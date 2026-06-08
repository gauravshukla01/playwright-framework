"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthApiClient = void 0;
const BaseApiClient_1 = require("./BaseApiClient");
class AuthApiClient extends BaseApiClient_1.BaseApiClient {
    constructor(request) {
        super(request, 'https://reqres.in');
    }
    // ─── Auth endpoints ───────────────────────────────────────
    /**
     * POST /api/login
     * Returns a token on success.
     * reqres.in valid credentials: eve.holt@reqres.in / cityslicka
     */
    async login(email, password) {
        const response = await this.post('/api/login', { email, password });
        const data = await this.parseResponse(response);
        return {
            status: response.status(),
            data,
        };
    }
    /**
     * POST /api/login with invalid credentials
     * Returns 400 with error message.
     */
    async loginWithInvalidCredentials(email, password) {
        const response = await this.post('/api/login', { email, password });
        const data = await this.parseResponse(response);
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
    async getUsers(page = 1) {
        const response = await this.get(`/api/users?page=${page}`);
        const data = await this.parseResponse(response);
        return {
            status: response.status(),
            data,
        };
    }
    /**
     * GET /api/users/:id
     * Returns a single user by ID.
     */
    async getUserById(userId) {
        const response = await this.get(`/api/users/${userId}`);
        const data = await this.parseResponse(response);
        return {
            status: response.status(),
            data,
        };
    }
    /**
     * POST /api/register
     * Registers a new user — returns token on success.
     */
    async register(email, password) {
        const response = await this.post('/api/register', { email, password });
        const data = await this.parseResponse(response);
        return {
            status: response.status(),
            data,
        };
    }
}
exports.AuthApiClient = AuthApiClient;
