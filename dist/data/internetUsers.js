"use strict";
// data/internetUsers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERNET_USERS = void 0;
exports.INTERNET_USERS = {
    VALID: {
        userName: 'tomsmith',
        passWord: 'SuperSecretPassword!',
    },
    INAVLID_PASSWORD: {
        userName: 'admin',
        passWord: 'wrongpassword',
    },
    INVALID_USERNAME: {
        userName: 'wrongusername',
        passWord: 'admin',
    },
    EMPTY_USERNAME: {
        userName: '',
        passWord: 'admin',
    },
    EMPTY_PASSWORD: {
        userName: 'admin',
        passWord: ''
    }
};
