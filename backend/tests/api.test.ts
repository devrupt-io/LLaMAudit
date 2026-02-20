import request from 'supertest';
import { app } from '../src/index';

describe('Health & Root', () => {
  it('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('LLaMa Audit API');
    expect(res.body.version).toBeDefined();
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Analysis Routes', () => {
  it('POST /api/analysis requires text', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text/i);
  });

  it('POST /api/analysis rejects empty text', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .send({ text: '   ' });
    expect(res.status).toBe(400);
  });

  it('POST /api/analysis returns 202 with job id', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .send({ text: 'Test text for analysis.' });
    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
  });

  it('GET /api/analysis returns array', async () => {
    const res = await request(app).get('/api/analysis');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/analysis/:id returns 404 for missing', async () => {
    const res = await request(app).get('/api/analysis/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('GET /api/analysis/:id returns status for existing', async () => {
    const postRes = await request(app)
      .post('/api/analysis')
      .send({ text: 'Another test.' });
    const { id } = postRes.body;
    const res = await request(app).get(`/api/analysis/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(['pending', 'processing', 'completed', 'failed']).toContain(res.body.status);
  });
});

describe('Settings Routes', () => {
  it('GET /api/settings returns object', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });

  it('PUT /api/settings requires key', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ value: 'test' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/settings rejects invalid keys', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ key: 'invalid_key', value: 'test' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/settings accepts valid provider key', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ key: 'provider', value: 'openrouter' });
    expect(res.status).toBe(200);
  });

  it('POST /api/settings/test-connection works', async () => {
    const res = await request(app)
      .post('/api/settings/test-connection')
      .send({ provider: 'openrouter' });
    expect(res.status).toBe(200);
    expect(typeof res.body.success).toBe('boolean');
  });

  it('GET /api/settings/models returns array', async () => {
    const res = await request(app).get('/api/settings/models');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
