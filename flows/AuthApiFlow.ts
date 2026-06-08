// flows/AuthApiFlow.ts
import { APIRequestContext, expect } from '@playwright/test';
import { AuthApiClient } from '../api/AuthApiClient';
import { API_USERS, ApiCredentials } from '../data/users';
import { LoginResponse, ApiResponse } from '../types';

export class AuthApiFlow {
  private readonly authApiClient: AuthApiClient;

  constructor(private readonly request: APIRequestContext) {
    this.authApiClient = new AuthApiClient(request);
  }

  // ─── Login journeys ───────────────────────────────────────

  /**
   * Logs in with valid credentials and returns the full response.
   * Use when you need the token for subsequent API calls.
   */
  async loginWithValidCredentials(): Promise<ApiResponse<LoginResponse>> {
    const response = await this.authApiClient.login(
      API_USERS.VALID.email,
      API_USERS.VALID.password,
    );
    return response;
  }

  /**
   * Logs in with provided credentials — use for parameterised tests.
   */
  async loginWith(
    credentials: ApiCredentials,
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await this.authApiClient.login(
      credentials.email,
      credentials.password,
    );
    return response;
  }

  /**
   * Attempts login with invalid credentials.
   * Returns the error response for assertion in the test.
   */
  async loginWithInvalidCredentials(): Promise<ApiResponse<{ error: string }>> {
    const response = await this.authApiClient.loginWithInvalidCredentials(
      API_USERS.INVALID.email,
      API_USERS.INVALID.password,
    );
    return response;
  }

  // ─── Token helpers ────────────────────────────────────────

  /**
   * Logs in and returns the token string only.
   * Use as a precondition when other flows need an auth token.
   */
  async getAuthToken(): Promise<string> {
    const response = await this.loginWithValidCredentials();
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    return response.data.token;
  }

  // ─── User journeys ────────────────────────────────────────

  /**
   * Fetches a paginated list of users.
   */
  async getUsers(page: number = 1) {
    return this.authApiClient.getUsers(page);
  }

  /**
   * Fetches a single user by ID.
   */
  async getUserById(userId: number) {
    return this.authApiClient.getUserById(userId);
  }

  /**
   * Registers a new user with valid reqres credentials.
   */
  async registerUser(credentials: ApiCredentials) {
    return this.authApiClient.register(
      credentials.email,
      credentials.password,
    );
  }

  // ─── Assertion helpers ────────────────────────────────────

  /**
   * Asserts login was successful — status 200 and token present.
   */
  async assertLoginSuccess(
    response: ApiResponse<LoginResponse>,
  ): Promise<void> {
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    expect(response.data.token.length).toBeGreaterThan(0);
  }

  /**
   * Asserts login failed — status 400 and error message present.
   */
  async assertLoginFailure(
    response: ApiResponse<{ error: string }>,
    expectedError: string,
  ): Promise<void> {
    expect(response.status).toBe(400);
    expect(response.data.error).toContain(expectedError);
  }

  /**
   * Asserts user data shape is correct.
   */
  async assertUserShape(userId: number): Promise<void> {
    const response = await this.getUserById(userId);
    expect(response.status).toBe(200);
    expect(response.data.data.id).toBe(userId);
    expect(response.data.data.email).toBeDefined();
    expect(response.data.data.first_name).toBeDefined();
  }
}