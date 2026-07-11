'use strict';

const { notFoundHandler, generalErrorHandler } = require('../middleware/errorHandler');

describe('notFoundHandler', () => {
  it('returns 404 with method and path in message', () => {
    const req = { method: 'GET', originalUrl: '/missing' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Cannot GET /missing' });
  });
});

describe('generalErrorHandler', () => {
  it('uses err.status when set', () => {
    const req = { method: 'POST', originalUrl: '/api/test' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const err = { status: 400, message: 'Bad request', stack: '' };
    generalErrorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Bad request' });
  });

  it('returns 500 for unhandled errors in non-production', () => {
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    generalErrorHandler(new Error('Broke'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Broke' });
  });

  it('masks 500 error message in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    generalErrorHandler(new Error('Sensitive'), req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    process.env.NODE_ENV = original;
  });
});
