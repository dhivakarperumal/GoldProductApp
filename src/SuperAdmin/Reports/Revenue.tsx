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
} from 'react-native';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';

type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thismonth'
  | 'lastmonth'
  | 'thisyear'
  | 'custom';
type PaginationData = { page: number; totalPages: number; total: number };
type RevenueOverviewData = {
  totalRevenue?: number;
  paidTransactions?: number;
  todayRevenue?: number;
  todayGrowth?: number;
  thisMonthRevenue?: number;
  monthGrowth?: number;
  thisYearRevenue?: number;
  yearGrowth?: number;
  totalSubscriptionRevenue?: number;
  activeSubscribers?: number;
  pendingPaymentsAmount?: number;
  pendingPaymentsCount?: number;
  filteredSummary?: {
    filteredRevenue?: number;
    filteredPaidCount?: number;
    filteredTransactions?: number;
    filteredPending?: number;
  };
};
type AnalyticsPoint = {
  label?: string;
  revenue?: number;
  registrations?: number;
  subscriptions?: number;
};
type RevenueAnalytics = {
  monthlyRevenue?: AnalyticsPoint[];
  shopRegistrations?: AnalyticsPoint[];
  subscriptionGrowth?: AnalyticsPoint[];
};
type SubscriptionPlanRevenue = {
  planId: string | number;
  planName?: string;
  monthlyPrice?: number;
  totalRevenue?: number;
  percentageShare?: number;
  subscribersCount?: number;
  activeSubscriptions?: number;
  expiredSubscriptions?: number;
};
type ShopRevenue = {
  shopId: string | number;
  sNo?: number;
  shopName?: string;
  shopCode?: string;
  ownerName?: string;
  city?: string;
  planName?: string;
  subscriptionDuration?: string;
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  paymentStatus?: string;
  lastPaymentDate?: string;
};
type PaymentRecord = {
  id: string | number;
  transactionId?: string;
  invoiceNumber?: string;
  shopName?: string;
  shopCode?: string;
  planName?: string;
  paymentDate?: string;
  paymentMethod?: string;
  amount?: number;
  refundAmount?: number;
  netAmount?: number;
  paymentStatus?: string;
};
type RevenuePlan = { id: string | number; plan_name?: string };
type ShopDetails = {
  shop?: {
    shop_name?: string;
    shop_code?: string;
    city?: string;
    owner_name?: string;
    mobile?: string;
    email?: string;
    gst_number?: string;
    address?: string;
    state?: string;
  };
  subscriptions?: {
    id: string | number;
    plan_name?: string;
    duration?: string;
    amount?: number;
    start_date?: string;
    end_date?: string;
    subscription_status?: string;
  }[];
  payments?: {
    id: string | number;
    transaction_id?: string;
    invoice_number?: string;
    payment_method?: string;
    amount?: number;
    payment_date?: string;
    created_at?: string;
    payment_status?: string;
  }[];
  financialSummary?: {
    totalInvoiced?: number;
    totalPaid?: number;
    pendingBalance?: number;
    totalRefunded?: number;
  };
};
type InvoiceDetails = PaymentRecord & {
  shop?: {
    name?: string;
    code?: string;
    owner?: string;
    mobile?: string;
    email?: string;
    gst?: string;
    address?: string;
    city?: string;
  };
  subscription?: {
    planName?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
  };
};

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];
const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Net Banking', label: 'Net Banking' },
  { value: 'Card', label: 'Credit / Debit Card' },
  { value: 'Cash', label: 'Cash / Offline' },
];
const TABS = [
  { id: 'all', label: 'Overview', icon: BarChart3 },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'shops', label: 'Shops', icon: Store },
  { id: 'plans', label: 'Plans', icon: Layers },
  { id: 'payments', label: 'Payments', icon: CreditCard },
] as const;
type RevenueTab = (typeof TABS)[number]['id'];

const CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const COMPACT_CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function formatCurrency(value: number | undefined) {
  return CURRENCY.format(Number(value) || 0);
}

function formatCompactCurrency(value: number | undefined) {
  return COMPACT_CURRENCY.format(Number(value) || 0);
}

