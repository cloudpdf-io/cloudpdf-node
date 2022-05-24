import Api from "./api";

const API_ENDPOINT = "http://localhost:4000/v2";

interface IDefaultPermissionsParams {
  download?: "NotAllowed" | "Allowed" | "EmailRequired";
  search?: boolean;
  selection?: boolean;
  info?: ("email" | "name" | "organization" | "phone")[]
}

interface IGetViewerTokenParams extends IDefaultPermissionsParams {
  id: string
}

interface ICreateDocumentParams { 
  name: string;
  description?: string;
  parentId?: string;
  tags?: string[];
  defaultPermissions?: IDefaultPermissionsParams;
}

interface IUploadDocumentFileParams { 
  uploadCompleted: boolean;
}

interface IUpdateDocumentParams extends ICreateDocumentParams {
  id: string;
}

interface IDocumentParams {
  id: string;
}

export interface IDeleteResonse {
  deletionTime: number
}

export interface IAuthResponse {
  organizationName: string;
  message: string;
}

export interface IAccountResponse {
  organizationName: string;
  plan: string;
  allowedMonthlyUploads: number;
  usedMonthlyUploads: number;
  allowedMonthlyViews: number;
  usedMonthlyViews: number;
  allowedStorage: number;
  usedStorage: any;
}

export interface IFileResponse {
  id: string;
  status: "WaitingUpload" | "Processing" | "Failed" | "Completed";
  uploadUrl: string | null ;
}

export interface IPermissionResponse {
  download: "NotAllowed" | "Allowed" | "EmailRequired";
  search: boolean;
  selection: boolean;
  info: ("email" | "name" | "organization" | "phone")[]
}

export interface IDocumentResponse {
  id: string;
  name: string;
  description: string | null;
  file: IFileResponse;
  defaultPermissions: IPermissionResponse;
}

export interface ICloudPDFOptions {
  cloudName?: string;
  apiKey: string;
  signingSecret?: string;
}

export class CloudPDF {
  private api;

  constructor(options: ICloudPDFOptions) {
    this.api = new Api(options, API_ENDPOINT);
  }

  public setSigned(enabled: boolean) {
    this.api.setSigned(enabled);
  }

  public async auth(): Promise<IAuthResponse> {
    return this.api.get<
    IAuthResponse
    >('APIV2GetAuth', '/auth');
  }

  public async account(): Promise<IAccountResponse> {
    return this.api.get<
      IAccountResponse
    >('APIV2GetAccount', '/account');
  }

  /* Documents */

  public async createDocument(params: ICreateDocumentParams): Promise<IDocumentResponse> {
    return this.api.post<
      IDocumentResponse, 
      ICreateDocumentParams
    >('APIV2CreateDocument', '/documents', params);
  }

  public async getDocument(id: string): Promise<IDocumentResponse> {
    return this.api.get<
      IDocumentResponse, 
      IDocumentParams
    >('APIV2GetDocument', `/documents/${id}`, {
      id
    });
  }

  public async updateDocument(id: string, params: ICreateDocumentParams): Promise<IDocumentResponse> {
    return this.api.put<
      IDocumentResponse, 
      IUpdateDocumentParams
    >('APIV2UpdateDocument', `/documents/${id}`, {
      id,
      ...params
    });
  }

  public async deleteDocument(id: string): Promise<IDeleteResonse> {
    return this.api.delete<
      IDeleteResonse, 
      IDocumentParams
    >('APIV2DeleteDocument', `/documents/${id}`, {
      id
    });
  }

  public async uploadDocumentFileComplete(id: string, fileId: string, params: IUploadDocumentFileParams): Promise<IFileResponse> {
    return this.api.patch<
      IFileResponse, 
      IUploadDocumentFileParams
    >('APIV2PatchDocumentFile', `/documents/${id}/files/${fileId}`, {
      id,
      fileId,
      ...params
    });
  }
 
  public async uploadDocumentFromPath(
    path: string, 
    params: ICreateDocumentParams,
    onUploadProgress?: (percentage: number) => void
  ): Promise<IDocumentResponse> {
    const document = await this.createDocument(params);

    if(!document.file.uploadUrl) throw new Error('Something went wrong');

    await this.api.uploadFromFilePath(
      document.file.uploadUrl, 
      path, 
      onUploadProgress
    )

    const file = await this.uploadDocumentFileComplete(
      document.id,
      document.file.id,
      {
        uploadCompleted: true
      }
    )

    return {
      ...document,
      file
    };
  }

  public getViewerToken(params: IGetViewerTokenParams, expiresIn: string | number = '1h') {
    return this.api.getSignedParams('APIGetDocument', params, expiresIn)
  }
}