import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import type { EmployeeRole, TierConfig } from '@xundian/shared';

interface CreateEmployeeBody {
  name: string;
  phone: string;
  password: string;
  role: EmployeeRole;
  territory_id?: string;
}

interface UpdateCompanyBody {
  name?: string;
  name_zh?: string;
  tier_config?: TierConfig;
}

export async function companyRoutes(app: FastifyInstance) {
  // GET /company — get current company profile
  app.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        'SELECT id, name, name_zh, business_license, unified_credit_code, industry, company_code, tier_config, created_at FROM companies WHERE id = $1',
        [companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Company not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // PUT /company — update company settings
  app.put<{ Body: UpdateCompanyBody }>(
    '/',
    async (request: FastifyRequest<{ Body: UpdateCompanyBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      // Only admin can update company
      if (request.employee.role !== 'admin') {
        return reply.code(403).send({ success: false, error: 'Only admins can update company settings' });
      }

      const { name, name_zh, tier_config } = request.body;

      const sets: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) { sets.push(`name = $${paramIndex++}`); params.push(name); }
      if (name_zh !== undefined) { sets.push(`name_zh = $${paramIndex++}`); params.push(name_zh); }
      if (tier_config !== undefined) { sets.push(`tier_config = $${paramIndex++}`); params.push(JSON.stringify(tier_config)); }

      if (sets.length === 0) {
        return reply.code(400).send({ success: false, error: 'No fields to update' });
      }

      params.push(companyId);

      const result = await pool.query(
        `UPDATE companies SET ${sets.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, name, name_zh, business_license, unified_credit_code, industry, company_code, tier_config, created_at`,
        params,
      );

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // GET /company/employees — list employees
  app.get(
    '/employees',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        'SELECT id, company_id, name, phone, role, territory_id, is_active, created_at FROM employees WHERE company_id = $1 ORDER BY created_at',
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // POST /company/employees — create employee (admin only)
  app.post<{ Body: CreateEmployeeBody }>(
    '/employees',
    async (request: FastifyRequest<{ Body: CreateEmployeeBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      // Only admin can create employees
      if (request.employee.role !== 'admin') {
        return reply.code(403).send({ success: false, error: 'Only admins can create employees' });
      }

      const { name, phone, password, role, territory_id } = request.body;

      if (!name || !phone || !password || !role) {
        return reply.code(400).send({
          success: false,
          error: 'name, phone, password, and role are required',
        });
      }

      // Check phone uniqueness
      const existing = await pool.query('SELECT id FROM employees WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        return reply.code(409).send({ success: false, error: 'Phone number already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `INSERT INTO employees (company_id, name, phone, password_hash, role, territory_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id, name, phone, role, territory_id, is_active, created_at`,
        [companyId, name, phone, passwordHash, role, territory_id || null],
      );

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );
}
