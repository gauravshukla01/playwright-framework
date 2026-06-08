// api/AuthApiClient.ts
import { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './BaseApiClient';
import { LoginResponse, ApiResponse } from '../types';

// reqres.in user shape
export interface ReqresUser {
  id:         number;
  email:      string;
  first_name: string;
  last_name:  string;
  avatar:     string;
}

export interface UserListResponse {
  page:         number;
  per_page:     number;
  total:        number;
  total_pages:  number;
  data:         ReqresUser[];
}

export class AuthApiClient extends BaseApiClient {

  constructor(request: APIRequestContext) {
    super(request, 'https://reqres.in');
  }

  // ─── Auth endpoints ───────────────────────────────────────

  /**
   * POST /api/login
   * Returns a token on success.
   * reqres.in valid credentials: eve.holt@reqres.in / cityslicka
   */
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post('/api/login', { email, password });
    const data = await this.parseResponse<LoginResponse>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * POST /api/login with invalid credentials
   * Returns 400 with error message.
   */
  async loginWithInvalidCredentials(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ error: string }>> {
    const response = await this.post('/api/login', { email, password });
    const data = await this.parseResponse<{ error: string }>(response);
    return {
      status: response.status(),
      data,
    };
  }

  // ─── User endpoints ───────────────────────────────────────

  /**
   * GET /api/users?page=1
   * Returns paginated list of users.
   */
  async getUsers(page: number = 1): Promise<ApiResponse<UserListResponse>> {
    const response = await this.get(`/api/users?page=${page}`);
    const data = await this.parseResponse<UserListResponse>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * GET /api/users/:id
   * Returns a single user by ID.
   */
  async getUserById(
    userId: number,
  ): Promise<ApiResponse<{ data: ReqresUser }>> {
    const response = await this.get(`/api/users/${userId}`);
    const data = await this.parseResponse<{ data: ReqresUser }>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * POST /api/register
   * Registers a new user — returns token on success.
   */
  async register(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ id: number; token: string }>> {
    const response = await this.post('/api/register', { email, password });
    const data = await this.parseResponse<{ id: number; token: string }>(response);
    return {
      status: response.status(),
      data,
    };
  }
}