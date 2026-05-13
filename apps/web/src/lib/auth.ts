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

export async function logout(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  // Notify server of logout (token invalidation)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
  } catch {
    // Proceed with local cleanup even if server call fails
  }
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

export function isManagerRole(user: { role: string } | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'area_manager' || user?.role === 'regional_director';
}
