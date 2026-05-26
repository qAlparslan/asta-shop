/**
 * Paraşüt API v4 — Yalnızca TASLAK (estimate / proforma) satış faturası oluşturma.
 * Resmileştirme, tahsilat kaydı, e-arşiv ve GİB iletimi bu modülde YAPILMAZ
 * (gereksiz görüldü; akış sadeleştirildi).
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { requireParasutConfig, apiRequest } = require('./parasutClient');
const { resolveVatPercentForProduct } = require('./parasutVat');
const { sendMail, getMailMeta } = require('./mailer');
const baseLayout = require('./emailTemplates/baseLayout');
const T = require('./emailTemplates/emailTheme');

const DUMMY_TCKN = '11111111111';

function hasParasutCredentials() {
    const keys = [
        'PARASUT_CLIENT_ID',
        'PARASUT_CLIENT_SECRET',
        'PARASUT_USERNAME',
        'PARASUT_PASSWORD',
        'PARASUT_COMPANY_ID',
        'PARASUT_DEFAULT_PRODUCT_ID',
    ];
    return keys.every((k) => String(process.env[k] || '').trim());
}

function isParasutAutomationEnabled() {
    if (String(process.env.PARASUT_AUTO_DRAFT || 'true').toLowerCase() === 'false') {
        return false;
    }
    return hasParasutCredentials();
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function effectiveTaxDigits(order) {
    const raw = String(order.invoiceTaxNumber || '').replace(/\D/g, '');
    if (raw.length === 10 || raw.length === 11) return raw;
    return DUMMY_TCKN;
}

function effectiveInvoiceTitle(order) {
    const t = String(order.invoiceCompanyTitle || '').trim();
    if (t.length >= 2) return t.slice(0, 254);
    return String(order.fullName || 'Müşteri').slice(0, 254);
}

class ParasutSalesInvoiceService {
    async findContactIdByEmail(companyId, email) {
        const e = encodeURIComponent(String(email || '').trim().toLowerCase());
        if (!e) return null;
        const res = await apiRequest(
            'GET',
            `/${companyId}/contacts?page[size]=25&filter[email]=${e}`,
        );
        const rows = res?.data;
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return String(rows[0].id);
    }

    async findContactIdByTax(companyId, taxDigits) {
        const q = encodeURIComponent(String(taxDigits || '').replace(/\D/g, ''));
        if (q.length < 10) return null;
        const res = await apiRequest(
            'GET',
            `/${companyId}/contacts?page[size]=25&filter[tax_number]=${q}`,
        );
        const rows = res?.data;
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return String(rows[0].id);
    }

    async createContact(companyId, order) {
        const tax = effectiveTaxDigits(order);
        const attrs = {
            name: effectiveInvoiceTitle(order),
            email: order.email,
            tax_number: tax,
            contact_type: tax.length === 11 ? 'person' : 'company',
            account_type: 'customer',
            address: String(order.address || '').slice(0, 500),
        };
        if (order.phone) attrs.phone = String(order.phone).slice(0, 50);
        if (tax.length === 10) {
            attrs.tax_office = String(order.invoiceTaxOffice || 'Belirtilmedi').slice(0, 120);
        }
        const body = {
            data: {
                type: 'contacts',
                attributes: attrs,
            },
        };
        const res = await apiRequest('POST', `/${companyId}/contacts`, body);
        const id = res?.data?.id;
        if (!id) throw new Error('Paraşüt: cari (contact) oluşturulamadı.');
        return String(id);
    }

    /** Önce e-posta, sonra vergi no; yoksa oluştur. */
    async findOrCreateContactId(companyId, order) {
        const byMail = await this.findContactIdByEmail(companyId, order.email);
        if (byMail) return byMail;
        const tax = effectiveTaxDigits(order);
        const byTax = await this.findContactIdByTax(companyId, tax);
        if (byTax) return byTax;
        return this.createContact(companyId, order);
    }

    /** @returns {Promise<object[]>} sales_invoice_details JSON:API gövdeleri */
    async buildSalesInvoiceDetailRows(order, defaultProductId, priceIncludesVat) {
        const items = Array.isArray(order.items) ? order.items : [];
        const pid = String(defaultProductId);

        const uniqueIds = [...new Set(items.map((l) => l.id).filter(Boolean))];
        let productMap = new Map();
        if (uniqueIds.length > 0) {
            const rows = await Product.findAll({
                where: { id: uniqueIds },
                attributes: ['id', 'purpose', 'vatRate'],
            });
            productMap = new Map(rows.map((p) => [String(p.id), p]));
        }

        if (items.length === 0) {
            const vatRate = Number(process.env.PARASUT_DEFAULT_VAT_RATE || 20);
            const gross = Number(order.totalAmount) || 0;
            const net = priceIncludesVat ? gross / (1 + vatRate / 100) : gross;
            return [
                {
                    type: 'sales_invoice_details',
                    attributes: {
                        quantity: 1,
                        unit_price: round2(net),
                        vat_rate: vatRate,
                        description: `Sipariş toplamı (${order.id})`,
                    },
                    relationships: {
                        product: { data: { type: 'products', id: pid } },
                    },
                },
            ];
        }

        return items.map((line) => {
            const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
            const unitPrice = Number(line.price);
            const lineGross = unitPrice * qty;
            const p = productMap.get(String(line.id));
            const vatRate = resolveVatPercentForProduct(
                p || { purpose: line.purpose || 'diger', vatRate: null },
            );
            let lineNet;
            if (priceIncludesVat) {
                lineNet = lineGross / (1 + vatRate / 100);
            } else {
                lineNet = lineGross;
            }
            const unitNet = lineNet / qty;
            const name = String(line.name || line.displayName || 'Ürün').slice(0, 400);
            return {
                type: 'sales_invoice_details',
                attributes: {
                    quantity: qty,
                    unit_price: round2(unitNet),
                    vat_rate: vatRate,
                    description: name,
                },
                relationships: {
                    product: { data: { type: 'products', id: pid } },
                },
            };
        });
    }

    /**
     * Taslak satış faturası oluştur — item_type her zaman 'estimate'.
     * @param {import('../models/Order')} order
     */
    async createDraftSalesInvoice(order) {
        const productId = (process.env.PARASUT_DEFAULT_PRODUCT_ID || '').trim();
        if (!productId) {
            throw new Error(
                'PARASUT_DEFAULT_PRODUCT_ID eksik. Paraşüt panelinde bir ürün oluşturup id’sini yazın.',
            );
        }

        const cfg = requireParasutConfig();
        const companyId = cfg.companyId;
        const priceIncludesVat =
            String(process.env.PARASUT_PRICE_INCLUDES_VAT || 'true').toLowerCase() === 'true';

        const contactId = await this.findOrCreateContactId(companyId, order);
        const detailRows = await this.buildSalesInvoiceDetailRows(
            order,
            productId,
            priceIncludesVat,
        );
        const issueDate = todayStr();
        const oidShort = String(order.id || '').replace(/-/g, '').slice(0, 24);

        const siBody = {
            data: {
                type: 'sales_invoices',
                attributes: {
                    item_type: 'estimate',
                    description: `E-ticaret sipariş #${oidShort}`.slice(0, 255),
                    issue_date: issueDate,
                    due_date: issueDate,
                    currency: 'TRL',
                    order_no: oidShort,
                    order_date: issueDate,
                },
                relationships: {
                    contact: { data: { type: 'contacts', id: String(contactId) } },
                    details: { data: detailRows },
                },
            },
        };

        const siRes = await apiRequest('POST', `/${companyId}/sales_invoices`, siBody);
        const salesInvoiceId = siRes?.data?.id;
        if (!salesInvoiceId) throw new Error('Paraşüt: satış faturası yanıtı geçersiz (id yok).');

        return {
            salesInvoiceId: String(salesInvoiceId),
            itemType: 'estimate',
        };
    }
}

