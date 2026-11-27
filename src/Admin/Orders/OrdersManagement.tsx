import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { CustomDropdown } from '../Loans/FormControls';
import CreateBillScreen from './CreateBillScreen';
import CreateTackOrderScreen from './CreateTackOrderScreen';

type Section = 'billing' | 'orders';
type PaymentType = 'FULL_PAYMENT' | 'EXCHANGE_GOLD';
type PaymentKind = 'PAYMENT' | 'REFUND';
type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Other';
type Option = { value: string; label: string };
type Customer = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
};
type CatalogProduct = {
  id: number | string;
  name: string;
  category?: string;
  purity?: string;
  metal_type?: string;
  status?: string;
  final_selling_price?: number | string;
  offer_price?: number | string;
  mrp?: number | string;
  net_gold_weight?: number | string | null;
  variants?: unknown;
};
type OrderItem = {
  product_id: number | string;
  product_name: string;
  category?: string;
  purity?: string;
  metal_type?: string;
  variant_color?: string;
  variant_size?: string;
  quantity: number;
  price: number;
  total_price?: number;
  net_gold_weight?: number | string;
};
type TackOrder = {
  id: number | string;
  order_no: string;
  order_status: string;
  payment_status: string;
  customer: Customer;
  items: OrderItem[];
  sub_total: number | string;
  gst_included: boolean;
  gst_rate: number | string;
  gst_amount: number | string;
  discount_type: string;
  discount_value: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  advance_amount: number | string;
  balance_due: number | string;
  created_at?: string;
};
type BillProduct = {
  product_id?: number | string;
  product_name: string;
  category: string;
  purity: string;
  quantity: number;
  price: number | string;
  total_price?: number | string;
};
type ExchangeItem = {
  product_name: string;
  category: string;
  metal_type: string;
  purity: string;
  weight: string;
  wastage_weight: string;
  rate_per_unit: string;
};
type Bill = {
  id: number | string;
  invoice_no: string;
  customers: Customer[];
  products: BillProduct[];
  exchanges: ExchangeItem[];
  payment_type: PaymentType;
  sub_total: number | string;
  discount_amount: number | string;
  gst_amount: number | string;
  gst_rate: number | string;
  tax_mode: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance_due: number | string;
  payment_status?: string;
  payment_count?: number | string;
  source_tack_order_id?: number | string | null;
  created_at?: string;
};
type OrderCartItem = {
  key: string;
  product_id: number | string;
  product_name: string;
  category: string;
  purity: string;
  variant_color: string;
  variant_size: string;
  quantity: number;
  price: number;
  net_gold_weight?: number | string;
};
type OrderDraft = {
  customer: Customer;
  items: OrderCartItem[];
  gstIncluded: boolean;
  gstRate: string;
  discountType: 'Percent' | 'Fixed';
  discountValue: string;
  advanceAmount: string;
};
type BillDraft = {
  customer: Customer;
  items: BillProduct[];
  paymentType: PaymentType;
  discountAmount: string;
  gstRate: string;
  taxMode: 'Tax Exclusive' | 'Tax Inclusive';
  exchanges: ExchangeItem[];
  tackOrder: TackOrder | null;
  advancePaymentMethod: PaymentMethod;
};
type BillPaymentDraft = {
  bill: Bill;
  paymentKind: PaymentKind;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber: string;
};
type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_unit?: number | string;
  rate_per_gram?: number | string;
  rate_unit?: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Cheque',
  'Other',
];
const ORDER_STATUS_OPTIONS: Option[] = [
  { value: 'Order Placed', label: 'Order Placed' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Ready', label: 'Ready for Billing' },
];
const BILL_TYPE_OPTIONS: Option[] = [
  { value: 'ALL', label: 'All bill types' },
  { value: 'FULL_PAYMENT', label: 'Full Payment' },
  { value: 'EXCHANGE_GOLD', label: 'Exchange Gold' },
];
const ORDER_STATUS_FILTERS: Option[] = [
  { value: 'ALL', label: 'All order statuses' },
  { value: 'Order Placed', label: 'Order Placed' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Ready', label: 'Ready for Billing' },
  { value: 'Billing Pending', label: 'Billing Pending' },
  { value: 'Completed', label: 'Completed' },
];
const PAYMENT_STATUS_FILTERS: Option[] = [
  { value: 'ALL', label: 'All payment statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partially paid' },
  { value: 'UNPAID', label: 'Unpaid' },
];

const emptyCustomer = (): Customer => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
});

const emptyOrderDraft = (): OrderDraft => ({
  customer: emptyCustomer(),
  items: [],
  gstIncluded: false,
  gstRate: '0',
  discountType: 'Percent',
  discountValue: '0',
  advanceAmount: '0',
});

const emptyBillDraft = (): BillDraft => ({
  customer: emptyCustomer(),
  items: [],
  paymentType: 'FULL_PAYMENT',
  discountAmount: '0',
  gstRate: '0',
  taxMode: 'Tax Exclusive',
  exchanges: [],
  tackOrder: null,
  advancePaymentMethod: 'Other',
});

const emptyExchange = (): ExchangeItem => ({
  product_name: 'Gold exchange item',
  category: '',
  metal_type: 'Gold',
  purity: '22K',
  weight: '',
  wastage_weight: '0',
  rate_per_unit: '',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: unknown, label: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new TypeError(`The server returned invalid ${label}.`);
  }
}

function parseArray(value: unknown, label: string): unknown[] {
  const parsed = parseJson(value, label);
  if (!Array.isArray(parsed)) {
    throw new TypeError(`The server returned an invalid ${label}.`);
  }
  return parsed;
}

function parseCustomer(value: unknown, label: string): Customer {
  const parsed = parseJson(value, label);
  if (!isRecord(parsed)) throw new TypeError(`The server returned invalid ${label}.`);
  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    email: typeof parsed.email === 'string' ? parsed.email : '',
    address: typeof parsed.address === 'string' ? parsed.address : '',
    city: typeof parsed.city === 'string' ? parsed.city : '',
    district: typeof parsed.district === 'string' ? parsed.district : '',
    state: typeof parsed.state === 'string' ? parsed.state : '',
    pincode: typeof parsed.pincode === 'string' ? parsed.pincode : '',
  };
}

function parseTackOrder(value: unknown): TackOrder {
  if (!isRecord(value) || value.id == null) {
    throw new TypeError('The server returned an invalid tack order.');
  }
  const rawItems = parseArray(value.items, 'tack order items');
  const items = rawItems.map((rawItem, index) => {
    if (!isRecord(rawItem) || rawItem.product_id == null) {
      throw new TypeError(`Tack order item ${index + 1} is invalid.`);
    }
    return {
      product_id: rawItem.product_id as number | string,
      product_name: typeof rawItem.product_name === 'string' ? rawItem.product_name : 'Product',
      category: typeof rawItem.category === 'string' ? rawItem.category : '',
      purity: typeof rawItem.purity === 'string' ? rawItem.purity : '',
      metal_type: typeof rawItem.metal_type === 'string' ? rawItem.metal_type : '',
      variant_color: typeof rawItem.variant_color === 'string' ? rawItem.variant_color : '',
      variant_size: typeof rawItem.variant_size === 'string' ? rawItem.variant_size : '',
      quantity: Math.max(1, Number(rawItem.quantity) || 1),
      price: Number(rawItem.price) || 0,
      total_price: Number(rawItem.total_price) || undefined,
      net_gold_weight: rawItem.net_gold_weight as number | string | undefined,
    };
  });
  return {
    id: value.id as number | string,
    order_no: typeof value.order_no === 'string' ? value.order_no : `ORDER-${value.id}`,
    order_status: typeof value.order_status === 'string' ? value.order_status : 'Order Placed',
    payment_status: typeof value.payment_status === 'string' ? value.payment_status : 'Pending',
    customer: parseCustomer(value.customer, 'tack order customer'),
    items,
    sub_total: Number(value.sub_total) || 0,
    gst_included: value.gst_included === true,
    gst_rate: Number(value.gst_rate) || 0,
    gst_amount: Number(value.gst_amount) || 0,
    discount_type: typeof value.discount_type === 'string' ? value.discount_type : 'Percent',
    discount_value: Number(value.discount_value) || 0,
    discount_amount: Number(value.discount_amount) || 0,
    total_amount: Number(value.total_amount) || 0,
    advance_amount: Number(value.advance_amount) || 0,
    balance_due: Number(value.balance_due) || 0,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
  };
}

function parseBill(value: unknown): Bill {
  if (!isRecord(value) || value.id == null || typeof value.invoice_no !== 'string') {
    throw new TypeError('The server returned an invalid bill.');
  }
  const customers = parseArray(value.customers, 'bill customers').map((customer, index) =>
    parseCustomer(customer, `bill customer ${index + 1}`),
  );
  const products = parseArray(value.products, 'bill products').map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`Bill product ${index + 1} is invalid.`);
    return {
      product_id: item.product_id as number | string | undefined,
      product_name: typeof item.product_name === 'string' ? item.product_name : 'Product',
      category: typeof item.category === 'string' ? item.category : '',
      purity: typeof item.purity === 'string' ? item.purity : '',
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(item.price) || 0,
      total_price: Number(item.total_price) || undefined,
    };
  });
  const exchanges = parseArray(value.exchanges ?? [], 'bill exchanges').map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`Bill exchange item ${index + 1} is invalid.`);
    return {
      product_name: typeof item.product_name === 'string' ? item.product_name : 'Exchange item',
      category: typeof item.category === 'string' ? item.category : '',
      metal_type: typeof item.metal_type === 'string' ? item.metal_type : 'Gold',
      purity: typeof item.purity === 'string' ? item.purity : '',
      weight: String(item.weight ?? ''),
      wastage_weight: String(item.wastage_weight ?? '0'),
      rate_per_unit: String(item.rate_per_unit ?? ''),
    };
  });
  return {
    id: value.id as number | string,
    invoice_no: value.invoice_no,
    customers,
    products,
    exchanges,
    payment_type: value.payment_type === 'EXCHANGE_GOLD' ? 'EXCHANGE_GOLD' : 'FULL_PAYMENT',
    sub_total: Number(value.sub_total) || 0,
    discount_amount: Number(value.discount_amount) || 0,
    gst_amount: Number(value.gst_amount) || 0,
    gst_rate: Number(value.gst_rate) || 0,
    tax_mode: value.tax_mode === 'Tax Inclusive' ? 'Tax Inclusive' : 'Tax Exclusive',
    total_amount: Number(value.total_amount) || 0,
    paid_amount: Number(value.paid_amount) || 0,
    balance_due: Number(value.balance_due) || 0,
    payment_status: typeof value.payment_status === 'string' ? value.payment_status : undefined,
    payment_count: value.payment_count as number | string | undefined,
    source_tack_order_id: value.source_tack_order_id as number | string | null | undefined,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
  };
}

