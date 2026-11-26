import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
  X,
  XCircle,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import api from '../../api';

type PaymentStatus =
  | 'paid'
  | 'pending'
  | 'unpaid'
  | 'failed'
  | 'refunded'
  | 'cancelled';
type PaymentFilter = 'all' | PaymentStatus;
type PaymentRecord = {
  id: string | number;
  paymentId?: string;
  shopCode?: string;
  shopName?: string;
  email?: string;
  transactionId?: string;
  planName?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  amount?: number;
  refundAmount?: number;
  paymentDate?: string;
  paymentStatus?: PaymentStatus | string;
  paymentMethod?: string;
  paymentReference?: string;
};
type PaymentOverviewData = {
  totalPayments?: number;
  totalAmountCollected?: number;
  pendingPaymentsCount?: number;
  pendingPaymentsAmount?: number;
  failedPaymentsCount?: number;
  failedPaymentsAmount?: number;
  refundedPaymentsCount?: number;
  refundedPaymentsAmount?: number;
};
type PaymentPlan = { id: string | number; plan_name?: string };
type PaymentDetails = PaymentRecord & {
  invoiceNumber?: string;
  createdAt?: string;
  notes?: string;
  rejectionReason?: string;
  shop?: {
    name?: string;
    code?: string;
    owner?: string;
    mobile?: string;
    email?: string;
    gst?: string;
  };
  subscription?: {
    planName?: string;
    duration?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
};
type PaymentManagementProps = { onBack: () => void };

const METHODS = [
  'UPI',
  'Bank Transfer',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Payment Gateway',
];
const STATUS_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'All Payment Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];
const EMPTY_OVERVIEW: PaymentOverviewData = {
  totalPayments: 0,
  totalAmountCollected: 0,
  pendingPaymentsCount: 0,
  pendingPaymentsAmount: 0,
  failedPaymentsCount: 0,
  failedPaymentsAmount: 0,
  refundedPaymentsCount: 0,
  refundedPaymentsAmount: 0,
};

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

function formatCurrency(value: number | string | null | undefined) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | undefined, time = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof CreditCard;
  color: string;
}) {
  return (
    <View className="flex-1 basis-[145px] rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View
        className={`mb-3 h-10 w-10 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={20} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text className="text-xs font-semibold text-[#6B7280]">{label}</Text>
      <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
        {value}
      </Text>
      <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">
        {note}
      </Text>
    </View>
  );
}

function StatusBadge({ status = 'pending' }: { status?: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-[#DCFCE7] text-[#166534]',
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    unpaid: 'bg-[#FEF3C7] text-[#92400E]',
    failed: 'bg-[#FFE4E6] text-[#9F1239]',
    refunded: 'bg-[#F3E8FF] text-[#6B21A8]',
    cancelled: 'bg-[#F3F4F6] text-[#4B5563]',
  };
  const label =
    status === 'unpaid' || status === 'pending'
      ? 'Pending'
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        colors[status] || 'bg-[#F3F4F6] text-[#4B5563]'
      }`}
    >
      <Text className="text-[10px] font-bold">{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-xl border border-[#E5E7EB] p-3">
      <Text className="text-[10px] font-bold uppercase text-[#9CA3AF]">
        {label}
      </Text>
      <Text className="mt-1 text-xs font-semibold text-[#1F2937]">
        {value || '—'}
      </Text>
    </View>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onSelect,
  containerClassName = 'min-w-[47%] flex-1',
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  containerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find(option => option.value === value)?.label || label;
  return (
    <View className={containerClassName}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(current => !current)}
        className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3"
      >
        <Text numberOfLines={1} className="mr-2 flex-1 text-xs text-[#374151]">
          {selected}
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
                onSelect(option.value);
                setOpen(false);
              }}
              className={`flex-row items-center justify-between rounded-lg px-2.5 py-2 ${
                option.value === value ? 'bg-[#E7F3EF]' : ''
              }`}
            >
              <Text className="flex-1 text-xs font-medium text-[#374151]">
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

export default function PaymentManagement({ onBack }: PaymentManagementProps) {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<PaymentOverviewData>(EMPTY_OVERVIEW);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [plansError, setPlansError] = useState('');
  const [listError, setListError] = useState('');

  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(
    null,
  );
  const [fullDetail, setFullDetail] = useState<PaymentDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [approveTarget, setApproveTarget] = useState<PaymentRecord | null>(
    null,
  );
  const [approveForm, setApproveForm] = useState({
    transactionId: '',
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    notes: 'Payment verified and approved by Super Admin',
  });
  const [approving, setApproving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError('');
    try {
      const response = await api.get('/super-admin/payments/overview');
      setOverview({ ...EMPTY_OVERVIEW, ...(response.data?.data || {}) });
    } catch (error) {
      setOverviewError(
        getErrorMessage(error, 'Unable to load payment totals.'),
      );
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansError('');
    try {
      const response = await api.get('/super-admin/subscription-plans', {
        params: { pageSize: 50 },
      });
      setPlans(Array.isArray(response.data?.plans) ? response.data.plans : []);
    } catch (error) {
      setPlansError(
        getErrorMessage(error, 'Unable to load subscription plans.'),
      );
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const params = {
        page,
        limit: 10,
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
        paymentMethod: methodFilter !== 'all' ? methodFilter : undefined,
        paymentDate: dateFilter || undefined,
      };
      const response = await api.get('/super-admin/payments', { params });
      const data = response.data?.data;
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      setListError(getErrorMessage(error, 'Unable to load payments.'));
    } finally {
      setLoadingList(false);
    }
  }, [dateFilter, methodFilter, page, planFilter, search, statusFilter]);

  useEffect(() => {
    loadOverview();
    loadPlans();
  }, [loadOverview, loadPlans]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadOverview(), loadPlans(), loadPayments()]);
    setRefreshing(false);
  }, [loadOverview, loadPayments, loadPlans]);

  const refreshAfterAction = useCallback(() => {
    loadOverview();
    loadPayments();
  }, [loadOverview, loadPayments]);

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  const viewDetails = async (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setFullDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await api.get(`/super-admin/payments/${payment.id}`);
      if (response.data?.data) {
        setFullDetail(response.data.data);
      } else {
        setDetailError('Payment details were not returned by the server.');
      }
    } catch (error) {
      setDetailError(getErrorMessage(error, 'Could not load payment details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const response = await api.post(
        `/super-admin/payments/${approveTarget.id}/approve`,
        approveForm,
      );
      Alert.alert(
        'Payment approved',
        response.data?.message ||
          'Payment approved and subscription activated.',
      );
      setApproveTarget(null);
      refreshAfterAction();
    } catch (error) {
      Alert.alert(
        'Approval failed',
        getErrorMessage(error, 'Failed to approve payment.'),
      );
    } finally {
      setApproving(false);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      Alert.alert(
        'Reason required',
        'Enter a reason for rejecting this payment.',
      );
      return;
    }
    setRejecting(true);
    try {
      const response = await api.post(
        `/super-admin/payments/${rejectTarget.id}/reject`,
        { rejectionReason: rejectionReason.trim() },
      );
      Alert.alert(
        'Payment rejected',
        response.data?.message || 'Payment has been rejected.',
      );
      setRejectTarget(null);
      refreshAfterAction();
    } catch (error) {
      Alert.alert(
        'Rejection failed',
        getErrorMessage(error, 'Failed to reject payment.'),
      );
    } finally {
      setRejecting(false);
    }
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    const amount = Number(refundAmount);
    const maximum =
      Number(refundTarget.amount || 0) - Number(refundTarget.refundAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > maximum) {
      Alert.alert(
        'Invalid refund amount',
        `Enter an amount greater than zero and no more than ${formatCurrency(
          maximum,
        )}.`,
      );
      return;
    }
    if (!refundReason.trim()) {
      Alert.alert(
        'Reason required',
        'Provide a reason for issuing this refund.',
      );
      return;
    }
    setRefunding(true);
    try {
      const response = await api.post(
        `/super-admin/payments/${refundTarget.id}/refund`,
        { refundAmount: amount, reason: refundReason.trim() },
      );
      Alert.alert(
        'Refund processed',
        response.data?.message || 'Refund processed successfully.',
      );
      setRefundTarget(null);
      refreshAfterAction();
    } catch (error) {
      Alert.alert(
        'Refund failed',
        getErrorMessage(error, 'Failed to process refund.'),
      );
    } finally {
      setRefunding(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline = false,
    keyboardType: 'default' | 'decimal-pad' = 'default',
  ) => (
    <View className="mt-3">
      <Text className="mb-1.5 text-xs font-bold text-[#374151]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        className={`rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#1F2937] ${
          multiline ? 'min-h-24' : 'min-h-11'
        }`}
      />
    </View>
  );

  const actionButton = (
    label: string,
    onPress: () => void,
    color: string,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`min-h-10 items-center justify-center rounded-xl px-3 ${color} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <Text className="text-xs font-bold text-white">{label}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} className="bg-[#153B35]">
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            onPress={onBack}
            className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft size={21} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-white">
              Payment Management
            </Text>
            <Text className="mt-0.5 text-[10px] text-white/75">
              Review payments, approvals, and refunds
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh payments"
            disabled={refreshing}
            onPress={() => refresh()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <RefreshCw size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 px-4 py-4 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh()}
              tintColor="#08745D"
            />
          }
        >
          {overviewError ? (
            <Text className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {overviewError}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-3">
            <SummaryCard
              label="Total Payments"
              value={
                loadingOverview
                  ? '—'
                  : (overview.totalPayments || 0).toLocaleString('en-IN')
              }
              note="All logged transactions"
              icon={CreditCard}
              color="bg-[#123B32]"
            />
            <SummaryCard
              label="Amount Collected"
              value={
                loadingOverview
                  ? '—'
                  : formatCurrency(overview.totalAmountCollected)
              }
              note="Net successful payments"
              icon={DollarSign}
              color="bg-[#443719]"
            />
            <SummaryCard
              label="Pending Payments"
              value={
                loadingOverview
                  ? '—'
                  : String(overview.pendingPaymentsCount || 0)
              }
              note={`${formatCurrency(overview.pendingPaymentsAmount)} due`}
              icon={Clock3}
              color="bg-[#17364D]"
            />
            <SummaryCard
              label="Failed Payments"
              value={
                loadingOverview
                  ? '—'
                  : String(overview.failedPaymentsCount || 0)
              }
              note={formatCurrency(overview.failedPaymentsAmount)}
              icon={XCircle}
              color="bg-[#4A2B25]"
            />
            <SummaryCard
              label="Refunded Payments"
              value={
                loadingOverview
                  ? '—'
                  : String(overview.refundedPaymentsCount || 0)
              }
              note={`${formatCurrency(
                overview.refundedPaymentsAmount,
              )} refunded`}
              icon={RotateCcw}
              color="bg-[#29363B]"
            />
          </View>

          <View className="rounded-2xl border border-[#ECE7D8] bg-white p-3">
            <View className="flex-row items-center rounded-xl border border-[#E5E7EB] px-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                accessibilityLabel="Search payments"
                value={search}
                onChangeText={value => updateFilter(() => setSearch(value))}
                placeholder="Search shop, owner, transaction..."
                placeholderTextColor="#9CA3AF"
                className="min-h-11 flex-1 px-2 text-xs text-[#1F2937]"
                returnKeyType="search"
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear payment search"
                  onPress={() => updateFilter(() => setSearch(''))}
                  className="p-1"
                >
                  <X size={15} color="#6B7280" />
                </Pressable>
              ) : null}
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              <FilterSelect
                label="Filter by payment status"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onSelect={value =>
                  updateFilter(() => setStatusFilter(value as PaymentFilter))
                }
              />
              <FilterSelect
                label="Filter by subscription plan"
                value={planFilter}
                options={[
                  { value: 'all', label: 'All Subscription Plans' },
                  ...plans.map(plan => ({
                    value: String(plan.id),
                    label: plan.plan_name || 'Unnamed plan',
                  })),
                ]}
                onSelect={value => updateFilter(() => setPlanFilter(value))}
              />
              <FilterSelect
                label="Filter by payment method"
                value={methodFilter}
                options={[
                  { value: 'all', label: 'All Payment Methods' },
                  ...METHODS.map(method => ({ value: method, label: method })),
                ]}
                onSelect={value => updateFilter(() => setMethodFilter(value))}
              />
              <View className="min-w-[47%] flex-1 flex-row items-center rounded-xl border border-[#E5E7EB] px-3">
                <CalendarDays size={15} color="#6B7280" />
                <TextInput
                  accessibilityLabel="Filter by payment date"
                  value={dateFilter}
                  onChangeText={value =>
                    updateFilter(() => setDateFilter(value))
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  className="min-h-11 flex-1 px-2 text-xs text-[#374151]"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                {dateFilter ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear payment date"
                    onPress={() => updateFilter(() => setDateFilter(''))}
                  >
                    <X size={14} color="#6B7280" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {plansError ? (
              <Text className="mt-2 text-[10px] font-semibold text-rose-700">
                {plansError}
              </Text>
            ) : null}
          </View>

          {listError ? (
            <View className="items-center rounded-2xl bg-white px-5 py-7">
              <Text className="text-center text-sm font-semibold text-rose-700">
                {listError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => loadPayments()}
                className="mt-3 rounded-xl bg-[#08745D] px-4 py-2.5"
              >
                <Text className="text-xs font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : loadingList && payments.length === 0 ? (
            <View className="items-center rounded-2xl bg-white py-10">
              <ActivityIndicator color="#08745D" />
              <Text className="mt-3 text-xs text-[#6B7280]">
                Loading payments...
              </Text>
            </View>
          ) : payments.length === 0 ? (
            <View className="items-center rounded-2xl bg-white px-5 py-10">
              <Wallet size={34} color="#9CA3AF" />
              <Text className="mt-3 text-sm font-bold text-[#374151]">
                No payment records found
              </Text>
              <Text className="mt-1 text-center text-xs text-[#6B7280]">
                Try changing your search or filters.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {payments.map(payment => (
                <View
                  key={payment.id}
                  className="rounded-2xl border border-[#ECE7D8] bg-white p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-[#173F35]">
                        {payment.shopName || 'Unnamed shop'}
                      </Text>
                      <Text className="mt-1 text-[10px] font-semibold text-[#6B7280]">
                        Shop ID: {payment.shopCode || '—'} ·{' '}
                        {payment.email || 'Email not provided'}
                      </Text>
                    </View>
                    <StatusBadge status={payment.paymentStatus} />
                  </View>
                  <View className="mt-3 flex-row flex-wrap gap-2 border-t border-[#F3F4F6] pt-3">
                    <DetailRow
                      label="Transaction ID"
                      value={payment.transactionId || 'PENDING'}
                    />
                    <DetailRow label="Plan" value={payment.planName} />
                    <DetailRow
                      label="Amount"
                      value={formatCurrency(payment.amount)}
                    />
                    <DetailRow
                      label="Payment Date"
                      value={formatDate(payment.paymentDate)}
                    />
                    <DetailRow
                      label="Subscription Start"
                      value={formatDate(payment.subscriptionStartDate)}
                    />
                    <DetailRow
                      label="Subscription Expiry"
                      value={formatDate(payment.subscriptionEndDate)}
                    />
                  </View>
                  {Number(payment.refundAmount || 0) > 0 ? (
                    <Text className="mt-2 text-xs font-semibold text-purple-700">
                      Refunded: {formatCurrency(payment.refundAmount)}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row flex-wrap gap-2 border-t border-[#F3F4F6] pt-3">
                    {actionButton(
                      'View Details',
                      () => viewDetails(payment),
                      'bg-[#173F35]',
                    )}
                    {payment.paymentStatus === 'pending'
                      ? actionButton(
                          'Approve',
                          () => {
                            setApproveTarget(payment);
                            setApproveForm(current => ({
                              ...current,
                              transactionId:
                                payment.transactionId === 'PENDING'
                                  ? ''
                                  : payment.transactionId || '',
                              paymentMethod:
                                payment.paymentMethod || 'Bank Transfer',
                              paymentReference: payment.paymentReference || '',
                            }));
                          },
                          'bg-[#059669]',
                        )
                      : null}
                    {payment.paymentStatus === 'pending'
                      ? actionButton(
                          'Reject',
                          () => {
                            setRejectTarget(payment);
                            setRejectionReason('');
                          },
                          'bg-[#BE123C]',
                        )
                      : null}
                    {payment.paymentStatus === 'paid'
                      ? actionButton(
                          'Refund',
                          () => {
                            setRefundTarget(payment);
                            const remaining =
                              Number(payment.amount || 0) -
                              Number(payment.refundAmount || 0);
                            setRefundAmount(
                              remaining > 0 ? String(remaining) : '',
                            );
                            setRefundReason('');
                          },
                          'bg-[#7E22CE]',
                        )
                      : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {pagination.totalPages > 1 ? (
            <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-3">
              <Text className="flex-1 text-[10px] text-[#6B7280]">
                Page {pagination.page || page} of {pagination.totalPages} ·{' '}
                {pagination.total || 0} payments
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                disabled={page <= 1}
                onPress={() => setPage(current => current - 1)}
                className={`mr-2 min-h-9 flex-row items-center rounded-lg border border-[#E5E7EB] px-2 ${
                  page <= 1 ? 'opacity-40' : ''
                }`}
              >
                <ChevronLeft size={15} color="#374151" />
                <Text className="text-[10px] font-semibold text-[#374151]">
                  Prev
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next page"
                disabled={page >= pagination.totalPages}
                onPress={() => setPage(current => current + 1)}
                className={`min-h-9 flex-row items-center rounded-lg border border-[#E5E7EB] px-2 ${
                  page >= pagination.totalPages ? 'opacity-40' : ''
                }`}
              >
                <Text className="text-[10px] font-semibold text-[#374151]">
                  Next
                </Text>
                <ChevronRight size={15} color="#374151" />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={Boolean(selectedPayment)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPayment(null)}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[92%] rounded-t-3xl bg-[#F8FAF9]">
            <View className="rounded-t-3xl bg-[#153B35] px-5 pb-4 pt-3">
              <View className="h-1 w-10 self-center rounded-full bg-white/40" />
              <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center pr-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <CreditCard size={21} color="#FDE68A" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-lg font-extrabold text-white">
                      Payment Details
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[10px] text-white/75"
                    >
                      {selectedPayment?.shopName || 'Payment record'} · ID{' '}
                      {selectedPayment?.paymentId || selectedPayment?.id || '—'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close payment details"
                  onPress={() => setSelectedPayment(null)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                  <X size={19} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
            <ScrollView
              className="shrink"
              contentContainerClassName="gap-3 p-4"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              {detailLoading ? (
                <View className="items-center py-10">
                  <ActivityIndicator color="#08745D" />
                  <Text className="mt-3 text-xs text-[#6B7280]">
                    Loading details...
                  </Text>
                </View>
              ) : detailError ? (
                <Text className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {detailError}
                </Text>
              ) : fullDetail ? (
                <>
                  <View className="flex-row items-center justify-between rounded-2xl bg-[#153B35] p-4">
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                        Payment status
                      </Text>
                      <View className="mt-1">
                        <StatusBadge status={fullDetail.paymentStatus} />
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                        Paid amount
                      </Text>
                      <Text className="mt-1 text-xl font-extrabold text-white">
                        {formatCurrency(fullDetail.amount)}
                      </Text>
                      {Number(fullDetail.refundAmount || 0) > 0 ? (
                        <Text className="text-[10px] font-bold text-amber-200">
                          Refunded: {formatCurrency(fullDetail.refundAmount)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="gap-2 rounded-2xl border border-[#E8ECE9] bg-white p-3">
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                      Transaction Information
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <DetailRow
                        label="Transaction ID"
                        value={fullDetail.transactionId}
                      />
                      <DetailRow
                        label="Invoice Number"
                        value={fullDetail.invoiceNumber}
                      />
                      <DetailRow
                        label="Payment Method"
                        value={fullDetail.paymentMethod}
                      />
                      <DetailRow
                        label="Payment Reference"
                        value={fullDetail.paymentReference}
                      />
                      <DetailRow
                        label="Payment Date"
                        value={formatDate(fullDetail.paymentDate, true)}
                      />
                      <DetailRow
                        label="Recorded At"
                        value={formatDate(fullDetail.createdAt, true)}
                      />
                    </View>
                    {fullDetail.notes ? (
                      <Text className="text-xs text-[#4B5563]">
                        Notes: {fullDetail.notes}
                      </Text>
                    ) : null}
                    {fullDetail.rejectionReason ? (
                      <Text className="text-xs font-semibold text-rose-700">
                        Rejection reason: {fullDetail.rejectionReason}
                      </Text>
                    ) : null}
                  </View>
                  <View className="gap-2 rounded-2xl border border-[#E8ECE9] bg-white p-3">
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                      Shop Information
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <DetailRow
                        label="Shop Name"
                        value={fullDetail.shop?.name}
                      />
                      <DetailRow
                        label="Shop ID"
                        value={fullDetail.shop?.code}
                      />
                      <DetailRow
                        label="Owner Name"
                        value={fullDetail.shop?.owner}
                      />
                      <DetailRow
                        label="Contact Number"
                        value={fullDetail.shop?.mobile}
                      />
                      <DetailRow label="Email" value={fullDetail.shop?.email} />
                      <DetailRow label="GST" value={fullDetail.shop?.gst} />
                    </View>
                  </View>
                  <View className="gap-2 rounded-2xl border border-[#E8ECE9] bg-white p-3">
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                      Subscription Details
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <DetailRow
                        label="Plan Name"
                        value={fullDetail.subscription?.planName}
                      />
                      <DetailRow
                        label="Billing Cycle"
                        value={fullDetail.subscription?.duration}
                      />
                      <DetailRow
                        label="Subscription Status"
                        value={fullDetail.subscription?.status}
                      />
                      <DetailRow
                        label="Period"
                        value={
                          fullDetail.subscription
                            ? `${formatDate(
                                fullDetail.subscription.startDate,
                              )} to ${formatDate(
                                fullDetail.subscription.endDate,
                              )}`
                            : undefined
                        }
                      />
                    </View>
                  </View>
                </>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedPayment(null)}
                className="min-h-12 items-center justify-center rounded-xl bg-[#08745D]"
              >
                <Text className="text-sm font-extrabold text-white">Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(approveTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setApproveTarget(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="max-h-[92%]"
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow justify-end"
          >
            <View
              className="rounded-t-3xl bg-white px-5 pt-4"
              style={{ paddingBottom: Math.max(insets.bottom, 20) }}
            >
              <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#D1D5DB]" />
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#DCFCE7]">
                    <CheckCircle2 size={22} color="#047857" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-lg font-extrabold text-[#173F35]">
                      Approve Payment
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-[#6B7280]">
                      Verify the transaction before confirming
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close approval form"
                  onPress={() => setApproveTarget(null)}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
                >
                  <X size={20} color="#6B7280" />
                </Pressable>
              </View>
              <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-[#DDEBE5] bg-[#F3F8F5] p-4">
                <View className="mr-3 flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    {approveTarget?.shopName || 'Payment'}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-[#173F35]">
                    {approveTarget?.planName || 'Subscription plan'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#6B7280]">
                    Txn: {approveTarget?.transactionId || 'PENDING'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] font-bold uppercase text-[#6B7280]">
                    Amount
                  </Text>
                  <Text className="mt-1 text-lg font-extrabold text-[#08745D]">
                    {formatCurrency(approveTarget?.amount)}
                  </Text>
                </View>
              </View>
              <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
                <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                  Payment details
                </Text>
                {renderField(
                  'Transaction ID',
                  approveForm.transactionId,
                  value =>
                    setApproveForm(current => ({
                      ...current,
                      transactionId: value,
                    })),
                  'Enter bank/gateway transaction ID',
                )}
                <View className="mt-3">
                  <Text className="mb-1.5 text-xs font-bold text-[#374151]">
                    Payment method
                  </Text>
                  <FilterSelect
                    label="Payment method"
                    value={approveForm.paymentMethod}
                    options={METHODS.map(method => ({
                      value: method,
                      label: method,
                    }))}
                    containerClassName=""
                    onSelect={value =>
                      setApproveForm(current => ({
                        ...current,
                        paymentMethod: value,
                      }))
                    }
                  />
                </View>
                {renderField(
                  'Reference / UTR (optional)',
                  approveForm.paymentReference,
                  value =>
                    setApproveForm(current => ({
                      ...current,
                      paymentReference: value,
                    })),
                  'e.g. UTR12345678',
                )}
              </View>
              <Text className="mt-3 text-[10px] leading-4 text-[#6B7280]">
                Approval marks this payment as paid and activates the linked
                subscription.
              </Text>
              <View className="mt-4 flex-row gap-2 border-t border-[#F3F4F6] pt-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setApproveTarget(null)}
                  className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#D1D5DB] bg-white"
                >
                  <Text className="text-sm font-bold text-[#4B5563]">
                    Cancel
                  </Text>
                </Pressable>
                {actionButton(
                  approving ? 'Approving...' : 'Confirm & Approve',
                  () => submitApprove(),
                  'flex-1 bg-[#08745D]',
                  approving,
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(rejectTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectTarget(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow justify-end"
          >
            <View className="rounded-t-3xl bg-white p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ban size={20} color="#BE123C" />
                  <Text className="ml-2 text-base font-extrabold text-[#111827]">
                    Reject Payment
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRejectTarget(null)}
                  className="p-2"
                >
                  <X size={20} color="#6B7280" />
                </Pressable>
              </View>
              <Text className="mt-3 text-xs leading-5 text-[#4B5563]">
                Rejecting {rejectTarget?.transactionId || 'PENDING'} for{' '}
                {rejectTarget?.shopName || 'this shop'} (
                {formatCurrency(rejectTarget?.amount)}). A reason is required.
              </Text>
              {renderField(
                'Rejection reason',
                rejectionReason,
                setRejectionReason,
                'Explain why this payment is being rejected',
                true,
              )}
              <View className="mt-5 flex-row justify-end gap-2 border-t border-[#F3F4F6] pt-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRejectTarget(null)}
                  className="min-h-11 justify-center rounded-xl border border-[#E5E7EB] px-4"
                >
                  <Text className="text-xs font-bold text-[#4B5563]">
                    Cancel
                  </Text>
                </Pressable>
                {actionButton(
                  rejecting ? 'Rejecting...' : 'Reject Payment',
                  () => submitReject(),
                  'bg-[#BE123C]',
                  rejecting,
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(refundTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundTarget(null)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow justify-end"
          >
            <View className="rounded-t-3xl bg-white p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <RotateCcw size={20} color="#7E22CE" />
                  <Text className="ml-2 text-base font-extrabold text-[#111827]">
                    Process Refund
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRefundTarget(null)}
                  className="p-2"
                >
                  <X size={20} color="#6B7280" />
                </Pressable>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2 rounded-xl bg-purple-50 p-3">
                <DetailRow
                  label="Total Paid"
                  value={formatCurrency(refundTarget?.amount)}
                />
                <DetailRow
                  label="Already Refunded"
                  value={formatCurrency(refundTarget?.refundAmount)}
                />
                <DetailRow
                  label="Max Refundable"
                  value={formatCurrency(
                    Number(refundTarget?.amount || 0) -
                      Number(refundTarget?.refundAmount || 0),
                  )}
                />
              </View>
              {renderField(
                'Refund amount',
                refundAmount,
                setRefundAmount,
                'Enter refund amount',
                false,
                'decimal-pad',
              )}
              {renderField(
                'Refund reason',
                refundReason,
                setRefundReason,
                'Provide a reason for issuing the refund',
                true,
              )}
              <View className="mt-5 flex-row justify-end gap-2 border-t border-[#F3F4F6] pt-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRefundTarget(null)}
                  className="min-h-11 justify-center rounded-xl border border-[#E5E7EB] px-4"
                >
                  <Text className="text-xs font-bold text-[#4B5563]">
                    Cancel
                  </Text>
                </Pressable>
                {actionButton(
                  refunding ? 'Processing...' : 'Process Refund',
                  () => submitRefund(),
                  'bg-[#7E22CE]',
                  refunding,
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
