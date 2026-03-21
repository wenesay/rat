const request = require('supertest');
const app = require('../server');

describe('Analytics Server', () => {
  it('should respond to GET /snippet/analytics.js', async () => {
    const response = await request(app).get('/snippet/analytics.js');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
  });

  it('should accept POST /track with valid data', async () => {
    const response = await request(app)
      .post('/track')
      .send({
        projectId: 1,
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        userAgent: 'Test Agent'
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject POST /track without projectId', async () => {
    const response = await request(app)
      .post('/track')
      .send({
        url: 'https://example.com/page'
      });
    expect(response.status).toBe(400);
  });

  it('should reject POST /track without URL', async () => {
    const response = await request(app)
      .post('/track')
      .send({
        projectId: 1
      });
    expect(response.status).toBe(400);
  });

  // Note: Authentication tests would require session setup, which is complex for unit tests
  // Integration tests with a test database would be better for full coverage
});