function parseProduct(value: unknown): CatalogProduct {
  if (!isRecord(value) || value.id == null || typeof value.name !== 'string') {
    throw new TypeError('The server returned an invalid catalog product.');
  }
  return {
    id: value.id as number | string,
    name: value.name,
    category: typeof value.category === 'string' ? value.category : '',
    purity: typeof value.purity === 'string' ? value.purity : '',
    metal_type: typeof value.metal_type === 'string' ? value.metal_type : '',
    status: typeof value.status === 'string' ? value.status : '',
    final_selling_price: value.final_selling_price as number | string | undefined,
    offer_price: value.offer_price as number | string | undefined,
    mrp: value.mrp as number | string | undefined,
    net_gold_weight: value.net_gold_weight as number | string | null | undefined,
    variants: value.variants,
  };
}

function currency(value: number | string | null | undefined): string {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function productPrice(product: CatalogProduct): number {
  const finalPrice = Number(product.final_selling_price);
  if (finalPrice > 0) return finalPrice;
  const offerPrice = Number(product.offer_price);
  if (offerPrice > 0) return offerPrice;
  return Math.max(0, Number(product.mrp) || 0);
}

function errorText(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;
  if (typeof error.message === 'string' && error.message) return error.message;
  if (isRecord(error.data) && typeof error.data.message === 'string') {
    return error.data.message;
  }
  return fallback;
}

function dateLabel(value?: string): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function orderStatus(order: TackOrder): string {
  return order.order_status === 'Bill Completed' ? 'Completed' : order.order_status;
}

function orderPaymentStatus(order: TackOrder): 'PAID' | 'PARTIAL' | 'UNPAID' {
  if (order.payment_status === 'Paid') return 'PAID';
  if (order.payment_status === 'Partial') return 'PARTIAL';
  const balance = Number(order.balance_due);
  const total = Number(order.total_amount);
  if (Number.isFinite(balance) && balance <= 0) return 'PAID';
  if (Number.isFinite(balance) && Number.isFinite(total) && balance < total) return 'PARTIAL';
  return Number(order.advance_amount) > 0 ? 'PARTIAL' : 'UNPAID';
}

function billStatus(bill: Bill): string {
  if (bill.payment_status) return bill.payment_status;
  if (Number(bill.balance_due) <= 0) return 'Paid';
  return Number(bill.paid_amount) > 0 ? 'Partial' : 'Pending';
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA6A1"
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`min-h-12 rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3 text-sm text-[#173F35] ${multiline ? 'min-h-20' : ''}`}
      />
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
}) {
  const Icon = icon;
  return (
    <View className="min-w-[48%] flex-1 flex-row items-center rounded-2xl border border-[#E6E9E3] bg-white p-3">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: tint }}>
        <Icon size={18} color="#07564B" />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[10px] font-bold uppercase tracking-wide text-[#7B8A83]">
          {label}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-base font-extrabold text-[#173F35]">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function OrdersManagement() {
  const { showAlert } = useCustomAlert();
  const [section, setSection] = useState<Section>('billing');
  const [ordersPage, setOrdersPage] = useState<'list' | 'create'>('list');
  const [billPage, setBillPage] = useState<'list' | 'form'>('list');
  const [orders, setOrders] = useState<TackOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [billsError, setBillsError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [ratesError, setRatesError] = useState('');
  const [billStartDate, setBillStartDate] = useState('');
  const [billEndDate, setBillEndDate] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [billTypeFilter, setBillTypeFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL');
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(emptyOrderDraft);
  const [billDraft, setBillDraft] = useState<BillDraft>(emptyBillDraft);
  const [orderSearchCatalog, setOrderSearchCatalog] = useState('');
  const [billSearchCatalog, setBillSearchCatalog] = useState('');
  const [orderSaving, setOrderSaving] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<number | string | null>(null);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<BillPaymentDraft | null>(null);

  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    setBillsError('');
    try {
      const response = await api.get('/billings', {
        params: { startDate: billStartDate, endDate: billEndDate },
      });
      if (!Array.isArray(response.data)) {
        throw new TypeError('The server returned an invalid bills list.');
      }
      setBills(response.data.map(parseBill));
    } catch (error) {
      const message = errorText(error, 'Could not load bills.');
      setBillsError(message);
      setBills([]);
      console.error('[Orders] Could not load bills:', error);
    } finally {
      setBillsLoading(false);
    }
  }, [billEndDate, billStartDate]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const response = await api.get('/tack-orders');
      if (!Array.isArray(response.data)) {
        throw new TypeError('The server returned an invalid tack-orders list.');
      }
      setOrders(response.data.map(parseTackOrder));
    } catch (error) {
      const message = errorText(error, 'Could not load tack orders.');
      setOrdersError(message);
      setOrders([]);
      console.error('[Orders] Could not load tack orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      let page = 1;
      let totalPages = 1;
      const allProducts: CatalogProduct[] = [];
      do {
        const response = await api.get('/products/mine', {
          params: { page, limit: 100 },
        });
        if (!isRecord(response.data) || !Array.isArray(response.data.products)) {
          throw new TypeError('The server returned an invalid product catalog.');
        }
        allProducts.push(...response.data.products.map(parseProduct));
        const pagination = isRecord(response.data.pagination)
          ? response.data.pagination
          : {};
        totalPages = Math.max(1, Number(pagination.totalPages) || 1);
        page += 1;
      } while (page <= totalPages);
      setCatalog(allProducts.filter(product => product.status === 'Active'));
      setCatalogLoaded(true);
    } catch (error) {
      const message = errorText(error, 'Could not load catalog products.');
      setCatalogError(message);
      setCatalog([]);
      console.error('[Orders] Could not load catalog products:', error);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadGoldRates = useCallback(async () => {
    setRatesError('');
    try {
      const response = await api.get('/gold-rates/current');
      if (!isRecord(response.data) || !Array.isArray(response.data.rates)) {
        throw new TypeError('The server returned an invalid daily gold-rate list.');
      }
      setGoldRates(response.data.rates.filter(isRecord) as GoldRate[]);
    } catch (error) {
      setRatesError(errorText(error, 'Could not load current gold rates.'));
      setGoldRates([]);
      console.error('[Orders] Could not load current gold rates:', error);
    }
  }, []);

  useEffect(() => {
    if (section === 'billing' && billPage === 'list') void loadBills();
  }, [billPage, loadBills, section]);

  useEffect(() => {
    if (section === 'orders' && ordersPage === 'list') void loadOrders();
  }, [loadOrders, ordersPage, section]);

  useEffect(() => {
    const formOpen =
      (section === 'orders' && ordersPage === 'create') ||
      (section === 'billing' && billPage === 'form');
    if (formOpen && !catalogLoaded && !catalogLoading && !catalogError) {
      void loadCatalog();
    }
  }, [
    billPage,
    catalogLoaded,
    catalogError,
    catalogLoading,
    loadCatalog,
    ordersPage,
    section,
  ]);

  useEffect(() => {
    if (section === 'billing' && billPage === 'form' && billDraft.paymentType === 'EXCHANGE_GOLD' && goldRates.length === 0 && !ratesError) {
      void loadGoldRates();
    }
  }, [billDraft.paymentType, billPage, goldRates.length, loadGoldRates, ratesError, section]);

  const orderTotals = useMemo(() => {
    const subtotal = orderDraft.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const gstRate = Number(orderDraft.gstRate);
    const gstAmount =
      orderDraft.gstIncluded && Number.isFinite(gstRate) && gstRate >= 0
        ? (subtotal * Math.min(gstRate, 100)) / 100
        : 0;
    const requestedDiscount = Math.max(0, Number(orderDraft.discountValue) || 0);
    const discount =
      orderDraft.discountType === 'Percent'
        ? (subtotal * Math.min(requestedDiscount, 100)) / 100
        : requestedDiscount;
    const appliedDiscount = Math.min(subtotal, discount);
    return {
      subtotal,
      gstAmount,
      discount: appliedDiscount,
      total: Math.max(0, subtotal + gstAmount - appliedDiscount),
    };
  }, [orderDraft]);

  const findRate = useCallback(
    (metalType: string, purity: string) =>
      goldRates.find(
        rate =>
          rate.metal_type.toLowerCase() === metalType.trim().toLowerCase() &&
          rate.purity.toLowerCase() === purity.trim().toLowerCase(),
      ),
    [goldRates],
  );

  const billTotals = useMemo(() => {
    const subtotal = billDraft.items.reduce(
      (total, item) => total + (Number(item.price) || 0) * item.quantity,
      0,
    );
    const discount = Math.max(0, Number(billDraft.discountAmount) || 0);
    const exchangeCredit = billDraft.paymentType === 'EXCHANGE_GOLD'
      ? billDraft.exchanges.reduce((total, exchange) => {
          const weight = Number(exchange.weight) || 0;
          const wastage = Number(exchange.wastage_weight) || 0;
          const enteredRate = Number(exchange.rate_per_unit);
          const rate = enteredRate > 0
            ? enteredRate
            : Number(findRate(exchange.metal_type, exchange.purity)?.rate_per_unit ?? findRate(exchange.metal_type, exchange.purity)?.rate_per_gram) || 0;
          return total + Math.max(0, weight - wastage) * rate;
        }, 0)
      : 0;
    const taxBase = Math.max(0, subtotal - discount - exchangeCredit);
    const gstRate = Number(billDraft.gstRate);
    const validGstRate = Number.isFinite(gstRate) && gstRate >= 0 && gstRate <= 100;
    const gstAmount = !validGstRate || gstRate === 0
      ? 0
      : billDraft.taxMode === 'Tax Inclusive'
        ? (taxBase * gstRate) / (100 + gstRate)
        : (taxBase * gstRate) / 100;
    const total = billDraft.taxMode === 'Tax Inclusive' ? taxBase : taxBase + gstAmount;
    return {
      subtotal,
      discount,
      exchangeCredit,
      gstAmount,
      total,
      validGstRate,
      validDiscount: discount <= subtotal && discount + exchangeCredit <= subtotal,
    };
  }, [billDraft, findRate]);

  const filteredBills = useMemo(() => {
    const query = billSearch.trim().toLowerCase();
    return bills.filter(bill => {
      if (billTypeFilter !== 'ALL' && bill.payment_type !== billTypeFilter) return false;
      if (!query) return true;
      const customerText = bill.customers
        .map(customer => `${customer.name} ${customer.phone}`)
        .join(' ')
        .toLowerCase();
      return `${bill.invoice_no} ${customerText}`.toLowerCase().includes(query);
    });
  }, [billSearch, billTypeFilter, bills]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orders.filter(order => {
      if (orderStatusFilter !== 'ALL' && orderStatus(order) !== orderStatusFilter) return false;
      if (orderPaymentFilter !== 'ALL' && orderPaymentStatus(order) !== orderPaymentFilter) return false;
      if (!query) return true;
      return [
        order.order_no,
        order.customer.name,
        order.customer.phone,
        order.customer.city,
        order.customer.district,
        order.customer.state,
        ...order.items.map(item => item.product_name),
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
  }, [orderPaymentFilter, orderSearch, orderStatusFilter, orders]);

  const billProductResults = useMemo(() => {
    const query = billSearchCatalog.trim().toLowerCase();
    return catalog
      .filter(product => !query || `${product.name} ${product.category} ${product.purity}`.toLowerCase().includes(query))
      .slice(0, 30);
  }, [billSearchCatalog, catalog]);

  const orderProductResults = useMemo(() => {
    const query = orderSearchCatalog.trim().toLowerCase();
    return catalog
      .filter(product => !query || `${product.name} ${product.category} ${product.purity} ${product.id}`.toLowerCase().includes(query))
      .slice(0, 30);
  }, [catalog, orderSearchCatalog]);

  const billedTotal = bills.reduce((total, bill) => total + Number(bill.total_amount || 0), 0);
  const paidTotal = bills.reduce((total, bill) => total + Number(bill.paid_amount || 0), 0);
  const outstandingTotal = bills.reduce((total, bill) => total + Math.max(0, Number(bill.balance_due || 0)), 0);
  const pendingOrderCount = orders.filter(order => ['Order Placed', 'Confirmed'].includes(orderStatus(order))).length;
  const readyOrderCount = orders.filter(order => orderStatus(order) === 'Ready').length;
  const orderOutstanding = orders.reduce((total, order) => total + Math.max(0, Number(order.balance_due) || 0), 0);

  const updateOrderCustomer = (field: keyof Customer, value: string) => {
    setOrderDraft(current => ({
      ...current,
      customer: { ...current.customer, [field]: value },
    }));
  };

  const addOrderProduct = (product: CatalogProduct) => {
    const variantData = parseJson(product.variants, 'product variants');
    const firstVariant = Array.isArray(variantData) && isRecord(variantData[0]) ? variantData[0] : null;
    const variantColor = firstVariant
      ? String(firstVariant.colorName || firstVariant.color || '')
      : '';
    const sizes = firstVariant?.selectedSizes;
    const variantSize = Array.isArray(sizes) && typeof sizes[0] === 'string' ? sizes[0] : '';
    const key = `${product.id}:${variantColor}:${variantSize}`;
    setOrderDraft(current => {
      const existing = current.items.find(item => item.key === key);
      if (existing) {
        if (existing.quantity >= 10000) return current;
        return {
          ...current,
          items: current.items.map(item =>
            item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }
      return {
        ...current,
        items: [
          ...current.items,
          {
            key,
            product_id: product.id,
            product_name: product.name,
            category: product.category || '',
            purity: product.purity || '',
            variant_color: variantColor,
            variant_size: variantSize,
            quantity: 1,
            price: productPrice(product),
            net_gold_weight: product.net_gold_weight ?? undefined,
          },
        ],
      };
    });
  };

  const updateOrderQuantity = (key: string, quantity: number) => {
    if (quantity < 1) {
      setOrderDraft(current => ({
        ...current,
        items: current.items.filter(item => item.key !== key),
      }));
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity > 10000) return;
    setOrderDraft(current => ({
      ...current,
      items: current.items.map(item => item.key === key ? { ...item, quantity } : item),
    }));
  };

  const createTackOrder = async () => {
    if (!orderDraft.customer.name.trim() || !orderDraft.customer.phone.trim()) {
      showAlert('Customer required', 'Enter a customer name and phone number.', { variant: 'warning' });
      return;
    }
    if (orderDraft.items.length === 0) {
      showAlert('Products required', 'Add at least one catalog product to this tack order.', { variant: 'warning' });
      return;
    }
    const gstRate = Number(orderDraft.gstRate);
    const discountValue = Number(orderDraft.discountValue) || 0;
    const advanceAmount = Number(orderDraft.advanceAmount) || 0;
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      showAlert('Invalid GST rate', 'GST rate must be between 0 and 100.', { variant: 'warning' });
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue < 0 ||
      (orderDraft.discountType === 'Percent' && discountValue > 100)) {
      showAlert('Invalid discount', 'Enter a valid discount amount or percentage.', { variant: 'warning' });
      return;
    }
    if (!Number.isFinite(advanceAmount) || advanceAmount < 0 || advanceAmount > orderTotals.total) {
      showAlert('Invalid advance', 'Advance payment cannot exceed the order total.', { variant: 'warning' });
      return;
    }

    setOrderSaving(true);
    setOrdersError('');
    try {
      const response = await api.post('/tack-orders', {
        customer: {
          name: orderDraft.customer.name.trim(),
          phone: orderDraft.customer.phone.trim(),
          email: orderDraft.customer.email.trim(),
          address: orderDraft.customer.address.trim(),
          city: orderDraft.customer.city?.trim() || '',
          district: orderDraft.customer.district?.trim() || '',
          state: orderDraft.customer.state?.trim() || '',
          pincode: orderDraft.customer.pincode?.trim() || '',
        },
        items: orderDraft.items.map(item => ({
          product_id: Number(item.product_id),
          quantity: item.quantity,
          variant_color: item.variant_color,
          variant_size: item.variant_size,
          ...(item.net_gold_weight != null ? { net_gold_weight: Number(item.net_gold_weight) } : {}),
        })),
        gst_included: orderDraft.gstIncluded,
        gst_rate: gstRate,
        discount_type: orderDraft.discountType,
        discount_value: discountValue,
        advance_amount: advanceAmount,
      });
      const created = parseTackOrder(response.data);
      setOrderDraft(emptyOrderDraft());
      setOrderSearchCatalog('');
      setOrdersPage('list');
      showAlert(
        'Tack order created',
        `${created.order_no} was created with status ${created.order_status}.`,
        { variant: 'success' },
      );
    } catch (error) {
      const message = errorText(error, 'Could not create tack order.');
      setOrdersError(message);
      showAlert('Could not create tack order', message, { variant: 'error' });
      console.error('[Orders] Could not create tack order:', error);
    } finally {
      setOrderSaving(false);
    }
  };

  const updateTackOrderStatus = async (order: TackOrder, status: string) => {
    if (status === orderStatus(order) || !ORDER_STATUS_OPTIONS.some(option => option.value === status)) return;
    setUpdatingOrderId(String(order.id));
    try {
      const response = await api.patch(`/tack-orders/${order.id}/status`, { order_status: status });
      if (!isRecord(response.data) || typeof response.data.order_status !== 'string') {
        throw new TypeError('The server returned an invalid order status response.');
      }
      setOrders(current => current.map(item =>
        item.id === order.id
          ? { ...item, order_status: response.data.order_status as string }
          : item,
      ));
      showAlert('Order updated', `${order.order_no} is now ${response.data.order_status}.`, { variant: 'success' });
    } catch (error) {
      const message = errorText(error, 'Could not update order status.');
      showAlert('Could not update order', message, { variant: 'error' });
      console.error('[Orders] Could not update tack order status:', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openNewBill = () => {
    setEditingBillId(null);
    setBillDraft(emptyBillDraft());
    setBillSearchCatalog('');
    setBillPage('form');
  };

  const openBillFromOrder = (order: TackOrder) => {
    setEditingBillId(null);
    setBillDraft({
      ...emptyBillDraft(),
      customer: { ...order.customer },
      items: order.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        category: item.category || 'Tack Order',
        purity: item.purity || '',
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price,
      })),
      discountAmount: String(Number(order.discount_amount) || 0),
      gstRate: order.gst_included ? String(Number(order.gst_rate) || 0) : '0',
      tackOrder: order,
    });
    setBillSearchCatalog('');
    setBillPage('form');
    setSection('billing');
  };

  const openEditBill = (bill: Bill) => {
    if (Number(bill.paid_amount) > 0 || Number(bill.payment_count) > 0) {
      showAlert('Bill cannot be edited', 'Bills with payment history cannot be changed.', { variant: 'warning' });
      return;
    }
    setEditingBillId(bill.id);
    setBillDraft({
      customer: { ...(bill.customers[0] || emptyCustomer()) },
      items: bill.products.map(item => ({ ...item })),
      paymentType: bill.payment_type,
      discountAmount: String(Number(bill.discount_amount) || 0),
      gstRate: String(Number(bill.gst_rate) || 0),
      taxMode: bill.tax_mode === 'Tax Inclusive' ? 'Tax Inclusive' : 'Tax Exclusive',
      exchanges: bill.exchanges.map(item => ({ ...item })),
      tackOrder: null,
      advancePaymentMethod: 'Other',
    });
    setBillSearchCatalog('');
    setBillPage('form');
  };

  const updateBillCustomer = (field: keyof Customer, value: string) => {
    setBillDraft(current => ({
      ...current,
      customer: { ...current.customer, [field]: value },
    }));
  };

  const addBillProduct = (product: CatalogProduct) => {
    if (billDraft.tackOrder) return;
    setBillDraft(current => {
      const existing = current.items.find(item => String(item.product_id) === String(product.id));
      if (existing) {
        return {
          ...current,
          items: current.items.map(item =>
            String(item.product_id) === String(product.id)
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }
      return {
        ...current,
        items: [
          ...current.items,
          {
            product_id: product.id,
            product_name: product.name,
            category: product.category || '',
            purity: product.purity || '',
            quantity: 1,
            price: productPrice(product),
          },
        ],
      };
    });
  };

  const updateBillItem = (index: number, patch: Partial<BillProduct>) => {
    setBillDraft(current => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const updateExchange = (index: number, patch: Partial<ExchangeItem>) => {
    setBillDraft(current => ({
      ...current,
      exchanges: current.exchanges.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const saveBill = async () => {
    if (!billDraft.customer.name.trim() || !billDraft.customer.phone.trim()) {
      showAlert('Customer required', 'Enter a customer name and phone number.', { variant: 'warning' });
      return;
    }
    if (billDraft.items.length === 0) {
      showAlert('Products required', 'Add at least one product to this bill.', { variant: 'warning' });
      return;
    }
    if (!billTotals.validGstRate) {
      showAlert('Invalid GST rate', 'GST percentage must be between 0 and 100.', { variant: 'warning' });
      return;
    }
    if (!billTotals.validDiscount) {
      showAlert('Invalid discount', 'Discount and exchange credit cannot exceed the product subtotal.', { variant: 'warning' });
      return;
    }
    if (billDraft.paymentType === 'EXCHANGE_GOLD' && billDraft.exchanges.length === 0) {
      showAlert('Exchange item required', 'Add at least one exchange item.', { variant: 'warning' });
      return;
    }
    const invalidExchange = billDraft.exchanges.some(item => {
      const weight = Number(item.weight);
      const wastage = Number(item.wastage_weight || 0);
      const rate = Number(item.rate_per_unit) || Number(findRate(item.metal_type, item.purity)?.rate_per_unit ?? findRate(item.metal_type, item.purity)?.rate_per_gram);
      return !item.category.trim() || !item.metal_type.trim() || !item.purity.trim() ||
        !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(wastage) || wastage < 0 ||
        wastage > weight || !Number.isFinite(rate) || rate <= 0;
    });
    if (billDraft.paymentType === 'EXCHANGE_GOLD' && invalidExchange) {
      showAlert('Invalid exchange details', 'Enter category, metal, purity, positive weight, and a valid rate for every exchange item.', { variant: 'warning' });
      return;
    }
    const advanceAmount = Number(billDraft.tackOrder?.advance_amount) || 0;
    if (advanceAmount > billTotals.total) {
      showAlert('Invalid advance', 'The tack order advance cannot exceed the bill total.', { variant: 'warning' });
      return;
    }

    setBillSaving(true);
    try {
      const payload = {
        customers: [{
          name: billDraft.customer.name.trim(),
          phone: billDraft.customer.phone.trim(),
          email: billDraft.customer.email.trim(),
          address: billDraft.customer.address.trim(),
        }],
        products: billDraft.items.map(item => ({
          product_id: Number(item.product_id),
          quantity: item.quantity,
        })),
        ...(billDraft.tackOrder ? { tack_order_id: billDraft.tackOrder.id } : {}),
        ...(billDraft.tackOrder && advanceAmount > 0
          ? { advance_payment_method: billDraft.advancePaymentMethod }
          : {}),
        payment_type: billDraft.paymentType,
        exchanges: billDraft.paymentType === 'EXCHANGE_GOLD'
          ? billDraft.exchanges.map(item => ({
              product_name: item.product_name.trim() || `${item.metal_type} ${item.purity} exchange item`,
              category: item.category.trim(),
              metal_type: item.metal_type.trim(),
              purity: item.purity.trim(),
              weight: Number(item.weight),
              wastage_weight: Number(item.wastage_weight) || 0,
              rate_per_unit: Number(item.rate_per_unit) || Number(findRate(item.metal_type, item.purity)?.rate_per_unit ?? findRate(item.metal_type, item.purity)?.rate_per_gram),
            }))
          : [],
        discount_amount: billTotals.discount,
        gst_rate: Number(billDraft.gstRate),
        tax_mode: billDraft.taxMode,
      };
      const response = editingBillId
        ? await api.put(`/billings/${editingBillId}`, payload)
        : await api.post('/billings', payload);
      const savedBill = parseBill(response.data);
      setBills(current => {
        const exists = current.some(item => item.id === savedBill.id);
        return exists
          ? current.map(item => item.id === savedBill.id ? savedBill : item)
          : [savedBill, ...current];
      });
      setBillDraft(emptyBillDraft());
      setEditingBillId(null);
      setBillPage('list');
      showAlert(
        'Bill saved',
        response.data.already_exists
          ? 'This tack order already has a bill.'
          : `${savedBill.invoice_no} was saved successfully.`,
        { variant: 'success' },
      );
    } catch (error) {
      const message = errorText(error, 'Could not save this bill.');
      showAlert('Could not save bill', message, { variant: 'error' });
      console.error('[Orders] Could not save bill:', error);
    } finally {
      setBillSaving(false);
    }
  };

  const startBillPayment = (bill: Bill, paymentKind: PaymentKind = 'PAYMENT') => {
    setPaymentDraft({
      bill,
      paymentKind,
      amount: String(paymentKind === 'PAYMENT' ? Number(bill.balance_due) || 0 : Number(bill.paid_amount) || 0),
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().slice(0, 16),
      referenceNumber: '',
    });
  };

  const saveBillPayment = async () => {
    if (!paymentDraft) return;
    const amount = Number(paymentDraft.amount);
    const maximum = paymentDraft.paymentKind === 'PAYMENT'
      ? Number(paymentDraft.bill.balance_due)
      : Number(paymentDraft.bill.paid_amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > maximum) {
      showAlert('Invalid payment amount', `Enter an amount greater than zero and no more than ${currency(maximum)}.`, { variant: 'warning' });
      return;
    }
    if (!paymentDraft.paymentDate || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(paymentDraft.paymentDate)) {
      showAlert('Payment date required', 'Enter a valid payment date and time.', { variant: 'warning' });
      return;
    }
    if (paymentDraft.referenceNumber.length > 100) {
      showAlert('Reference is too long', 'Reference number must be 100 characters or fewer.', { variant: 'warning' });
      return;
    }

    setBillSaving(true);
    try {
      const response = await api.post(`/billings/${paymentDraft.bill.id}/payments`, {
        payment_kind: paymentDraft.paymentKind,
        amount,
        payment_method: paymentDraft.paymentMethod,
        payment_date: paymentDraft.paymentDate,
        reference_number: paymentDraft.referenceNumber.trim(),
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      const updatedBill = parseBill(response.data);
      setBills(current => current.map(item => item.id === updatedBill.id ? updatedBill : item));
      setViewingBill(current => current?.id === updatedBill.id ? updatedBill : current);
      setPaymentDraft(null);
      showAlert(
        paymentDraft.paymentKind === 'PAYMENT' ? 'Payment recorded' : 'Refund recorded',
        paymentDraft.paymentKind === 'PAYMENT'
          ? 'The collection was added to the bill and fund ledger.'
          : 'The refund was recorded and deducted from the fund ledger.',
        { variant: 'success' },
      );
    } catch (error) {
      const message = errorText(error, 'Could not record this payment.');
      showAlert('Could not record payment', message, { variant: 'error' });
      console.error('[Orders] Could not record bill payment:', error);
    } finally {
      setBillSaving(false);
    }
  };

  const deleteBill = async (bill: Bill) => {
    try {
      await api.delete(`/billings/${bill.id}`);
      setBills(current => current.filter(item => item.id !== bill.id));
      showAlert('Bill deleted', `${bill.invoice_no} was deleted.`, { variant: 'success' });
    } catch (error) {
      const message = errorText(error, 'Could not delete this bill.');
      showAlert('Could not delete bill', message, { variant: 'error' });
      console.error('[Orders] Could not delete bill:', error);
    }
  };

  const confirmDeleteBill = (bill: Bill) => {
    if (Number(bill.paid_amount) > 0 || Number(bill.payment_count) > 0) {
      showAlert('Bill cannot be deleted', 'A bill with payment history must be preserved.', { variant: 'warning' });
      return;
    }
    showAlert('Delete bill?', `${bill.invoice_no} will be permanently deleted.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteBill(bill) },
      ],
    });
  };

  const openOrderForm = () => {
    setOrderDraft(emptyOrderDraft());
    setOrderSearchCatalog('');
    setOrdersPage('create');
  };

  const renderBillList = () => (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={billsLoading} onRefresh={() => void loadBills()} />
      }>
      <View className="p-4 pb-5">
        <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-[#075348] p-4">
          <View className="mr-3 flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-emerald-200">
              Payments & invoices
            </Text>
            <Text className="mt-1 text-xl font-black text-white">Billing overview</Text>
            <Text className="mt-1 text-xs leading-5 text-white/70">
              Review invoices, collections and customer payments.
            </Text>
          </View>
          <Pressable
            testID="billing-new-button"
            accessibilityRole="button"
            onPress={openNewBill}
            className="min-h-11 flex-row items-center rounded-xl bg-white px-3">
            <Plus size={16} color="#075348" />
            <Text className="ml-1 text-xs font-extrabold text-[#075348]">New bill</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <SummaryCard label="Total billed" value={currency(billedTotal)} icon={CreditCard} tint="#E4F4ED" />
          <SummaryCard label="Collected" value={currency(paidTotal)} icon={CheckCircle2} tint="#E7F1FB" />
          <SummaryCard label="Balance due" value={currency(outstandingTotal)} icon={CalendarDays} tint="#FFF0D9" />
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-3">
          <View className="mb-2 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
            <Search size={17} color="#7B8A83" />
            <TextInput
              accessibilityLabel="Search bills"
              value={billSearch}
              onChangeText={setBillSearch}
              placeholder="Invoice, customer or phone"
              placeholderTextColor="#9AA6A1"
              className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
            />
            {billSearch ? (
              <Pressable accessibilityLabel="Clear bill search" onPress={() => setBillSearch('')}>
                <X size={17} color="#7B8A83" />
              </Pressable>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <InputField
                label="From"
                value={billStartDate}
                onChangeText={setBillStartDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View className="flex-1">
              <InputField
                label="To"
                value={billEndDate}
                onChangeText={setBillEndDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
          <CustomDropdown
            label="Bill type"
            value={billTypeFilter}
            options={BILL_TYPE_OPTIONS}
            onSelect={setBillTypeFilter}
          />
        </View>

        <View className="mb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-extrabold text-[#173F35]">Recent invoices</Text>
            <Text className="mt-0.5 text-xs text-[#6B7E76]">
              {billsLoading ? 'Loading bills…' : `${filteredBills.length} invoice${filteredBills.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh bills" onPress={() => void loadBills()} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
            <RefreshCw size={17} color="#07564B" />
          </Pressable>
        </View>

        {billsError ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{billsError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadBills()} className="mt-3 self-start rounded-lg bg-rose-700 px-4 py-2">
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : billsLoading && bills.length === 0 ? (
          <View className="items-center rounded-2xl bg-white py-10">
            <ActivityIndicator color="#07564B" />
            <Text className="mt-3 text-sm text-[#6B7E76]">Loading invoices…</Text>
          </View>
        ) : filteredBills.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-[#D7E2DC] bg-white px-5 py-10">
            <FileText size={28} color="#7B8A83" />
            <Text className="mt-3 text-base font-bold text-[#173F35]">
              {bills.length === 0 ? 'No bills yet' : 'No matching bills'}
            </Text>
            <Text className="mt-1 text-center text-xs text-[#6B7E76]">
              {bills.length === 0 ? 'Create your first invoice to see it here.' : 'Try a different search or bill type.'}
            </Text>
          </View>
        ) : filteredBills.map(bill => (
          <View key={String(bill.id)} className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4">
            <View className="mb-3 flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#7B8A83]">Invoice</Text>
                <Text className="mt-1 text-base font-extrabold text-[#07564B]">{bill.invoice_no}</Text>
                {bill.source_tack_order_id != null ? (
                  <Text className="mt-1 text-[10px] font-bold text-emerald-700">Linked tack order</Text>
                ) : null}
              </View>
              <View className={`rounded-full px-2.5 py-1 ${billStatus(bill) === 'Paid' ? 'bg-emerald-50' : billStatus(bill) === 'Partial' ? 'bg-amber-50' : 'bg-rose-50'}`}>
                <Text className={`text-[10px] font-extrabold ${billStatus(bill) === 'Paid' ? 'text-emerald-700' : billStatus(bill) === 'Partial' ? 'text-amber-700' : 'text-rose-700'}`}>
                  {billStatus(bill)}
                </Text>
              </View>
            </View>
            <Text className="text-sm font-bold text-[#173F35]">
              {bill.customers.map(customer => customer.name).filter(Boolean).join(', ') || 'No customer name'}
            </Text>
            {bill.customers[0]?.phone ? (
              <Text className="mt-0.5 text-xs text-[#6B7E76]">{bill.customers[0].phone}</Text>
            ) : null}
            <View className="my-3 flex-row justify-between border-y border-[#F0F2EF] py-3">
              <View>
                <Text className="text-[10px] uppercase text-[#7B8A83]">Items · {bill.products.length}</Text>
                <Text className="mt-1 text-xs font-semibold text-[#52645F]">{dateLabel(bill.created_at)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] uppercase text-[#7B8A83]">Total bill</Text>
                <Text className="mt-1 text-base font-extrabold text-[#173F35]">{currency(bill.total_amount)}</Text>
              </View>
            </View>
            <View className="mb-3 flex-row justify-between">
              <Text className="text-xs font-semibold text-emerald-700">Paid {currency(bill.paid_amount)}</Text>
              <Text className="text-xs font-semibold text-rose-700">Due {currency(bill.balance_due)}</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {Number(bill.balance_due) > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => startBillPayment(bill)} className="min-h-10 flex-row items-center rounded-lg bg-emerald-700 px-3">
                  <CreditCard size={14} color="white" />
                  <Text className="ml-1.5 text-xs font-bold text-white">Collect</Text>
                </Pressable>
              ) : null}
              {Number(bill.paid_amount) > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => startBillPayment(bill, 'REFUND')} className="min-h-10 flex-row items-center rounded-lg bg-rose-50 px-3">
                  <RefreshCw size={14} color="#B42332" />
                  <Text className="ml-1.5 text-xs font-bold text-rose-700">Refund</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => setViewingBill(bill)} className="min-h-10 flex-row items-center rounded-lg bg-[#EAF3EF] px-3">
                <FileText size={14} color="#07564B" />
                <Text className="ml-1.5 text-xs font-bold text-[#07564B]">View</Text>
              </Pressable>
              {Number(bill.paid_amount) === 0 && Number(bill.payment_count) === 0 ? (
                <>
                  <Pressable accessibilityRole="button" onPress={() => openEditBill(bill)} className="min-h-10 items-center justify-center rounded-lg bg-amber-50 px-3">
                    <Text className="text-xs font-bold text-amber-800">Edit</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete bill ${bill.invoice_no}`} onPress={() => confirmDeleteBill(bill)} className="min-h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                    <Trash2 size={15} color="#B42332" />
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderBillForm = () => (
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
      <View className="p-4 pb-6">
        {billDraft.tackOrder ? (
          <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-sm font-extrabold text-emerald-900">
              Tack order {billDraft.tackOrder.order_no}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-emerald-800">
              Product quantities and saved order totals will be used. Advance {currency(billDraft.tackOrder.advance_amount)} will be added to the bill as a payment.
            </Text>
          </View>
        ) : null}

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Customer details</Text>
          <InputField label="Customer name *" value={billDraft.customer.name} onChangeText={value => updateBillCustomer('name', value)} placeholder="Enter customer name" />
          <InputField label="Phone number *" value={billDraft.customer.phone} onChangeText={value => updateBillCustomer('phone', value)} keyboardType="phone-pad" placeholder="Enter phone number" />
          <InputField label="Email address" value={billDraft.customer.email} onChangeText={value => updateBillCustomer('email', value)} keyboardType="email-address" placeholder="Optional" />
          <InputField label="Address" value={billDraft.customer.address} onChangeText={value => updateBillCustomer('address', value)} multiline placeholder="Customer address" />
        </View>

        {!billDraft.tackOrder ? (
          <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
            <Text className="mb-2 text-base font-extrabold text-[#173F35]">Add catalog products</Text>
            <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
              <Search size={16} color="#7B8A83" />
              <TextInput
                accessibilityLabel="Search catalog products for bill"
                value={billSearchCatalog}
                onChangeText={setBillSearchCatalog}
                placeholder="Search products"
                placeholderTextColor="#9AA6A1"
                className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
              />
            </View>
            {catalogLoading ? (
              <ActivityIndicator color="#07564B" />
            ) : catalogError ? (
              <View>
                <Text className="text-sm text-rose-700">{catalogError}</Text>
                <Pressable onPress={() => void loadCatalog()} className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2">
                  <Text className="text-xs font-bold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View className="max-h-64">
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {billProductResults.map(product => (
                    <View key={String(product.id)} className="mb-2 flex-row items-center justify-between rounded-xl bg-[#F8FAF8] p-3">
                      <View className="mr-2 flex-1">
                        <Text numberOfLines={1} className="text-sm font-bold text-[#173F35]">{product.name}</Text>
                        <Text numberOfLines={1} className="mt-0.5 text-xs text-[#6B7E76]">
                          {product.category || 'Uncategorized'} · {product.purity || 'Purity not set'}
                        </Text>
                        <Text className="mt-1 text-xs font-bold text-[#07564B]">{currency(productPrice(product))}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to bill`} onPress={() => addBillProduct(product)} className="h-9 w-9 items-center justify-center rounded-full bg-[#07564B]">
                        <Plus size={17} color="white" />
                      </Pressable>
                    </View>
                  ))}
                  {billProductResults.length === 0 && !catalogLoading ? (
                    <Text className="py-4 text-center text-xs text-[#6B7E76]">No matching products.</Text>
                  ) : null}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Products in bill · {billDraft.items.length}</Text>
          {billDraft.items.length === 0 ? (
            <Text className="rounded-xl bg-[#F8FAF8] p-4 text-center text-xs text-[#6B7E76]">Add a catalog product to continue.</Text>
          ) : billDraft.items.map((item, index) => (
            <View key={`${item.product_id}-${index}`} className="mb-2 flex-row items-center rounded-xl bg-[#F8FAF8] p-3">
              <View className="mr-2 flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-[#173F35]">{item.product_name}</Text>
                <Text className="mt-0.5 text-xs text-[#6B7E76]">
                  {item.category || 'Product'} · {item.purity || '—'} · {currency(item.price)}
                </Text>
              </View>
              {!billDraft.tackOrder ? (
                <TextInput
                  accessibilityLabel={`Quantity for ${item.product_name}`}
                  value={String(item.quantity)}
                  onChangeText={value => updateBillItem(index, { quantity: Math.max(1, Number(value) || 1) })}
                  keyboardType="number-pad"
                  className="mr-2 h-10 w-12 rounded-lg border border-[#DDE6E0] bg-white text-center text-sm font-bold text-[#173F35]"
                />
              ) : (
                <Text className="mr-2 text-xs font-bold text-[#52645F]">Qty {item.quantity}</Text>
              )}
              {!billDraft.tackOrder ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.product_name}`} onPress={() => setBillDraft(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
                  <Trash2 size={15} color="#B42332" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Payment method</Text>
          <View className="mb-3 flex-row gap-2">
            {([
              ['FULL_PAYMENT', 'Full payment'],
              ['EXCHANGE_GOLD', 'Exchange gold'],
            ] as Array<[PaymentType, string]>).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: billDraft.paymentType === value }}
                onPress={() => setBillDraft(current => ({
                  ...current,
                  paymentType: value,
                  exchanges: value === 'EXCHANGE_GOLD' && current.exchanges.length === 0
                    ? [emptyExchange()]
                    : current.exchanges,
                }))}
                className={`flex-1 rounded-xl border p-3 ${billDraft.paymentType === value ? 'border-emerald-700 bg-emerald-50' : 'border-[#E6E9E3] bg-white'}`}>
                <Text className={`text-center text-xs font-extrabold ${billDraft.paymentType === value ? 'text-emerald-800' : 'text-[#52645F]'}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {billDraft.tackOrder && Number(billDraft.tackOrder.advance_amount) > 0 ? (
            <CustomDropdown
              label="Tack order advance method"
              value={billDraft.advancePaymentMethod}
              options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
              onSelect={value => setBillDraft(current => ({ ...current, advancePaymentMethod: value as PaymentMethod }))}
            />
          ) : null}
          {billDraft.paymentType === 'EXCHANGE_GOLD' ? (
            <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-amber-900">Exchange items</Text>
                <Pressable accessibilityRole="button" onPress={() => setBillDraft(current => ({ ...current, exchanges: [...current.exchanges, emptyExchange()] }))} className="flex-row items-center rounded-lg bg-amber-100 px-3 py-2">
                  <Plus size={14} color="#92400E" />
                  <Text className="ml-1 text-xs font-bold text-amber-900">Add item</Text>
                </Pressable>
              </View>
              {ratesError ? (
                <Text className="mb-2 text-xs text-rose-700">{ratesError} Enter the exchange rate manually.</Text>
              ) : null}
              {billDraft.exchanges.map((item, index) => (
                <View key={`exchange-${index}`} className="mb-3 rounded-xl bg-white p-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-extrabold text-[#173F35]">Exchange item {index + 1}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove exchange item ${index + 1}`} onPress={() => setBillDraft(current => ({ ...current, exchanges: current.exchanges.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <X size={17} color="#B42332" />
                    </Pressable>
                  </View>
                  <InputField label="Category *" value={item.category} onChangeText={value => updateExchange(index, { category: value })} placeholder="e.g. Gold jewellery" />
                  <View className="flex-row gap-2">
                    <View className="flex-1"><InputField label="Metal *" value={item.metal_type} onChangeText={value => updateExchange(index, { metal_type: value })} placeholder="Gold" /></View>
                    <View className="flex-1"><InputField label="Purity *" value={item.purity} onChangeText={value => updateExchange(index, { purity: value })} placeholder="22K" /></View>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1"><InputField label="Weight (g) *" value={item.weight} onChangeText={value => updateExchange(index, { weight: value })} keyboardType="decimal-pad" placeholder="0.000" /></View>
                    <View className="flex-1"><InputField label="Wastage (g)" value={item.wastage_weight} onChangeText={value => updateExchange(index, { wastage_weight: value })} keyboardType="decimal-pad" placeholder="0.000" /></View>
                  </View>
                  <InputField label="Rate per unit (₹)" value={item.rate_per_unit} onChangeText={value => updateExchange(index, { rate_per_unit: value })} keyboardType="decimal-pad" placeholder={findRate(item.metal_type, item.purity) ? String(findRate(item.metal_type, item.purity)?.rate_per_unit ?? findRate(item.metal_type, item.purity)?.rate_per_gram ?? '') : 'Enter rate'} />
                  <Text className="text-right text-xs font-extrabold text-amber-800">
                    Credit: {currency(Math.max(0, (Number(item.weight) - Number(item.wastage_weight || 0)) * (Number(item.rate_per_unit) || Number(findRate(item.metal_type, item.purity)?.rate_per_unit ?? findRate(item.metal_type, item.purity)?.rate_per_gram) || 0)))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="mb-4 rounded-2xl bg-[#173F35] p-4">
          <Text className="mb-3 text-base font-extrabold text-white">Bill summary</Text>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-xs text-white/70">Subtotal</Text>
            <Text className="text-xs font-bold text-white">{currency(billTotals.subtotal)}</Text>
          </View>
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="mr-2 text-xs text-white/70">Discount (₹)</Text>
            <TextInput
              accessibilityLabel="Bill discount"
              value={billDraft.discountAmount}
              onChangeText={value => setBillDraft(current => ({ ...current, discountAmount: value }))}
              keyboardType="decimal-pad"
              className="h-10 w-28 rounded-lg border border-white/20 bg-white/10 px-2 text-right text-sm font-bold text-white"
            />
          </View>
          {billDraft.paymentType === 'EXCHANGE_GOLD' ? (
            <View className="flex-row justify-between py-1.5">
              <Text className="text-xs text-white/70">Exchange credit</Text>
              <Text className="text-xs font-bold text-amber-200">−{currency(billTotals.exchangeCredit)}</Text>
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <InputField label="GST %" value={billDraft.gstRate} onChangeText={value => setBillDraft(current => ({ ...current, gstRate: value }))} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View className="flex-1">
              <CustomDropdown
                label="Tax mode"
                value={billDraft.taxMode}
                options={[
                  { value: 'Tax Exclusive', label: 'Tax Exclusive' },
                  { value: 'Tax Inclusive', label: 'Tax Inclusive' },
                ]}
                onSelect={value => setBillDraft(current => ({ ...current, taxMode: value as BillDraft['taxMode'] }))}
              />
            </View>
          </View>
          <View className="flex-row justify-between border-t border-white/15 py-2">
            <Text className="text-xs text-white/70">GST amount</Text>
            <Text className="text-xs font-bold text-white">{currency(billTotals.gstAmount)}</Text>
          </View>
          <View className="flex-row justify-between border-t border-white/15 pt-3">
            <Text className="text-sm font-extrabold text-white">Total bill</Text>
            <Text className="text-lg font-black text-amber-200">{currency(billTotals.total)}</Text>
          </View>
          {billDraft.tackOrder && Number(billDraft.tackOrder.advance_amount) > 0 ? (
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-white/70">Advance paid</Text>
              <Text className="text-xs font-bold text-emerald-200">−{currency(billDraft.tackOrder.advance_amount)}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          testID="billing-save-button"
          accessibilityRole="button"
          disabled={billSaving}
          onPress={() => void saveBill()}
          className={`min-h-12 flex-row items-center justify-center rounded-xl px-5 ${billSaving ? 'bg-[#8DA69B]' : 'bg-[#07564B]'}`}>
          {billSaving ? <ActivityIndicator color="white" /> : <Check size={18} color="white" />}
          <Text className="ml-2 text-sm font-extrabold text-white">{billSaving ? 'Saving bill…' : editingBillId ? 'Update bill' : 'Save bill'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderOrderList = () => (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={ordersLoading} onRefresh={() => void loadOrders()} />
      }>
      <View className="p-4 pb-5">
        <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-[#075348] p-4">
          <View className="mr-3 flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-emerald-200">
              Order management
            </Text>
            <Text className="mt-1 text-xl font-black text-white">Tack order overview</Text>
            <Text className="mt-1 text-xs leading-5 text-white/70">
              Manage pre-orders, order status and billing progress.
            </Text>
          </View>
          <Pressable
            testID="tack-new-button"
            accessibilityRole="button"
            onPress={openOrderForm}
            className="min-h-11 items-center justify-center rounded-xl bg-white px-3">
            <Plus size={18} color="#075348" />
            <Text className="mt-0.5 text-[10px] font-extrabold text-[#075348]">New order</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <SummaryCard label="Total orders" value={String(orders.length)} icon={ShoppingBag} tint="#E4F4ED" />
          <SummaryCard label="Awaiting confirmation" value={String(pendingOrderCount)} icon={CalendarDays} tint="#FFF0D9" />
          <SummaryCard label="Ready for billing" value={String(readyOrderCount)} icon={CheckCircle2} tint="#E7F1FB" />
          <SummaryCard label="Outstanding" value={currency(orderOutstanding)} icon={CreditCard} tint="#FCE9E9" />
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-3">
          <View className="mb-2 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
            <Search size={17} color="#7B8A83" />
            <TextInput
              accessibilityLabel="Search tack orders"
              value={orderSearch}
              onChangeText={setOrderSearch}
              placeholder="Search order, customer or phone"
              placeholderTextColor="#9AA6A1"
              className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
            />
            {orderSearch ? (
              <Pressable accessibilityLabel="Clear order search" onPress={() => setOrderSearch('')}>
                <X size={17} color="#7B8A83" />
              </Pressable>
            ) : null}
          </View>
          <CustomDropdown
            label="Order status"
            value={orderStatusFilter}
            options={ORDER_STATUS_FILTERS}
            onSelect={setOrderStatusFilter}
          />
          <CustomDropdown
            label="Payment status"
            value={orderPaymentFilter}
            options={PAYMENT_STATUS_FILTERS}
            onSelect={setOrderPaymentFilter}
          />
        </View>

        <View className="mb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-extrabold text-[#173F35]">Recent tack orders</Text>
            <Text className="mt-0.5 text-xs text-[#6B7E76]">
              {ordersLoading ? 'Loading orders…' : `${filteredOrders.length} order${filteredOrders.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh tack orders" onPress={() => void loadOrders()} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
            <RefreshCw size={17} color="#07564B" />
          </Pressable>
        </View>

        {ordersError ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm font-semibold text-rose-800">{ordersError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadOrders()} className="mt-3 self-start rounded-lg bg-rose-700 px-4 py-2">
              <Text className="text-xs font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : ordersLoading && orders.length === 0 ? (
          <View className="items-center rounded-2xl bg-white py-10">
            <ActivityIndicator color="#07564B" />
            <Text className="mt-3 text-sm text-[#6B7E76]">Loading tack orders…</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-[#D7E2DC] bg-white px-5 py-10">
            <Package size={28} color="#7B8A83" />
            <Text className="mt-3 text-base font-bold text-[#173F35]">
              {orders.length === 0 ? 'No tack orders yet' : 'No matching orders'}
            </Text>
            <Text className="mt-1 text-center text-xs text-[#6B7E76]">
              {orders.length === 0 ? 'Orders you create will appear here.' : 'Adjust your filters to see more orders.'}
            </Text>
          </View>
        ) : filteredOrders.map(order => {
          const status = orderStatus(order);
          const payment = orderPaymentStatus(order);
          const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
          return (
            <View key={String(order.id)} className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4">
              <View className="mb-3 flex-row items-start justify-between">
                <View className="mr-2 flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Tack order</Text>
                  <Text className="mt-1 text-base font-black text-[#173F35]">{order.order_no}</Text>
                </View>
                <View className={`rounded-full px-2.5 py-1 ${status === 'Ready' ? 'bg-sky-50' : status === 'Completed' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <Text className={`text-[10px] font-extrabold ${status === 'Ready' ? 'text-sky-800' : status === 'Completed' ? 'text-emerald-800' : 'text-amber-800'}`}>{status}</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <UserRound size={15} color="#B7791F" />
                <Text className="ml-2 flex-1 text-sm font-bold text-[#173F35]">{order.customer.name}</Text>
                <Text className="text-[10px] font-bold text-[#6B7E76]">{payment}</Text>
              </View>
              <View className="mt-1 flex-row items-center">
                <CalendarDays size={14} color="#7B8A83" />
                <Text className="ml-2 text-xs text-[#6B7E76]">{dateLabel(order.created_at)}</Text>
              </View>
              <View className="my-3 border-y border-[#F0F2EF] py-3">
                <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#7B8A83]">
                  Products · {itemCount} item{itemCount === 1 ? '' : 's'}
                </Text>
                {order.items.map((item, index) => (
                  <View key={`${String(item.product_id)}-${index}`} className="mb-1 flex-row justify-between">
                    <Text numberOfLines={1} className="mr-2 flex-1 text-xs text-[#52645F]">
                      {item.product_name} · Qty {item.quantity}
                    </Text>
                    <Text className="text-xs font-bold text-[#173F35]">{currency(item.total_price ?? item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>
              <View className="mb-3 flex-row justify-between">
                <View>
                  <Text className="text-[10px] uppercase text-[#7B8A83]">Paid · {currency(order.advance_amount)}</Text>
                  <Text className="mt-1 text-xs font-bold text-rose-700">Due · {currency(order.balance_due)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase text-[#7B8A83]">Total</Text>
                  <Text className="mt-1 text-base font-extrabold text-[#173F35]">{currency(order.total_amount)}</Text>
                </View>
              </View>
              {status !== 'Completed' ? (
                <CustomDropdown
                  label="Update order status"
                  value={ORDER_STATUS_OPTIONS.some(option => option.value === status) ? status : 'Order Placed'}
                  options={ORDER_STATUS_OPTIONS}
                  onSelect={value => void updateTackOrderStatus(order, value)}
                />
              ) : null}
              {status === 'Ready' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Create bill for ${order.order_no}`}
                  onPress={() => openBillFromOrder(order)}
                  className="min-h-11 flex-row items-center justify-center rounded-xl bg-[#07564B]">
                  <FileText size={16} color="white" />
                  <Text className="ml-2 text-sm font-extrabold text-white">Create bill</Text>
                </Pressable>
              ) : null}
              {updatingOrderId === String(order.id) ? (
                <View className="mt-2 flex-row items-center">
                  <ActivityIndicator size="small" color="#07564B" />
                  <Text className="ml-2 text-xs text-[#6B7E76]">Updating order…</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderOrderForm = () => (
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
      <View className="p-4 pb-6">
        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-2 text-base font-extrabold text-[#173F35]">Catalog products</Text>
          <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
            <Search size={16} color="#7B8A83" />
            <TextInput
              accessibilityLabel="Search catalog products for tack order"
              value={orderSearchCatalog}
              onChangeText={setOrderSearchCatalog}
              placeholder="Search by name, category or ID"
              placeholderTextColor="#9AA6A1"
              className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
            />
          </View>
          {catalogLoading ? (
            <ActivityIndicator color="#07564B" />
          ) : catalogError ? (
            <View>
              <Text className="text-sm text-rose-700">{catalogError}</Text>
              <Pressable onPress={() => void loadCatalog()} className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2">
                <Text className="text-xs font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View className="max-h-64">
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {orderProductResults.map(product => (
                  <View key={String(product.id)} className="mb-2 flex-row items-center justify-between rounded-xl bg-[#F8FAF8] p-3">
                    <View className="mr-2 flex-1">
                      <Text numberOfLines={1} className="text-sm font-bold text-[#173F35]">{product.name}</Text>
                      <Text numberOfLines={1} className="mt-0.5 text-xs text-[#6B7E76]">
                        {product.category || 'Uncategorized'} · {product.purity || 'Purity not set'}
                      </Text>
                      <Text className="mt-1 text-xs font-bold text-[#07564B]">{currency(productPrice(product))}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to tack order`} onPress={() => addOrderProduct(product)} className="h-9 w-9 items-center justify-center rounded-full bg-[#07564B]">
                      <Plus size={17} color="white" />
                    </Pressable>
                  </View>
                ))}
                {orderProductResults.length === 0 && !catalogLoading ? (
                  <Text className="py-4 text-center text-xs text-[#6B7E76]">No matching active products.</Text>
                ) : null}
              </ScrollView>
            </View>
          )}
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Pre-order items · {orderDraft.items.length}</Text>
          {orderDraft.items.length === 0 ? (
            <Text className="rounded-xl bg-[#F8FAF8] p-4 text-center text-xs text-[#6B7E76]">Choose a catalog product to start this order.</Text>
          ) : orderDraft.items.map(item => (
            <View key={item.key} className="mb-2 flex-row items-center rounded-xl bg-[#F8FAF8] p-3">
              <View className="mr-2 flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-[#173F35]">{item.product_name}</Text>
                <Text className="mt-0.5 text-xs text-[#6B7E76]">{item.category || 'Product'} · {currency(item.price)} each</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${item.product_name} quantity`} onPress={() => updateOrderQuantity(item.key, item.quantity - 1)} className="h-8 w-8 items-center justify-center rounded-lg bg-white">
                <Minus size={14} color="#07564B" />
              </Pressable>
              <Text className="mx-3 min-w-5 text-center text-sm font-extrabold text-[#173F35]">{item.quantity}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${item.product_name} quantity`} onPress={() => updateOrderQuantity(item.key, item.quantity + 1)} className="h-8 w-8 items-center justify-center rounded-lg bg-white">
                <Plus size={14} color="#07564B" />
              </Pressable>
              <Text className="ml-3 text-xs font-bold text-[#173F35]">{currency(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Customer details</Text>
          <InputField label="Customer name *" value={orderDraft.customer.name} onChangeText={value => updateOrderCustomer('name', value)} placeholder="Enter customer name" />
          <InputField label="Phone number *" value={orderDraft.customer.phone} onChangeText={value => updateOrderCustomer('phone', value)} keyboardType="phone-pad" placeholder="Enter phone number" />
          <InputField label="Email address" value={orderDraft.customer.email} onChangeText={value => updateOrderCustomer('email', value)} keyboardType="email-address" placeholder="Optional" />
          <InputField label="Address" value={orderDraft.customer.address} onChangeText={value => updateOrderCustomer('address', value)} multiline placeholder="Street address" />
          <View className="flex-row gap-2">
            <View className="flex-1"><InputField label="City" value={orderDraft.customer.city || ''} onChangeText={value => updateOrderCustomer('city', value)} placeholder="City" /></View>
            <View className="flex-1"><InputField label="District" value={orderDraft.customer.district || ''} onChangeText={value => updateOrderCustomer('district', value)} placeholder="District" /></View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1"><InputField label="State" value={orderDraft.customer.state || ''} onChangeText={value => updateOrderCustomer('state', value)} placeholder="State" /></View>
            <View className="flex-1"><InputField label="PIN code" value={orderDraft.customer.pincode || ''} onChangeText={value => updateOrderCustomer('pincode', value)} keyboardType="number-pad" placeholder="6 digits" /></View>
          </View>
        </View>

        <View className="mb-4 rounded-2xl bg-[#173F35] p-4">
          <Text className="mb-3 text-base font-extrabold text-white">Order summary</Text>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-xs text-white/70">Subtotal</Text>
            <Text className="text-xs font-bold text-white">{currency(orderTotals.subtotal)}</Text>
          </View>
          <InputField label="GST rate (%)" value={orderDraft.gstRate} onChangeText={value => setOrderDraft(current => ({ ...current, gstRate: value }))} keyboardType="decimal-pad" placeholder="0" />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: orderDraft.gstIncluded }}
            onPress={() => setOrderDraft(current => ({ ...current, gstIncluded: !current.gstIncluded }))}
            className="mb-3 min-h-10 flex-row items-center">
            <View className={`mr-2 h-5 w-5 items-center justify-center rounded border ${orderDraft.gstIncluded ? 'border-emerald-300 bg-emerald-600' : 'border-white/50'}`}>
              {orderDraft.gstIncluded ? <Check size={13} color="white" /> : null}
            </View>
            <Text className="text-xs font-semibold text-white/80">Apply GST to this order</Text>
          </Pressable>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <CustomDropdown
                label="Discount type"
                value={orderDraft.discountType}
                options={[
                  { value: 'Percent', label: 'Percent' },
                  { value: 'Fixed', label: 'Fixed amount' },
                ]}
                onSelect={value => setOrderDraft(current => ({ ...current, discountType: value as OrderDraft['discountType'] }))}
              />
            </View>
            <View className="flex-1">
              <InputField label="Discount" value={orderDraft.discountValue} onChangeText={value => setOrderDraft(current => ({ ...current, discountValue: value }))} keyboardType="decimal-pad" placeholder="0" />
            </View>
          </View>
          <InputField label="Advance amount (₹)" value={orderDraft.advanceAmount} onChangeText={value => setOrderDraft(current => ({ ...current, advanceAmount: value }))} keyboardType="decimal-pad" placeholder="0" />
          <View className="flex-row justify-between border-t border-white/15 py-2">
            <Text className="text-xs text-white/70">GST amount</Text>
            <Text className="text-xs font-bold text-white">{currency(orderTotals.gstAmount)}</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-xs text-white/70">Discount applied</Text>
            <Text className="text-xs font-bold text-white">−{currency(orderTotals.discount)}</Text>
          </View>
          <View className="flex-row justify-between border-t border-white/15 pt-3">
            <Text className="text-sm font-extrabold text-white">Total</Text>
            <Text className="text-lg font-black text-amber-200">{currency(orderTotals.total)}</Text>
          </View>
        </View>

        <Pressable
          testID="tack-order-save-button"
          accessibilityRole="button"
          disabled={orderSaving}
          onPress={() => void createTackOrder()}
          className={`min-h-12 flex-row items-center justify-center rounded-xl px-5 ${orderSaving ? 'bg-[#8DA69B]' : 'bg-[#07564B]'}`}>
          {orderSaving ? <ActivityIndicator color="white" /> : <Check size={18} color="white" />}
          <Text className="ml-2 text-sm font-extrabold text-white">{orderSaving ? 'Creating order…' : 'Create tack order'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  return (
    <View testID="orders-management" className="flex-1 bg-[#F8F7F2]">
      <View className="flex-1">
        {section === 'billing'
          ? billPage === 'list'
            ? renderBillList()
            : (
                <CreateBillScreen
                  title={editingBillId ? 'Edit bill' : 'Create a new bill'}
                  onBack={() => setBillPage('list')}>
                  {renderBillForm()}
                </CreateBillScreen>
              )
          : ordersPage === 'list'
            ? renderOrderList()
            : (
                <CreateTackOrderScreen onBack={() => setOrdersPage('list')}>
                  {renderOrderForm()}
                </CreateTackOrderScreen>
              )}
      </View>
      {billPage === 'list' && ordersPage === 'list' ? (
        <View testID="orders-mode-bar" className="flex-row border-t border-[#E2E8E3] bg-white px-3 py-2">
          <Pressable
            testID="orders-mode-tab-billing"
            accessibilityRole="button"
            accessibilityState={{ selected: section === 'billing' }}
            onPress={() => setSection('billing')}
            className={`mr-2 min-h-11 flex-1 flex-row items-center justify-center rounded-xl ${section === 'billing' ? 'bg-[#07564B]' : 'bg-[#F2F5F2]'}`}>
            <CreditCard size={17} color={section === 'billing' ? 'white' : '#52645F'} />
            <Text className={`ml-2 text-sm font-extrabold ${section === 'billing' ? 'text-white' : 'text-[#52645F]'}`}>Billing</Text>
          </Pressable>
          <Pressable
            testID="orders-mode-tab-orders"
            accessibilityRole="button"
            accessibilityState={{ selected: section === 'orders' }}
            onPress={() => setSection('orders')}
            className={`min-h-11 flex-1 flex-row items-center justify-center rounded-xl ${section === 'orders' ? 'bg-[#07564B]' : 'bg-[#F2F5F2]'}`}>
            <ShoppingBag size={17} color={section === 'orders' ? 'white' : '#52645F'} />
            <Text className={`ml-2 text-sm font-extrabold ${section === 'orders' ? 'text-white' : 'text-[#52645F]'}`}>Orders</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={viewingBill !== null} transparent animationType="slide" onRequestClose={() => setViewingBill(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable accessibilityLabel="Close bill details" onPress={() => setViewingBill(null)} className="flex-1" />
          {viewingBill ? (
            <View className="max-h-[80%] rounded-t-3xl bg-[#F8F7F2] p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#6B7E76]">Bill details</Text>
                  <Text className="mt-1 text-lg font-black text-[#173F35]">{viewingBill.invoice_no}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setViewingBill(null)} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <X size={19} color="#52645F" />
                </Pressable>
              </View>
              <ScrollView>
                <View className="mb-3 rounded-2xl bg-white p-4">
                  <Text className="text-xs font-extrabold text-[#173F35]">Customer</Text>
                  {viewingBill.customers.map((customer, index) => (
                    <View key={`${customer.phone}-${index}`} className="mt-2">
                      <Text className="text-sm font-bold text-[#173F35]">{customer.name}</Text>
                      <Text className="text-xs text-[#6B7E76]">{customer.phone}</Text>
                    </View>
                  ))}
                </View>
                <View className="mb-3 rounded-2xl bg-white p-4">
                  <Text className="mb-2 text-xs font-extrabold text-[#173F35]">Products</Text>
                  {viewingBill.products.map((item, index) => (
                    <View key={`${String(item.product_id)}-${index}`} className="mb-2 flex-row justify-between">
                      <Text className="mr-2 flex-1 text-xs text-[#52645F]">{item.product_name} · Qty {item.quantity}</Text>
                      <Text className="text-xs font-bold text-[#173F35]">{currency(Number(item.price) * item.quantity)}</Text>
                    </View>
                  ))}
                </View>
                <View className="mb-3 rounded-2xl bg-white p-4">
                  <View className="flex-row justify-between py-1"><Text className="text-xs text-[#6B7E76]">Subtotal</Text><Text className="text-xs font-bold">{currency(viewingBill.sub_total)}</Text></View>
                  <View className="flex-row justify-between py-1"><Text className="text-xs text-[#6B7E76]">Discount</Text><Text className="text-xs font-bold">−{currency(viewingBill.discount_amount)}</Text></View>
                  <View className="flex-row justify-between py-1"><Text className="text-xs text-[#6B7E76]">GST ({viewingBill.gst_rate}%)</Text><Text className="text-xs font-bold">{currency(viewingBill.gst_amount)}</Text></View>
                  <View className="flex-row justify-between border-t border-[#E6E9E3] pt-2"><Text className="text-sm font-extrabold">Total</Text><Text className="text-sm font-black">{currency(viewingBill.total_amount)}</Text></View>
                  <View className="mt-2 flex-row justify-between"><Text className="text-xs font-bold text-emerald-700">Paid {currency(viewingBill.paid_amount)}</Text><Text className="text-xs font-bold text-rose-700">Due {currency(viewingBill.balance_due)}</Text></View>
                </View>
                <View className="mb-3 flex-row gap-2">
                  {Number(viewingBill.balance_due) > 0 ? (
                    <Pressable onPress={() => startBillPayment(viewingBill)} className="min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-700">
                      <Text className="text-xs font-extrabold text-white">Collect payment</Text>
                    </Pressable>
                  ) : null}
                  {Number(viewingBill.paid_amount) > 0 ? (
                    <Pressable onPress={() => startBillPayment(viewingBill, 'REFUND')} className="min-h-11 flex-1 items-center justify-center rounded-xl bg-rose-700">
                      <Text className="text-xs font-extrabold text-white">Refund</Text>
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={paymentDraft !== null} transparent animationType="slide" onRequestClose={() => setPaymentDraft(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable accessibilityLabel="Close payment form" onPress={() => setPaymentDraft(null)} className="flex-1" />
          {paymentDraft ? (
            <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[85%] rounded-t-3xl bg-[#F8F7F2] p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${paymentDraft.paymentKind === 'PAYMENT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {paymentDraft.paymentKind === 'PAYMENT' ? 'Billing collection' : 'Bill refund'}
                  </Text>
                  <Text className="mt-1 text-lg font-black text-[#173F35]">{paymentDraft.bill.invoice_no}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setPaymentDraft(null)} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <X size={19} color="#52645F" />
                </Pressable>
              </View>
              <View className="mb-3 rounded-2xl bg-white p-4">
                <Text className="mb-3 text-xs text-[#6B7E76]">
                  Paid {currency(paymentDraft.bill.paid_amount)} · Due {currency(paymentDraft.bill.balance_due)}
                </Text>
                <InputField label="Amount (₹) *" value={paymentDraft.amount} onChangeText={value => setPaymentDraft(current => current ? { ...current, amount: value } : current)} keyboardType="decimal-pad" placeholder="0.00" />
                <CustomDropdown
                  label="Payment method"
                  value={paymentDraft.paymentMethod}
                  options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
                  onSelect={value => setPaymentDraft(current => current ? { ...current, paymentMethod: value as PaymentMethod } : current)}
                />
                <InputField label="Date and time *" value={paymentDraft.paymentDate} onChangeText={value => setPaymentDraft(current => current ? { ...current, paymentDate: value } : current)} placeholder="YYYY-MM-DDTHH:mm" />
                <InputField label="Reference number / transaction ID" value={paymentDraft.referenceNumber} onChangeText={value => setPaymentDraft(current => current ? { ...current, referenceNumber: value } : current)} placeholder="Optional" />
              </View>
              <Pressable disabled={billSaving} onPress={() => void saveBillPayment()} className={`mb-4 min-h-12 flex-row items-center justify-center rounded-xl ${paymentDraft.paymentKind === 'PAYMENT' ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                {billSaving ? <ActivityIndicator color="white" /> : <Check size={18} color="white" />}
                <Text className="ml-2 text-sm font-extrabold text-white">
                  {billSaving ? 'Saving…' : paymentDraft.paymentKind === 'PAYMENT' ? 'Confirm collection' : 'Confirm refund'}
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
