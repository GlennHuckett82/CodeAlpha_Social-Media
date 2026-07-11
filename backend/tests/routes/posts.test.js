'use strict';

const request = require('supertest');
const app = require('../../server');
const { registerAndLogin } = require('../testHelpers');

const NONEXISTENT_ID = '507f1f77bcf86cd799439011';

describe('GET /api/posts', () => {
  it('200 with empty array on fresh DB', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/posts/:id (not found)', () => {
  it('404 on non-existent id', async () => {
    const res = await request(app).get(`/api/posts/${NONEXISTENT_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/posts', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
  });

  it('401 without token', async () => {
    const res = await request(app).post('/api/posts').send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('201 with valid token and content', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello Alpha Chat!' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Hello Alpha Chat!');
  });

  it('422 if content missing', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 if content > 500 chars', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'a'.repeat(501) });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/posts/:id (existing post)', () => {
  let token;
  let postId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test post content' });
    postId = res.body.data._id;
  });

  it('200 with post data and author populated', async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(postId);
    expect(res.body.data.author).toHaveProperty('username');
  });
});

describe('DELETE /api/posts/:id', () => {
  let token;
  let otherToken;
  let postId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    ({ token: otherToken } = await registerAndLogin({
      username: 'other_user',
      email: 'other@example.com',
    }));
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post to delete' });
    postId = res.body.data._id;
  });

  it('401 without token', async () => {
    const res = await request(app).delete(`/api/posts/${postId}`);
    expect(res.status).toBe(401);
  });

  it('403 with different user token', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('200 with owner token', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Post deleted');
  });
});

describe('POST /api/posts/:id/comments', () => {
  let token;
  let postId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post for comments' });
    postId = res.body.data._id;
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('201 adds comment to post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Great post!' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comments).toHaveLength(1);
    expect(res.body.data.comments[0].content).toBe('Great post!');
  });

  it('422 if content missing', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/posts/:id/comments/:commentId', () => {
  let token;
  let otherToken;
  let postId;
  let commentId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    ({ token: otherToken } = await registerAndLogin({
      username: 'other_user',
      email: 'other@example.com',
    }));
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post with comment' });
    postId = postRes.body.data._id;
    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Comment to delete' });
    commentId = commentRes.body.data.comments[0]._id;
  });

  it('403 with different user', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('200 with comment author', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Comment deleted');
  });
});

describe('GET /api/posts/:id (comment author populated)', () => {
  let token;
  let postId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post with comment' });
    postId = postRes.body.data._id;
    await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'A comment' });
  });

  it('comments.author is populated with username and avatarUrl', async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments[0].author).toHaveProperty('username');
    expect(res.body.data.comments[0].author).toHaveProperty('avatarUrl');
  });
});

describe('POST /api/posts/:id/like', () => {
  let token;
  let postId;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post to like' });
    postId = res.body.data._id;
  });

  it('401 without token', async () => {
    const res = await request(app).post(`/api/posts/${postId}/like`);
    expect(res.status).toBe(401);
  });

  it('200 liked:true on first call', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.liked).toBe(true);
    expect(res.body.likeCount).toBe(1);
  });

  it('200 liked:false on second call (toggle)', async () => {
    await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
    expect(res.body.likeCount).toBe(0);
  });

  it('likeCount reflects changes correctly', async () => {
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(likeRes.body.likeCount).toBe(1);
    const unlikeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(unlikeRes.body.likeCount).toBe(0);
  });
});
