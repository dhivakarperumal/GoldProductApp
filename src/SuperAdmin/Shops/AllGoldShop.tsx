import { useCallback, useEffect, useState } from 'react';
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
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Store,
  Trash2,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';
import AddShops from './AddShops';
import GoldShopDetails from './GoldshopDetails';

type Shop = {
  id: number;
  shop_code?: string;
  shop_uuid?: string;
  shop_name?: string;
  owner_name?: string;
  owner_username?: string;
  mobile?: string;
  email?: string;
  gst_number?: string;
  aadhaar_number?: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  max_branches?: number;
  max_staff?: number;
  notes?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  approval_status?: string;
  approved_at?: string;
  plan_name?: string;
  plan_id?: number;
  account_plan_type?: string;
  subscription_amount?: number | string;
  duration?: string;
  account_start_date?: string;
  account_end_date?: string;
  subscription_status?: string;
  payment_status?: string;
  current_payment_status?: string;
  current_subscription_id?: number;
  subscriptions?: Array<Record<string, unknown>>;
  payments?: Array<Record<string, unknown>>;
  activity?: Array<Record<string, unknown>>;
};

type Summary = {
  total_shops?: number;
  pending_shops?: number;
  active_shops?: number;
  expired_subscriptions?: number;
};

const PAGE_SIZE = 10;

type AllGoldShopProps = {
  onFullScreenShopPageChange: (visible: boolean) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value?: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '—';
}

