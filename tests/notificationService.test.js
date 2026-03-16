import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseAdmin } from '../src/config/supabase.js';
import { NotificationService } from '../src/services/notificationService.js';

test('NotificationService.sendPushToClient writes notifications using legacy manager_id storage', async () => {
    const calls = [];
    const originalFrom = supabaseAdmin.from;

    supabaseAdmin.from = (table) => ({
        insert: async (payload) => {
            calls.push({ table, payload });
            return { error: null };
        }
    });

    try {
        const result = await NotificationService.sendPushToClient(
            'client_42',
            'Titre',
            'Message',
            { type: 'SYSTEM_TEST' }
        );

        assert.equal(result, true);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].table, 'notifications');
        assert.equal(calls[0].payload[0].manager_id, 'client_42');
        assert.equal(calls[0].payload[0].type, 'SYSTEM_TEST');
    } finally {
        supabaseAdmin.from = originalFrom;
    }
});

test('NotificationService.sendPushToManager remains an alias of sendPushToClient', async () => {
    assert.equal(NotificationService.sendPushToManager, NotificationService.sendPushToClient);
});
