// flows/tuum/CreatePersonAndAccountFlow.ts
import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { TuumAuthApiClient } from '../../api/tuum/TuumAuthApiClient';
import {
  PersonApiClient,
  Person,
  PersonDetails,
  CreatePersonRequest,
} from '../../api/tuum/PersonApiClient';
import { AccountApiClient, CreateAccountResponse } from '../../api/tuum/AccountApiClient';
import { buildCreateAccountRequest } from '../../data/tuumPersonAccountData';
import { getENV } from '../../utils/envUtils';
import { ApiResponse, PaginatedResult, ValidationErrorEntry } from '../../types';

export class CreatePersonAndAccountFlow {
  private readonly authClient: TuumAuthApiClient;
  private readonly personClient: PersonApiClient;
  private readonly accountClient: AccountApiClient;

  constructor(request: APIRequestContext) {
    this.authClient = new TuumAuthApiClient(request);
    this.personClient = new PersonApiClient(request);
    this.accountClient = new AccountApiClient(request);
  }

  // ─── Auth ─────────────────────────────────────────────────

  /**
   * Logs in as the configured employee and shares the resulting token
   * with the person/account clients used later in the journey.
   */
  async authenticate(): Promise<string> {
    const env = getENV();
    const response = await this.authClient.authorise({
      username: env.TUUM_EMPLOYEE_USERNAME,
      password: env.TUUM_EMPLOYEE_PASSWORD,
    });
    expect(response.status, 'Authorise response status should be 200').toBe(200);
    expect(response.data.token, 'Authorise response should include a token').toBeTruthy();

    this.personClient.setAuthToken(response.data.token);
    this.accountClient.setAuthToken(response.data.token);
    return response.data.token;
  }

  // ─── Journey steps ────────────────────────────────────────

  async createPerson(requestBody: CreatePersonRequest): Promise<ApiResponse<PersonDetails>> {
    return this.personClient.createPerson(requestBody);
  }

  /**
   * Creates an account owned by the given person. A fresh x-request-id is
   * generated per call so retries never create duplicate accounts.
   */
  async createAccount(
    personId: string,
    personName: string,
  ): Promise<ApiResponse<CreateAccountResponse>> {
    const requestBody = buildCreateAccountRequest(personId, personName);
    return this.accountClient.createAccount(requestBody, randomUUID());
  }

  /**
   * Attempts to create a person with a deliberately incomplete body and
   * returns the raw validation-error envelope for assertValidationError()
   * to check — used by data-driven "missing field" scenarios.
   */
  async createPersonExpectingValidationError(
    requestBody: Record<string, unknown>,
  ): Promise<{ status: number; errors: string[]; validationErrors: ValidationErrorEntry[] }> {
    return this.personClient.createPersonExpectingValidationError(requestBody);
  }

  async searchPersonByIdNumber(idNumber: string): Promise<ApiResponse<PaginatedResult<Person>>> {
    return this.personClient.searchPersons({
      pageNumber: 1,
      pageSize: 10,
      globalSearch: idNumber,
      personTypeCode: 'L',
      statusCodes: ['ACTIVE'],
      includeAccessRestricted: true,
    });
  }

  // ─── Assertion helpers ────────────────────────────────────

  /**
   * Asserts the person was created and returns its ID, so the caller can
   * feed it into createAccount()/searchPersonByIdNumber() without
   * hardcoding anything.
   */
  assertPersonCreated(response: ApiResponse<PersonDetails>): string {
    expect(response.status, 'Create person response status should be 200').toBe(200);
    expect(response.data.personId, 'Created person should have a personId').toBeTruthy();
    return response.data.personId;
  }

  assertAccountCreated(
    response: ApiResponse<CreateAccountResponse>,
    expected: { personId: string },
  ): string {
    expect(response.status, 'Create account response status should be 200').toBe(200);
    expect(response.data.accountId, 'Created account should have an accountId').toBeTruthy();
    expect(
      response.data.accountPersons.some((p) => p.personId === expected.personId),
      `Account's accountPersons should include personId "${expected.personId}"`,
    ).toBe(true);
    return response.data.accountId;
  }

  assertPersonFoundInSearch(
    response: ApiResponse<PaginatedResult<Person>>,
    expectedPersonId: string,
  ): void {
    expect(response.status, 'Search persons response status should be 200').toBe(200);
    expect(
      response.data.values.some((person) => person.personId === expectedPersonId),
      `Search results should include personId "${expectedPersonId}"`,
    ).toBe(true);
  }

  /**
   * Asserts a createPersonExpectingValidationError() response matches the
   * expected status/errorCode/message. `field` is optional since the
   * source collection's person-validation checks only ever assert
   * code/message, never validationErrors[0].field.
   */
  assertValidationError(
    response: { status: number; errors: string[]; validationErrors: ValidationErrorEntry[] },
    expected: { status: number; field?: string; code: string; message: string },
  ): void {
    expect(response.status, `Response status should be ${expected.status}`).toBe(expected.status);
    const [entry] = response.validationErrors;
    expect(entry, 'validationErrors[0] should be present').toBeTruthy();
    if (expected.field) {
      expect(entry.field, `validationErrors[0].field should be "${expected.field}"`).toBe(
        expected.field,
      );
    }
    const [errorDetail] = entry.errors;
    expect(errorDetail.code, `Error code should be "${expected.code}"`).toBe(expected.code);
    expect(errorDetail.translations.en, `Error message should be "${expected.message}"`).toBe(
      expected.message,
    );
  }
}