function formatDate(value: string | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const shift = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  switch (preset) {
    case 'today':
      return {
        startDate: toLocalDate(startOfToday),
        endDate: toLocalDate(startOfToday),
      };
    case 'yesterday': {
      const yesterday = shift(startOfToday, -1);
      return {
        startDate: toLocalDate(yesterday),
        endDate: toLocalDate(yesterday),
      };
    }
    case 'last7days':
      return {
        startDate: toLocalDate(shift(startOfToday, -6)),
        endDate: toLocalDate(startOfToday),
      };
    case 'last30days':
      return {
        startDate: toLocalDate(shift(startOfToday, -29)),
        endDate: toLocalDate(startOfToday),
      };
    case 'thismonth':
      return {
        startDate: toLocalDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate: toLocalDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        ),
      };
    case 'lastmonth':
      return {
        startDate: toLocalDate(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
        ),
        endDate: toLocalDate(
          new Date(today.getFullYear(), today.getMonth(), 0),
        ),
      };
    case 'thisyear':
      return {
        startDate: toLocalDate(new Date(today.getFullYear(), 0, 1)),
        endDate: toLocalDate(new Date(today.getFullYear(), 11, 31)),
      };
    case 'custom':
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      };
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(option => option.value === value)?.label;
  return (
    <View className="min-w-[47%] flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(current => !current)}
        className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3"
      >
        <Text
          numberOfLines={1}
          className="mr-2 flex-1 text-xs font-semibold text-[#374151]"
        >
          {currentLabel || label}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>
      {open ? (
        <View className="mt-1 rounded-xl border border-[#E5E7EB] bg-white p-1">
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex-row items-center justify-between rounded-lg px-2.5 py-2 ${
                option.value === value ? 'bg-[#E7F3EF]' : ''
              }`}
            >
              <Text className="flex-1 text-xs text-[#374151]">
                {option.label}
              </Text>
              {option.value === value ? (
                <Check size={14} color="#08745D" />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = (status || 'pending').toLowerCase();
  const styles: Record<string, string> = {
    paid: 'bg-[#DCFCE7] text-[#166534]',
    partial: 'bg-[#FEF3C7] text-[#92400E]',
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    unpaid: 'bg-[#FEF3C7] text-[#92400E]',
    failed: 'bg-[#FFE4E6] text-[#9F1239]',
    refunded: 'bg-[#F3E8FF] text-[#6B21A8]',
  };
  const label =
    value === 'unpaid'
      ? 'Pending'
      : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        styles[value] || 'bg-[#F3F4F6] text-[#4B5563]'
      }`}
    >
      <Text className="text-[10px] font-bold">{label}</Text>
    </View>
  );
}

