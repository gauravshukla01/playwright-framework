// data/internetUsers.ts

// ─── Credentials ──────────────────────────────────────────────

export interface InternetCredentials{
    userName: string;
    passWord: string;
}

export const INTERNET_USERS ={
    VALID: {
        userName: 'tomsmith',
        passWord: 'SuperSecretPassword!',
    } as InternetCredentials,

    INAVLID_PASSWORD: {
        userName: 'admin',
        passWord: 'wrongpassword',
    } as InternetCredentials,

    INVALID_USERNAME:{
        userName: 'wrongusername',
        passWord: 'admin',
    } as InternetCredentials,

    EMPTY_USERNAME: {
        userName: '',
        passWord: 'admin',
    } as InternetCredentials,

    EMPTY_PASSWORD: {
        userName: 'admin',
        passWord: ''
    } as InternetCredentials
};