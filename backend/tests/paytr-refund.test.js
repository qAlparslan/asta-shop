const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
    computePaytrRefundToken,
    formatPaytrReturnAmount,
    sanitizePaytrReferenceNo,
} = require('../services/paytrRefundApi');

describe('PayTR refund helpers', () => {
    test('formatPaytrReturnAmount uses dot decimal', () => {
        assert.equal(formatPaytrReturnAmount(10), '10.00');
        assert.equal(formatPaytrReturnAmount(10.2), '10.20');
        assert.equal(formatPaytrReturnAmount('3449.5'), '3449.50');
    });

    test('sanitizePaytrReferenceNo strips non-alphanumeric', () => {
        assert.equal(sanitizePaytrReferenceNo('cncl-76f8-dc6f'), 'cncl76f8dc6f');
        assert.equal(sanitizePaytrReferenceNo('', 'abc123'), 'abc123');
    });

    test('computePaytrRefundToken matches HMAC recipe', () => {
        const cred = { merchantId: '1', merchantKey: 'key', merchantSalt: 'salt' };
        const merchant_oid = 'abc123';
        const return_amount = '99.90';
        const hashStr = `1${merchant_oid}${return_amount}salt`;
        const expected = crypto.createHmac('sha256', 'key').update(hashStr).digest('base64');
        assert.equal(
            computePaytrRefundToken(cred, { merchant_oid, return_amount }),
            expected,
        );
    });
});
