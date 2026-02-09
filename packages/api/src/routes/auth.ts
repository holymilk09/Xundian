import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import type { LoginRequest, RefreshTokenRequest } from '@xundian/shared';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post<{ Body: LoginRequest }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
      const { company_code, phone, password } = request.body;

      if (!company_code || !phone || !password) {
        return reply.code(400).send({
          success: false,
          error: 'company_code, phone, and password are required',
        });
      }

      // Find company by code
      const companyResult = await pool.query(
        'SELECT id, name FROM companies WHERE company_code = $1',
        [company_code],
      );

      if (companyResult.rows.length === 0) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' });
      }

      const company = companyResult.rows[0]!;

      // Find employee
      const empResult = await pool.query(
        'SELECT id, name, phone, role, password_hash, company_id FROM employees WHERE phone = $1 AND company_id = $2 AND is_active = true',
        [phone, company.id],
      );

      if (empResult.rows.length === 0) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' });
      }

      const employee = empResult.rows[0]!;

      // Verify password
      const valid = await bcrypt.compare(password, employee.password_hash);
      if (!valid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' });
      }

      // Generate access token (1h)
      const accessToken = app.jwt.sign(
        {
          sub: employee.id,
          company_id: employee.company_id,
          role: employee.role,
        },
        { expiresIn: '1h' },
      );

      // Generate refresh token (7d)
      const refreshToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        'INSERT INTO refresh_tokens (employee_id, token, expires_at) VALUES ($1, $2, $3)',
        [employee.id, refreshToken, expiresAt],
      );

      return reply.send({
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          employee: {
            id: employee.id,
            name: employee.name,
            phone: employee.phone,
            role: employee.role,
            company_id: employee.company_id,
            company_name: company.name,
          },
        },
      });
    },
  );

  // POST /auth/refresh
  app.post<{ Body: RefreshTokenRequest }>(
    '/refresh',
    async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) => {
      const { refresh_token } = request.body;

      if (!refresh_token) {
        return reply.code(400).send({ success: false, error: 'refresh_token is required' });
      }

      // Find valid refresh token
      const tokenResult = await pool.query(
        'SELECT rt.id, rt.employee_id, e.company_id, e.role FROM refresh_tokens rt JOIN employees e ON e.id = rt.employee_id WHERE rt.token = $1 AND rt.expires_at > NOW()',
        [refresh_token],
      );

      if (tokenResult.rows.length === 0) {
        return reply.code(401).send({ success: false, error: 'Invalid or expired refresh token' });
      }

      const tokenRow = tokenResult.rows[0]!;

      // Delete old refresh token
      await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRow.id]);

      // Generate new tokens
      const accessToken = app.jwt.sign(
        {
          sub: tokenRow.employee_id,
          company_id: tokenRow.company_id,
          role: tokenRow.role,
        },
        { expiresIn: '1h' },
      );

      const newRefreshToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        'INSERT INTO refresh_tokens (employee_id, token, expires_at) VALUES ($1, $2, $3)',
        [tokenRow.employee_id, newRefreshToken, expiresAt],
      );

      return reply.send({
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: newRefreshToken,
        },
      });
    },
  );

  // POST /auth/logout
  app.post<{ Body: RefreshTokenRequest }>(
    '/logout',
    async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) => {
      const { refresh_token } = request.body;

      if (refresh_token) {
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);
      }

      return reply.send({ success: true, data: null });
    },
  );
}
