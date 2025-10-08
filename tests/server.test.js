import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Configure environment for testing before importing app
process.env.ALLOW_COUNTRY_OVERRIDE = 'true';
const testDataFile = path.join('data', 'test-aggregates.json');
process.env.DATA_FILE = testDataFile;
process.env.ALLOWED_ORIGINS = '*';
process.env.SESSION_TTL_MINUTES = '1';

import { app } from '../src/app.js';

afterAll(() => {
  try { fs.unlinkSync(testDataFile); } catch (_) {}
});

describe('privacy-first endpoints', () => {
  test('collect view aggregates by country without IP leakage', async () => {
    const res1 = await request(app)
      .post('/collect')
      .set('X-Country-Override', 'US')
      .send({ type: 'view', page: '/post/1', vp: { w: 100, h: 100 } });
    expect(res1.status).toBe(204);

    const res2 = await request(app)
      .get('/stats');
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('periods.day.views.US');
    expect(res2.body.periods.day.views.US).toBeGreaterThanOrEqual(1);

    // Ensure persisted file does not contain any IP-like patterns
    const raw = fs.readFileSync(testDataFile, 'utf8');
    expect(/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(raw)).toBe(false);
  });

  test('collect ask counts separately', async () => {
    const res1 = await request(app)
      .post('/collect')
      .set('X-Country-Override', 'MX')
      .send({ type: 'ask', page: '/ask', vp: { w: 100, h: 100 } });
    expect(res1.status).toBe(204);

    const res2 = await request(app).get('/stats');
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('periods.day.asks.MX');
    expect(res2.body.periods.day.asks.MX).toBeGreaterThanOrEqual(1);
  });
});

