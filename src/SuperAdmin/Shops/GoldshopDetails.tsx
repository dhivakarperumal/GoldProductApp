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
  ArrowLeft,
  Building2,
  Clock3,
  CreditCard,
  FileText,
  History,
  MapPin,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';

type DetailTab = 'overview' | 'subscription' | 'payments' | 'documents' | 'activity';

type SubscriptionRecord = {
  id?: number;
  plan_name?: string;
  duration?: string;
  amount?: number | string;
  start_date?: string;
  end_date?: string;
  payment_status?: string;
  subscription_status?: string;
};

type PaymentRecord = {
  id: number;
  subscription_id?: number;
  transaction_id?: string;
  amount?: number | string;
  payment_method?: string;
  payment_status?: string;
  payment_date?: string;
  created_at?: string;
};

type ShopDocument = {
  id: number;
  original_name?: string;
  document_type?: string;
  created_at?: string;
};

type ActivityRecord = {
  id: number;
  action?: string;
  actor_name?: string;
  created_at?: string;
};

type GoldShop = {
  id: number;
  shop_code?: string;
  shop_uuid?: string;
  shop_name?: string;
  owner_name?: string;
  owner_username?: string;
  mobile?: string;
  email?: string;
  gst_number?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  max_branches?: number;
  max_staff?: number;
  approval_status?: string;
  approved_at?: string;
  status?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  current_subscription_id?: number;
  plan_name?: string;
  duration?: string;
  subscription_amount?: number | string;
  account_plan_type?: string;
  account_start_date?: string;
  account_end_date?: string;
  subscription_status?: string;
  payment_status?: string;
  subscriptions?: SubscriptionRecord[];
  payments?: PaymentRecord[];
  documents?: ShopDocument[];
  activity?: ActivityRecord[];
};

type GoldShopDetailsProps = {
  shopId: number;
  onBack: () => void;
};

const TABS: Array<{ id: DetailTab; label: string; icon: typeof Store }> = [
  { id: 'overview', label: 'Overview', icon: Store },
  { id: 'subscription', label: 'Subscriptions', icon: CreditCard },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'activity', label: 'Activity', icon: History },
];

const PAYMENT_METHODS = [
  ['upi', 'UPI'],
  ['bank_transfer', 'Bank transfer'],
  ['cash', 'Cash'],
  ['card', 'Card'],
  ['other', 'Other'],
];

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

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
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