function MetricCard({
  title,
  amount,
  subtext,
  icon: Icon,
  tone,
  growth,
  badge,
}: {
  title: string;
  amount: number;
  subtext: string;
  icon: typeof DollarSign;
  tone: string;
  growth?: number;
  badge?: string;
}) {
  const tones: Record<string, string> = {
    forest: 'border-t-emerald-500 bg-[#F0FDF4]',
    gold: 'border-t-amber-500 bg-[#FFFBEB]',
    blue: 'border-t-sky-500 bg-[#F0F9FF]',
    indigo: 'border-t-violet-500 bg-[#F5F3FF]',
    teal: 'border-t-teal-500 bg-[#F0FDFA]',
    rust: 'border-t-rose-500 bg-[#FFF1F2]',
  };
  const iconTones: Record<string, string> = {
    forest: 'bg-emerald-700',
    gold: 'bg-amber-500',
    blue: 'bg-sky-700',
    indigo: 'bg-violet-600',
    teal: 'bg-teal-700',
    rust: 'bg-rose-600',
  };
  const isPositive = (growth || 0) >= 0;
  return (
    <View
      className={`min-w-[47%] flex-1 rounded-2xl border border-[#E5E7EB] border-t-4 p-4 ${
        tones[tone] || tones.forest
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-2 text-xl font-black text-[#111827]"
          >
            {formatCompactCurrency(amount)}
          </Text>
        </View>
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            iconTones[tone] || iconTones.forest
          }`}
        >
          <Icon size={19} color="#FFFFFF" />
        </View>
      </View>
      <View className="mt-3 min-h-5 flex-row items-center gap-1">
        {growth !== undefined ? (
          isPositive ? (
            <TrendingUp size={14} color="#059669" />
          ) : (
            <TrendingDown size={14} color="#E11D48" />
          )
        ) : (
          <View
            className={`h-2 w-2 rounded-full ${
              tone === 'rust' ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
        )}
        <Text
          numberOfLines={1}
          className="flex-1 text-[10px] font-semibold text-[#4B5563]"
        >
          {subtext}
        </Text>
        {badge ? (
          <Text className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold text-[#075C51]">
            {badge}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DetailCell({ label, value }: { label: string; value?: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-xl border border-[#E8ECE9] bg-[#FAFBFA] p-3">
      <Text className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">
        {label}
      </Text>
      <Text className="mt-1 text-xs font-semibold text-[#374151]">
        {value || '—'}
      </Text>
    </View>
  );
}

function Pager({
  page,
  pagination,
  onChange,
  label,
}: {
  page: number;
  pagination: PaginationData;
  onChange: (page: number) => void;
  label: string;
}) {
  if (pagination.totalPages <= 1) return null;
  return (
    <View className="mt-3 flex-row items-center justify-between rounded-xl bg-white px-3 py-3">
      <Text className="flex-1 text-[10px] text-[#6B7280]">
        Page {pagination.page || page} of {pagination.totalPages} ·{' '}
        {pagination.total || 0} {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        className={`mr-2 min-h-9 flex-row items-center rounded-lg border border-[#E5E7EB] px-2 ${
          page <= 1 ? 'opacity-40' : ''
        }`}
      >
        <ChevronLeft size={14} color="#374151" />
        <Text className="text-[10px] font-semibold text-[#374151]">Prev</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next page"
        disabled={page >= pagination.totalPages}
        onPress={() => onChange(page + 1)}
        className={`min-h-9 flex-row items-center rounded-lg border border-[#E5E7EB] px-2 ${
          page >= pagination.totalPages ? 'opacity-40' : ''
        }`}
      >
        <Text className="text-[10px] font-semibold text-[#374151]">Next</Text>
        <ChevronRight size={14} color="#374151" />
      </Pressable>
    </View>
  );
}

export default function Revenue() {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<RevenueOverviewData>({});
  const [analytics, setAnalytics] = useState<RevenueAnalytics>({});
  const [subscriptions, setSubscriptions] = useState<{
    items: SubscriptionPlanRevenue[];
    totalAllRevenue: number;
  }>({ items: [], totalAllRevenue: 0 });
  const [plans, setPlans] = useState<RevenuePlan[]>([]);
  const [shops, setShops] = useState<ShopRevenue[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [shopPagination, setShopPagination] = useState<PaginationData>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [paymentPagination, setPaymentPagination] = useState<PaginationData>({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [activeView, setActiveView] = useState<RevenueTab>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [search, setSearch] = useState('');
  const [shopPage, setShopPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shopError, setShopError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [selectedShopId, setSelectedShopId] = useState<string | number | null>(
    null,
  );
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [shopDetailLoading, setShopDetailLoading] = useState(false);
  const [shopDetailError, setShopDetailError] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<
    string | number | null
  >(null);
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  const dateRange = useMemo(
    () => getDateRange(datePreset, customStart, customEnd),
    [datePreset, customEnd, customStart],
  );

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        planId: selectedPlan !== 'all' ? selectedPlan : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };
      const [
        overviewResponse,
        analyticsResponse,
        subscriptionResponse,
        planResponse,
      ] = await Promise.all([
        api.get('/super-admin/revenue-reports/overview', { params }),
        api.get('/super-admin/revenue-reports/analytics', { params }),
        api.get('/super-admin/revenue-reports/subscription-revenue'),
        api.get('/super-admin/subscription-plans', {
          params: { pageSize: 50 },
        }),
      ]);
      setOverview(overviewResponse.data?.data || {});
      setAnalytics(analyticsResponse.data?.data || {});
      setSubscriptions(
        subscriptionResponse.data?.data || {
          items: [],
          totalAllRevenue: 0,
        },
      );
      setPlans(
        Array.isArray(planResponse.data?.plans) ? planResponse.data.plans : [],
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, 'Unable to load revenue analytics.'),
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPlan, selectedStatus]);

  const loadShopData = useCallback(async () => {
    setShopLoading(true);
    setShopError('');
    try {
      const response = await api.get(
        '/super-admin/revenue-reports/shop-revenue',
        {
          params: {
            page: shopPage,
            limit: 10,
            search,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            planId: selectedPlan !== 'all' ? selectedPlan : undefined,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        },
      );
      const data = response.data?.data;
      setShops(Array.isArray(data?.items) ? data.items : []);
      setShopPagination(
        data?.pagination || { page: 1, totalPages: 1, total: 0 },
      );
    } catch (requestError) {
      setShopError(
        getErrorMessage(requestError, 'Unable to load shop revenue.'),
      );
    } finally {
      setShopLoading(false);
    }
  }, [dateRange, search, selectedPlan, selectedStatus, shopPage]);

  const loadPaymentData = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const response = await api.get('/super-admin/revenue-reports/payments', {
        params: {
          page: paymentPage,
          limit: 10,
          search,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
          planId: selectedPlan !== 'all' ? selectedPlan : undefined,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      const data = response.data?.data;
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setPaymentPagination(
        data?.pagination || { page: 1, totalPages: 1, total: 0 },
      );
    } catch (requestError) {
      setPaymentError(
        getErrorMessage(requestError, 'Unable to load payment history.'),
      );
    } finally {
      setPaymentLoading(false);
    }
  }, [
    dateRange,
    paymentMethod,
    paymentPage,
    search,
    selectedPlan,
    selectedStatus,
  ]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);
  useEffect(() => {
    loadShopData();
  }, [loadShopData]);
  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadShopData(), loadPaymentData()]);
    setRefreshing(false);
  }, [loadDashboardData, loadPaymentData, loadShopData]);

  useEffect(() => {
    if (selectedShopId == null) return;
    let active = true;
    setShopDetails(null);
    setShopDetailError('');
    setShopDetailLoading(true);
    api
      .get(`/super-admin/revenue-reports/shops/${selectedShopId}/details`)
      .then(response => {
        if (active) setShopDetails(response.data?.data || null);
      })
      .catch(requestError => {
        if (active) {
          setShopDetailError(
            getErrorMessage(requestError, 'Unable to load shop details.'),
          );
        }
      })
      .finally(() => {
        if (active) setShopDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedShopId]);

  useEffect(() => {
    if (selectedPaymentId == null) return;
    let active = true;
    setInvoice(null);
    setInvoiceError('');
    setInvoiceLoading(true);
    api
      .get(`/super-admin/revenue-reports/payments/${selectedPaymentId}/details`)
      .then(response => {
        if (active) setInvoice(response.data?.data || null);
      })
      .catch(requestError => {
        if (active) {
          setInvoiceError(
            getErrorMessage(requestError, 'Unable to load invoice details.'),
          );
        }
      })
      .finally(() => {
        if (active) setInvoiceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPaymentId]);

  const setFilter = (update: () => void) => {
    update();
    setShopPage(1);
    setPaymentPage(1);
  };

  const chartModeOptions = [
    { id: 'revenue', label: 'Revenue', key: 'monthlyRevenue' },
    { id: 'shops', label: 'Shop Growth', key: 'shopRegistrations' },
    { id: 'subscriptions', label: 'Subscriptions', key: 'subscriptionGrowth' },
  ] as const;
  const [chartMode, setChartMode] =
    useState<(typeof chartModeOptions)[number]['id']>('revenue');
  const activeChart = chartModeOptions.find(item => item.id === chartMode);
  const chartValues = useMemo(() => {
    if (!activeChart) return [];
    const points = analytics[activeChart.key] || [];
    return points.map(point => ({
      label: point.label || '—',
      value:
        chartMode === 'revenue'
          ? Number(point.revenue || 0)
          : Number(point.registrations || point.subscriptions || 0),
    }));
  }, [activeChart, analytics, chartMode]);
  const chartMax = Math.max(1, ...chartValues.map(item => item.value));

  const metricCards = [
    {
      id: 'total',
      title: 'Total Revenue',
      amount: overview.totalRevenue || 0,
      subtext: `${overview.paidTransactions || 0} successful transactions`,
      badge: 'All Time',
      icon: DollarSign,
      tone: 'forest',
    },
    {
      id: 'today',
      title: "Today's Revenue",
      amount: overview.todayRevenue || 0,
      subtext:
        overview.todayGrowth === 0 || overview.todayGrowth == null
          ? 'Same as yesterday'
          : `${overview.todayGrowth > 0 ? '+' : ''}${
              overview.todayGrowth
            }% vs yesterday`,
      growth: overview.todayGrowth,
      icon: Clock3,
      tone: 'gold',
    },
    {
      id: 'month',
      title: "This Month's Revenue",
      amount: overview.thisMonthRevenue || 0,
      subtext:
        overview.monthGrowth === 0 || overview.monthGrowth == null
          ? 'Month to date'
          : `${overview.monthGrowth > 0 ? '+' : ''}${
              overview.monthGrowth
            }% vs last month`,
      growth: overview.monthGrowth,
      icon: CalendarDays,
      tone: 'blue',
    },
    {
      id: 'year',
      title: "This Year's Revenue",
      amount: overview.thisYearRevenue || 0,
      subtext:
        overview.yearGrowth === 0 || overview.yearGrowth == null
          ? 'Year to date'
          : `${overview.yearGrowth > 0 ? '+' : ''}${
              overview.yearGrowth
            }% vs last year`,
      growth: overview.yearGrowth,
      icon: TrendingUp,
      tone: 'indigo',
    },
    {
      id: 'subscription',
      title: 'Subscription Revenue',
      amount: overview.totalSubscriptionRevenue || 0,
      subtext: `${overview.activeSubscribers || 0} active Gold Shops`,
      icon: CreditCard,
      tone: 'teal',
    },
    {
      id: 'pending',
      title: 'Pending Payments',
      amount: overview.pendingPaymentsAmount || 0,
      subtext: `${overview.pendingPaymentsCount || 0} invoices pending`,
      badge:
        (overview.pendingPaymentsCount || 0) > 0
          ? `${overview.pendingPaymentsCount} unpaid`
          : 'Clear',
      icon: XCircle,
      tone: 'rust',
    },
  ];

  const renderShopList = () => (
    <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E7F3EF]">
            <Store size={19} color="#08745D" />
          </View>
          <View className="ml-3">
            <Text className="text-sm font-extrabold text-[#173F35]">
              Shop-wise Revenue
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#6B7280]">
              {shopPagination.total || shops.length} shops
            </Text>
          </View>
        </View>
        <SelectField
          label="Filter shops by payment status"
          value={selectedStatus}
          options={STATUS_OPTIONS}
          onChange={value => setFilter(() => setSelectedStatus(value))}
        />
      </View>
      {shopError ? (
        <Text className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          {shopError}
        </Text>
      ) : shopLoading && shops.length === 0 ? (
        <ActivityIndicator className="py-8" color="#08745D" />
      ) : shops.length === 0 ? (
        <Text className="py-8 text-center text-xs text-[#6B7280]">
          No Gold Shops found for these filters.
        </Text>
      ) : (
        <View className="gap-3">
          {shops.map((shop, index) => {
            const paidPercent =
              Number(shop.totalAmount) > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (Number(shop.paidAmount || 0) /
                        Number(shop.totalAmount || 1)) *
                        100,
                    ),
                  )
                : 0;
            return (
              <Pressable
                key={shop.shopId || index}
                accessibilityRole="button"
                accessibilityLabel={`View ${
                  shop.shopName || 'shop'
                } revenue details`}
                onPress={() => setSelectedShopId(shop.shopId)}
                className="rounded-xl border border-[#E8ECE9] bg-[#FCFDFC] p-3"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold text-[#173F35]">
                      {shop.shopName || 'Gold Shop'}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#6B7280]">
                      {shop.shopCode || '—'} · {shop.planName || 'No plan'}
                    </Text>
                  </View>
                  <StatusBadge status={shop.paymentStatus} />
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <DetailCell
                    label="Invoiced"
                    value={formatCurrency(shop.totalAmount)}
                  />
                  <DetailCell
                    label="Paid"
                    value={formatCurrency(shop.paidAmount)}
                  />
                  <DetailCell
                    label="Pending"
                    value={formatCurrency(shop.pendingAmount)}
                  />
                </View>
                <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <View
                    className="h-full rounded-full bg-[#10B981]"
                    style={{ width: `${paidPercent}%` }}
                  />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[10px] text-[#6B7280]">
                    Last payment: {formatDate(shop.lastPaymentDate)}
                  </Text>
                  <Text className="text-[10px] font-bold text-[#08745D]">
                    Details
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Pager
        page={shopPage}
        pagination={shopPagination}
        onChange={setShopPage}
        label="shops"
      />
    </View>
  );

  const renderPlanList = () => (
    <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-extrabold text-[#173F35]">
            Subscription Plan Revenue
          </Text>
          <Text className="mt-1 text-[10px] text-[#6B7280]">
            {subscriptions.items.length} subscription plans
          </Text>
        </View>
        <View className="rounded-xl bg-[#E7F3EF] px-3 py-2">
          <Text className="text-[9px] font-bold uppercase text-[#08745D]">
            Total Income
          </Text>
          <Text className="mt-0.5 text-sm font-extrabold text-[#075C51]">
            {formatCompactCurrency(subscriptions.totalAllRevenue)}
          </Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator className="py-8" color="#08745D" />
      ) : subscriptions.items.length === 0 ? (
        <Text className="py-8 text-center text-xs text-[#6B7280]">
          No subscription revenue found.
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {subscriptions.items.map(plan => {
            const share = Math.min(
              100,
              Math.max(0, Number(plan.percentageShare || 0)),
            );
            return (
              <View
                key={plan.planId}
                className="rounded-xl border border-[#E8ECE9] bg-[#FCFDFC] p-3"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1 flex-row items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#E7F3EF]">
                      <Layers size={17} color="#08745D" />
                    </View>
                    <View className="ml-2 flex-1">
                      <Text className="text-xs font-extrabold text-[#173F35]">
                        {plan.planName || 'Subscription Plan'}
                      </Text>
                      <Text className="mt-0.5 text-[10px] text-[#6B7280]">
                        {formatCurrency(plan.monthlyPrice)} / month
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-extrabold text-[#111827]">
                    {formatCompactCurrency(plan.totalRevenue)}
                  </Text>
                </View>
                <View className="mt-3 flex-row justify-between">
                  <Text className="text-[10px] font-semibold text-[#6B7280]">
                    Revenue share
                  </Text>
                  <Text className="text-[10px] font-bold text-[#08745D]">
                    {Number(plan.percentageShare || 0).toFixed(1)}%
                  </Text>
                </View>
                <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <View
                    className="h-full rounded-full bg-[#059669]"
                    style={{ width: `${share}%` }}
                  />
                </View>
                <View className="mt-3 flex-row justify-between border-t border-[#E8ECE9] pt-2">
                  <Text className="text-[10px] text-[#6B7280]">
                    {plan.subscribersCount || 0} subscribers
                  </Text>
                  <Text className="text-[10px] font-semibold text-emerald-700">
                    {plan.activeSubscriptions || 0} active
                  </Text>
                  <Text className="text-[10px] text-[#6B7280]">
                    {plan.expiredSubscriptions || 0} expired
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderPaymentList = () => (
    <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E7F3EF]">
            <FileText size={19} color="#08745D" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-extrabold text-[#173F35]">
              Payment History
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#6B7280]">
              {paymentPagination.total || payments.length} transactions
            </Text>
          </View>
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <SelectField
          label="Filter transactions by status"
          value={selectedStatus}
          options={STATUS_OPTIONS.filter(option => option.value !== 'partial')}
          onChange={value => setFilter(() => setSelectedStatus(value))}
        />
        <SelectField
          label="Filter transactions by method"
          value={paymentMethod}
          options={METHOD_OPTIONS}
          onChange={value => setFilter(() => setPaymentMethod(value))}
        />
      </View>
      {paymentError ? (
        <Text className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
          {paymentError}
        </Text>
      ) : paymentLoading && payments.length === 0 ? (
        <ActivityIndicator className="py-8" color="#08745D" />
      ) : payments.length === 0 ? (
        <Text className="py-8 text-center text-xs text-[#6B7280]">
          No payment records found. Try adjusting the filters.
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {payments.map(payment => (
            <Pressable
              key={payment.id}
              accessibilityRole="button"
              accessibilityLabel={`View invoice ${
                payment.invoiceNumber || payment.id
              }`}
              onPress={() => setSelectedPaymentId(payment.id)}
              className="rounded-xl border border-[#E8ECE9] bg-[#FCFDFC] p-3"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-[#173F35]">
                    {payment.shopName || 'Shop'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#6B7280]">
                    {payment.invoiceNumber || 'Invoice —'} ·{' '}
                    {payment.transactionId || 'PENDING'}
                  </Text>
                </View>
                <StatusBadge status={payment.paymentStatus} />
              </View>
              <View className="mt-3 flex-row items-end justify-between border-t border-[#E8ECE9] pt-2">
                <View>
                  <Text className="text-[10px] text-[#6B7280]">
                    {payment.planName || 'Subscription'} ·{' '}
                    {payment.paymentMethod || 'N/A'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#6B7280]">
                    {formatDate(payment.paymentDate, true)}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-[#111827]">
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
              {Number(payment.refundAmount || 0) > 0 ? (
                <Text className="mt-2 text-[10px] font-semibold text-purple-700">
                  Refunded: {formatCurrency(payment.refundAmount)}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
      <Pager
        page={paymentPage}
        pagination={paymentPagination}
        onChange={setPaymentPage}
        label="transactions"
      />
    </View>
  );

  const renderChart = () => (
    <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E7F3EF]">
          <BarChart3 size={19} color="#08745D" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-extrabold text-[#173F35]">
            Revenue Analytics & Trends
          </Text>
          <Text className="mt-0.5 text-[10px] text-[#6B7280]">
            Performance based on verified transactions
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="mt-3 gap-2"
      >
        {chartModeOptions.map(option => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: chartMode === option.id }}
            onPress={() => setChartMode(option.id)}
            className={`rounded-lg px-3 py-2 ${
              chartMode === option.id ? 'bg-[#08745D]' : 'bg-[#F3F4F6]'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                chartMode === option.id ? 'text-white' : 'text-[#4B5563]'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator className="py-10" color="#08745D" />
      ) : chartValues.length === 0 ? (
        <Text className="py-10 text-center text-xs text-[#6B7280]">
          No analytics available for this period.
        </Text>
      ) : (
        <View className="mt-5 h-48 flex-row items-end justify-around border-b border-l border-[#E5E7EB] px-2">
          {chartValues.slice(-8).map((item, index) => {
            const height = Math.max((item.value / chartMax) * 125, 6);
            return (
              <View
                key={`${item.label}-${index}`}
                className="flex-1 items-center justify-end"
              >
                <Text
                  numberOfLines={1}
                  className="mb-1 text-[8px] font-semibold text-[#6B7280]"
                >
                  {chartMode === 'revenue'
                    ? formatCompactCurrency(item.value)
                    : item.value.toLocaleString('en-IN')}
                </Text>
                <View
                  className="w-[55%] rounded-t-lg bg-[#0B806B]"
                  style={{ height }}
                />
                <Text
                  numberOfLines={1}
                  className="mb-2 mt-2 text-[8px] text-[#6B7280]"
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderFilterSummary = () => {
    if (!overview.filteredSummary) return null;
    return (
      <View className="rounded-xl border border-emerald-200 bg-[#F0FDF4] p-3">
        <Text className="text-[10px] font-bold uppercase text-[#166534]">
          Filtered period revenue
        </Text>
        <Text className="mt-1 text-lg font-extrabold text-[#14532D]">
          {formatCompactCurrency(overview.filteredSummary.filteredRevenue)}
        </Text>
        <Text className="mt-1 text-[10px] text-[#166534]">
          {overview.filteredSummary.filteredPaidCount || 0} paid ·{' '}
          {overview.filteredSummary.filteredTransactions || 0} total invoices
        </Text>
        {Number(overview.filteredSummary.filteredPending || 0) > 0 ? (
          <Text className="mt-1 text-[10px] font-semibold text-amber-800">
            Pending: {formatCurrency(overview.filteredSummary.filteredPending)}
          </Text>
        ) : null}
      </View>
    );
  };

  const closeShopDetails = () => {
    setSelectedShopId(null);
    setShopDetails(null);
    setShopDetailError('');
  };
  const closeInvoice = () => {
    setSelectedPaymentId(null);
    setInvoice(null);
    setInvoiceError('');
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-4 py-4 pb-8"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            tintColor="#08745D"
          />
        }
      >
        <View className="rounded-3xl bg-[#07564B] p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center pr-2">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <BarChart3 size={23} color="#FDE68A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[9px] font-extrabold uppercase tracking-[1.5px] text-emerald-100">
                  Super Admin · Finance
                </Text>
                <Text className="mt-1 text-xl font-black text-white">
                  Revenue Reports
                </Text>
                <Text className="mt-1 text-[10px] leading-4 text-white/75">
                  Income, subscriptions, and transaction history
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh revenue reports"
              disabled={refreshing}
              onPress={() => refresh()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            >
              <RefreshCw size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View className="rounded-2xl border border-[#ECE7D8] bg-white p-3">
          <View className="mb-3 flex-row items-center">
            <Filter size={15} color="#08745D" />
            <Text className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
              Report filters
            </Text>
          </View>
          <View className="flex-row items-center rounded-xl border border-[#E5E7EB] px-3">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              accessibilityLabel="Search revenue reports"
              value={search}
              onChangeText={value => setFilter(() => setSearch(value))}
              placeholder="Search shops, transactions, invoices..."
              placeholderTextColor="#9CA3AF"
              className="min-h-11 flex-1 px-2 text-xs text-[#1F2937]"
              returnKeyType="search"
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear report search"
                onPress={() => setFilter(() => setSearch(''))}
              >
                <X size={15} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <SelectField
              label="Filter revenue by date"
              value={datePreset}
              options={DATE_OPTIONS}
              onChange={value =>
                setFilter(() => setDatePreset(value as DatePreset))
              }
            />
            <SelectField
              label="Filter by subscription plan"
              value={selectedPlan}
              options={[
                { value: 'all', label: 'All Subscription Plans' },
                ...plans.map(plan => ({
                  value: String(plan.id),
                  label: plan.plan_name || 'Unnamed plan',
                })),
              ]}
              onChange={value => setFilter(() => setSelectedPlan(value))}
            />
            <SelectField
              label="Filter by payment status"
              value={selectedStatus}
              options={STATUS_OPTIONS}
              onChange={value => setFilter(() => setSelectedStatus(value))}
            />
          </View>
          {datePreset === 'custom' ? (
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-semibold text-[#6B7280]">
                  Start date
                </Text>
                <TextInput
                  accessibilityLabel="Start date"
                  value={customStart}
                  onChangeText={value => setCustomStart(value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-10 rounded-lg border border-[#E5E7EB] px-2 text-xs text-[#374151]"
                  maxLength={10}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-semibold text-[#6B7280]">
                  End date
                </Text>
                <TextInput
                  accessibilityLabel="End date"
                  value={customEnd}
                  onChangeText={value => setCustomEnd(value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-10 rounded-lg border border-[#E5E7EB] px-2 text-xs text-[#374151]"
                  maxLength={10}
                />
              </View>
            </View>
          ) : null}
        </View>

        {error ? (
          <View className="rounded-xl bg-rose-50 p-3">
            <Text className="text-xs font-semibold text-rose-700">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadDashboardData()}
              className="mt-2 self-start rounded-lg bg-rose-700 px-3 py-2"
            >
              <Text className="text-[10px] font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {renderFilterSummary()}

        <View className="flex-row flex-wrap gap-2">
          {metricCards.map(card => (
            <MetricCard
              key={card.id}
              title={card.title}
              amount={card.amount}
              subtext={card.subtext}
              icon={card.icon}
              tone={card.tone}
              growth={card.growth}
              badge={card.badge}
            />
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const selected = activeView === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setActiveView(tab.id)}
                className={`flex-row items-center rounded-xl border px-3 py-2.5 ${
                  selected
                    ? 'border-[#075C51] bg-[#075C51]'
                    : 'border-[#E5E7EB] bg-white'
                }`}
              >
                <Icon size={15} color={selected ? '#FFFFFF' : '#6B7280'} />
                <Text
                  className={`ml-1.5 text-[10px] font-bold ${
                    selected ? 'text-white' : 'text-[#4B5563]'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeView === 'all' || activeView === 'analytics'
          ? renderChart()
          : null}
        {activeView === 'all' || activeView === 'shops'
          ? renderShopList()
          : null}
        {activeView === 'all' || activeView === 'plans'
          ? renderPlanList()
          : null}
        {activeView === 'all' || activeView === 'payments'
          ? renderPaymentList()
          : null}
      </ScrollView>

      <Modal
        visible={selectedShopId != null}
        transparent
        animationType="slide"
        onRequestClose={closeShopDetails}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-3xl bg-[#F8F7F2]">
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#153B35] px-5 py-4">
              <View className="flex-1 flex-row items-center pr-2">
                <Store size={20} color="#FDE68A" />
                <View className="ml-2 flex-1">
                  <Text className="text-base font-extrabold text-white">
                    {shopDetails?.shop?.shop_name || 'Shop Revenue'}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-white/70">
                    {shopDetails?.shop?.shop_code || 'Revenue breakdown'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close shop revenue details"
                onPress={closeShopDetails}
                className="p-2"
              >
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <ScrollView
              contentContainerClassName="gap-3 p-4"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              {shopDetailLoading ? (
                <ActivityIndicator className="py-10" color="#08745D" />
              ) : shopDetailError ? (
                <Text className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  {shopDetailError}
                </Text>
              ) : shopDetails ? (
                <>
                  <View className="flex-row flex-wrap gap-2">
                    <DetailCell
                      label="Total invoiced"
                      value={formatCurrency(
                        shopDetails.financialSummary?.totalInvoiced,
                      )}
                    />
                    <DetailCell
                      label="Total paid"
                      value={formatCurrency(
                        shopDetails.financialSummary?.totalPaid,
                      )}
                    />
                    <DetailCell
                      label="Pending balance"
                      value={formatCurrency(
                        shopDetails.financialSummary?.pendingBalance,
                      )}
                    />
                    <DetailCell
                      label="Refunds"
                      value={formatCurrency(
                        shopDetails.financialSummary?.totalRefunded,
                      )}
                    />
                  </View>
                  <View className="rounded-2xl border border-[#E8ECE9] bg-white p-4">
                    <Text className="text-xs font-extrabold uppercase text-[#173F35]">
                      Shop information
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      <DetailCell
                        label="Owner"
                        value={shopDetails.shop?.owner_name}
                      />
                      <DetailCell
                        label="Phone"
                        value={shopDetails.shop?.mobile}
                      />
                      <DetailCell
                        label="Email"
                        value={shopDetails.shop?.email}
                      />
                      <DetailCell
                        label="GST"
                        value={shopDetails.shop?.gst_number || 'Not registered'}
                      />
                      <DetailCell
                        label="Address"
                        value={
                          shopDetails.shop?.address
                            ? `${shopDetails.shop.address}, ${
                                shopDetails.shop.city || ''
                              }, ${shopDetails.shop.state || ''}`
                            : '—'
                        }
                      />
                    </View>
                  </View>
                  <View className="rounded-2xl border border-[#E8ECE9] bg-white p-4">
                    <Text className="text-xs font-extrabold uppercase text-[#173F35]">
                      Subscription history
                    </Text>
                    {(shopDetails.subscriptions || []).length === 0 ? (
                      <Text className="mt-3 text-xs text-[#6B7280]">
                        No subscriptions found.
                      </Text>
                    ) : (
                      <View className="mt-3 gap-2">
                        {shopDetails.subscriptions?.map(subscription => (
                          <View
                            key={subscription.id}
                            className="rounded-xl bg-[#F8FAF9] p-3"
                          >
                            <View className="flex-row justify-between gap-2">
                              <Text className="flex-1 text-xs font-bold text-[#173F35]">
                                {subscription.plan_name || 'Plan'}
                              </Text>
                              <StatusBadge
                                status={subscription.subscription_status}
                              />
                            </View>
                            <Text className="mt-1 text-[10px] text-[#6B7280]">
                              {subscription.duration || '—'} ·{' '}
                              {formatDate(subscription.start_date)} –{' '}
                              {formatDate(subscription.end_date)}
                            </Text>
                            <Text className="mt-1 text-xs font-bold text-[#374151]">
                              {formatCurrency(subscription.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View className="rounded-2xl border border-[#E8ECE9] bg-white p-4">
                    <Text className="text-xs font-extrabold uppercase text-[#173F35]">
                      Payment transactions
                    </Text>
                    {(shopDetails.payments || []).length === 0 ? (
                      <Text className="mt-3 text-xs text-[#6B7280]">
                        No payment transactions recorded.
                      </Text>
                    ) : (
                      <View className="mt-3 gap-2">
                        {shopDetails.payments?.map(payment => (
                          <View
                            key={payment.id}
                            className="flex-row items-center justify-between rounded-xl bg-[#F8FAF9] p-3"
                          >
                            <View className="flex-1">
                              <Text className="text-[10px] font-bold text-[#374151]">
                                {payment.transaction_id || 'PENDING'}
                              </Text>
                              <Text className="mt-1 text-[9px] text-[#6B7280]">
                                {payment.invoice_number || `INV-${payment.id}`}{' '}
                                ·{' '}
                                {formatDate(
                                  payment.payment_date || payment.created_at,
                                )}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-xs font-bold text-[#111827]">
                                {formatCurrency(payment.amount)}
                              </Text>
                              <StatusBadge status={payment.payment_status} />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedPaymentId != null}
        transparent
        animationType="slide"
        onRequestClose={closeInvoice}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-3xl bg-[#F8F7F2]">
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#153B35] px-5 py-4">
              <View className="flex-1 flex-row items-center pr-2">
                <FileText size={20} color="#FDE68A" />
                <View className="ml-2 flex-1">
                  <Text className="text-base font-extrabold text-white">
                    Invoice Details
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-white/70">
                    {invoice?.invoiceNumber || 'Payment receipt'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close invoice details"
                onPress={closeInvoice}
                className="p-2"
              >
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <ScrollView
              contentContainerClassName="gap-3 p-4"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              {invoiceLoading ? (
                <ActivityIndicator className="py-10" color="#08745D" />
              ) : invoiceError ? (
                <Text className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  {invoiceError}
                </Text>
              ) : invoice ? (
                <>
                  <View className="rounded-2xl bg-[#153B35] p-4">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-[9px] font-bold uppercase text-white/65">
                          Invoice
                        </Text>
                        <Text className="mt-1 text-sm font-extrabold text-white">
                          {invoice.invoiceNumber || '—'}
                        </Text>
                      </View>
                      <StatusBadge status={invoice.paymentStatus} />
                    </View>
                    <Text className="mt-4 text-[9px] font-bold uppercase text-white/65">
                      Net paid amount
                    </Text>
                    <Text className="mt-1 text-2xl font-black text-white">
                      {formatCurrency(invoice.netAmount ?? invoice.amount)}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <DetailCell
                      label="Subtotal"
                      value={formatCurrency(invoice.amount)}
                    />
                    <DetailCell
                      label="Refunded"
                      value={formatCurrency(invoice.refundAmount)}
                    />
                  </View>
                  <View className="rounded-2xl border border-[#E8ECE9] bg-white p-4">
                    <Text className="text-xs font-extrabold uppercase text-[#173F35]">
                      Billed to
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      <DetailCell label="Shop" value={invoice.shop?.name} />
                      <DetailCell label="Shop ID" value={invoice.shop?.code} />
                      <DetailCell label="Owner" value={invoice.shop?.owner} />
                      <DetailCell label="Mobile" value={invoice.shop?.mobile} />
                      <DetailCell label="Email" value={invoice.shop?.email} />
                      <DetailCell label="GST" value={invoice.shop?.gst} />
                    </View>
                  </View>
                  <View className="rounded-2xl border border-[#E8ECE9] bg-white p-4">
                    <Text className="text-xs font-extrabold uppercase text-[#173F35]">
                      Transaction & subscription
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      <DetailCell
                        label="Transaction ID"
                        value={invoice.transactionId}
                      />
                      <DetailCell
                        label="Payment method"
                        value={invoice.paymentMethod}
                      />
                      <DetailCell
                        label="Plan"
                        value={invoice.subscription?.planName}
                      />
                      <DetailCell
                        label="Billing cycle"
                        value={invoice.subscription?.duration}
                      />
                      <DetailCell
                        label="Payment date"
                        value={formatDate(invoice.paymentDate)}
                      />
                      <DetailCell
                        label="Validity"
                        value={
                          invoice.subscription
                            ? `${formatDate(
                                invoice.subscription.startDate,
                              )} – ${formatDate(invoice.subscription.endDate)}`
                            : undefined
                        }
                      />
                    </View>
                  </View>
                  <Text className="px-2 py-2 text-center text-[10px] leading-4 text-[#8A8F8B]">
                    Computer-generated subscription payment receipt.
                  </Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
