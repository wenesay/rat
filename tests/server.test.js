/**
 * RAT Analytics Server Tests
 * Run with: npm test
 */
const request = require('supertest');

describe('RAT Analytics Server', () => {
  let app;

  beforeAll(async () => {
    app = require('../server');
    await app.ready;
  });

  describe('Health', () => {
    it('GET /health returns 200 and status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Analytics Snippet', () => {
    it('GET /snippet/analytics.js returns JavaScript', async () => {
      const res = await request(app).get('/snippet/analytics.js');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
      expect(res.text).toContain('ratAnalytics');
      expect(res.text).toContain('doNotTrack');
      expect(res.text).toContain('ratTrack');
      expect(res.text).toContain('keepalive');
      expect(res.text).toContain('data-rat-track');
    });
  });

  describe('Analytics Tracking', () => {
    it('POST /track accepts valid data', async () => {
      const res = await request(app).post('/track').send({
        projectId: 1,
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        userAgent: 'Test Agent',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /track rejects missing projectId', async () => {
      const res = await request(app).post('/track').send({ url: 'https://example.com/page' });
      expect(res.status).toBe(400);
    });

    it('POST /track rejects missing url', async () => {
      const res = await request(app).post('/track').send({ projectId: 1 });
      expect(res.status).toBe(400);
    });

    it('POST /track rejects invalid projectId', async () => {
      const res = await request(app).post('/track').send({
        projectId: 99999,
        url: 'https://example.com/page',
      });
      expect(res.status).toBe(404);
    });

    it('POST /track accepts X-API-Key header', async () => {
      const res = await request(app)
        .post('/track')
        .set('X-API-Key', 'test-api-key-12345')
        .send({ url: 'https://example.com/page' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /track accepts sessionId, event, eventTarget, eventData', async () => {
      const res = await request(app)
        .post('/track')
        .send({
          projectId: 1,
          url: 'https://example.com/app',
          referrer: 'https://google.com',
          userAgent: 'Jest',
          sessionId: 'a1b2c3d4e5f6789012345678abcdef12',
          event: 'purchase',
          eventTarget: 'checkout',
          eventData: JSON.stringify({ amount: 10 }),
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /track ignores invalid sessionId', async () => {
      const res = await request(app).post('/track').send({
        projectId: 1,
        url: 'https://example.com/nosession',
        sessionId: 'not-valid-hex',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('POST /login rejects empty credentials', async () => {
      const res = await request(app).post('/login').send({});
      expect(res.status).toBe(400);
    });

    it('POST /login rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({ username: 'baduser', password: 'badpass' });
      expect(res.status).toBe(401);
    });

    it('POST /login accepts valid test credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({ username: 'testadmin', password: 'Test1234!' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/user returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/user');
      expect(res.status).toBe(401);
    });
  });
});
