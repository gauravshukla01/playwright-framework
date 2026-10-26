// api/tuum/TuumBaseApiClient.ts
import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from '../BaseApiClient';
import { getENV } from '../../utils/envUtils';
import { TuumApiEnvelope, ValidationErrorEntry } from '../../types';

// Shared base for the real Tuum microservices (auth-api, person-api,
// account-api...). Unlike reqres, auth is a per-instance JWT set after
// login, and every request needs tenant/channel headers instead of an
// api key.
export abstract class TuumBaseApiClient extends BaseApiClient {
  private authToken?: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    super(request, baseUrl);
  }

  // Call after TuumAuthApiClient.authorise() succeeds — the token is then
  // sent as x-auth-token on every subsequent call this instance makes.
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  protected getDefaultHeaders(): Record<string, string> {
    const env = getENV();
    return {
      'x-tenant-code': env.TUUM_TENANT_CODE,
      'x-channel-code': env.TUUM_CHANNEL_CODE,
      ...(this.authToken ? { 'x-auth-token': this.authToken } : {}),
    };
  }

  // Every Tuum response is wrapped as { errors, validationErrors, data }.
  // This unwraps it so client methods can return a plain ApiResponse<T>.
  protected async parseTuumData<T>(response: APIResponse): Promise<T> {
    const envelope = await this.parseResponse<TuumApiEnvelope<T>>(response);
    return envelope.data;
  }

  // Like parseTuumData(), but also surfaces the envelope's own
  // errors/validationErrors instead of discarding them — used by client
  // methods whose callers need to assert "errors is null" /
  // "validationErrors is null" on a success-path response (not just the
  // *ExpectingError() error-path methods, which already return these via
  // parseTuumError()).
  protected async parseTuumEnvelope<T>(
    response: APIResponse,
  ): Promise<{
    data: T;
    errors: string[] | null;
    validationErrors: ValidationErrorEntry[] | null;
  }> {
    const envelope = await this.parseResponse<TuumApiEnvelope<T>>(response);
    return {
      data: envelope.data,
      errors: envelope.errors,
      validationErrors: envelope.validationErrors,
    };
  }

  // For error responses, where `data` is null and the caller needs the
  // envelope's errors/validationErrors instead — used by *ExpectingError()
  // client methods that deliberately test a validation-failure path.
  protected async parseTuumError(
    response: APIResponse,
  ): Promise<{ errors: string[]; validationErrors: ValidationErrorEntry[] }> {
    const envelope = await this.parseResponse<TuumApiEnvelope<unknown>>(response);
    // Error-path responses are expected to always populate these — ?? []
    // only guards the type (envelope.errors is now string[] | null since
    // success-path responses can genuinely have null here), not a real
    // runtime fallback.
    return { errors: envelope.errors ?? [], validationErrors: envelope.validationErrors ?? [] };
  }
}
