import Api from "./api";

const API_ENDPOINT = "https://api.cloudpdf.io/v2";

export type TWatermarkType = 'diagonal' | 'headerLeft' | 'headerCenter' | 'headerRight' | 'footerLeft' | 'footerCenter' | 'footerRight';

export interface IWatermarkParams {
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  text: string;
  type: TWatermarkType;
}

interface IDefaultPermissionsParams {
  download?: "NotAllowed" | "Allowed" | "EmailRequired";
  search?: boolean;
  selection?: boolean;
  info?: ("email" | "name" | "organization" | "phone")[];
  watermarks?: IWatermarkParams[];
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

interface ICreateWebhookParams { 
  name: string;
  url: string;
  secret?: string;
  events?: string[];
  headers?: {
    [key: string]: string
  };
}

interface IUpdateWebhookParams extends ICreateWebhookParams {
  id: string;
}

interface ICreateDocumentFileNewVersionParams { 
  name: string;
}

interface IUploadDocumentFileParams { 
  uploadCompleted: boolean;
}

interface IUpdateDocumentParams extends ICreateDocumentParams {
  id: string;
}

interface IWebhookParams {
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
  thumbnail: string | null;
  size: number | null;
  documentId: string;
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

interface IWebhookEventsResponse {
  name: string;
  slug: string;
}

export interface IWebhookResponse {
  name: string;
  url: string;
  secret: string;
  events: IWebhookEventsResponse[];
  enabled: string;
  headers: {
    [key: string]: string
  }
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

  public async createNewFileVersion(documentId: string, params: ICreateDocumentFileNewVersionParams): Promise<IFileResponse> {
    return this.api.post<
      IFileResponse
    >('APIV2CreateDocumentFile', `/documents/${documentId}/files`, {
      id: documentId,
      ...params
    });
  }

  public async uploadDocumentFileComplete(id: string, fileId: string): Promise<IFileResponse> {
    return this.api.patch<
      IFileResponse, 
      IUploadDocumentFileParams
    >('APIV2PatchDocumentFile', `/documents/${id}/files/${fileId}`, {
      id,
      fileId,
      uploadCompleted: true
    });
  }

  public async getDocumentFile(documentId: string, fileId: string): Promise<IFileResponse> {
    return this.api.get<
      IFileResponse
    >('APIV2GetDocumentFile', `/documents/${documentId}/files/${fileId}`, {
      id: documentId,
      fileId
    });
  }
 
  public async uploadDocument(
    bufferOrPath: string | Buffer, 
    params: ICreateDocumentParams
  ): Promise<IDocumentResponse> {
    const document = await this.createDocument(params);

    if(!document.file.uploadUrl) throw new Error('Something went wrong');

    await this.api.uploadBufferOrPath(
      document.file.uploadUrl, 
      bufferOrPath
    )

    const file = await this.uploadDocumentFileComplete(
      document.id,
      document.file.id
    )

    return {
      ...document,
      file
    };
  }

  public async uploadNewFileVersion(
    id: string,
    bufferOrPath: string | Buffer, 
    params: ICreateDocumentFileNewVersionParams
  ): Promise<IFileResponse> {
    const file = await this.createNewFileVersion(id, params);

    if(!file.uploadUrl) throw new Error('Something went wrong');

    await this.api.uploadBufferOrPath(
      file.uploadUrl, 
      bufferOrPath
    )

    const uploadedFile = await this.uploadDocumentFileComplete(
      file.documentId,
      file.id
    )

    return uploadedFile;
  }

  /* Document TOKEN generation */
  public getViewerToken(params: IGetViewerTokenParams, expiresIn: string | number = '1h') {
    return this.api.getSignedParams('APIGetDocument', params, expiresIn)
  }

  /* Webhook */
  public async createWebhook(params: ICreateWebhookParams): Promise<IWebhookResponse> {
    return this.api.post<
      IWebhookResponse, 
      ICreateWebhookParams
    >('APIV2CreateWebhook', '/webhooks', params);
  }

  public async getWebhook(id: string): Promise<IWebhookResponse> {
    return this.api.get<
      IWebhookResponse
    >('APIV2GetWebhook', `/webhooks/${id}`, {
      id
    });
  }

  public async updateWebhook(id: string, params: ICreateWebhookParams): Promise<IWebhookResponse> {
    return this.api.put<
      IWebhookResponse, 
      IUpdateWebhookParams
    >('APIV2UpdateWebhook', `/webhooks/${id}`, {
      id,
      ...params
    });
  }

  public async deleteWebhook(id: string): Promise<IWebhookResponse> {
    return this.api.delete<
      IWebhookResponse, 
      IWebhookParams
    >('APIV2DeleteWebhook', `/webhooks/${id}`, {
      id
    });
  }

  public async getWebhooks(): Promise<IWebhookResponse[]> {
    return this.api.get<
      IWebhookResponse[]
    >('APIV2GetWebhooks', `/webhooks`, {});
  }
}