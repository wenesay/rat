const { expect } = require('chai');
const request = require('supertest');
const app = require('./server');

describe('RAT Analytics Server', () => {
  let server;

  before((done) => {
    server = app.listen(3001, done);
  });

  after((done) => {
    server.close(done);
  });

  describe('Public Endpoints', () => {
    it('should serve analytics snippet', (done) => {
      request(app)
        .get('/snippet/analytics.js')
        .expect(200)
        .expect('Content-Type', /javascript/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text).to.include('ratAnalytics');
          done();
        });
    });

    it('should serve login page', (done) => {
      request(app)
        .get('/login.html')
        .expect(200)
        .expect('Content-Type', /html/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text).to.include('Login');
          done();
        });
    });

    it('should serve register page', (done) => {
      request(app)
        .get('/register.html')
        .expect(200)
        .expect('Content-Type', /html/)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.text).to.include('Create Account');
          done();
        });
    });

    it('should handle analytics tracking', (done) => {
      request(app)
        .post('/track')
        .send({
          projectId: 'test-project',
          data: {
            url: 'https://example.com/test',
            timestamp: new Date().toISOString()
          }
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('success', true);
          done();
        });
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when accessing dashboard without auth', (done) => {
      request(app)
        .get('/')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.headers.location).to.include('login.html');
          done();
        });
    });
  });
});