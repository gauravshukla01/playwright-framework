// api/tuum/TuumAuthApiClient.ts
import { APIRequestContext } from '@playwright/test';
import { TuumBaseApiClient } from './TuumBaseApiClient';
import { getENV } from '../../utils/envUtils';
import { ApiResponse } from '../../types';

export interface AuthoriseEmployeeRequest {
  username: string;
  password: string;
  csrfToken?: string;
  tenantCode?: string | null;
}

export interface AuthToken {
  token: string;
}

export class TuumAuthApiClient extends TuumBaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, getENV().BASE_URL_AUTH_API);
  }

  // ─── Auth endpoints ───────────────────────────────────────

  /**
   * POST /api/v1/employees/authorise
   * Validates employee credentials and returns a JWT.
   */
  async authorise(credentials: AuthoriseEmployeeRequest): Promise<ApiResponse<AuthToken>> {
    const response = await this.post('/api/v1/employees/authorise', { ...credentials });
    const data = await this.parseTuumData<AuthToken>(response);
    return {
      status: response.status(),
      data,
    };
  }
}
