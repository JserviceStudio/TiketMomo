import test from 'node:test';
import assert from 'node:assert/strict';
import { LicenseActivationService } from '../src/modules/license-saas/services/licenseActivationService.js';

test('generateEnterpriseKey returns expected license format', () => {
    const key = LicenseActivationService.generateEnterpriseKey('PRO');
    assert.match(key, /^TKMO-PRO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
});

test('generateEnterpriseKey uses VTE prefix for VENTE plan', () => {
    const key = LicenseActivationService.generateEnterpriseKey('VENTE');
    assert.match(key, /^TKMO-VTE-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
});

test('getFeaturesForPlan returns correct features for VIP plan', () => {
    assert.deepEqual(LicenseActivationService.getFeaturesForPlan('VIP'), {
        isPro: true,
        hasVpn: true,
        hasWebStore: true,
        isVip: true
    });
});

test('getFeaturesForPlan returns safe defaults for unknown plan', () => {
    assert.deepEqual(LicenseActivationService.getFeaturesForPlan('UNKNOWN'), {
        isPro: false,
        hasVpn: false,
        hasWebStore: false,
        isVip: false
    });
});
