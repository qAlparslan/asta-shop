/**
 * DB olmadan çalışır; CI kritik kablolar (health + yasal sürüm uçları).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-test-jwt-secret-min-length-32-chars';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { buildApp } = require('../expressApp');

describe('API smoke', () => {
    test('GET /api/health', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ok');
        assert.ok(typeof res.body.uptime === 'number');
    });

    test('GET /api/legal/versions', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/legal/versions');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'success');
        assert.ok(res.body.data?.privacyVersion);
    });

    test('GET /api/orders/me — token yok 401', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/orders/me');
        assert.equal(res.status, 401);
    });

    test('GET /api/admin/product-reviews — token yok 401', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/admin/product-reviews');
        assert.equal(res.status, 401);
    });
});
