"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthApiFlow = void 0;
// flows/AuthApiFlow.ts
const test_1 = require("@playwright/test");
const AuthApiClient_1 = require("../api/AuthApiClient");
const users_1 = require("../data/users");
class AuthApiFlow {
    constructor(request) {
        this.request = request;
        this.authApiClient = new AuthApiClient_1.AuthApiClient(request);
    }
    // ─── Login journeys ───────────────────────────────────────
    /**
     * Logs in with valid credentials and returns the full response.
     * Use when you need the token for subsequent API calls.
     */
    async loginWithValidCredentials() {
        const response = await this.authApiClient.login(users_1.API_USERS.VALID.email, users_1.API_USERS.VALID.password);
        return response;
    }
    /**
     * Logs in with provided credentials — use for parameterised tests.
     */
    async loginWith(credentials) {
        const response = await this.authApiClient.login(credentials.email, credentials.password);
        return response;
    }
    /**
     * Attempts login with invalid credentials.
     * Returns the error response for assertion in the test.
     */
    async loginWithInvalidCredentials() {
        const response = await this.authApiClient.loginWithInvalidCredentials(users_1.API_USERS.INVALID.email, users_1.API_USERS.INVALID.password);
        return response;
    }
    // ─── Token helpers ────────────────────────────────────────
    /**
     * Logs in and returns the token string only.
     * Use as a precondition when other flows need an auth token.
     */
    async getAuthToken() {
        const response = await this.loginWithValidCredentials();
        (0, test_1.expect)(response.status).toBe(200);
        (0, test_1.expect)(response.data.token).toBeDefined();
        return response.data.token;
    }
    // ─── User journeys ────────────────────────────────────────
    /**
     * Fetches a paginated list of users.
     */
    async getUsers(page = 1) {
        return this.authApiClient.getUsers(page);
    }
    /**
     * Fetches a single user by ID.
     */
    async getUserById(userId) {
        return this.authApiClient.getUserById(userId);
    }
    /**
     * Registers a new user with valid reqres credentials.
     */
    async registerUser(credentials) {
        return this.authApiClient.register(credentials.email, credentials.password);
    }
    // ─── Assertion helpers ────────────────────────────────────
    /**
     * Asserts login was successful — status 200 and token present.
     */
    async assertLoginSuccess(response) {
        (0, test_1.expect)(response.status).toBe(200);
        (0, test_1.expect)(response.data.token).toBeDefined();
        (0, test_1.expect)(response.data.token.length).toBeGreaterThan(0);
    }
    /**
     * Asserts login failed — status 400 and error message present.
     */
    async assertLoginFailure(response, expectedError) {
        (0, test_1.expect)(response.status).toBe(400);
        (0, test_1.expect)(response.data.error).toContain(expectedError);
    }
    /**
     * Asserts user data shape is correct.
     */
    async assertUserShape(userId) {
        const response = await this.getUserById(userId);
        (0, test_1.expect)(response.status).toBe(200);
        (0, test_1.expect)(response.data.data.id).toBe(userId);
        (0, test_1.expect)(response.data.data.email).toBeDefined();
        (0, test_1.expect)(response.data.data.first_name).toBeDefined();
    }
}
exports.AuthApiFlow = AuthApiFlow;
