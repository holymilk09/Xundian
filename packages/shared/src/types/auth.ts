import type { EmployeeRole } from './company';

export interface LoginRequest {
  company_code: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  employee: {
    id: string;
    name: string;
    phone: string;
    role: EmployeeRole;
    company_id: string;
    company_name: string;
  };
}

export interface TokenPayload {
  sub: string; // employee_id
  company_id: string;
  role: EmployeeRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}
