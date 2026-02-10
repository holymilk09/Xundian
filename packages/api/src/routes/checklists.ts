import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';

interface TemplateParams {
  id: string;
}

interface CreateTemplateBody {
  name: string;
  name_zh?: string;
  items: Array<{
    id: string;
    label: string;
    label_zh?: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  assigned_tiers: string[];
}

interface SubmitChecklistBody {
  visit_id: string;
  template_id: string;
  results: Array<{
    item_id: string;
    value: string | number | boolean;
    photo_url?: string;
  }>;
}

export async function checklistRoutes(app: FastifyInstance) {
  // GET /checklists/templates — list checklist templates for company
  app.get(
    '/templates',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT ct.id, ct.company_id, ct.name, ct.name_zh, ct.items,
                ct.assigned_tiers, ct.is_active, ct.created_by, ct.created_at,
                e.name as creator_name
         FROM checklist_templates ct
         LEFT JOIN employees e ON e.id = ct.created_by
         WHERE ct.company_id = $1
         ORDER BY ct.created_at DESC`,
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // GET /checklists/templates/:id — single template detail
  app.get<{ Params: TemplateParams }>(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT ct.id, ct.company_id, ct.name, ct.name_zh, ct.items,
                ct.assigned_tiers, ct.is_active, ct.created_by, ct.created_at,
                e.name as creator_name
         FROM checklist_templates ct
         LEFT JOIN employees e ON e.id = ct.created_by
         WHERE ct.id = $1 AND ct.company_id = $2`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // POST /checklists/templates — create a new checklist template (manager only)
  app.post<{ Body: CreateTemplateBody }>(
    '/templates',
    async (request: FastifyRequest<{ Body: CreateTemplateBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const { name, name_zh, items, assigned_tiers } = request.body;

      if (!name || !items || !Array.isArray(items) || items.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'name and items (non-empty array) are required',
        });
      }

      if (!assigned_tiers || !Array.isArray(assigned_tiers) || assigned_tiers.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'assigned_tiers (non-empty array) is required',
        });
      }

      const result = await pool.query(
        `INSERT INTO checklist_templates (company_id, name, name_zh, items, assigned_tiers, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [companyId, name, name_zh || null, JSON.stringify(items), assigned_tiers, request.employee.id],
      );

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );

  // PUT /checklists/templates/:id — update a checklist template (manager only)
  app.put<{ Params: TemplateParams; Body: Partial<CreateTemplateBody> & { is_active?: boolean } }>(
    '/templates/:id',
    async (
      request: FastifyRequest<{ Params: TemplateParams; Body: Partial<CreateTemplateBody> & { is_active?: boolean } }>,
      reply: FastifyReply,
    ) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const { name, name_zh, items, assigned_tiers, is_active } = request.body;

      const sets: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) { sets.push(`name = $${paramIndex++}`); params.push(name); }
      if (name_zh !== undefined) { sets.push(`name_zh = $${paramIndex++}`); params.push(name_zh); }
      if (items !== undefined) { sets.push(`items = $${paramIndex++}`); params.push(JSON.stringify(items)); }
      if (assigned_tiers !== undefined) { sets.push(`assigned_tiers = $${paramIndex++}`); params.push(assigned_tiers); }
      if (is_active !== undefined) { sets.push(`is_active = $${paramIndex++}`); params.push(is_active); }

      if (sets.length === 0) {
        return reply.code(400).send({ success: false, error: 'No fields to update' });
      }

      params.push(request.params.id, companyId);

      const result = await pool.query(
        `UPDATE checklist_templates SET ${sets.join(', ')}
         WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
         RETURNING *`,
        params,
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // DELETE /checklists/templates/:id — delete a checklist template (manager only)
  app.delete<{ Params: TemplateParams }>(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const result = await pool.query(
        `DELETE FROM checklist_templates WHERE id = $1 AND company_id = $2 RETURNING id`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // GET /checklists/for-store/:tier — get applicable templates for a store tier
  app.get<{ Params: { tier: string } }>(
    '/for-store/:tier',
    async (request: FastifyRequest<{ Params: { tier: string } }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const tier = request.params.tier;

      const result = await pool.query(
        `SELECT id, name, name_zh, items, assigned_tiers
         FROM checklist_templates
         WHERE company_id = $1 AND is_active = true AND $2 = ANY(assigned_tiers)
         ORDER BY created_at DESC`,
        [companyId, tier],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // POST /checklists/results — submit a checklist result for a visit
  app.post<{ Body: SubmitChecklistBody }>(
    '/results',
    async (request: FastifyRequest<{ Body: SubmitChecklistBody }>, reply: FastifyReply) => {
      const { visit_id, template_id, results } = request.body;

      if (!visit_id || !template_id || !results || !Array.isArray(results)) {
        return reply.code(400).send({
          success: false,
          error: 'visit_id, template_id, and results are required',
        });
      }

      // Get template to calculate completion rate
      const templateResult = await pool.query(
        'SELECT items FROM checklist_templates WHERE id = $1',
        [template_id],
      );

      if (templateResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Template not found' });
      }

      const templateItems = templateResult.rows[0]!.items as Array<{ id: string; required: boolean }>;
      const requiredItems = templateItems.filter((i) => i.required);
      const completedRequired = requiredItems.filter((ri) =>
        results.some((r) => r.item_id === ri.id && r.value !== '' && r.value !== null),
      );

      const completionRate = requiredItems.length > 0
        ? Math.round((completedRequired.length / requiredItems.length) * 100)
        : 100;

      const enrichedResults = results.map((r) => ({
        ...r,
        completed_at: new Date().toISOString(),
      }));

      const result = await pool.query(
        `INSERT INTO visit_checklist_results (visit_id, template_id, results, completion_rate)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [visit_id, template_id, JSON.stringify(enrichedResults), completionRate],
      );

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );

  // GET /checklists/results/visit/:visitId — get checklist results for a visit
  app.get<{ Params: { visitId: string } }>(
    '/results/visit/:visitId',
    async (request: FastifyRequest<{ Params: { visitId: string } }>, reply: FastifyReply) => {
      const result = await pool.query(
        `SELECT vcr.id, vcr.visit_id, vcr.template_id, vcr.results, vcr.completion_rate,
                vcr.created_at, ct.name as template_name, ct.name_zh as template_name_zh
         FROM visit_checklist_results vcr
         JOIN checklist_templates ct ON ct.id = vcr.template_id
         WHERE vcr.visit_id = $1
         ORDER BY vcr.created_at DESC`,
        [request.params.visitId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );
}
