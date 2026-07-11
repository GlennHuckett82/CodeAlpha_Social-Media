'use strict';

const request = require('supertest');
const app = require('../../server');

const validUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

describe('POST /api/auth/register', () => {
  it('201 + token + user on valid data', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(validUser.username);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('422 if username missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@example.com', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 if email invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 if password < 6 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', email: 'b@example.com', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('409 if email already registered', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, username: 'otherusr' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('409 if username already taken', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'other@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('200 + token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('401 if email not found', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 if password wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('422 if email missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 if password missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
