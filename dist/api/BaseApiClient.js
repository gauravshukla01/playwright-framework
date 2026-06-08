"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseApiClient = void 0;
const envUtils_1 = require("../utils/envUtils");
class BaseApiClient {
    constructor(request, baseUrl = envUtils_1.ENV.REQRES_BASE_URL) {
        this.request = request;
        this.baseUrl = baseUrl;
    }
    // ─── Core HTTP methods ────────────────────────────────────
    async get(endpoint, headers) {
        return this.request.get(`${this.baseUrl}${endpoint}`, {
            headers: this.buildHeaders(headers),
        });
    }
    async post(endpoint, body, headers) {
        return this.request.post(`${this.baseUrl}${endpoint}`, {
            data: body,
            headers: this.buildHeaders(headers),
        });
    }
    async put(endpoint, body, headers) {
        return this.request.put(`${this.baseUrl}${endpoint}`, {
            data: body,
            headers: this.buildHeaders(headers),
        });
    }
    async delete(endpoint, headers) {
        return this.request.delete(`${this.baseUrl}${endpoint}`, {
            headers: this.buildHeaders(headers),
        });
    }
    // ─── Response helpers ─────────────────────────────────────
    async parseResponse(response) {
        const body = await response.json();
        return body;
    }
    isSuccess(response) {
        return response.status() >= 200 && response.status() < 300;
    }
    // ─── Header builder ───────────────────────────────────────
    buildHeaders(additionalHeaders) {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': envUtils_1.ENV.REQRES_API_KEY, // ← injected automatically
            ...additionalHeaders,
        };
    }
}
exports.BaseApiClient = BaseApiClient;
