import axios from 'axios';
import { ICloudPDFOptions } from './cloudpdf';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';

export default class Api {
  options: ICloudPDFOptions;
  baseUrl: string;
  isSigned: boolean;

  constructor(options: ICloudPDFOptions, url: string) {
    this.options = options;
    this.baseUrl = url;
    this.isSigned = (options.cloudName && options.signingSecret) ? true : false;
  }

  public setSigned(enabled: boolean) {
    if(enabled && (!this.options.cloudName || !this.options.signingSecret)) {
      throw new Error('cloudName and signingSecret should be set');
    }

    this.isSigned = enabled;
  }

  public getSignedParams(functionName:string, params: any = {}, expiresIn: string | number = '15s') {
    if(!this.options.cloudName || !this.options.signingSecret) {
      throw new Error('cloudName and signingSecret should be set');
    }

    return jwt.sign({ 
      function: functionName,
      params
    }, this.options.signingSecret , { 
      expiresIn,
      header: {
        alg: 'HS256',
        typ: 'JWt',
        kid: this.options.cloudName
      } 
    });
  }

  private getHeaders(functionName:string, params: any = {}): any {
    let token: string;

    if(this.isSigned) {
      token = this.getSignedParams(functionName, params);
    } else {
      token = this.options.apiKey;
    }

    return {
      'Content-Type': 'application/json',
      'X-Authorization': token
    }
  }

  public async get<ResponseType, RequestParams = {}>(functionName: string, url: string, params: RequestParams | {} = {}): Promise<ResponseType> {
    return axios.get(`${this.baseUrl}${url}`, {
      headers: this.getHeaders(functionName, params)
    }).then(response => {
      return response.data
    }).catch(error => {
      throw new Error("HTTP error " + error.response.data.code)
    })
  }

  public async delete<ResponseType, RequestParams = {}>(functionName: string, url: string, params: RequestParams | {} = {}): Promise<ResponseType> {
    return axios.delete(`${this.baseUrl}${url}`, {
      headers: this.getHeaders(functionName, params)
    }).then(response => {
      return response.data
    }).catch(error => {
      throw new Error("HTTP error " + error.response.data.code)
    })
  }

  public async put<ResponseType, RequestParams>(functionName: string, url: string, params: RequestParams | {} = {}): Promise<ResponseType> {
    return axios.put(`${this.baseUrl}${url}`, params, {
      headers: this.getHeaders(functionName, params)
    }).then(response => {
      return response.data
    }).catch(error => {
      throw new Error("HTTP error " + error.response.data.code)
    })
  }

  public async patch<ResponseType, RequestParams>(functionName: string, url: string, params: RequestParams | {} = {}): Promise<ResponseType> {
    return axios.patch(`${this.baseUrl}${url}`, params, {
      headers: this.getHeaders(functionName, params)
    }).then(response => {
      return response.data
    }).catch(error => {
      throw new Error("HTTP error " + error.response.data.code)
    })
  }

  public async post<ResponseType, RequestParams>(functionName: string, url: string, params: RequestParams | {} = {}): Promise<ResponseType> {
    return axios.post(`${this.baseUrl}${url}`, params, {
      headers: this.getHeaders(functionName, params)
    }).then(response => {
      return response.data
    }).catch(error => {
      throw new Error("HTTP error " + error.response.data.code)
    })
  }

  public async uploadFromFilePath(preSignedURL:string, filePath: string, onUploadProgress?: (percentage: number) => void) {
    return axios.put(preSignedURL, fs.readFileSync(filePath), {
      headers: {
        'Content-Type': 'application/pdf'
      },
      onUploadProgress: (e) => {
        //  Show progress
        console.log(e);
        const percentComplete = Math.round((e.loaded * 100) / e.total);
        onUploadProgress && onUploadProgress(percentComplete)
      }
    }).then(response => {
      return response;
    }).catch(_error => {
      throw new Error("Upload error")
    });
  }
}