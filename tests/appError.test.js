import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError, badRequest, unauthorized } from '../src/utils/appError.js';

test('AppError preserves status code and error code', () => {
    const error = new AppError('boom', { statusCode: 422, code: 'VALIDATION_FAILED', details: { field: 'email' } });
    assert.equal(error.message, 'boom');
    assert.equal(error.statusCode, 422);
    assert.equal(error.code, 'VALIDATION_FAILED');
    assert.deepEqual(error.details, { field: 'email' });
});

test('badRequest creates a 400 application error', () => {
    const error = badRequest('invalid');
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, 'BAD_REQUEST');
});

test('unauthorized creates a 401 application error', () => {
    const error = unauthorized('nope');
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, 'UNAUTHORIZED_INVALID_CREDENTIALS');
});
