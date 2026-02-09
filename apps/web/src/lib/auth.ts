import type { LoginRequest, LoginResponse } from '@xundian/shared';
import api from './api';

const TOKEN_KEY = 'xundian_access_token';
const REFRESH_KEY = 'xundian_refresh_token';
const USER_KEY = 'xundian_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post('/auth/login', credentials);
  const payload = response.data.data as LoginResponse;
  localStorage.setItem(TOKEN_KEY, payload.access_token);
  localStorage.setItem(REFRESH_KEY, payload.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.employee));
  return payload;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): LoginResponse['employee'] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
