// api/BaseApiClient.ts
import { APIRequestContext, APIResponse } from '@playwright/test';
import { ENV } from '../utils/envUtils';

export abstract class BaseApiClient {
  protected readonly baseUrl: string;
  protected readonly request: APIRequestContext;

  constructor(request: APIRequestContext, baseUrl: string = ENV.REQRES_BASE_URL) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  // ─── Core HTTP methods ────────────────────────────────────

  protected async get(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}${endpoint}`, {
      headers: this.buildHeaders(headers),
    });
  }

  protected async post(
    endpoint: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}${endpoint}`, {
      data:    body,
      headers: this.buildHeaders(headers),
    });
  }

  protected async put(
    endpoint: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.put(`${this.baseUrl}${endpoint}`, {
      data:    body,
      headers: this.buildHeaders(headers),
    });
  }

  protected async delete(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.delete(`${this.baseUrl}${endpoint}`, {
      headers: this.buildHeaders(headers),
    });
  }

  // ─── Response helpers ─────────────────────────────────────

  protected async parseResponse<T>(response: APIResponse): Promise<T> {
    const body = await response.json();
    return body as T;
  }

  protected isSuccess(response: APIResponse): boolean {
    return response.status() >= 200 && response.status() < 300;
  }

  // ─── Header builder ───────────────────────────────────────

  private buildHeaders(
    additionalHeaders?: Record<string, string>,
  ): Record<string, string> {
    return {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'x-api-key':     ENV.REQRES_API_KEY,    // ← injected automatically
      ...additionalHeaders,
    };
  }
}