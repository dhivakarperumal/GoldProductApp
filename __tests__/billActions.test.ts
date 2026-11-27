const mockGet = jest.fn();
const mockGeneratePDF = jest.fn();
const mockExists = jest.fn();
const mockChooser = jest.fn();

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: (...args: unknown[]) => mockGeneratePDF(...args),
}));

jest.mock('react-native-blob-util', () => ({
  fs: { exists: (...args: unknown[]) => mockExists(...args) },
  open: { chooser: (...args: unknown[]) => mockChooser(...args) },
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { printBillReceipt } from '../src/Admin/Orders/billActions';

const bill = {
  id: 8,
  invoice_no: 'INV-008',
  customers: [{
    name: 'A & B Jewellers',
    phone: '9876543210',
    email: '',
    address: 'Main Street',
  }],
  products: [{
    product_name: 'Gold Necklace',
    category: 'Necklace',
    purity: '22K / 916',
    quantity: 2,
    price: 25000,
    total_price: 50000,
  }],
  exchanges: [{
    product_name: 'Gold exchange item',
    category: 'Gold Jewellery',
    metal_type: 'Gold',
    purity: '916',
    weight: 5,
    wastage_weight: 0.5,
    rate_per_unit: 9000,
  }],
  payment_type: 'EXCHANGE_GOLD',
  sub_total: 50000,
  discount_amount: 1000,
  gst_amount: 765,
  gst_rate: 9,
  tax_mode: 'Tax Exclusive',
  total_amount: 9265,
  paid_amount: 1000,
  balance_due: 8265,
  created_at: '2026-11-27T09:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    data: {
      shopName: 'Sri Golds',
      logoUrl: 'https://images.example.test/logo.png',
      address: 'Tirupattur',
      gstNumber: 'GST-123',
      phone: '04179-12345',
      email: 'shop@example.test',
      footerMessage: 'Thank you for shopping with us.',
    },
  });
  mockGeneratePDF.mockResolvedValue({ filePath: '/documents/bill-INV-008.pdf' });
  mockExists.mockResolvedValue(true);
});

test('creates a receipt PDF with invoice, exchange, totals, and shop settings', async () => {
  const filePath = await printBillReceipt(bill);

  expect(filePath).toBe('/documents/bill-INV-008.pdf');
  expect(mockGet).toHaveBeenCalledWith('/receipt-settings');
  const generated = mockGeneratePDF.mock.calls[0][0] as {
    html: string;
    fileName: string;
  };
  expect(generated.fileName).toBe('bill-INV-008');
  expect(generated.html).toContain('Sri Golds');
  expect(generated.html).toContain('A &amp; B Jewellers');
  expect(generated.html).toContain('Gold Jewellery · Gold · 916');
  expect(generated.html).toContain('−₹40,500.00');
  expect(generated.html).toContain('Balance due');
  expect(mockChooser).toHaveBeenCalledWith(
    '/documents/bill-INV-008.pdf',
    expect.objectContaining({ mime: 'application/pdf' }),
  );
});

test('reports when the generated receipt PDF is missing', async () => {
  mockExists.mockResolvedValue(false);

  await expect(printBillReceipt(bill)).rejects.toThrow(
    'The bill PDF could not be generated.',
  );
  expect(mockChooser).not.toHaveBeenCalled();
});
