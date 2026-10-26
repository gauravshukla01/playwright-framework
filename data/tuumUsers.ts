// data/tuumUsers.ts

export interface TuumUserCredentials {
  username: string;
  password: string;
}

export const TUUM_USERS: Record<string, TuumUserCredentials> = {
  VALID: {
    username: 'Gaurav',
    password: 'newpassword@#23D',
  },
  INVALID: {
    username: 'invaliduser',
    password: 'wrongpassword999',
  },
};
