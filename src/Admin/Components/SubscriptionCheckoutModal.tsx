import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { CreditCard, ShieldCheck, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import type {
  RazorpayOptions,
  RazorpayPaymentResponse,
} from 'react-native-razorpay';

type Duration = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

type SubscriptionPlan = {
  id: number | string;
  plan_name: string;
  monthly_price?: number | string | null;
  quarterly_price?: number | string | null;
  half_yearly_price?: number | string | null;
  yearly_price?: number | string | null;
};

type SubscriptionOrder = {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  planName: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type SubscriptionCheckoutModalProps = {
  visible: boolean;
  token?: string;
  initialPlanId?: string | number;
  onClose: () => void;
  onPaymentComplete?: () => void | Promise<void>;
};

type RazorpayCheckoutModule = {
  default: {
    open(options: RazorpayOptions): Promise<RazorpayPaymentResponse>;
  };
};

const DURATIONS: { label: string; value: Duration }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Half-yearly', value: 'half_yearly' },
  { label: 'Yearly', value: 'yearly' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePlanPrice(value: unknown) {
  if (
    value !== undefined &&
    value !== null &&
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    throw new TypeError('Subscription plan price is invalid.');
  }
  return value;
}

function parsePlans(value: unknown): SubscriptionPlan[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Subscription plans response is invalid.');
  }

  return value.map((plan, index) => {
    if (
      !isRecord(plan) ||
      (typeof plan.id !== 'string' && typeof plan.id !== 'number') ||
      typeof plan.plan_name !== 'string'
    ) {
      throw new TypeError(`Subscription plan ${index + 1} is invalid.`);
    }

    return {
      id: plan.id,
      plan_name: plan.plan_name,
      monthly_price: parsePlanPrice(plan.monthly_price),
      quarterly_price: parsePlanPrice(plan.quarterly_price),
      half_yearly_price: parsePlanPrice(plan.half_yearly_price),
      yearly_price: parsePlanPrice(plan.yearly_price),
    };
  });
}

function parseOrder(value: unknown): SubscriptionOrder {
  if (!isRecord(value)) {
    throw new TypeError('Razorpay order response is invalid.');
  }

  const { orderId, keyId, amount, currency, planName, prefill } = value;
  if (
    typeof orderId !== 'string' ||
    !orderId ||
    typeof keyId !== 'string' ||
    !keyId ||
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    typeof currency !== 'string' ||
    !currency
  ) {
    throw new TypeError('Razorpay order response is invalid.');
  }

  let parsedPrefill: SubscriptionOrder['prefill'];
  if (prefill !== undefined) {
    if (!isRecord(prefill)) {
      throw new TypeError('Razorpay customer details are invalid.');
    }
    parsedPrefill = {};
    for (const key of ['name', 'email', 'contact'] as const) {
      if (prefill[key] !== undefined && typeof prefill[key] !== 'string') {
        throw new TypeError('Razorpay customer details are invalid.');
      }
      if (typeof prefill[key] === 'string') {
        parsedPrefill[key] = prefill[key];
      }
    }
  }

  return {
    orderId,
    keyId,
    amount,
    currency,
    planName: typeof planName === 'string' ? planName : 'Subscription',
    prefill: parsedPrefill,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error)) {
    if (typeof error.message === 'string') return error.message;
    if (typeof error.description === 'string') return error.description;
    if (
      isRecord(error.response) &&
      isRecord(error.response.data) &&
      typeof error.response.data.message === 'string'
    ) {
      return error.response.data.message;
    }
  }
  return fallback;
}

function formatAmount(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function SubscriptionCheckoutModal({
  visible,
  token,
  initialPlanId,
  onClose,
  onPaymentComplete,
}: SubscriptionCheckoutModalProps) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planId, setPlanId] = useState('');
  const [duration, setDuration] = useState<Duration>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingPayment, setPendingPayment] =
    useState<RazorpayPaymentResponse | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const requestConfig = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token],
  );
  const selectedPlan = plans.find(plan => String(plan.id) === planId);
  const amount = selectedPlan
    ? Number(selectedPlan[`${duration}_price`])
    : Number.NaN;
  const amountIsValid = Number.isFinite(amount) && amount > 0;

  useEffect(() => {
    if (!visible) return undefined;

    let active = true;
    setLoadingPlans(true);
    setErrorMessage('');
    api
      .get('/subscriptions/plans', requestConfig)
      .then(({ data }) => {
        const nextPlans = parsePlans(data?.plans);
        if (!active) return;
        setPlans(nextPlans);
        setPlanId(current => {
          const preferredId = String(initialPlanId ?? '');
          if (preferredId && nextPlans.some(plan => String(plan.id) === preferredId)) {
            return preferredId;
          }
          if (nextPlans.some(plan => String(plan.id) === current)) return current;
          return nextPlans[0] ? String(nextPlans[0].id) : '';
        });
      })
      .catch(error => {
        if (active) {
          setErrorMessage(
            getErrorMessage(error, 'Could not load subscription plans.'),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, [initialPlanId, loadAttempt, requestConfig, visible]);

  const verifyPayment = async (payment: RazorpayPaymentResponse) => {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { data } = await api.post(
        '/subscriptions/verify',
        payment,
        requestConfig,
      );
      setPendingPayment(null);
      if (data?.message) setErrorMessage('');
      await onPaymentComplete?.();
    } catch (error) {
      setPendingPayment(payment);
      setErrorMessage(
        `Payment was received, but verification could not be completed. ${getErrorMessage(
          error,
          'Retry verification before making another payment.',
        )}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startCheckout = async () => {
    if (!selectedPlan || submitting) return;

    if (pendingPayment) {
      await verifyPayment(pendingPayment);
      return;
    }

    const numericPlanId = Number(selectedPlan.id);
    if (!Number.isSafeInteger(numericPlanId)) {
      setErrorMessage('The selected subscription plan is invalid.');
      return;
    }
    if (!amountIsValid) {
      setErrorMessage('This plan does not have a valid price for that duration.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const { data } = await api.post(
        '/subscriptions/orders',
        { planId: numericPlanId, duration },
        requestConfig,
      );
      const order = parseOrder(data?.order);
      const checkoutModule = require(
        'react-native-razorpay',
      ) as RazorpayCheckoutModule;
      const options: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sri Golds',
        description: `${order.planName} subscription`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#07564B' },
      };
      const payment = await checkoutModule.default.open(options);

      if (
        !payment.razorpay_payment_id ||
        !payment.razorpay_order_id ||
        !payment.razorpay_signature
      ) {
        setPendingPayment(payment);
        setErrorMessage(
          'Razorpay returned incomplete payment verification details. Retry verification or contact the Super Admin before making another payment.',
        );
        setSubmitting(false);
        return;
      }
      if (payment.razorpay_order_id !== order.orderId) {
        setPendingPayment(payment);
        setErrorMessage(
          'The payment order did not match the selected subscription. Retry verification or contact the Super Admin before making another payment.',
        );
        setSubmitting(false);
        return;
      }

      setPendingPayment(payment);
      await verifyPayment(payment);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not start Razorpay checkout.'),
      );
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    if (pendingPayment) {
      Alert.alert(
        'Payment verification pending',
        'Your payment has not been confirmed by the server yet. Reopen checkout and retry verification before making another payment.',
        [
          { text: 'Stay here', style: 'cancel' },
          { text: 'Close', style: 'destructive', onPress: onClose },
        ],
      );
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeModal}>
      <View
        className="flex-1 items-center justify-center bg-black/65 px-4"
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        }}>
        <View className="max-h-full w-full max-w-lg overflow-hidden rounded-[26px] border border-[#E6D39A] bg-white shadow-2xl">
          <View className="flex-row items-center justify-between bg-[#153B35] px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-base font-extrabold text-white">
                Choose a subscription
              </Text>
              <View className="mt-1 flex-row items-center">
                <ShieldCheck size={12} color="#A7F3D0" />
                <Text className="ml-1 text-[11px] font-medium text-white/75">
                  Secure checkout powered by Razorpay
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close subscription checkout"
              disabled={submitting}
              onPress={closeModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <X size={19} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="p-5"
            showsVerticalScrollIndicator={false}>
            {loadingPlans ? (
              <View className="min-h-36 items-center justify-center">
                <ActivityIndicator size="large" color="#08745D" />
                <Text className="mt-3 text-sm font-medium text-[#64748B]">
                  Loading plans…
                </Text>
              </View>
            ) : plans.length === 0 ? (
              <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Text className="text-sm leading-5 text-amber-900">
                  No active subscription plans are available. Please contact
                  the Super Admin.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setLoadAttempt(value => value + 1)}
                  className="mt-3 self-start rounded-xl bg-amber-100 px-4 py-2">
                  <Text className="text-sm font-bold text-amber-900">
                    Try loading again
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-[0.8px] text-[#59615D]">
                  Subscription plan
                </Text>
                <View className="gap-2">
                  {plans.map(plan => {
                    const selected = String(plan.id) === planId;
                    return (
                      <Pressable
                        key={String(plan.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setPlanId(String(plan.id))}
                        className={`rounded-2xl border px-4 py-3 ${
                          selected
                            ? 'border-[#B8860B] bg-[#FFF9E8]'
                            : 'border-[#E5E7EB] bg-white'
                        }`}>
                        <Text className="text-sm font-bold text-[#173F35]">
                          {plan.plan_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-2 mt-4 ml-1 text-xs font-bold uppercase tracking-[0.8px] text-[#59615D]">
                  Billing period
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {DURATIONS.map(option => {
                    const selected = duration === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setDuration(option.value)}
                        className={`rounded-full border px-3 py-2 ${
                          selected
                            ? 'border-[#07564B] bg-[#07564B]'
                            : 'border-[#D1D5DB] bg-white'
                        }`}>
                        <Text
                          className={`text-xs font-bold ${
                            selected ? 'text-white' : 'text-[#4B5563]'
                          }`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-[#E8D9A7] bg-[#FFFCF2] px-4 py-3">
                  <View>
                    <Text className="text-[11px] font-bold uppercase tracking-[0.7px] text-[#7C6A36]">
                      Subscription price
                    </Text>
                    <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
                      {amountIsValid ? formatAmount(amount) : 'Not configured'}
                    </Text>
                  </View>
                  <CreditCard size={24} color="#A77B15" />
                </View>
              </>
            )}

            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800">
                {errorMessage}
              </Text>
            ) : null}
            {pendingPayment ? (
              <Text className="mt-3 text-xs leading-5 text-amber-800">
                Do not make another payment. Retry verification to confirm this
                payment with the server.
              </Text>
            ) : null}

            {plans.length > 0 ? (
              <Pressable
                testID="subscription-checkout-submit"
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    submitting ||
                    !selectedPlan ||
                    (!pendingPayment && !amountIsValid),
                }}
                disabled={
                  submitting ||
                  !selectedPlan ||
                  (!pendingPayment && !amountIsValid)
                }
                onPress={startCheckout}
                className={`mt-5 min-h-12 flex-row items-center justify-center rounded-2xl px-4 ${
                  submitting ? 'bg-[#6C8F86]' : 'bg-[#07564B]'
                }`}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CreditCard size={18} color="#FFE08A" />
                )}
                <Text className="ml-2 text-sm font-extrabold text-white">
                  {submitting
                    ? pendingPayment
                      ? 'Verifying payment…'
                      : 'Opening secure checkout…'
                    : pendingPayment
                      ? 'Retry payment verification'
                      : 'Continue to payment'}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
