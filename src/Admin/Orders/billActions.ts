import { fs, open } from 'react-native-blob-util';
import { generatePDF } from 'react-native-html-to-pdf';
import api from '../../api';
import { mediaUrl } from '../Products/inventory';

type BillReceiptCustomer = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

type BillReceiptProduct = {
  product_name: string;
  category?: string;
  purity?: string;
  quantity: number;
  price: number | string;
  total_price?: number | string;
};

type BillReceiptExchange = {
  product_name: string;
  category: string;
  metal_type: string;
  purity: string;
  weight: string | number;
  wastage_weight: string | number;
  rate_per_unit: string | number;
};

type BillReceipt = {
  id: number | string;
  invoice_no: string;
  customers: BillReceiptCustomer[];
  products: BillReceiptProduct[];
  exchanges: BillReceiptExchange[];
  payment_type: string;
  sub_total: number | string;
  discount_amount: number | string;
  gst_amount: number | string;
  gst_rate: number | string;
  tax_mode: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance_due: number | string;
  created_at?: string;
};

type ReceiptSettings = {
  shopName: string;
  logoUrl: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  footerMessage: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&#39;',
    '"': '&quot;',
  };
  return String(value ?? '').replace(/[<>&'"]/g, character => entities[character]);
}

function currency(value: number | string | null | undefined): string {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value?: string): string {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function readReceiptSettings(value: unknown): ReceiptSettings {
  if (
    !isRecord(value) ||
    !['shopName', 'logoUrl', 'address', 'gstNumber', 'phone', 'email', 'footerMessage']
      .every(key => typeof value[key] === 'string')
  ) {
    throw new Error('Receipt settings are missing or invalid. Check Receipt Settings and try again.');
  }
  return value as ReceiptSettings;
}

function receiptHtml(bill: BillReceipt, settings: ReceiptSettings): string {
  const customer = bill.customers[0];
  const logo = settings.logoUrl ? mediaUrl(settings.logoUrl) : undefined;
  const productRows = bill.products.map(item => {
    const total = Number(item.total_price) || Number(item.price) * item.quantity;
    return `
      <tr>
        <td>${escapeHtml(item.product_name)}<small>${escapeHtml([item.category, item.purity].filter(Boolean).join(' · '))}</small></td>
        <td class="number">${item.quantity}</td>
        <td class="number">${currency(item.price)}</td>
        <td class="number">${currency(total)}</td>
      </tr>`;
  }).join('');
  const exchangeRows = bill.exchanges.map(item => {
    const netWeight = Math.max(0, Number(item.weight) - Number(item.wastage_weight || 0));
    const credit = netWeight * Number(item.rate_per_unit || 0);
    return `
      <tr>
        <td>${escapeHtml(item.product_name)}<small>${escapeHtml([item.category, item.metal_type, item.purity].filter(Boolean).join(' · '))}</small></td>
        <td class="number">${escapeHtml(item.weight)} g</td>
        <td class="number">${currency(item.rate_per_unit)} / g</td>
        <td class="number">−${currency(credit)}</td>
      </tr>`;
  }).join('');
  const contactDetails = [settings.phone, settings.email].filter(Boolean).join(' · ');
  const customerAddress = customer?.address || '';
  const customerContact = [customer?.phone, customer?.email].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 18px; color: #173F35; font-family: Arial, sans-serif; font-size: 12px; }
          .receipt { max-width: 760px; margin: 0 auto; }
          header { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 16px; border-bottom: 2px solid #07564B; }
          .brand { display: flex; align-items: flex-start; gap: 12px; }
          .logo { width: 58px; height: 58px; object-fit: contain; }
          h1 { margin: 0 0 5px; font-size: 20px; }
          h2 { margin: 0 0 5px; font-size: 18px; text-align: right; }
          p { margin: 3px 0; color: #52645F; }
          .invoice-meta { text-align: right; }
          .customer { margin: 18px 0; padding: 12px; border: 1px solid #DDE6E0; border-radius: 8px; }
          .customer strong { display: block; margin-bottom: 5px; }
          h3 { margin: 20px 0 8px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 9px 7px; border-bottom: 1px solid #E6E9E3; text-align: left; vertical-align: top; }
          th { background: #EAF3EF; color: #173F35; font-size: 10px; text-transform: uppercase; }
          .number { text-align: right; white-space: nowrap; }
          small { display: block; margin-top: 3px; color: #6B7E76; font-size: 10px; }
          .totals { width: 320px; max-width: 100%; margin: 16px 0 0 auto; }
          .totals td { padding: 6px; border: 0; }
          .grand-total td { padding-top: 10px; border-top: 2px solid #07564B; color: #07564B; font-size: 15px; font-weight: bold; }
          .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #DDE6E0; text-align: center; }
          @page { size: A4 portrait; margin: 12mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <article class="receipt">
          <header>
            <div class="brand">
              ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="" />` : ''}
              <div>
                <h1>${escapeHtml(settings.shopName)}</h1>
                <p>${escapeHtml(settings.address)}</p>
                ${contactDetails ? `<p>${escapeHtml(contactDetails)}</p>` : ''}
                ${settings.gstNumber ? `<p>GSTIN: ${escapeHtml(settings.gstNumber)}</p>` : ''}
              </div>
            </div>
            <div class="invoice-meta">
              <h2>Tax Invoice</h2>
              <p><strong>${escapeHtml(bill.invoice_no)}</strong></p>
              <p>Date: ${escapeHtml(date(bill.created_at))}</p>
              <p>${bill.payment_type === 'EXCHANGE_GOLD' ? 'Exchange Gold' : 'Full Payment'}</p>
            </div>
          </header>
          <section class="customer">
            <strong>Bill to: ${escapeHtml(customer?.name || 'Customer')}</strong>
            ${customerContact ? `<p>${escapeHtml(customerContact)}</p>` : ''}
            ${customerAddress ? `<p>${escapeHtml(customerAddress)}</p>` : ''}
          </section>
          <h3>Products</h3>
          <table>
            <thead><tr><th>Product</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
            <tbody>${productRows}</tbody>
          </table>
          ${exchangeRows ? `
            <h3>Exchange items</h3>
            <table>
              <thead><tr><th>Item</th><th class="number">Weight</th><th class="number">Rate</th><th class="number">Credit</th></tr></thead>
              <tbody>${exchangeRows}</tbody>
            </table>` : ''}
          <table class="totals">
            <tbody>
              <tr><td>Subtotal</td><td class="number">${currency(bill.sub_total)}</td></tr>
              <tr><td>Discount</td><td class="number">−${currency(bill.discount_amount)}</td></tr>
              ${bill.exchanges.length ? `<tr><td>Exchange credit</td><td class="number">−${currency(bill.exchanges.reduce((total, item) => total + Math.max(0, Number(item.weight) - Number(item.wastage_weight || 0)) * Number(item.rate_per_unit || 0), 0))}</td></tr>` : ''}
              <tr><td>GST (${escapeHtml(bill.gst_rate)}%) · ${escapeHtml(bill.tax_mode)}</td><td class="number">${currency(bill.gst_amount)}</td></tr>
              <tr class="grand-total"><td>Total</td><td class="number">${currency(bill.total_amount)}</td></tr>
              <tr><td>Paid</td><td class="number">${currency(bill.paid_amount)}</td></tr>
              <tr><td>Balance due</td><td class="number">${currency(bill.balance_due)}</td></tr>
            </tbody>
          </table>
          <p class="footer">${escapeHtml(settings.footerMessage)}</p>
        </article>
      </body>
    </html>`;
}

export async function printBillReceipt(bill: BillReceipt): Promise<string> {
  const settingsResponse = await api.get<unknown>('/receipt-settings');
  const settings = readReceiptSettings(settingsResponse.data);
  const fileName = `bill-${String(bill.invoice_no).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const pdf = await generatePDF({
    html: receiptHtml(bill, settings),
    fileName,
    directory: 'Documents',
    shouldPrintBackgrounds: true,
  });
  if (!pdf.filePath || !(await fs.exists(pdf.filePath))) {
    throw new Error('The bill PDF could not be generated.');
  }
  await open.chooser(pdf.filePath, {
    mime: 'application/pdf',
    title: 'Print bill PDF',
  });
  return pdf.filePath;
}
