import test from 'node:test';
import assert from 'node:assert/strict';
import { PromoCodePolicy } from '../src/modules/partner-marketing/utils/promoCodePolicy.js';

test('normalize uppercases and trims promo codes', () => {
    assert.equal(PromoCodePolicy.normalize('  test229 '), 'TEST229');
});

test('findConflict detects duplicate promo codes', () => {
    const conflict = PromoCodePolicy.findConflict('jplus-abc', ['JPLUS-ABC', 'OTHER']);
    assert.deepEqual(conflict, { type: 'duplicate', code: 'JPLUS-ABC' });
});

test('findConflict detects too-similar promo codes', () => {
    const conflict = PromoCodePolicy.findConflict('PROMO12', ['PROMO13']);
    assert.deepEqual(conflict, { type: 'similar', code: 'PROMO13' });
});

test('findConflict returns null for sufficiently different promo codes', () => {
    const conflict = PromoCodePolicy.findConflict('PROMO12', ['ALPHA99', 'BETA88']);
    assert.equal(conflict, null);
});
