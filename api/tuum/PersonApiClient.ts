// api/tuum/PersonApiClient.ts
import { APIRequestContext } from '@playwright/test';
import { TuumBaseApiClient } from './TuumBaseApiClient';
import { getENV } from '../../utils/envUtils';
import { ApiResponse, PaginatedResult, ValidationErrorEntry } from '../../types';

export interface Person {
  personId: string;
  personTypeCode: string;
  statusCode: string;
  fullName?: string;
  email?: string;
  tenantCode?: string;
}

export interface CreateIdentificationNumberRequest {
  idNumber: string;
  idCountryCode: string;
  primary?: boolean;
}

export interface CreateAddressRequest {
  addressTypeCode: string;
  countryCode: string;
  cityCounty: string;
  street1?: string;
  zip?: string;
}

// Matches CreatePersonJson — only the fields this framework currently sends.
export interface CreatePersonRequest {
  personTypeCode: 'P' | 'L';
  name?: string;
  tradingName?: string;
  identificationNumbers?: CreateIdentificationNumberRequest[];
  addresses?: CreateAddressRequest[];
}

export interface PersonDetails {
  personId: string;
  statusCode: string;
  tenantCode?: string;
  fullName?: string;
  identificationNumbers?: CreateIdentificationNumberRequest[];
}

// Matches PersonSearchJson — only the fields this framework currently sends.
export interface PersonSearchRequest {
  pageNumber: number;
  pageSize: number;
  globalSearch?: string;
  personTypeCode?: 'P' | 'L';
  statusCodes?: string[];
  includeAccessRestricted?: boolean;
}

export class PersonApiClient extends TuumBaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, getENV().BASE_URL_PERSON_API);
  }

  // ─── Person endpoints ─────────────────────────────────────

  /**
   * GET /api/v3/persons/{personId}
   * Finds a person by ID.
   */
  async getPerson(personId: string): Promise<ApiResponse<Person>> {
    const response = await this.get(`/api/v3/persons/${personId}`);
    const data = await this.parseTuumData<Person>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * POST /api/v2/persons
   * Creates a new person (private or legal).
   */
  async createPerson(requestBody: CreatePersonRequest): Promise<ApiResponse<PersonDetails>> {
    const response = await this.post('/api/v2/persons', { ...requestBody });
    const data = await this.parseTuumData<PersonDetails>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * POST /api/v2/persons
   * Same endpoint as createPerson(), but for scenarios that deliberately
   * send an incomplete body and expect a validation failure — returns the
   * raw envelope's errors/validationErrors instead of trying to unwrap a
   * (null, on failure) PersonDetails. requestBody is intentionally loose
   * since the whole point is an incomplete CreatePersonRequest.
   */
  async createPersonExpectingValidationError(
    requestBody: Record<string, unknown>,
  ): Promise<{ status: number; errors: string[]; validationErrors: ValidationErrorEntry[] }> {
    const response = await this.post('/api/v2/persons', { ...requestBody });
    const { errors, validationErrors } = await this.parseTuumError(response);
    return { status: response.status(), errors, validationErrors };
  }

  /**
   * POST /api/v2/persons/search
   * Finds persons matching the given criteria.
   */
  async searchPersons(
    criteria: PersonSearchRequest,
  ): Promise<ApiResponse<PaginatedResult<Person>>> {
    const response = await this.post('/api/v2/persons/search', { ...criteria });
    const data = await this.parseTuumData<PaginatedResult<Person>>(response);
    return {
      status: response.status(),
      data,
    };
  }
}
