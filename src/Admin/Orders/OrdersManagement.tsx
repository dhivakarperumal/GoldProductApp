import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { mediaUrl, parseArray as parseImageArray } from '../Products/inventory';
import DashboardMetricCard, {
  dashboardMetricPalettes,
} from '../Components/DashboardMetricCard';
import { CustomDropdown, DatePicker } from '../Loans/FormControls';
import { INDIAN_STATES_AND_UTS } from '../Loans/loanOptions';
import type { Category, Metal } from '../Products/inventory';
import CreateBillScreen from './CreateBillScreen';
import CreateTackOrderScreen from './CreateTackOrderScreen';
import { printBillReceipt } from './billActions';

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
  product_code?: string;
  images?: unknown;
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
  product_code: string;
  image?: string;
  category: string;
  purity: string;
  metal_type: string;
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
const screenStyles = StyleSheet.create({
  stepButtonEnabled: { backgroundColor: '#07564B' },
  stepButtonDisabled: { backgroundColor: '#B7C7C0' },
  stepButtonLabelEnabled: { color: '#FFFFFF' },
  stepButtonLabelDisabled: { color: '#52645F' },
  weightInput: { paddingVertical: 0 },
});
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
  metal_type: '',
  purity: '',
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
    throw new TypeError('The server returned an invalid take order.');
  }
  const rawItems = parseArray(value.items, 'take order items');
  const items = rawItems.map((rawItem, index) => {
    if (!isRecord(rawItem) || rawItem.product_id == null) {
      throw new TypeError(`Take order item ${index + 1} is invalid.`);
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
    customer: parseCustomer(value.customer, 'take order customer'),
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
    product_code: typeof value.product_code === 'string' ? value.product_code : '',
    images: value.images,
    category: typeof value.category === 'string' ? value.category : '',
    purity: typeof value.purity === 'string' ? value.purity : '',
    metal_type: typeof value.metal_type === 'string' ? value.metal_type : '',
    status: typeof value.status === 'string' ? value.status : '',
    final_selling_price: (value.final_selling_price ?? value.final_price) as number | string | undefined,
    offer_price: value.offer_price as number | string | undefined,
    mrp: value.mrp as number | string | undefined,
    net_gold_weight: (value.net_gold_weight ?? value.net_weight) as number | string | null | undefined,
    variants: value.variants,
  };
}

function firstCatalogImage(product: CatalogProduct): string | undefined {
  const image = parseImageArray(product.images)[0];
  if (image) return image;
  const firstVariant = Array.isArray(product.variants) && isRecord(product.variants[0])
    ? product.variants[0]
    : null;
  return firstVariant ? parseImageArray(firstVariant.images)[0] : undefined;
}

function currency(value: number | string | null | undefined): string {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function purityCode(purity: string): string {
  const normalized = purity.trim().toLowerCase();
  const grade = normalized.match(/\b(999|916|833|750|585)\b/);
  if (grade) return grade[1];
  const karat = normalized.match(/\b(24|22|20|18|14)\s*k\b/);
  const codes: Record<string, string> = {
    '24': '999',
    '22': '916',
    '20': '833',
    '18': '750',
    '14': '585',
  };
  return karat ? codes[karat[1]] : '';
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
  labelClassName = 'text-[#52645F]',
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  editable = true,
}: {
  label: string;
  labelClassName?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${labelClassName}`}>
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
  id,
  label,
  value,
  icon,
  palette,
}: {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  palette: keyof typeof dashboardMetricPalettes;
}) {
  return (
    <DashboardMetricCard
      id={id}
      label={label}
      value={value}
      icon={icon}
      palette={dashboardMetricPalettes[palette]}
      testID={`dashboard-metric-${id}`}
      className="min-w-[45%] flex-1 basis-[45%]"
    />
  );
}

type OrdersManagementProps = {
  requestedSection?: Section;
  sectionRequestKey?: number;
  onFormVisibilityChange?: (visible: boolean) => void;
};

export default function OrdersManagement({
  requestedSection,
  sectionRequestKey = 0,
  onFormVisibilityChange,
}: OrdersManagementProps) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>(requestedSection ?? 'billing');
  const [ordersPage, setOrdersPage] = useState<'list' | 'create'>('list');
  const [orderFormStep, setOrderFormStep] = useState<'products' | 'details'>('products');
  const [billPage, setBillPage] = useState<'list' | 'form'>('list');
  const [billFormStep, setBillFormStep] = useState<'products' | 'details'>('products');

  useEffect(() => {
    if (sectionRequestKey > 0 && requestedSection) {
      setSection(requestedSection);
      setBillPage('list');
      setOrdersPage('list');
    }
  }, [requestedSection, sectionRequestKey]);
  const [orders, setOrders] = useState<TackOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [exchangeCategories, setExchangeCategories] = useState<Category[]>([]);
  const [exchangeMetals, setExchangeMetals] = useState<Metal[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [exchangeOptionsLoaded, setExchangeOptionsLoaded] = useState(false);
  const [exchangeOptionsLoading, setExchangeOptionsLoading] = useState(false);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [billsError, setBillsError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [ratesError, setRatesError] = useState('');
  const [exchangeOptionsError, setExchangeOptionsError] = useState('');
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
  const [printingBillId, setPrintingBillId] = useState<string | null>(null);
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
        throw new TypeError('The server returned an invalid take-orders list.');
      }
      setOrders(response.data.map(parseTackOrder));
    } catch (error) {
      const message = errorText(error, 'Could not load take orders.');
      setOrdersError(message);
      setOrders([]);
      console.error('[Orders] Could not load take orders:', error);
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
    setRatesLoading(true);
    setRatesError('');
    try {
      const response = await api.get('/gold-rates/current');
      if (!isRecord(response.data) || !Array.isArray(response.data.rates)) {
        throw new TypeError('The server returned an invalid daily gold-rate list.');
      }
      setGoldRates(response.data.rates.filter(isRecord) as GoldRate[]);
      setRatesLoaded(true);
    } catch (error) {
      setRatesError(errorText(error, 'Could not load current gold rates.'));
      setGoldRates([]);
      setRatesLoaded(false);
      console.error('[Orders] Could not load current gold rates:', error);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const loadExchangeOptions = useCallback(async () => {
    setExchangeOptionsLoading(true);
    setExchangeOptionsError('');
    try {
      const [categoryResponse, metalResponse] = await Promise.all([
        api.get<Category[]>('/categories/manage'),
        api.get<Metal[]>('/metals/manage'),
      ]);
      if (!Array.isArray(categoryResponse.data) || !Array.isArray(metalResponse.data)) {
        throw new TypeError('The server returned invalid exchange category or metal options.');
      }
      setExchangeCategories(categoryResponse.data);
      setExchangeMetals(metalResponse.data);
      setExchangeOptionsLoaded(true);
    } catch (error) {
      setExchangeCategories([]);
      setExchangeMetals([]);
      setExchangeOptionsError(errorText(error, 'Could not load exchange categories and metals.'));
      console.error('[Billing] Could not load exchange options:', error);
    } finally {
      setExchangeOptionsLoading(false);
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
    if (
      section === 'billing' &&
      billPage === 'form' &&
      billDraft.paymentType === 'EXCHANGE_GOLD' &&
      !ratesLoaded &&
      !ratesLoading &&
      !ratesError
    ) {
      loadGoldRates();
    }
  }, [
    billDraft.paymentType,
    billPage,
    loadGoldRates,
    ratesError,
    ratesLoaded,
    ratesLoading,
    section,
  ]);

  useEffect(() => {
    if (
      section === 'billing' &&
      billPage === 'form' &&
      billDraft.paymentType === 'EXCHANGE_GOLD' &&
      !exchangeOptionsLoaded &&
      !exchangeOptionsLoading &&
      !exchangeOptionsError
    ) {
      loadExchangeOptions();
    }
  }, [
    billDraft.paymentType,
    billPage,
    exchangeOptionsError,
    exchangeOptionsLoaded,
    exchangeOptionsLoading,
    loadExchangeOptions,
    section,
  ]);

  const orderTotals = useMemo(() => {
    const subtotal = orderDraft.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const requestedDiscount = Math.max(0, Number(orderDraft.discountValue) || 0);
    const discount =
      orderDraft.discountType === 'Percent'
        ? (subtotal * Math.min(requestedDiscount, 100)) / 100
        : requestedDiscount;
    const appliedDiscount = Math.min(subtotal, discount);
    const gstRate = Number(orderDraft.gstRate);
    const gstAmount =
      orderDraft.gstIncluded && Number.isFinite(gstRate) && gstRate >= 0
        ? (subtotal * Math.min(gstRate, 100)) / 100
        : 0;
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
          (rate.purity.toLowerCase() === purity.trim().toLowerCase() ||
            (purityCode(rate.purity) !== '' && purityCode(rate.purity) === purityCode(purity))),
      ),
    [goldRates],
  );

  const exchangeCategoryOptions = useMemo(
    () => exchangeCategories
      .filter(category => (category.status || 'Active').toLowerCase() === 'active')
      .map(category => ({ value: category.name, label: category.name })),
    [exchangeCategories],
  );
  const exchangeMetalOptions = useMemo(
    () => exchangeMetals
      .filter(metal => (metal.status || 'Active').toLowerCase() === 'active')
      .map(metal => ({ value: metal.name, label: metal.name }))
      .filter((option, index, options) =>
        options.findIndex(item => item.value.toLowerCase() === option.value.toLowerCase()) === index,
      ),
    [exchangeMetals],
  );
  const exchangePurityOptions = useCallback((metalType: string): Option[] => {
    const values = [
      ...exchangeMetals
        .filter(metal => metal.name.toLowerCase() === metalType.trim().toLowerCase())
        .map(metal => metal.purity || ''),
      ...goldRates
        .filter(rate => rate.metal_type.toLowerCase() === metalType.trim().toLowerCase())
        .map(rate => rate.purity),
    ].map(value => value.trim()).filter(Boolean);
    const uniqueValues = values.filter((value, index) =>
      values.findIndex(item =>
        purityCode(item) ? purityCode(item) === purityCode(value) : item.toLowerCase() === value.toLowerCase(),
      ) === index,
    );
    const labels: Record<string, string> = {
      '999': '24K / 999',
      '916': '22K / 916',
      '833': '20K / 833',
      '750': '18K / 750',
      '585': '14K / 585',
    };
    return uniqueValues.map(value => ({
      value,
      label: labels[purityCode(value)] || value,
    }));
  }, [exchangeMetals, goldRates]);

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
    return catalog.filter(product =>
      !query ||
      `${product.name} ${product.category} ${product.purity} ${product.product_code} ${product.id}`
        .toLowerCase()
        .includes(query),
    );
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
            product_code: product.product_code || '',
            image: mediaUrl(firstCatalogImage(product)),
            category: product.category || '',
            purity: product.purity || '',
            metal_type: product.metal_type || '',
            variant_color: variantColor,
            variant_size: variantSize,
            quantity: 1,
            price: productPrice(product),
            net_gold_weight:
              product.net_gold_weight == null
                ? undefined
                : String(product.net_gold_weight),
          },
        ],
      };
    });
  };

  const updateOrderWeight = (key: string, netGoldWeight: string) => {
    setOrderDraft(current => ({
      ...current,
      items: current.items.map(item =>
        item.key === key ? { ...item, net_gold_weight: netGoldWeight } : item,
      ),
    }));
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
      showAlert('Products required', 'Add at least one catalog product to this take order.', { variant: 'warning' });
      return;
    }
    const invalidWeight = orderDraft.items.some(item => {
      if (item.net_gold_weight == null || String(item.net_gold_weight).trim() === '') {
        return false;
      }
      const weight = Number(item.net_gold_weight);
      return !Number.isFinite(weight) || weight < 0;
    });
    if (invalidWeight) {
      showAlert('Invalid product weight', 'Enter a valid non-negative net weight for each product.', { variant: 'warning' });
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
          ...(item.net_gold_weight != null && String(item.net_gold_weight).trim() !== ''
            ? { net_gold_weight: Number(item.net_gold_weight) }
            : {}),
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
      setOrderFormStep('products');
      onFormVisibilityChange?.(false);
      setOrdersPage('list');
      showAlert(
        'Take order created',
        `${created.order_no} was created with status ${created.order_status}.`,
        { variant: 'success' },
      );
    } catch (error) {
      const message = errorText(error, 'Could not create take order.');
      setOrdersError(message);
      showAlert('Could not create take order', message, { variant: 'error' });
      console.error('[Orders] Could not create take order:', error);
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
      console.error('[Orders] Could not update take order status:', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openNewBill = () => {
    onFormVisibilityChange?.(true);
    setEditingBillId(null);
    setBillFormStep('products');
    setBillDraft(emptyBillDraft());
    setBillSearchCatalog('');
    setBillPage('form');
  };

  const openBillFromOrder = (order: TackOrder) => {
    onFormVisibilityChange?.(true);
    setEditingBillId(null);
    setBillDraft({
      ...emptyBillDraft(),
      customer: { ...order.customer },
      items: order.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        category: item.category || 'Take Order',
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
    setBillFormStep('details');
    setBillPage('form');
    setSection('billing');
  };

  const openEditBill = (bill: Bill) => {
    if (Number(bill.paid_amount) > 0 || Number(bill.payment_count) > 0) {
      showAlert('Bill cannot be edited', 'Bills with payment history cannot be changed.', { variant: 'warning' });
      return;
    }
    onFormVisibilityChange?.(true);
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
    setBillFormStep('products');
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

  const updateExchangeMetal = (index: number, metalType: string) => {
    updateExchange(index, { metal_type: metalType, purity: '', rate_per_unit: '' });
  };

  const updateExchangePurity = (index: number, purity: string) => {
    const item = billDraft.exchanges[index];
    const rate = item ? findRate(item.metal_type, purity) : undefined;
    updateExchange(index, {
      purity,
      rate_per_unit: rate
        ? String(rate.rate_per_unit ?? rate.rate_per_gram ?? '')
        : '',
    });
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
      showAlert('Invalid advance', 'The take order advance cannot exceed the bill total.', { variant: 'warning' });
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
      setBillFormStep('products');
      onFormVisibilityChange?.(false);
      setBillPage('list');
      showAlert(
        'Bill saved',
        response.data.already_exists
          ? 'This take order already has a bill.'
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

  const printBill = async (bill: Bill) => {
    if (printingBillId) return;
    setPrintingBillId(String(bill.id));
    try {
      await printBillReceipt(bill);
    } catch (error) {
      const message = errorText(error, 'Could not prepare the bill PDF.');
      showAlert('Could not print bill', message, { variant: 'error' });
      console.error('[Billing] Could not print bill:', error);
    } finally {
      setPrintingBillId(null);
    }
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
    onFormVisibilityChange?.(true);
    setOrderDraft(emptyOrderDraft());
    setOrderSearchCatalog('');
    setOrderFormStep('products');
    setOrdersPage('create');
  };

  const renderBillList = () => (
    <>
    <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={billsLoading} onRefresh={() => void loadBills()} />
        }>
      <View className="p-4 pb-24">
        <View className="mb-2 flex-row flex-wrap gap-3">
          <SummaryCard id="billing-total-billed" label="Total billed" value={currency(billedTotal)} icon={CreditCard} palette="total_products" />
          <SummaryCard id="billing-collected" label="Collected" value={currency(paidTotal)} icon={CheckCircle2} palette="completed_loans" />
          <SummaryCard id="billing-balance-due" label="Balance due" value={currency(outstandingTotal)} icon={CalendarDays} palette="low_stock_products" />
          <SummaryCard id="billing-invoice-count" label="Total invoices" value={String(bills.length)} icon={FileText} palette="total_customers" />
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
              <DatePicker
                label="From"
                value={billStartDate}
                onChange={setBillStartDate}
                maximumDate={billEndDate ? new Date(`${billEndDate}T00:00:00`) : undefined}
              />
            </View>
            <View className="flex-1">
              <DatePicker
                label="To"
                value={billEndDate}
                onChange={setBillEndDate}
                minimumDate={billStartDate ? new Date(`${billStartDate}T00:00:00`) : undefined}
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
                  <Text className="mt-1 text-[10px] font-bold text-emerald-700">Linked take order</Text>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              testID={`bill-actions-scroll-${String(bill.id)}`}>
              <View className="flex-row flex-nowrap gap-2">
              <Pressable
                testID={`print-bill-${String(bill.id)}`}
                accessibilityRole="button"
                accessibilityLabel={`Print bill ${bill.invoice_no}`}
                disabled={printingBillId !== null}
                onPress={() => printBill(bill)}
                className="min-h-10 flex-row items-center rounded-lg bg-[#EAF3EF] px-3 disabled:opacity-50">
                {printingBillId === String(bill.id) ? (
                  <ActivityIndicator size="small" color="#07564B" />
                ) : (
                  <Printer size={15} color="#07564B" />
                )}
                <Text className="ml-1.5 text-xs font-bold text-[#07564B]">
                  {printingBillId === String(bill.id) ? 'Preparing…' : 'Print'}
                </Text>
              </Pressable>
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
            </ScrollView>
          </View>
        ))}
      </View>
    </ScrollView>
    <Pressable
        testID="billing-new-button"
        accessibilityRole="button"
        accessibilityLabel="Create new bill"
        onPress={openNewBill}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
        <Plus size={26} color="white" />
    </Pressable>
    </>
  );

  const renderBillForm = () => (
    <View className="flex-1">
      <ScrollView
        testID="billing-form-scroll"
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <View className="p-4">
          <View className="mb-4 flex-row items-center justify-between rounded-xl bg-[#EAF3EF] p-3">
            <View>
              <Text className="text-xs font-extrabold text-[#07564B]">
                {billFormStep === 'products' && !billDraft.tackOrder
                  ? 'Step 1 of 2 · Products'
                  : 'Step 2 of 2 · Bill details'}
              </Text>
              <Text className="mt-0.5 text-[10px] text-[#52645F]">
                {billFormStep === 'products' && !billDraft.tackOrder
                  ? 'Choose products and review quantities.'
                  : 'Enter customer, payment and tax details.'}
              </Text>
            </View>
            <Text className="text-xs font-extrabold text-[#07564B]">
              {billDraft.items.length} product{billDraft.items.length === 1 ? '' : 's'}
            </Text>
          </View>

          {billFormStep === 'products' && !billDraft.tackOrder ? (
            <>
              <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-3">
                <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
                  <Search size={16} color="#7B8A83" />
                  <TextInput
                    accessibilityLabel="Search catalog products for bill"
                    value={billSearchCatalog}
                    onChangeText={setBillSearchCatalog}
                    placeholder="Search products by name or ID"
                    placeholderTextColor="#9AA6A1"
                    className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
                  />
                </View>
                {catalogLoading ? (
                  <View className="items-center py-8">
                    <ActivityIndicator color="#07564B" />
                    <Text className="mt-2 text-xs text-[#6B7E76]">Loading products…</Text>
                  </View>
                ) : catalogError ? (
                  <View className="py-2">
                    <Text className="text-sm text-rose-700">{catalogError}</Text>
                    <Pressable onPress={() => void loadCatalog()} className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2">
                      <Text className="text-xs font-bold text-white">Retry</Text>
                    </Pressable>
                  </View>
                ) : billProductResults.length === 0 ? (
                  <Text className="py-8 text-center text-xs text-[#6B7E76]">
                    {catalog.length ? 'No matching products.' : 'No active products available.'}
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {billProductResults.map(product => {
                      const image = mediaUrl(firstCatalogImage(product));
                      const isAdded = billDraft.items.some(
                        item => String(item.product_id) === String(product.id),
                      );
                      return (
                        <View
                          key={String(product.id)}
                          testID={`billing-product-${String(product.id)}`}
                          className="mb-3 w-[48%] overflow-hidden rounded-xl border border-[#E6E9E3] bg-white">
                          {image ? (
                            <Image
                              source={{ uri: image }}
                              resizeMode="cover"
                              className="h-24 w-full bg-[#F3F4F1]"
                            />
                          ) : (
                            <View className="h-24 items-center justify-center bg-[#EAF3EF]">
                              <Package size={24} color="#07564B" />
                            </View>
                          )}
                          <View className="p-2.5">
                            <Text numberOfLines={1} className="text-sm font-extrabold text-[#173F35]">
                              {product.name}
                            </Text>
                            <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7E76]">
                              {product.product_code || `Product ID: ${product.id}`}
                            </Text>
                            <Text numberOfLines={1} className="mt-1 text-[10px] text-[#6B7E76]">
                              {product.category || 'Uncategorized'} · {product.metal_type || 'Metal'} · {product.purity || 'Purity'}
                            </Text>
                            <View className="mt-2 flex-row items-center justify-between">
                              <Text numberOfLines={1} className="mr-1 flex-1 text-xs font-extrabold text-[#07564B]">
                                {currency(productPrice(product))}
                              </Text>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${isAdded ? 'Add another' : 'Add'} ${product.name} to bill`}
                                onPress={() => addBillProduct(product)}
                                className="h-9 w-9 items-center justify-center rounded-lg bg-[#07564B]">
                                <Plus size={18} color="white" />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="mb-2 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                <View className="mb-3 flex-row items-center justify-between border-b border-[#E6E9E3] pb-3">
                  <View>
                    <Text className="text-base font-extrabold text-[#173F35]">Products in bill</Text>
                    <Text className="mt-0.5 text-xs text-[#6B7E76]">
                      {billDraft.items.reduce((count, item) => count + item.quantity, 0)} items selected
                    </Text>
                  </View>
                  <View className="rounded-full border border-[#DDE6E0] bg-[#EAF3EF] px-3 py-1">
                    <Text className="text-xs font-bold text-[#07564B]">{billDraft.items.length} products</Text>
                  </View>
                </View>
                {billDraft.items.length === 0 ? (
                  <Text className="py-5 text-center text-xs text-[#6B7E76]">
                    Add products above to start this bill.
                  </Text>
                ) : billDraft.items.map((item, index) => {
                  const product = catalog.find(
                    catalogItem => String(catalogItem.id) === String(item.product_id),
                  );
                  const image = product ? mediaUrl(firstCatalogImage(product)) : undefined;
                  return (
                    <View key={`${item.product_id}-${index}`} className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] p-3">
                      {image ? (
                        <Image source={{ uri: image }} className="mr-3 h-12 w-12 rounded-xl bg-white" />
                      ) : (
                        <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3EF]">
                          <Package size={18} color="#07564B" />
                        </View>
                      )}
                      <View className="mr-2 min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-extrabold text-[#173F35]">
                          {item.product_name}
                        </Text>
                        <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7E76]">
                          {item.category || 'Product'} · {item.purity || '—'} · {currency(item.price)} each
                        </Text>
                      </View>
                      <TextInput
                        accessibilityLabel={`Quantity for ${item.product_name}`}
                        value={String(item.quantity)}
                        onChangeText={value => updateBillItem(index, { quantity: Math.max(1, Number(value) || 1) })}
                        keyboardType="number-pad"
                        className="mr-2 h-10 w-12 rounded-lg border border-[#DDE6E0] bg-white text-center text-sm font-bold text-[#173F35]"
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.product_name}`}
                        onPress={() => setBillDraft(current => ({
                          ...current,
                          items: current.items.filter((_product, itemIndex) => itemIndex !== index),
                        }))}
                        className="h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
                        <Trash2 size={15} color="#B42332" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              {billDraft.tackOrder ? (
                <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <Text className="text-sm font-extrabold text-emerald-900">
                    Take order {billDraft.tackOrder.order_no}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-emerald-800">
                    Product quantities and saved order totals will be used. Advance {currency(billDraft.tackOrder.advance_amount)} will be added to the bill as a payment.
                  </Text>
                </View>
              ) : null}

              <View testID="billing-customer-details" className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                <Text className="mb-3 text-base font-extrabold text-[#173F35]">Customer details</Text>
                <InputField label="Customer name *" value={billDraft.customer.name} onChangeText={value => updateBillCustomer('name', value)} placeholder="Enter customer name" />
                <InputField label="Phone number *" value={billDraft.customer.phone} onChangeText={value => updateBillCustomer('phone', value)} keyboardType="phone-pad" placeholder="Enter phone number" />
                <InputField label="Email address" value={billDraft.customer.email} onChangeText={value => updateBillCustomer('email', value)} keyboardType="email-address" placeholder="Optional" />
                <InputField label="Address" value={billDraft.customer.address} onChangeText={value => updateBillCustomer('address', value)} multiline placeholder="Customer address" />
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
                      testID={value === 'EXCHANGE_GOLD' ? 'billing-payment-exchange' : 'billing-payment-full'}
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
                      <Text className={`text-center text-xs font-extrabold ${billDraft.paymentType === value ? 'text-emerald-800' : 'text-[#52645F]'}`}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {billDraft.tackOrder && Number(billDraft.tackOrder.advance_amount) > 0 ? (
                  <CustomDropdown
                    label="Take order advance method"
                    value={billDraft.advancePaymentMethod}
                    options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
                    onSelect={value => setBillDraft(current => ({ ...current, advancePaymentMethod: value as PaymentMethod }))}
                  />
                ) : null}
                {billDraft.paymentType === 'EXCHANGE_GOLD' ? (
                  <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-extrabold text-amber-900">Exchange items</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add exchange item"
                        onPress={() => setBillDraft(current => ({
                          ...current,
                          exchanges: [...current.exchanges, emptyExchange()],
                        }))}
                        className="flex-row items-center rounded-lg bg-amber-100 px-3 py-2">
                        <Plus size={14} color="#92400E" />
                        <Text className="ml-1 text-xs font-bold text-amber-900">Add item</Text>
                      </Pressable>
                    </View>
                    {exchangeOptionsLoading ? (
                      <View className="flex-row items-center py-2">
                        <ActivityIndicator size="small" color="#92400E" />
                        <Text className="ml-2 text-xs text-amber-900">Loading categories and metals…</Text>
                      </View>
                    ) : exchangeOptionsError ? (
                      <View className="mb-2">
                        <Text className="text-xs text-rose-700">{exchangeOptionsError}</Text>
                        <Pressable onPress={() => loadExchangeOptions()} className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2">
                          <Text className="text-xs font-bold text-white">Retry options</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {ratesLoading ? (
                      <View className="mb-2 flex-row items-center py-1">
                        <ActivityIndicator size="small" color="#92400E" />
                        <Text className="ml-2 text-xs text-amber-900">Loading current rates…</Text>
                      </View>
                    ) : null}
                    {ratesError ? (
                      <View className="mb-2">
                        <Text className="text-xs text-rose-700">{ratesError} Enter the exchange rate manually.</Text>
                        <Pressable onPress={() => loadGoldRates()} className="mt-2 self-start rounded-lg bg-amber-100 px-3 py-2">
                          <Text className="text-xs font-bold text-amber-900">Retry rate</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {billDraft.exchanges.map((item, index) => {
                      const rate = findRate(item.metal_type, item.purity);
                      const rateValue = Number(item.rate_per_unit) ||
                        Number(rate?.rate_per_unit ?? rate?.rate_per_gram) || 0;
                      const exchangeCredit = Math.max(
                        0,
                        Number(item.weight) - Number(item.wastage_weight || 0),
                      ) * rateValue;
                      return (
                        <View
                          key={`exchange-${index}`}
                          testID={`billing-exchange-item-${index}`}
                          className="mb-3 rounded-xl border border-amber-100 bg-white p-3">
                          <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-xs font-extrabold text-[#173F35]">
                              Exchange item {index + 1}
                            </Text>
                            {billDraft.exchanges.length > 1 ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Remove exchange item ${index + 1}`}
                                onPress={() => setBillDraft(current => ({
                                  ...current,
                                  exchanges: current.exchanges.filter((_exchange, itemIndex) => itemIndex !== index),
                                }))}>
                                <X size={17} color="#B42332" />
                              </Pressable>
                            ) : null}
                          </View>
                          <CustomDropdown
                            label="Category *"
                            value={item.category}
                            options={exchangeCategoryOptions}
                            onSelect={value => updateExchange(index, { category: value })}
                            placeholder={exchangeOptionsLoading ? 'Loading categories…' : 'Choose category'}
                            searchable
                            required
                          />
                          <CustomDropdown
                            label="Metal *"
                            value={item.metal_type}
                            options={exchangeMetalOptions}
                            onSelect={value => updateExchangeMetal(index, value)}
                            placeholder={exchangeOptionsLoading ? 'Loading metals…' : 'Choose metal'}
                            searchable
                            required
                          />
                          <CustomDropdown
                            label="Purity *"
                            value={item.purity}
                            options={exchangePurityOptions(item.metal_type)}
                            onSelect={value => updateExchangePurity(index, value)}
                            placeholder={item.metal_type ? 'Choose purity' : 'Choose a metal first'}
                            searchable
                            required
                          />
                          <View className="flex-row gap-2">
                            <View className="flex-1">
                              <InputField label="Weight (g) *" value={item.weight} onChangeText={value => updateExchange(index, { weight: value })} keyboardType="decimal-pad" placeholder="0.000" />
                            </View>
                            <View className="flex-1">
                              <InputField label="Wastage (g)" value={item.wastage_weight} onChangeText={value => updateExchange(index, { wastage_weight: value })} keyboardType="decimal-pad" placeholder="0.000" />
                            </View>
                          </View>
                          <InputField
                            label="Rate per gram (₹)"
                            value={item.rate_per_unit}
                            onChangeText={value => updateExchange(index, { rate_per_unit: value })}
                            keyboardType="decimal-pad"
                            placeholder={rate ? String(rate.rate_per_unit ?? rate.rate_per_gram ?? '') : 'Select purity or enter rate'}
                          />
                          <Text className="text-right text-xs font-extrabold text-amber-800">
                            Credit: {currency(exchangeCredit)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View className="mb-2 rounded-2xl bg-[#173F35] p-4">
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
                    <Text testID="billing-exchange-credit" className="text-xs font-bold text-amber-200">
                      −{currency(billTotals.exchangeCredit)}
                    </Text>
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
            </>
          )}
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 pt-3">
        {billFormStep === 'products' && !billDraft.tackOrder ? (
          <Pressable
            testID="billing-next-button"
            accessibilityRole="button"
            disabled={billDraft.items.length === 0}
            onPress={() => setBillFormStep('details')}
            style={billDraft.items.length === 0
              ? screenStyles.stepButtonDisabled
              : screenStyles.stepButtonEnabled}
            className="min-h-12 flex-row items-center justify-center rounded-xl">
            <Text
              style={billDraft.items.length === 0
                ? screenStyles.stepButtonLabelDisabled
                : screenStyles.stepButtonLabelEnabled}
              className="text-sm font-extrabold">
              Next Details
            </Text>
            <Text
              style={billDraft.items.length === 0
                ? screenStyles.stepButtonLabelDisabled
                : screenStyles.stepButtonLabelEnabled}
              className="ml-2 text-lg font-bold">
              ›
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-3">
            {!billDraft.tackOrder ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setBillFormStep('products')}
                className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#07564B] bg-white">
                <Text className="text-sm font-extrabold text-[#07564B]">Back to products</Text>
              </Pressable>
            ) : null}
            <Pressable
              testID="billing-save-button"
              accessibilityRole="button"
              disabled={billSaving}
              onPress={() => void saveBill()}
              className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl px-5 ${billSaving ? 'bg-[#8DA69B]' : 'bg-[#07564B]'}`}>
              {billSaving ? <ActivityIndicator color="white" /> : <Check size={18} color="white" />}
              <Text className="ml-2 text-sm font-extrabold text-white">
                {billSaving ? 'Saving bill…' : editingBillId ? 'Update bill' : 'Save bill'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  const renderOrderList = () => (
    <>
    <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={ordersLoading} onRefresh={() => void loadOrders()} />
        }>
      <View className="p-4 pb-24">
        <View className="mb-4 flex-row flex-wrap gap-3">
          <SummaryCard id="orders-total" label="Total orders" value={String(orders.length)} icon={ShoppingBag} palette="total_categories" />
          <SummaryCard id="orders-awaiting-confirmation" label="Awaiting confirmation" value={String(pendingOrderCount)} icon={CalendarDays} palette="active_gold_loans" />
          <SummaryCard id="orders-ready-for-billing" label="Ready for billing" value={String(readyOrderCount)} icon={CheckCircle2} palette="total_customers" />
          <SummaryCard id="orders-outstanding" label="Outstanding" value={currency(orderOutstanding)} icon={CreditCard} palette="low_stock_products" />
        </View>

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-3">
          <View className="mb-2 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
            <Search size={17} color="#7B8A83" />
            <TextInput
              accessibilityLabel="Search take orders"
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
            <Text className="text-base font-extrabold text-[#173F35]">Recent take orders</Text>
            <Text className="mt-0.5 text-xs text-[#6B7E76]">
              {ordersLoading ? 'Loading orders…' : `${filteredOrders.length} order${filteredOrders.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh take orders" onPress={() => void loadOrders()} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
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
            <Text className="mt-3 text-sm text-[#6B7E76]">Loading take orders…</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-[#D7E2DC] bg-white px-5 py-10">
            <Package size={28} color="#7B8A83" />
            <Text className="mt-3 text-base font-bold text-[#173F35]">
              {orders.length === 0 ? 'No take orders yet' : 'No matching orders'}
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
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Take order</Text>
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
    <Pressable
        testID="tack-new-button"
        accessibilityRole="button"
        accessibilityLabel="Create new take order"
        onPress={openOrderForm}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
        <Plus size={26} color="white" />
    </Pressable>
        </>
  );

  const renderOrderForm = () => (
    <KeyboardAvoidingView
      testID="take-order-form"
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1">
        <ScrollView
          testID="take-order-form-scroll"
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
          <View className="p-4">
            <View className="mb-4 flex-row items-center justify-between rounded-xl bg-[#EAF3EF] p-3">
              <View>
                <Text className="text-xs font-extrabold text-[#07564B]">
                  {orderFormStep === 'products' ? 'Step 1 of 2 · Products' : 'Step 2 of 2 · Details'}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#52645F]">
                  {orderFormStep === 'products'
                    ? 'Select products and confirm their weights.'
                    : 'Enter customer, tax and payment details.'}
                </Text>
              </View>
              <Text className="text-xs font-extrabold text-[#07564B]">
                {orderDraft.items.length} item{orderDraft.items.length === 1 ? '' : 's'}
              </Text>
            </View>

            {orderFormStep === 'products' ? (
              <>
                <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-3">
                  <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-[#F8FAF8] px-3">
                    <Search size={16} color="#7B8A83" />
                    <TextInput
                      accessibilityLabel="Search catalog products for take order"
                      value={orderSearchCatalog}
                      onChangeText={setOrderSearchCatalog}
                      placeholder="Search products by name or ID"
                      placeholderTextColor="#9AA6A1"
                      className="min-h-11 flex-1 px-2 text-sm text-[#173F35]"
                    />
                  </View>
                  {catalogLoading ? (
                    <View className="items-center py-8">
                      <ActivityIndicator color="#07564B" />
                      <Text className="mt-2 text-xs text-[#6B7E76]">Loading products…</Text>
                    </View>
                  ) : catalogError ? (
                    <View className="py-3">
                      <Text className="text-sm text-rose-700">{catalogError}</Text>
                      <Pressable onPress={() => void loadCatalog()} className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2">
                        <Text className="text-xs font-bold text-white">Retry</Text>
                      </Pressable>
                    </View>
                  ) : orderProductResults.length === 0 ? (
                    <View className="items-center py-8">
                      <Package size={26} color="#7B8A83" />
                      <Text className="mt-2 text-center text-xs text-[#6B7E76]">
                        {catalog.length === 0 ? 'No active products available.' : 'No matching products.'}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap justify-between">
                      {orderProductResults.map(product => {
                        const image = mediaUrl(firstCatalogImage(product));
                        const isAdded = orderDraft.items.some(
                          item => String(item.product_id) === String(product.id),
                        );
                        return (
                          <View
                            testID={`take-order-product-${String(product.id)}`}
                            key={String(product.id)}
                            className="mb-3 w-[48%] overflow-hidden rounded-xl border border-[#E6E9E3] bg-white">
                            {image ? (
                              <Image
                                source={{ uri: image }}
                                resizeMode="cover"
                                className="h-24 w-full bg-[#F3F4F1]"
                              />
                            ) : (
                              <View className="h-24 items-center justify-center bg-[#EAF3EF]">
                                <Package size={24} color="#07564B" />
                              </View>
                            )}
                            <View className="p-2.5">
                              <Text numberOfLines={1} className="text-sm font-extrabold text-[#173F35]">
                                {product.name}
                              </Text>
                              <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7E76]">
                                Product ID: {product.product_code || product.id}
                              </Text>
                              <Text numberOfLines={1} className="mt-1 text-[10px] text-[#6B7E76]">
                                {product.metal_type || 'Metal'} / {product.purity || 'Purity'}
                              </Text>
                              <View className="mt-2 flex-row items-center justify-between">
                                <Text numberOfLines={1} className="mr-1 flex-1 text-xs font-extrabold text-[#07564B]">
                                  {currency(productPrice(product))}
                                </Text>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${isAdded ? 'Add another' : 'Add'} ${product.name} to take order`}
                                  onPress={() => addOrderProduct(product)}
                                  className="h-9 w-9 items-center justify-center rounded-lg bg-[#07564B]">
                                  <Plus size={18} color="white" />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View className="mb-2 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                  <View className="mb-3 flex-row items-center justify-between border-b border-[#E6E9E3] pb-3">
                    <View>
                      <Text className="text-base font-extrabold text-[#173F35]">Order Summary</Text>
                      <Text className="mt-0.5 text-xs text-[#6B7E76]">
                        {orderDraft.items.reduce((count, item) => count + item.quantity, 0)} items in this order
                      </Text>
                    </View>
                    <View className="rounded-full border border-[#DDE6E0] bg-[#EAF3EF] px-3 py-1">
                      <Text className="text-xs font-bold text-[#07564B]">{orderDraft.items.length} products</Text>
                    </View>
                  </View>

                  {orderDraft.items.length === 0 ? (
                    <Text className="py-5 text-center text-xs text-[#6B7E76]">
                      Add products above to start this order.
                    </Text>
                  ) : orderDraft.items.map(item => (
                    <View key={item.key} className="mb-3 rounded-2xl border border-[#E6E9E3] bg-[#F8FAF8] p-3">
                      <View className="flex-row items-start">
                        {item.image ? (
                          <Image source={{ uri: item.image }} className="mr-3 h-12 w-12 rounded-xl bg-white" />
                        ) : (
                          <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3EF]">
                            <Package size={19} color="#07564B" />
                          </View>
                        )}
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-sm font-extrabold text-[#173F35]">{item.product_name}</Text>
                          <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#6B7E76]">
                            {item.variant_color || 'Default'} / {item.variant_size || 'Free size'}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.product_name}`}
                          onPress={() => updateOrderQuantity(item.key, 0)}
                          className="ml-2 h-8 w-8 items-center justify-center">
                          <Trash2 size={16} color="#6B7E76" />
                        </Pressable>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Text className="mr-2 text-[10px] text-[#6B7E76]">Net weight</Text>
                          <TextInput
                            accessibilityLabel={`Net weight for ${item.product_name}`}
                            value={String(item.net_gold_weight ?? '')}
                            onChangeText={value => updateOrderWeight(item.key, value)}
                            keyboardType="decimal-pad"
                            textAlignVertical="center"
                            placeholder="0.000"
                            placeholderTextColor="#9AA6A1"
                            style={screenStyles.weightInput}
                            className="h-11 w-24 rounded-lg border border-[#DDE6E0] bg-white px-2 text-xs font-bold text-[#173F35]"
                          />
                          <Text className="ml-1 text-[10px] text-[#6B7E76]">g</Text>
                        </View>
                        <Text className="text-xs font-extrabold text-[#173F35]">
                          {currency(item.price * item.quantity)}
                        </Text>
                      </View>
                      <View className="mt-3 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease ${item.product_name} quantity`}
                            onPress={() => updateOrderQuantity(item.key, item.quantity - 1)}
                            className="h-8 w-8 items-center justify-center rounded-lg border border-[#DDE6E0] bg-white">
                            <Minus size={14} color="#07564B" />
                          </Pressable>
                          <Text className="mx-3 min-w-4 text-center text-sm font-bold text-[#173F35]">{item.quantity}</Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Increase ${item.product_name} quantity`}
                            onPress={() => updateOrderQuantity(item.key, item.quantity + 1)}
                            className="h-8 w-8 items-center justify-center rounded-lg border border-[#DDE6E0] bg-white">
                            <Plus size={14} color="#07564B" />
                          </Pressable>
                        </View>
                        <Text className="text-[10px] text-[#6B7E76]">{currency(item.price)} each</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View testID="take-order-customer-details" className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
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
                    <View className="flex-1">
                      <CustomDropdown
                        label="State"
                        value={orderDraft.customer.state || ''}
                        options={INDIAN_STATES_AND_UTS.map(state => ({
                          value: state,
                          label: state,
                        }))}
                        onSelect={value => updateOrderCustomer('state', value)}
                        placeholder="Select state"
                        searchable
                      />
                    </View>
                    <View className="flex-1"><InputField label="PIN code" value={orderDraft.customer.pincode || ''} onChangeText={value => updateOrderCustomer('pincode', value)} keyboardType="number-pad" placeholder="6 digits" /></View>
                  </View>
                </View>

                <View testID="take-order-payment-summary" className="mb-4 rounded-2xl bg-[#173F35] p-4">
                  <Text className="mb-3 text-base font-extrabold text-white">GST, discount & advance</Text>
                  <View className="mb-2 flex-row justify-between">
                    <Text className="text-xs text-white/70">Subtotal</Text>
                    <Text className="text-xs font-bold text-white">{currency(orderTotals.subtotal)}</Text>
                  </View>
                  <InputField label="GST rate (%)" labelClassName="text-white/80" value={orderDraft.gstRate} onChangeText={value => setOrderDraft(current => ({ ...current, gstRate: value }))} keyboardType="decimal-pad" placeholder="0" />
                  <Pressable
                    testID="take-order-gst-toggle"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: orderDraft.gstIncluded }}
                    onPress={() => setOrderDraft(current => ({ ...current, gstIncluded: !current.gstIncluded }))}
                    className="mb-3 min-h-10 flex-row items-center">
                    <View className={`mr-2 h-5 w-5 items-center justify-center rounded border ${orderDraft.gstIncluded ? 'border-emerald-300 bg-emerald-600' : 'border-white/50'}`}>
                      {orderDraft.gstIncluded ? <Check size={13} color="white" /> : null}
                    </View>
                    <Text className="text-xs font-semibold text-white/80">Apply GST to this order</Text>
                  </Pressable>
                  <View className="mb-2 flex-row justify-between">
                    <Text className="text-xs text-white/70">GST on subtotal (before discount)</Text>
                    <Text testID="take-order-gst-amount" className="text-xs font-bold text-white">
                      {currency(orderTotals.gstAmount)}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <CustomDropdown
                        label="Discount type"
                        labelClassName="text-white/80"
                        value={orderDraft.discountType}
                        options={[
                          { value: 'Percent', label: 'Percent' },
                          { value: 'Fixed', label: 'Fixed amount' },
                        ]}
                        onSelect={value => setOrderDraft(current => ({ ...current, discountType: value as OrderDraft['discountType'] }))}
                      />
                    </View>
                    <View className="flex-1">
                      <InputField label="Discount" labelClassName="text-white/80" value={orderDraft.discountValue} onChangeText={value => setOrderDraft(current => ({ ...current, discountValue: value }))} keyboardType="decimal-pad" placeholder="0" />
                    </View>
                  </View>
                  <InputField label="Advance amount (₹)" labelClassName="text-white/80" value={orderDraft.advanceAmount} onChangeText={value => setOrderDraft(current => ({ ...current, advanceAmount: value }))} keyboardType="decimal-pad" placeholder="0" />
                  <View className="flex-row justify-between py-1">
                    <Text className="text-xs text-white/70">Discount applied</Text>
                    <Text testID="take-order-discount-amount" className="text-xs font-bold text-white">−{currency(orderTotals.discount)}</Text>
                  </View>
                  <View className="flex-row justify-between border-t border-white/15 pt-3">
                    <Text className="text-sm font-extrabold text-white">Total</Text>
                    <Text testID="take-order-total" className="text-lg font-black text-amber-200">{currency(orderTotals.total)}</Text>
                  </View>
                  <View className="mt-1 flex-row justify-between">
                    <Text className="text-xs text-white/70">Balance due</Text>
                    <Text testID="take-order-balance-due" className="text-xs font-bold text-white">
                      {currency(Math.max(0, orderTotals.total - (Number(orderDraft.advanceAmount) || 0)))}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 pt-3">
        {orderFormStep === 'products' ? (
          <Pressable
            testID="take-order-next-button"
            accessibilityRole="button"
            disabled={orderDraft.items.length === 0}
            onPress={() => setOrderFormStep('details')}
            style={orderDraft.items.length === 0
              ? screenStyles.stepButtonDisabled
              : screenStyles.stepButtonEnabled}
            className="min-h-12 flex-row items-center justify-center rounded-xl">
            <Text
              style={orderDraft.items.length === 0
                ? screenStyles.stepButtonLabelDisabled
                : screenStyles.stepButtonLabelEnabled}
              className="text-sm font-extrabold">
              Next Details
            </Text>
            <Text
              style={orderDraft.items.length === 0
                ? screenStyles.stepButtonLabelDisabled
                : screenStyles.stepButtonLabelEnabled}
              className="ml-2 text-lg font-bold">
              ›
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => setOrderFormStep('products')}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#07564B] bg-white">
              <Text className="text-sm font-extrabold text-[#07564B]">Back to products</Text>
            </Pressable>
            <Pressable
              testID="tack-order-save-button"
              accessibilityRole="button"
              disabled={orderSaving}
              onPress={() => void createTackOrder()}
              className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl ${orderSaving ? 'bg-[#8DA69B]' : 'bg-[#07564B]'}`}>
              {orderSaving ? <ActivityIndicator color="white" /> : <Check size={18} color="white" />}
              <Text className="ml-2 text-sm font-extrabold text-white">{orderSaving ? 'Creating…' : 'Create order'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
                  onBack={() => {
                    onFormVisibilityChange?.(false);
                    setBillPage('list');
                  }}>
                  {renderBillForm()}
                </CreateBillScreen>
              )
          : ordersPage === 'list'
            ? renderOrderList()
            : (
                <CreateTackOrderScreen
                  onBack={() => {
                    onFormVisibilityChange?.(false);
                    setOrdersPage('list');
                  }}>
                  {renderOrderForm()}
                </CreateTackOrderScreen>
              )}
      </View>
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
