import { Hono } from 'hono';
import {
  createCronJob,
  deleteCronJob,
  listCronJobs,
  getCronJob,
  toggleCronJob,
} from '../core/cron-scheduler';

const cron = new Hono();

// POST /cron — Create cron job
cron.post('/', async (c) => {
  const body = await c.req.json<{
    squadId: string;
    agentId: string;
    schedule: string;
    input?: Record<string, unknown>;
    description?: string;
  }>();

  if (!body.squadId || !body.agentId || !body.schedule) {
    return c.json({ error: 'squadId, agentId, and schedule required' }, 400);
  }

  try {
    const def = createCronJob({
      squadId: body.squadId,
      agentId: body.agentId,
      schedule: body.schedule,
      inputPayload: body.input,
      description: body.description,
    });

    return c.json({
      id: def.id,
      schedule: def.schedule,
      squad_id: def.squad_id,
      agent_id: def.agent_id,
      next_run_at: def.next_run_at,
      status: 'active',
    }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

// GET /cron — List all cron jobs
cron.get('/', (c) => {
  const defs = listCronJobs();
  return c.json({
    crons: defs.map(d => ({
      id: d.id,
      squad_id: d.squad_id,
      agent_id: d.agent_id,
      schedule: d.schedule,
      enabled: !!d.enabled,
      description: d.description,
      last_run_at: d.last_run_at,
      last_job_id: d.last_job_id,
      next_run_at: d.next_run_at,
      created_at: d.created_at,
    })),
  });
});

// GET /cron/:id — Get single cron job
cron.get('/:id', (c) => {
  const def = getCronJob(c.req.param('id'));
  if (!def) return c.json({ error: 'Cron job not found' }, 404);
  return c.json(def);
});

// DELETE /cron/:id — Delete cron job
cron.delete('/:id', (c) => {
  const id = c.req.param('id');
  const def = getCronJob(id);
  if (!def) return c.json({ error: 'Cron job not found' }, 404);

  deleteCronJob(id);
  return c.json({ id, status: 'deleted' });
});

// PATCH /cron/:id/toggle — Enable/disable cron
cron.patch('/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ enabled: boolean }>();
  const def = getCronJob(id);
  if (!def) return c.json({ error: 'Cron job not found' }, 404);

  toggleCronJob(id, body.enabled);
  return c.json({ id, enabled: body.enabled });
});

export { cron };
