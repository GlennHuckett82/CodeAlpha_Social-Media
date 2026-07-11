'use strict';

const request = require('supertest');
const app = require('../server');

async function registerAndLogin(overrides = {}) {
  const userData = {
    username: 'helperuser',
    email: 'helper@example.com',
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(userData);
  return { token: res.body.token, user: res.body.user };
}

module.exports = { registerAndLogin };