const singleton = new ParasutSalesInvoiceService();

/**
 * @param {import('../models/Order')} order
 */
async function createDraftSalesInvoiceForOrder(order) {
    const r = await singleton.createDraftSalesInvoice(order);
    const ref = `ps:draft:si:${r.salesInvoiceId}`;
    await order.update({
        eInvoiceIntegrationRef: ref.slice(0, 160),
        eInvoiceLastError: null,
    });
    return { ...r, integrationRef: ref };
}

/**
 * @param {import('../models/Order')} order
 * @param {Error} err
 */
async function notifyAdminsOfParasutFailure(order, err) {
    try {
        let recipients = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        if (recipients.length === 0) {
            const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['email'] });
            recipients = admins.map((a) => a.email).filter(Boolean);
        }
        if (recipients.length === 0) return;
        const msg = err?.message || String(err);
        const meta = await getMailMeta();
        const orderIdSafe = escapeHtml(String(order.id));
        const content = `
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.gold};font-family:${T.fontSans};">
      Paraşüt
    </p>
    <h2 style="${T.heading}">Taslak satış faturası oluşturulamadı</h2>
    <p style="${T.bodyText}">
      Sipariş <strong style="color:${T.navy};font-family:${T.fontMono};">${orderIdSafe}</strong> için Paraşüt'te taslak satış faturası oluştururken bir hata oluştu.
    </p>
    <div style="${T.cardNeutral}">
      <p style="margin:0;font-family:${T.fontMono};font-size:12px;line-height:1.65;color:${T.textSecondary};white-space:pre-wrap;word-break:break-word;">${escapeHtml(msg)}</p>
    </div>
    `;
        await sendMail({
            to: recipients.join(','),
            subject: `Paraşüt taslak fatura hatası — sipariş ${order.id}`,
            html: baseLayout({
                title: 'Paraşüt taslak fatura hatası',
                content,
                storeName: meta.storeName,
                logoUrl: meta.logoUrl,
            }),
            text: `Sipariş ${order.id} için Paraşüt taslak satış faturası oluşturulamadı.\n\n${msg}`,
            type: 'generic',
        });
    } catch (mailErr) {
        console.error('Paraşüt yönetici bildirimi gönderilemedi:', mailErr?.message || mailErr);
    }
}

/**
 * Ödeme sonrası — sadece taslak oluşturma akışını sıraya alır (bloklamaz).
 */
function dispatchParasutDraftAfterPayment(orderId) {
    const id = String(orderId || '');
    if (!id || !isParasutAutomationEnabled()) return;
    let invoiceService;
    try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        invoiceService = require('./invoiceService');
    } catch (e) {
        console.error('[parasut] invoiceService yüklenemedi:', e?.message || e);
        return;
    }
    if (typeof invoiceService.enqueuePostPaymentInvoicing === 'function') {
        invoiceService.enqueuePostPaymentInvoicing(id);
    }
}

module.exports = {
    ParasutSalesInvoiceService,
    singleton,
    createDraftSalesInvoiceForOrder,
    dispatchParasutDraftAfterPayment,
    isParasutAutomationEnabled,
    hasParasutCredentials,
    notifyAdminsOfParasutFailure,
};
