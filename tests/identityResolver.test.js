import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET ??= 'test-secret';

const { IdentityResolver } = await import('../src/modules/identity-access/services/identityResolver.js');

test('IdentityResolver resolves client_session cookies into canonical client identity', async () => {
    const token = jwt.sign(
        {
            manager_id: 'client_123',
            email: 'client@example.com',
            role: 'client'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const identity = await IdentityResolver.resolveRequestIdentity({
        cookies: {
            client_session: token
        },
        headers: {}
    });

    assert.deepEqual(identity, {
        client_id: 'client_123',
        manager_id: 'client_123',
        email: 'client@example.com',
        role: 'client',
        method: 'client_session',
        provider: 'internal_client_session',
        provider_user_id: undefined
    });
});

test('IdentityResolver resolves legacy manager_session cookies into the same canonical client identity', async () => {
    const token = jwt.sign(
        {
            manager_id: 'client_legacy',
            email: 'legacy@example.com',
            role: 'manager'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const identity = await IdentityResolver.resolveRequestIdentity({
        cookies: {
            manager_session: token
        },
        headers: {}
    });

    assert.equal(identity.client_id, 'client_legacy');
    assert.equal(identity.manager_id, 'client_legacy');
    assert.equal(identity.role, 'client');
    assert.equal(identity.method, 'client_session');
});
