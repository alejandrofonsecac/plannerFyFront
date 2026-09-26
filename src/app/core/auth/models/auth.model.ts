export type UserRole = 'USER' | 'USER_PLUS' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export interface AuthCredentials {
  name: string;
  email: string;
  password: string;
}
