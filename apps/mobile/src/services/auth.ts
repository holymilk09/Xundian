import { api } from './api';
import type { LoginRequest, LoginResponse, RefreshTokenRequest } from '@xundian/shared';

export async function login(
  companyCode: string,
  phone: string,
  password: string,
): Promise<LoginResponse> {
  const payload: LoginRequest = {
    company_code: companyCode,
    phone,
    password,
  };
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function refreshToken(token: string): Promise<LoginResponse> {
  const payload: RefreshTokenRequest = { refresh_token: token };
  const response = await api.post<LoginResponse>('/auth/refresh', payload);
  return response.data;
}

export async function logoutServer(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors on logout -- token will expire
  }
}
