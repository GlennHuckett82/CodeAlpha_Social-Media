'use strict';

const request = require('supertest');
const app = require('../../server');
const { registerAndLogin } = require('../testHelpers');

describe('GET /api/users/:username', () => {
  let user;

  beforeEach(async () => {
    ({ user } = await registerAndLogin());
  });

  it('200 with public profile fields', async () => {
    const res = await request(app).get(`/api/users/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(user.username);
    expect(res.body.data).toHaveProperty('followerCount');
    expect(res.body.data).toHaveProperty('followingCount');
    expect(res.body.data).toHaveProperty('postCount');
  });

  it('404 for unknown username', async () => {
    const res = await request(app).get('/api/users/nobody_xyz_404');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('never returns password or email', async () => {
    const res = await request(app).get(`/api/users/${user.username}`);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.email).toBeUndefined();
  });
});

describe('GET /api/users/:username/posts', () => {
  let token;
  let user;

  beforeEach(async () => {
    ({ token, user } = await registerAndLogin());
    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'User post' });
  });

  it('200 array of posts by user', async () => {
    const res = await request(app).get(`/api/users/${user.username}/posts`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PATCH /api/users/me', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
  });

  it('401 without token', async () => {
    const res = await request(app).patch('/api/users/me').send({ bio: 'New bio' });
    expect(res.status).toBe(401);
  });

  it('200 updates bio and displayName', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'My new bio', displayName: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bio).toBe('My new bio');
    expect(res.body.data.displayName).toBe('New Name');
  });

  it('422 if bio > 160 chars', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'a'.repeat(161) });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/users/:username/follow', () => {
  let token;
  let user;
  let otherUser;

  beforeEach(async () => {
    ({ token, user } = await registerAndLogin());
    ({ user: otherUser } = await registerAndLogin({
      username: 'other_user',
      email: 'other@example.com',
    }));
  });

  it('401 without token', async () => {
    const res = await request(app).post(`/api/users/${otherUser.username}/follow`);
    expect(res.status).toBe(401);
  });

  it('400 if following self', async () => {
    const res = await request(app)
      .post(`/api/users/${user.username}/follow`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('200 following:true on first call', async () => {
    const res = await request(app)
      .post(`/api/users/${otherUser.username}/follow`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.following).toBe(true);
    expect(res.body.followerCount).toBe(1);
  });

  it('200 following:false on second call (toggle)', async () => {
    await request(app)
      .post(`/api/users/${otherUser.username}/follow`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/users/${otherUser.username}/follow`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
    expect(res.body.followerCount).toBe(0);
  });
});

describe('GET /api/users/:username/followers', () => {
  let user;
  let otherToken;
  let otherUser;

  beforeEach(async () => {
    ({ user } = await registerAndLogin());
    ({ token: otherToken, user: otherUser } = await registerAndLogin({
      username: 'other_user',
      email: 'other@example.com',
    }));
  });

  it('200 array updates after follow', async () => {
    await request(app)
      .post(`/api/users/${user.username}/follow`)
      .set('Authorization', `Bearer ${otherToken}`);
    const res = await request(app).get(`/api/users/${user.username}/followers`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].username).toBe(otherUser.username);
  });
});

describe('GET /api/users/:username/following', () => {
  let token;
  let user;
  let otherUser;

  beforeEach(async () => {
    ({ token, user } = await registerAndLogin());
    ({ user: otherUser } = await registerAndLogin({
      username: 'other_user',
      email: 'other@example.com',
    }));
  });

  it('200 array updates after follow', async () => {
    const followRes = await request(app)
      .post(`/api/users/${otherUser.username}/follow`)
      .set('Authorization', `Bearer ${token}`);
    expect(followRes.body.following).toBe(true);
    const res = await request(app).get(`/api/users/${user.username}/following`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].username).toBe(otherUser.username);
  });
});
