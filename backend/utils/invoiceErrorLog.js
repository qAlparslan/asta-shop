const fs = require('fs/promises');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'invoice_errors.log');

/**
 * Paraşüt / fatura pipeline hatalarını dosyaya yazar (ISO satır + JSON).
 * @param {{ stage?: string, orderId?: string, message: string, detail?: string }} entry
 */
async function appendInvoiceError(entry) {
    const line = {
        time: new Date().toISOString(),
        stage: entry.stage || 'unknown',
        orderId: entry.orderId || null,
        message: String(entry.message || ''),
        detail: entry.detail ? String(entry.detail).slice(0, 8000) : undefined,
    };
    const text = `${line.time}\t${JSON.stringify(line)}\n`;
    try {
        await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
        await fs.appendFile(LOG_FILE, text, 'utf8');
    } catch (e) {
        console.error('[invoiceErrorLog] yazılamadı:', e?.message || e, line);
    }
}

module.exports = { appendInvoiceError, LOG_FILE };