function recordString(
  record: Record<string, unknown> | null,
  key: string,
) {
  const value = record?.[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function getInitials(value?: string) {
  return (value || 'Shop')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

function StatusBadge({ value }: { value?: string }) {
  const status = (value || 'pending').toLowerCase();
  const active = status === 'active' || status === 'approved' || status === 'paid';
  const danger =
    status === 'rejected' || status === 'suspended' || status === 'failed';
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        active
          ? 'bg-[#DCFCE7]'
          : danger
            ? 'bg-[#FFE4E6]'
            : 'bg-[#FEF3C7]'
      }`}
    >
      <Text
        className={`text-[10px] font-bold capitalize ${
          active
            ? 'text-[#166534]'
            : danger
              ? 'text-[#9F1239]'
              : 'text-[#92400E]'
        }`}
      >
        {status}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <Text className="text-[10px] font-bold uppercase text-[#9CA3AF]">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-[#1F2937]">
        {value || '—'}
      </Text>
    </View>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  note: string;
  progress: number;
  icon: typeof Store;
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
};

const SUMMARY_BAR_SEGMENTS = [
  { height: 'h-1.5', threshold: 10 },
  { height: 'h-2', threshold: 30 },
  { height: 'h-3', threshold: 50 },
  { height: 'h-4', threshold: 70 },
  { height: 'h-5', threshold: 90 },
];

const SUMMARY_TONES = {
  emerald: {
    card: 'border-emerald-100',
    icon: 'bg-emerald-700',
    glow: 'bg-emerald-200/45',
    note: 'text-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  amber: {
    card: 'border-amber-100',
    icon: 'bg-amber-500',
    glow: 'bg-amber-200/45',
    note: 'text-amber-700',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  sky: {
    card: 'border-sky-100',
    icon: 'bg-sky-700',
    glow: 'bg-sky-200/45',
    note: 'text-sky-700',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
  },
  rose: {
    card: 'border-rose-100',
    icon: 'bg-rose-600',
    glow: 'bg-rose-200/45',
    note: 'text-rose-700',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
};

function SummaryCard({
  label,
  value,
  note,
  progress,
  icon: Icon,
  tone,
}: SummaryCardProps) {
  const styles = SUMMARY_TONES[tone];
  const percentage = Math.min(Math.max(progress, 0), 100);
  return (
    <View
      className={`relative min-h-[145px] flex-1 basis-[155px] overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ${styles.card}`}
    >
      <View
        pointerEvents="none"
        className={`absolute -right-5 -top-6 h-24 w-24 rounded-full ${styles.glow}`}
      />
      <View className="relative">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#6B7280]">
            {label}
          </Text>
          <View
            className={`ml-2 h-10 w-10 items-center justify-center rounded-xl shadow-sm ${styles.icon}`}
          >
            <Icon size={19} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
        <Text className="mt-2 text-[28px] font-black leading-8 tracking-tight text-[#173F35]">
          {Number(value || 0).toLocaleString('en-IN')}
        </Text>
        <View className="mt-2 flex-row items-center">
          <View className={`mr-1.5 h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          <Text
            numberOfLines={1}
            className={`flex-1 text-[10px] font-semibold ${styles.note}`}
          >
            {note}
          </Text>
        </View>
        <View className="mt-3 flex-row items-end gap-1.5">
          {SUMMARY_BAR_SEGMENTS.map(segment => (
            <View
              key={segment.threshold}
              className={`flex-1 rounded-full ${
                percentage >= segment.threshold
                  ? styles.bar
                  : 'bg-[#E5E7EB]'
              } ${segment.height}`}
            />
          ))}
          <Text className="ml-1 text-[9px] font-bold text-[#6B7280]">
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AllGoldShop({
  onFullScreenShopPageChange,
}: AllGoldShopProps) {
  const { showAlert } = useCustomAlert();
  const [shops, setShops] = useState<Shop[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Shop | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    shop: Shop;
    payment: Record<string, unknown> | null;
  } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [pendingApproval, setPendingApproval] = useState<Shop | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalCredentials, setApprovalCredentials] = useState<{
    mobile?: string;
    identifier?: string;
    username?: string;
    userId?: string;
    name?: string;
    temporaryPassword?: string;
  } | null>(null);

  const loadShops = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const { data } = await api.get('/super-admin/gold-shops', {
          params: {
            page,
            pageSize: PAGE_SIZE,
            search: search.trim(),
            status,
          },
        });
        setShops(Array.isArray(data?.shops) ? data.shops : []);
        setSummary(data?.summary || {});
        setPagination({
          page: Number(data?.pagination?.page) || page,
          totalPages: Math.max(
            1,
            Number(data?.pagination?.totalPages) || 1,
          ),
          total: Number(data?.pagination?.total) || 0,
        });
      } catch (error) {
        showAlert(
          'Unable to load gold shops',
          getErrorMessage(error, 'Could not load the gold shop directory.'),
          { variant: 'error' },
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, showAlert, status],
  );

  useEffect(() => {
    const timer = setTimeout(() => loadShops(), 250);
    return () => clearTimeout(timer);
  }, [loadShops]);

  const changeStatus = (shop: Shop) => {
    const nextStatus = shop.status === 'active' ? 'suspended' : 'active';
    showAlert(
      `${nextStatus === 'active' ? 'Activate' : 'Suspend'} shop?`,
      `${shop.shop_name || 'This shop'} will be ${nextStatus}.`,
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: nextStatus === 'active' ? 'Activate' : 'Suspend',
            style: nextStatus === 'active' ? 'default' : 'destructive',
            onPress: async () => {
              try {
                await api.patch(`/super-admin/gold-shops/${shop.id}/status`, {
                  status: nextStatus,
                });
                await loadShops(true);
              } catch (error) {
                showAlert(
                  'Unable to update shop',
                  getErrorMessage(error, 'Could not update the shop status.'),
                  { variant: 'error' },
                );
              }
            },
          },
        ],
      },
    );
  };

  const approveShop = async (shop: Shop) => {
    setApprovalLoading(true);
    try {
      const { data } = await api.get(`/super-admin/gold-shops/${shop.id}`);
      if (!data?.shop) {
        throw new Error('Gold shop details were not returned.');
      }
      setPendingApproval(data.shop as Shop);
    } catch (error) {
      showAlert(
        'Unable to load shop',
        getErrorMessage(error, 'Could not load complete shop details.'),
        { variant: 'error' },
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  const confirmApproveShop = async () => {
    if (!pendingApproval || approvalSubmitting) return;
    setApprovalSubmitting(true);
    try {
      const { data } = await api.post(
        `/super-admin/gold-shops/${pendingApproval.id}/approve`,
      );
      setApprovalCredentials({
        identifier:
          data?.credentials?.identifier ||
          data?.shop?.owner_email ||
          pendingApproval.email ||
          '',
        username: data?.shop?.owner_username || '',
        userId: data?.shop?.owner_user_uuid || '',
        name: data?.shop?.owner_name || pendingApproval.owner_name || '',
        mobile: data?.shop?.mobile || pendingApproval.mobile || '',
        temporaryPassword: data?.credentials?.temporaryPassword || '',
      });
      setPendingApproval(null);
      await loadShops(true);
    } catch (error) {
      showAlert(
        'Unable to approve shop',
        getErrorMessage(error, 'Could not approve this shop.'),
        { variant: 'error' },
      );
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const rejectShop = (shop: Shop) => {
    showAlert(
      'Reject shop?',
      `Reject ${shop.shop_name || 'this shop'}? Its pending login credentials will be removed.`,
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post(`/super-admin/gold-shops/${shop.id}/reject`);
                await loadShops(true);
                showAlert(
                  'Shop rejected',
                  'The shop registration was rejected.',
                  { variant: 'success' },
                );
              } catch (error) {
                showAlert(
                  'Unable to reject shop',
                  getErrorMessage(error, 'Could not reject this shop.'),
                  { variant: 'error' },
                );
              }
            },
          },
        ],
      },
    );
  };

  const openPaymentVerification = async (shop: Shop) => {
    try {
      const { data } = await api.get(
        `/super-admin/gold-shops/${shop.id}/payment`,
      );
      const paymentShop = data?.shop;
      const payment = data?.payment;
      if (!paymentShop || !payment) {
        showAlert(
          'Payment unavailable',
          'No pending payment was found for this shop.',
          { variant: 'warning' },
        );
        return;
      }
      setPendingPayment({ shop: paymentShop, payment });
      setTransactionId(String(payment.transaction_id || ''));
      setPaymentMethod(
        String(payment.payment_method || 'bank_transfer')
          .toLowerCase()
          .replace('bank transfer', 'bank_transfer'),
      );
    } catch (error) {
      showAlert(
        'Unable to load payment',
        getErrorMessage(error, 'Could not load payment details.'),
        { variant: 'error' },
      );
    }
  };

  const confirmPayment = async () => {
    if (!pendingPayment?.payment || paymentSubmitting) return;
    if (!transactionId.trim()) {
      showAlert(
        'Reference required',
        'Enter the payment reference or transaction ID.',
        { variant: 'warning' },
      );
      return;
    }
    setPaymentSubmitting(true);
    try {
      await api.put(
        `/super-admin/gold-shops/${pendingPayment.shop.id}/payment/verify`,
        {
          transactionId: transactionId.trim(),
          paymentMethod,
        },
      );
      setPendingPayment(null);
      await loadShops(true);
      showAlert('Payment confirmed', 'The subscription payment was verified.', {
        variant: 'success',
      });
    } catch (error) {
      showAlert(
        'Unable to verify payment',
        getErrorMessage(error, 'Could not verify this payment.'),
        { variant: 'error' },
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const archiveShop = (shop: Shop) => {
    showAlert(
      'Archive shop?',
      `${shop.shop_name || 'This shop'} will be archived.`,
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.delete(`/super-admin/gold-shops/${shop.id}`);
                await loadShops(true);
              } catch (error) {
                showAlert(
                  'Unable to archive shop',
                  getErrorMessage(error, 'Could not archive the shop.'),
                  { variant: 'error' },
                );
              }
            },
          },
        ],
      },
    );
  };

  const openEditShop = async (shop: Shop) => {
    setEditLoadingId(shop.id);
    try {
      const { data } = await api.get(`/super-admin/gold-shops/${shop.id}`);
      if (!data?.shop) {
        throw new TypeError('Gold shop details response is invalid.');
      }
      setEditingShop(data.shop as Shop);
      setShowCreate(true);
      onFullScreenShopPageChange(true);
    } catch (error) {
      showAlert(
        'Unable to edit shop',
        getErrorMessage(error, 'Could not load shop details for editing.'),
        { variant: 'error' },
      );
    } finally {
      setEditLoadingId(null);
    }
  };

  if (showCreate) {
    return (
      <AddShops
        key={editingShop ? `edit-${editingShop.id}` : 'create'}
        mode={editingShop ? 'edit' : 'create'}
        initialShop={editingShop || undefined}
        onCancel={() => {
          setShowCreate(false);
          setEditingShop(null);
          onFullScreenShopPageChange(false);
        }}
        onSuccess={() => loadShops(true)}
      />
    );
  }

  if (selected) {
    return (
      <GoldShopDetails
        shopId={selected.id}
        onBack={() => {
          setSelected(null);
          onFullScreenShopPageChange(false);
        }}
      />
    );
  }

  const statusOptions = [
    ['all', 'All'],
    ['active', 'Active'],
    ['inactive', 'Inactive'],
    ['suspended', 'Suspended'],
  ];
  const totalShopCount = Number(summary.total_shops || 0);
  const shopShare = (value: number) =>
    totalShopCount > 0 ? (value / totalShopCount) * 100 : 0;

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShops(true)}
            tintColor="#08745D"
          />
        }
        contentContainerClassName="gap-4 px-4 pb-6 pt-4"
      >
        <View className="overflow-hidden rounded-2xl bg-[#123B32] p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 flex-row">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Store size={23} color="#F5C451" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-wider text-[#F5C451]">
                  Super Admin
                </Text>
                <Text className="mt-1 text-xl font-black text-white">
                  Gold shop portfolio
                </Text>
                <Text className="mt-1 text-xs leading-5 text-white/75">
                  Manage shop onboarding and subscriptions.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <SummaryCard
            label="Total Shops"
            value={totalShopCount}
            note="All registered shops"
            progress={shopShare(totalShopCount)}
            icon={Store}
            tone="emerald"
          />
          <SummaryCard
            label="Pending"
            value={summary.pending_shops || 0}
            note="Awaiting review"
            progress={shopShare(Number(summary.pending_shops || 0))}
            icon={ShieldAlert}
            tone="amber"
          />
          <SummaryCard
            label="Active"
            value={summary.active_shops || 0}
            note="Approved shops"
            progress={shopShare(Number(summary.active_shops || 0))}
            icon={CheckCircle2}
            tone="sky"
          />
          <SummaryCard
            label="Expired"
            value={summary.expired_subscriptions || 0}
            note="Subscriptions ended"
            progress={shopShare(Number(summary.expired_subscriptions || 0))}
            icon={X}
            tone="rose"
          />
        </View>

        <View className="rounded-2xl border border-[#ECE7D8] bg-white p-3">
          <View className="flex-row items-center rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3">
            <Search size={17} color="#08745D" />
            <TextInput
              value={search}
              onChangeText={value => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search shop, code, owner, or mobile"
              placeholderTextColor="#9CA3AF"
              className="min-h-11 flex-1 px-3 text-sm text-[#1F2937]"
            />
          </View>
          <View className="mt-3">
            <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
              Shop status
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select shop status"
              accessibilityState={{ expanded: statusDropdownOpen }}
              onPress={() =>
                setStatusDropdownOpen(current => !current)
              }
              className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3"
            >
              <Text className="text-sm font-semibold text-[#1F2937]">
                {statusOptions.find(([value]) => value === status)?.[1] ||
                  'All'}
              </Text>
              <ChevronDown size={17} color="#6B7280" />
            </Pressable>
            {statusDropdownOpen ? (
              <View className="mt-1 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                {statusOptions.map(([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: status === value }}
                    onPress={() => {
                      setStatus(value);
                      setPage(1);
                      setStatusDropdownOpen(false);
                    }}
                    className={`border-b border-[#F3F4F6] px-3 py-3 ${
                      status === value ? 'bg-[#E7F3EF]' : ''
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        status === value ? 'text-[#08745D]' : 'text-[#4B5563]'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View className="min-h-48 items-center justify-center">
            <ActivityIndicator color="#08745D" />
          </View>
        ) : shops.length === 0 ? (
          <View className="min-h-64 items-center justify-center rounded-2xl border border-[#ECE7D8] bg-white p-6">
            <Store size={28} color="#08745D" />
            <Text className="mt-3 font-bold text-[#173F35]">
              No gold shops found
            </Text>
            <Text className="mt-1 text-center text-xs text-[#6B7280]">
              Try another search or add the first gold shop.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {shops.map(shop => (
              <View
                key={shop.id}
                className="rounded-2xl border border-[#ECE7D8] bg-white p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1 flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-[#08745D]">
                      <Text className="text-xs font-black text-white">
                        {getInitials(shop.shop_name)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-base font-extrabold text-[#173F35]"
                      >
                        {shop.shop_name || 'Unnamed shop'}
                      </Text>
                      <Text className="mt-0.5 text-[10px] font-bold text-[#A16207]">
                        {shop.shop_code || 'No shop code'}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge
                    value={
                      shop.approval_status ||
                      'pending'
                    }
                  />
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <DetailRow label="Owner" value={shop.owner_name} />
                  <DetailRow label="Mobile" value={shop.mobile} />
                  <DetailRow label="Plan" value={shop.plan_name} />
                  <DetailRow
                    label="Expiry"
                    value={formatDate(shop.account_end_date)}
                  />
                </View>

                <View className="mt-4 flex-row items-center justify-end border-t border-[#F3F4F6] pt-3">
                  {(shop.approval_status || 'pending') === 'pending' ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Approve ${shop.shop_name}`}
                        disabled={approvalLoading || approvalSubmitting}
                        onPress={() => approveShop(shop)}
                        className="mr-1 rounded-lg bg-[#DCFCE7] px-2.5 py-2"
                      >
                        <Text className="text-[10px] font-bold text-[#166534]">
                          Approve
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Reject ${shop.shop_name}`}
                        onPress={() => rejectShop(shop)}
                        className="mr-1 rounded-lg bg-[#FFE4E6] px-2.5 py-2"
                      >
                        <Text className="text-[10px] font-bold text-[#9F1239]">
                          Reject
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                  {['pending', 'unpaid'].includes(
                    String(
                      shop.current_payment_status || shop.payment_status || '',
                    ).toLowerCase(),
                  ) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Verify payment for ${shop.shop_name}`}
                      onPress={() => openPaymentVerification(shop)}
                      className="mr-1 rounded-lg bg-[#FEF3C7] px-2.5 py-2"
                    >
                      <View className="flex-row items-center">
                        <CreditCard size={14} color="#92400E" />
                        <Text className="ml-1 text-[10px] font-bold text-[#92400E]">
                          Verify
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${shop.shop_name}`}
                    onPress={() => {
                      setSelected(shop);
                      onFullScreenShopPageChange(true);
                    }}
                    className="mr-1 rounded-lg border border-[#E5E7EB] bg-white p-2"
                  >
                    <Eye size={17} color="#4B5563" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${shop.shop_name}`}
                    disabled={editLoadingId !== null}
                    onPress={() => openEditShop(shop)}
                    className="mr-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-2 disabled:opacity-40"
                  >
                    {editLoadingId === shop.id ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Pencil size={17} color="#2563EB" />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change status for ${shop.shop_name}`}
                    onPress={() => changeStatus(shop)}
                    className="mr-1 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-2"
                  >
                    <CheckCircle2 size={17} color="#08745D" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Archive ${shop.shop_name}`}
                    onPress={() => archiveShop(shop)}
                    className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] p-2"
                  >
                    <Trash2 size={17} color="#BE123C" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row items-center justify-between rounded-xl border border-[#ECE7D8] bg-white px-3 py-3">
          <Text className="text-xs text-[#6B7280]">
            Page {pagination.page || page} of{' '}
            {Math.max(pagination.totalPages, 1)} · {pagination.total} shops
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={page <= 1 || loading}
              onPress={() => setPage(current => Math.max(current - 1, 1))}
              className="h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB]"
            >
              <ChevronLeft
                size={17}
                color={page <= 1 ? '#D1D5DB' : '#4B5563'}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={page >= pagination.totalPages || loading}
              onPress={() => setPage(current => current + 1)}
              className="h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB]"
            >
              <ChevronRight
                size={17}
                color={
                  page >= pagination.totalPages ? '#D1D5DB' : '#4B5563'
                }
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add gold shop"
        onPress={() => {
          setEditingShop(null);
          setShowCreate(true);
          onFullScreenShopPageChange(true);
        }}
        className="absolute bottom-5 right-5 z-10 h-14 w-14 items-center justify-center rounded-full bg-[#F5C451] shadow-lg"
        style={{ elevation: 8 }}
      >
        <Plus size={32} color="#173F35" strokeWidth={4} />
      </Pressable>

      <Modal
        visible={Boolean(pendingApproval)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!approvalSubmitting) setPendingApproval(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="max-h-[88%] w-full rounded-2xl bg-[#FBFAF7]">
            <View className="flex-row items-center justify-between rounded-t-2xl bg-[#173F35] px-4 py-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-white">
                  Verify shop approval
                </Text>
                <Text className="mt-1 text-xs text-white/70">
                  Review all details before creating the Shop Admin account
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close approval review"
                disabled={approvalSubmitting}
                onPress={() => setPendingApproval(null)}
                className="h-9 w-9 items-center justify-center"
              >
                <X size={19} color="#FFFFFF" />
              </Pressable>
            </View>
            {pendingApproval ? (
              <ScrollView contentContainerClassName="gap-4 p-4">
                <View className="flex-row items-center justify-between rounded-xl border border-[#F0DDA9] bg-[#FFF8E1] p-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-[#173F35]">
                      {pendingApproval.shop_name || 'Unnamed shop'}
                    </Text>
                    <Text className="mt-1 text-xs font-bold text-[#A16207]">
                      {pendingApproval.shop_code || 'No shop code'}
                    </Text>
                  </View>
                  <StatusBadge value={pendingApproval.approval_status || 'pending'} />
                </View>

                <View>
                  <Text className="mb-2 font-extrabold text-[#173F35]">
                    Shop information
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <DetailRow label="Shop name" value={pendingApproval.shop_name} />
                    <DetailRow label="Shop UUID" value={pendingApproval.shop_uuid} />
                    <DetailRow label="Owner" value={pendingApproval.owner_name} />
                    <DetailRow label="Mobile" value={pendingApproval.mobile} />
                    <DetailRow label="Email" value={pendingApproval.email} />
                    <DetailRow label="GST number" value={pendingApproval.gst_number} />
                    <DetailRow label="Aadhaar" value={pendingApproval.aadhaar_number} />
                    <DetailRow
                      label="Address"
                      value={[
                        pendingApproval.address,
                        pendingApproval.city,
                        pendingApproval.state,
                        pendingApproval.pincode,
                      ].filter(Boolean).join(', ')}
                    />
                    <DetailRow label="City" value={pendingApproval.city} />
                    <DetailRow label="State" value={pendingApproval.state} />
                    <DetailRow label="Pincode" value={pendingApproval.pincode} />
                    <DetailRow
                      label="Max branches"
                      value={
                        pendingApproval.max_branches !== undefined
                          ? String(pendingApproval.max_branches)
                          : undefined
                      }
                    />
                    <DetailRow
                      label="Max staff"
                      value={
                        pendingApproval.max_staff !== undefined
                          ? String(pendingApproval.max_staff)
                          : undefined
                      }
                    />
                    <DetailRow label="Shop status" value={pendingApproval.status} />
                    <DetailRow label="Created by" value={pendingApproval.created_by_name} />
                    <DetailRow label="Updated by" value={pendingApproval.updated_by_name} />
                    <DetailRow
                      label="Created at"
                      value={formatDate(pendingApproval.created_at)}
                    />
                    <DetailRow
                      label="Updated at"
                      value={formatDate(pendingApproval.updated_at)}
                    />
                    <DetailRow label="Admin notes" value={pendingApproval.notes} />
                  </View>
                </View>

                <View>
                  <Text className="mb-2 font-extrabold text-[#173F35]">
                    Current subscription
                  </Text>
                  {pendingApproval.current_subscription_id ? (
                    <View className="flex-row flex-wrap gap-2">
                      <DetailRow label="Plan" value={pendingApproval.plan_name} />
                      <DetailRow
                        label="Account type"
                        value={
                          pendingApproval.account_plan_type === 'expired'
                            ? 'Trial expired'
                            : pendingApproval.account_plan_type
                        }
                      />
                      <DetailRow
                        label="Duration"
                        value={pendingApproval.duration}
                      />
                      <DetailRow
                        label="Amount"
                        value={formatAmount(pendingApproval.subscription_amount)}
                      />
                      <DetailRow
                        label="Start date"
                        value={formatDate(pendingApproval.account_start_date)}
                      />
                      <DetailRow
                        label="Expiry"
                        value={formatDate(pendingApproval.account_end_date)}
                      />
                      <DetailRow
                        label="Subscription status"
                        value={pendingApproval.subscription_status}
                      />
                      <DetailRow
                        label="Payment status"
                        value={pendingApproval.payment_status}
                      />
                    </View>
                  ) : (
                    <View className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                      <Text className="text-sm text-[#6B7280]">
                        No subscription history.
                      </Text>
                    </View>
                  )}
                </View>

                {pendingApproval.subscriptions?.length ? (
                  <View>
                    <Text className="mb-2 font-extrabold text-[#173F35]">
                      Subscription history
                    </Text>
                    {pendingApproval.subscriptions.map((item, index) => (
                      <View
                        key={String(item.id || index)}
                        className="mb-2 rounded-xl border border-[#E5E7EB] bg-white p-3"
                      >
                        <Text className="font-bold text-[#1F2937]">
                          {String(item.plan_name || 'Subscription')}
                        </Text>
                        <Text className="mt-1 text-xs text-[#6B7280]">
                          {String(item.duration || '—')} · {formatAmount(
                            typeof item.amount === 'number' ||
                              typeof item.amount === 'string'
                              ? item.amount
                              : undefined,
                          )}
                        </Text>
                        <Text className="mt-1 text-xs text-[#6B7280]">
                          {formatDate(
                            typeof item.start_date === 'string'
                              ? item.start_date
                              : undefined,
                          )}{' '}
                          -{' '}
                          {formatDate(
                            typeof item.end_date === 'string'
                              ? item.end_date
                              : undefined,
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {pendingApproval.payments?.length ? (
                  <View>
                    <Text className="mb-2 font-extrabold text-[#173F35]">
                      Payment history
                    </Text>
                    {pendingApproval.payments.map((item, index) => (
                      <View
                        key={String(item.id || index)}
                        className="mb-2 rounded-xl border border-[#E5E7EB] bg-white p-3"
                      >
                        <Text className="font-bold text-[#1F2937]">
                          {String(item.transaction_id || 'Awaiting confirmation')}
                        </Text>
                        <Text className="mt-1 text-xs text-[#6B7280]">
                          {formatAmount(
                            typeof item.amount === 'number' ||
                              typeof item.amount === 'string'
                              ? item.amount
                              : undefined,
                          )}{' '}
                          · {String(item.payment_method || '—')} ·{' '}
                          {String(item.payment_status || 'pending')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {pendingApproval.activity?.length ? (
                  <View>
                    <Text className="mb-2 font-extrabold text-[#173F35]">
                      Activity history
                    </Text>
                    {pendingApproval.activity.map((item, index) => (
                      <View
                        key={String(item.id || index)}
                        className="mb-2 rounded-xl border border-[#E5E7EB] bg-white p-3"
                      >
                        <Text className="text-xs font-semibold text-[#4B5563]">
                          {String(item.action || 'Activity')
                            .replaceAll('.', ' ')}
                        </Text>
                        <Text className="mt-1 text-[10px] text-[#9CA3AF]">
                          {String(item.actor_name || 'System')} ·{' '}
                          {formatDate(
                            typeof item.created_at === 'string'
                              ? item.created_at
                              : undefined,
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View className="rounded-xl border border-[#F0DDA9] bg-[#FFF8E1] p-3">
                  <Text className="text-xs leading-5 text-[#92400E]">
                    Approval creates the Shop Admin account. Subscription activation
                    continues through the payment workflow.
                  </Text>
                </View>
              </ScrollView>
            ) : null}
            <View className="flex-row justify-end gap-2 border-t border-[#E5E7EB] px-4 py-4">
              <Pressable
                accessibilityRole="button"
                disabled={approvalSubmitting}
                onPress={() => setPendingApproval(null)}
                className="rounded-xl border border-[#E5E7EB] px-4 py-3"
              >
                <Text className="text-sm font-bold text-[#4B5563]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={approvalSubmitting || !pendingApproval}
                onPress={confirmApproveShop}
                className="flex-row items-center rounded-xl bg-[#08745D] px-4 py-3"
              >
                {approvalSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ShieldCheck size={16} color="#FFFFFF" />
                )}
                <Text className="ml-2 text-sm font-bold text-white">
                  {approvalSubmitting ? 'Approving…' : 'Verify & Approve'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(approvalCredentials)}
        transparent
        animationType="fade"
        onRequestClose={() => setApprovalCredentials(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="w-full rounded-2xl bg-[#FBFAF7] p-5">
            <Text className="text-lg font-black text-[#173F35]">
              Shop Admin login approved
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#4B5563]">
              {approvalCredentials?.temporaryPassword
                ? 'The account is active. Share the login details shown below and ask the shop to change the temporary password.'
                : 'The account is active. Log in with the password entered during registration. The password is secure and cannot be viewed again.'}
            </Text>
            <View className="mt-4 gap-2">
              {approvalCredentials?.mobile ? (
                <DetailRow label="Login mobile" value={approvalCredentials.mobile} />
              ) : null}
              {approvalCredentials?.identifier ? (
                <DetailRow label="Email" value={approvalCredentials.identifier} />
              ) : null}
              {approvalCredentials?.username ? (
                <DetailRow label="Username" value={approvalCredentials.username} />
              ) : null}
              {approvalCredentials?.userId ? (
                <DetailRow label="User ID" value={approvalCredentials.userId} />
              ) : null}
              {approvalCredentials?.name ? (
                <DetailRow label="Name" value={approvalCredentials.name} />
              ) : null}
              {approvalCredentials?.temporaryPassword ? (
                <DetailRow
                  label="Temporary password"
                  value={approvalCredentials.temporaryPassword}
                />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setApprovalCredentials(null)}
              className="mt-5 items-center rounded-xl bg-[#08745D] px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pendingPayment)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!paymentSubmitting) setPendingPayment(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="max-h-[88%] w-full rounded-2xl bg-[#FBFAF7]">
            <View className="flex-row items-center justify-between rounded-t-2xl bg-[#173F35] px-4 py-4">
              <View className="flex-1">
                <Text className="text-lg font-black text-white">
                  Verify subscription payment
                </Text>
                <Text className="mt-1 text-xs text-white/70">
                  {pendingPayment?.shop.shop_name || 'Selected shop'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close payment verification"
                disabled={paymentSubmitting}
                onPress={() => setPendingPayment(null)}
                className="h-9 w-9 items-center justify-center"
              >
                <X size={19} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView
              className="flex-grow-0"
              contentContainerClassName="gap-4 p-4"
            >
              <View className="rounded-xl border border-[#F0DDA9] bg-[#FFF8E1] p-4">
                <Text className="text-[10px] font-bold uppercase text-[#A16207]">
                  Payment to verify
                </Text>
                <Text className="mt-1 text-2xl font-black text-[#173F35]">
                  {formatAmount(
                    typeof pendingPayment?.payment?.amount === 'number' ||
                      typeof pendingPayment?.payment?.amount === 'string'
                      ? pendingPayment.payment.amount
                      : undefined,
                  )}
                </Text>
                <Text className="mt-1 text-xs text-[#92400E]">
                  Status: {recordString(pendingPayment?.payment || null, 'payment_status') || 'pending'}
                </Text>
              </View>

              <View>
                <Text className="mb-2 font-extrabold text-[#173F35]">
                  Shop details
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <DetailRow
                    label="Shop code"
                    value={pendingPayment?.shop.shop_code}
                  />
                  <DetailRow
                    label="Owner"
                    value={pendingPayment?.shop.owner_name}
                  />
                  <DetailRow
                    label="Mobile"
                    value={pendingPayment?.shop.mobile}
                  />
                  <DetailRow
                    label="Email"
                    value={pendingPayment?.shop.email}
                  />
                  <DetailRow
                    label="City"
                    value={[pendingPayment?.shop.city, pendingPayment?.shop.state]
                      .filter(Boolean)
                      .join(', ')}
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 font-extrabold text-[#173F35]">
                  Subscription details
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <DetailRow
                    label="Plan"
                    value={pendingPayment?.shop.plan_name}
                  />
                  <DetailRow
                    label="Duration"
                    value={pendingPayment?.shop.duration}
                  />
                  <DetailRow
                    label="Account type"
                    value={pendingPayment?.shop.account_plan_type}
                  />
                  <DetailRow
                    label="Start date"
                    value={formatDate(pendingPayment?.shop.account_start_date)}
                  />
                  <DetailRow
                    label="Expiry"
                    value={formatDate(pendingPayment?.shop.account_end_date)}
                  />
                  <DetailRow
                    label="Subscription status"
                    value={pendingPayment?.shop.subscription_status}
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 font-extrabold text-[#173F35]">
                  Payment details
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <DetailRow
                    label="Transaction ID"
                    value={
                      recordString(pendingPayment?.payment || null, 'transaction_id') ||
                      'Awaiting confirmation'
                    }
                  />
                  <DetailRow
                    label="Submitted method"
                    value={
                      recordString(pendingPayment?.payment || null, 'payment_method') ||
                      '—'
                    }
                  />
                  <DetailRow
                    label="Payment date"
                    value={formatDate(
                      recordString(
                        pendingPayment?.payment || null,
                        'payment_date',
                      ) ||
                        recordString(
                          pendingPayment?.payment || null,
                          'created_at',
                        ),
                    )}
                  />
                  <DetailRow
                    label="Subscription ID"
                    value={
                      recordString(
                        pendingPayment?.payment || null,
                        'subscription_id',
                      ) || '—'
                    }
                  />
                  <DetailRow
                    label="Verification remarks"
                    value={
                      recordString(
                        pendingPayment?.payment || null,
                        'verification_remarks',
                      ) || '—'
                    }
                  />
                </View>
              </View>

              <View className="rounded-xl border border-[#F0DDA9] bg-[#FFF8E1] p-3">
                <Text className="text-xs leading-5 text-[#92400E]">
                  Confirm only after independently verifying that the full payment
                  was received. The entered reference will be saved permanently.
                </Text>
              </View>

              <View>
                <Text className="text-[11px] font-bold uppercase text-[#4B5563]">
                  Transaction / reference ID
                </Text>
                <TextInput
                  value={transactionId}
                  onChangeText={setTransactionId}
                  placeholder="Enter bank, UPI, or receipt reference"
                  placeholderTextColor="#9CA3AF"
                  maxLength={120}
                  className="mt-1.5 min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#1F2937]"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold uppercase text-[#4B5563]">
                  Payment method
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="mt-1.5 gap-2"
                >
                  {[
                    ['upi', 'UPI'],
                    ['bank_transfer', 'Bank transfer'],
                    ['cash', 'Cash'],
                    ['card', 'Card'],
                    ['other', 'Other'],
                  ].map(([value, label]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      onPress={() => setPaymentMethod(value)}
                      className={`rounded-lg border px-3 py-2 ${
                        paymentMethod === value
                          ? 'border-[#08745D] bg-[#E7F3EF]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          paymentMethod === value
                            ? 'text-[#08745D]'
                            : 'text-[#4B5563]'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View className="flex-row justify-end gap-2 border-t border-[#E5E7EB] px-4 py-4">
              <Pressable
                accessibilityRole="button"
                disabled={paymentSubmitting}
                onPress={() => setPendingPayment(null)}
                className="rounded-xl border border-[#E5E7EB] px-4 py-3"
              >
                <Text className="text-sm font-bold text-[#4B5563]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={paymentSubmitting}
                onPress={confirmPayment}
                className="flex-row items-center rounded-xl bg-[#08745D] px-4 py-3"
              >
                {paymentSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ShieldCheck size={16} color="#FFFFFF" />
                )}
                <Text className="ml-2 text-sm font-bold text-white">
                  {paymentSubmitting ? 'Verifying…' : 'Confirm payment'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}