function StatusBadge({ value }: { value?: string }) {
  const status = (value || 'pending').toLowerCase();
  const backgroundColor =
    status === 'active' || status === 'approved' || status === 'paid'
      ? 'bg-[#DCFCE7]'
      : status === 'inactive'
        ? 'bg-[#F3F4F6]'
        : status === 'rejected' || status === 'suspended' || status === 'unpaid'
          ? 'bg-[#FFE4E6]'
          : 'bg-[#FEF3C7]';
  const textColor =
    status === 'active' || status === 'approved' || status === 'paid'
      ? 'text-[#166534]'
      : status === 'inactive'
        ? 'text-[#4B5563]'
        : status === 'rejected' || status === 'suspended' || status === 'unpaid'
          ? 'text-[#9F1239]'
          : 'text-[#92400E]';
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${backgroundColor}`}
    >
      <Text className={`text-[10px] font-bold capitalize ${textColor}`}>
        {status}
      </Text>
    </View>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </Text>
      <Text className="mt-1 break-words text-sm font-semibold text-[#1F2937]">
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Store;
  title: string;
  description: string;
}) {
  return (
    <View className="mb-4 flex-row items-start border-b border-[#F3F4F6] pb-4">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7E0]">
        <Icon size={19} color="#A16207" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-[#173F35]">{title}</Text>
        <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
          {description}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <View className="min-h-36 items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-[#FAFAF9] px-5 py-8">
      <FileText size={20} color="#9CA3AF" />
      <Text className="mt-3 text-center text-sm leading-5 text-[#6B7280]">
        {children}
      </Text>
    </View>
  );
}

export default function GoldShopDetails({
  shopId,
  onBack,
}: GoldShopDetailsProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [shop, setShop] = useState<GoldShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [paymentToConfirm, setPaymentToConfirm] =
    useState<PaymentRecord | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    paymentMethod: 'upi',
  });

  const loadShop = useCallback(
    async (signal?: AbortSignal, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setLoadError('');
      try {
        const { data } = await api.get(`/super-admin/gold-shops/${shopId}`, {
          signal,
        });
        if (!data?.shop) {
          throw new TypeError('Gold shop details response is invalid.');
        }
        if (!signal?.aborted) setShop(data.shop as GoldShop);
      } catch (error) {
        if (!signal?.aborted) {
          setShop(null);
          setLoadError(
            getErrorMessage(error, 'Could not load this gold shop.'),
          );
        }
      } finally {
        if (!signal?.aborted) {
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [shopId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadShop(controller.signal);
    return () => controller.abort();
  }, [loadShop, retryCount]);

  const openPaymentConfirmation = (payment: PaymentRecord) => {
    setPaymentForm({
      transactionId: payment.transaction_id || '',
      paymentMethod: (payment.payment_method || 'upi').toLowerCase(),
    });
    setPaymentToConfirm(payment);
  };

  const confirmPayment = async () => {
    if (!paymentToConfirm || paymentSubmitting) return;
    if (!paymentForm.transactionId.trim()) {
      showAlert(
        'Reference required',
        'Enter the payment transaction or reference ID.',
        { variant: 'warning' },
      );
      return;
    }

    setPaymentSubmitting(true);
    try {
      await api.post(
        `/super-admin/gold-shops/${shopId}/payments/${paymentToConfirm.id}/confirm`,
        {
          transactionId: paymentForm.transactionId.trim(),
          paymentMethod: paymentForm.paymentMethod,
        },
      );
      setPaymentToConfirm(null);
      await loadShop();
      showAlert('Payment confirmed', 'The subscription payment was confirmed.', {
        variant: 'success',
      });
    } catch (error) {
      showAlert(
        'Unable to confirm payment',
        getErrorMessage(error, 'Could not confirm this subscription payment.'),
        { variant: 'error' },
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const approvalStatus =
    shop?.approval_status || (shop?.approved_at ? 'approved' : 'pending');
  const currentPayment = shop?.payments?.find(
    payment =>
      Number(payment.subscription_id) === Number(shop.current_subscription_id),
  );

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
      <SafeAreaView edges={['top']} className="bg-[#153B35]">
        <View className="flex-row items-center bg-[#153B35] px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to gold shops"
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#F4C95D]">
              Gold Shops
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-lg font-extrabold text-white">
              {shop?.shop_name || 'Shop details'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#08745D" />
          <Text className="mt-3 text-sm text-[#6B7280]">
            Loading shop details…
          </Text>
        </View>
      ) : loadError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm font-semibold text-rose-700">
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount(count => count + 1)}
            className="mt-4 rounded-xl bg-[#08745D] px-5 py-3"
          >
            <Text className="text-sm font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : shop ? (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  return loadShop(undefined, true);
                }}
                tintColor="#08745D"
              />
            }
            contentContainerClassName="gap-4 px-4 pb-8 pt-4"
          >
            <View className="overflow-hidden rounded-2xl bg-[#123B32] p-4">
              <View className="flex-row items-start">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#F5C451]">
                  <Building2 size={23} color="#173F35" />
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#F5C451]">
                      {shop.shop_code || 'Gold shop'}
                    </Text>
                    <Text className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-white/80">
                      SHOP PROFILE
                    </Text>
                  </View>
                  <Text className="mt-1 text-xl font-black text-white">
                    {shop.shop_name || 'Unnamed shop'}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                    <View className="flex-row items-center">
                      <Store size={13} color="#F5C451" />
                      <Text className="ml-1 text-xs text-white/80">
                        {shop.owner_name || 'Owner not provided'}
                      </Text>
                    </View>
                    {shop.city || shop.state ? (
                      <View className="flex-row items-center">
                        <MapPin size={13} color="#F5C451" />
                        <Text className="ml-1 text-xs text-white/80">
                          {[shop.city, shop.state].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <View className="mt-4 flex-row gap-2 border-t border-white/10 pt-3">
                <View className="flex-1">
                  <Text className="mb-1 text-[9px] font-bold uppercase text-white/60">
                    Approval
                  </Text>
                  <StatusBadge value={approvalStatus} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[9px] font-bold uppercase text-white/60">
                    Shop status
                  </Text>
                  <StatusBadge value={shop.status} />
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setActiveTab(id)}
                    className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                      active ? 'bg-[#123B32]' : 'border border-[#E5E7EB] bg-white'
                    }`}
                  >
                    <Icon size={15} color={active ? '#F5C451' : '#6B7280'} />
                    <Text
                      className={`ml-1.5 text-xs font-bold ${
                        active ? 'text-white' : 'text-[#4B5563]'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
              {activeTab === 'overview' ? (
                <>
                  <SectionHeading
                    icon={Store}
                    title="Shop overview"
                    description="Owner, contact, location, and audit information."
                  />
                  <View className="flex-row flex-wrap gap-2">
                    <InfoCard label="Shop code" value={shop.shop_code} />
                    <InfoCard label="Shop UUID" value={shop.shop_uuid} />
                    <InfoCard label="Owner name" value={shop.owner_name} />
                    <InfoCard label="Mobile" value={shop.mobile} />
                    <InfoCard label="Email" value={shop.email} />
                    <InfoCard
                      label="Owner login username"
                      value={shop.owner_username}
                    />
                    <InfoCard label="GST number" value={shop.gst_number} />
                    <InfoCard
                      label="City / State"
                      value={[shop.city, shop.state].filter(Boolean).join(', ')}
                    />
                    <InfoCard label="Pincode" value={shop.pincode} />
                    <InfoCard label="Address" value={shop.address} />
                    <InfoCard
                      label="Maximum branches"
                      value={shop.max_branches}
                    />
                    <InfoCard label="Maximum staff" value={shop.max_staff} />
                    <InfoCard label="Approval status" value={approvalStatus} />
                    <InfoCard label="Operational status" value={shop.status} />
                    <InfoCard label="Created by" value={shop.created_by_name} />
                    <InfoCard label="Updated by" value={shop.updated_by_name} />
                    <InfoCard
                      label="Created at"
                      value={formatDate(shop.created_at)}
                    />
                    <InfoCard
                      label="Updated at"
                      value={formatDate(shop.updated_at)}
                    />
                    <InfoCard label="Admin notes" value={shop.notes} />
                  </View>
                </>
              ) : null}

              {activeTab === 'subscription' ? (
                <>
                  <SectionHeading
                    icon={CreditCard}
                    title="Subscription history"
                    description="Current plan and previous renewals."
                  />
                  {shop.subscriptions?.length ? (
                    <View className="gap-3">
                      {shop.subscriptions.map((item, index) => (
                        <View
                          key={item.id ?? index}
                          className="rounded-xl border border-[#E5E7EB] bg-white p-3"
                        >
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="flex-1 font-bold text-[#173F35]">
                              {item.plan_name || 'Subscription'}
                            </Text>
                            <StatusBadge value={item.subscription_status} />
                          </View>
                          <View className="mt-3 flex-row flex-wrap gap-2">
                            <InfoCard
                              label="Duration"
                              value={item.duration?.replaceAll('_', ' ')}
                            />
                            <InfoCard
                              label="Amount"
                              value={formatAmount(item.amount)}
                            />
                            <InfoCard
                              label="Period"
                              value={`${formatDate(item.start_date)} – ${formatDate(item.end_date)}`}
                            />
                            <InfoCard
                              label="Payment"
                              value={item.payment_status}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <EmptyState>
                      No subscription history is recorded for this shop.
                    </EmptyState>
                  )}
                </>
              ) : null}

              {activeTab === 'payments' ? (
                <>
                  <SectionHeading
                    icon={Wallet}
                    title="Payment history"
                    description="Confirm payment only after verifying it was received."
                  />
                  {shop.payments?.length ? (
                    <View className="gap-3">
                      {shop.payments.map(payment => {
                        const isCurrent =
                          Number(payment.subscription_id) ===
                          Number(shop.current_subscription_id);
                        const canConfirm =
                          isCurrent &&
                          (payment.payment_status || '').toLowerCase() !==
                            'paid';
                        return (
                          <View
                            key={payment.id}
                            className="rounded-xl border border-[#E5E7EB] bg-white p-3"
                          >
                            <View className="flex-row items-start justify-between gap-2">
                              <View className="flex-1">
                                <Text className="font-bold text-[#1F2937]">
                                  {payment.transaction_id ||
                                    'Awaiting confirmation'}
                                </Text>
                                <Text className="mt-1 text-xs text-[#6B7280]">
                                  {payment.payment_method?.replaceAll('_', ' ') ||
                                    '—'}{' '}
                                  ·{' '}
                                  {formatDate(
                                    payment.payment_date || payment.created_at,
                                  )}
                                </Text>
                              </View>
                              <StatusBadge value={payment.payment_status} />
                            </View>
                            <Text className="mt-3 text-lg font-extrabold text-[#173F35]">
                              {formatAmount(payment.amount)}
                            </Text>
                            {canConfirm ? (
                              <Pressable
                                accessibilityRole="button"
                                onPress={() =>
                                  openPaymentConfirmation(payment)
                                }
                                className="mt-3 items-center rounded-xl bg-[#123B32] px-4 py-3"
                              >
                                <Text className="text-xs font-bold text-white">
                                  Confirm received
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <EmptyState>No payments are recorded for this shop.</EmptyState>
                  )}
                  {currentPayment ? (
                    <View className="mt-4 flex-row items-center">
                      <Text className="mr-2 text-xs text-[#6B7280]">
                        Current subscription payment:
                      </Text>
                      <Text className="mr-2 text-xs font-bold text-[#173F35]">
                        {formatAmount(currentPayment.amount)}
                      </Text>
                      <StatusBadge value={currentPayment.payment_status} />
                    </View>
                  ) : null}
                </>
              ) : null}

              {activeTab === 'documents' ? (
                <>
                  <SectionHeading
                    icon={FileText}
                    title="Shop documents"
                    description="Private files uploaded for this shop."
                  />
                  {shop.documents?.length ? (
                    <View className="gap-3">
                      {shop.documents.map(document => (
                        <View
                          key={document.id}
                          className="flex-row items-center rounded-xl border border-[#E5E7EB] bg-white p-3"
                        >
                          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7E0]">
                            <FileText size={18} color="#A16207" />
                          </View>
                          <View className="flex-1">
                            <Text
                              numberOfLines={2}
                              className="text-sm font-semibold text-[#1F2937]"
                            >
                              {document.original_name || 'Shop document'}
                            </Text>
                            <Text className="mt-1 text-[10px] capitalize text-[#6B7280]">
                              {(document.document_type || 'document').replaceAll(
                                '_',
                                ' ',
                              )}{' '}
                              · {formatDate(document.created_at)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <EmptyState>
                      No documents have been uploaded for this shop.
                    </EmptyState>
                  )}
                </>
              ) : null}

              {activeTab === 'activity' ? (
                <>
                  <SectionHeading
                    icon={History}
                    title="Activity history"
                    description="Recent changes and actions for this shop."
                  />
                  {shop.activity?.length ? (
                    <View className="gap-3">
                      {shop.activity.map((event, index) => (
                        <View
                          key={event.id ?? index}
                          className="flex-row items-start rounded-xl border border-[#E5E7EB] bg-white p-3"
                        >
                          <View className="mr-3 mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#FFF1C2]">
                            <Clock3 size={15} color="#A16207" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold capitalize text-[#1F2937]">
                              {(event.action || 'Activity').replaceAll('.', ' ')}
                            </Text>
                            <Text className="mt-1 text-xs text-[#6B7280]">
                              {event.actor_name || 'System'} ·{' '}
                              {formatDate(event.created_at)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <EmptyState>
                      No activity has been recorded for this shop.
                    </EmptyState>
                  )}
                </>
              ) : null}
            </View>
          </ScrollView>

          <Modal
            visible={Boolean(paymentToConfirm)}
            transparent
            animationType="slide"
            onRequestClose={() => {
              if (!paymentSubmitting) setPaymentToConfirm(null);
            }}
          >
            <View className="flex-1 justify-end bg-black/50">
              <View className="max-h-[90%] rounded-t-3xl bg-[#F8F7F2]">
                <View className="flex-row items-center justify-between rounded-t-3xl bg-[#153B35] px-5 py-4">
                  <View className="flex-1">
                    <Text className="text-lg font-extrabold text-white">
                      Confirm subscription payment
                    </Text>
                    <Text className="mt-1 text-xs text-white/70">
                      Confirm only after verifying receipt.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close payment confirmation"
                    disabled={paymentSubmitting}
                    onPress={() => setPaymentToConfirm(null)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  >
                    <X size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerClassName="gap-4 p-5"
                >
                  <View className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                    <Text className="text-xs font-semibold text-[#6B7280]">
                      Amount received
                    </Text>
                    <Text className="mt-1 text-lg font-extrabold text-[#173F35]">
                      {formatAmount(paymentToConfirm?.amount)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
                      Transaction / reference ID
                    </Text>
                    <TextInput
                      value={paymentForm.transactionId}
                      onChangeText={value =>
                        setPaymentForm(current => ({
                          ...current,
                          transactionId: value,
                        }))
                      }
                      placeholder="Bank, UPI, or receipt reference"
                      placeholderTextColor="#9CA3AF"
                      maxLength={120}
                      className="mt-1.5 min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#1F2937]"
                    />
                  </View>
                  <View>
                    <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
                      Payment method
                    </Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {PAYMENT_METHODS.map(([value, label]) => (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: paymentForm.paymentMethod === value,
                          }}
                          onPress={() =>
                            setPaymentForm(current => ({
                              ...current,
                              paymentMethod: value,
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 ${
                            paymentForm.paymentMethod === value
                              ? 'border-[#08745D] bg-[#E7F3EF]'
                              : 'border-[#E5E7EB] bg-white'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              paymentForm.paymentMethod === value
                                ? 'text-[#08745D]'
                                : 'text-[#4B5563]'
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </ScrollView>
                <View
                  className="flex-row justify-end gap-2 border-t border-[#E5E7EB] bg-white px-5 py-4"
                  style={{ paddingBottom: Math.max(insets.bottom, 16) }}
                >
                  <Pressable
                    accessibilityRole="button"
                    disabled={paymentSubmitting}
                    onPress={() => setPaymentToConfirm(null)}
                    className="rounded-xl border border-[#E5E7EB] px-4 py-3"
                  >
                    <Text className="text-sm font-bold text-[#4B5563]">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={paymentSubmitting}
                    onPress={confirmPayment}
                    className="min-w-36 flex-row items-center justify-center rounded-xl bg-[#08745D] px-4 py-3"
                  >
                    {paymentSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ShieldCheck size={16} color="#FFFFFF" />
                    )}
                    <Text className="ml-2 text-sm font-bold text-white">
                      {paymentSubmitting ? 'Confirming…' : 'Confirm payment'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </SafeAreaView>
  );
}