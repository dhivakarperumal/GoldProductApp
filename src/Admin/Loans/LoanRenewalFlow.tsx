import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';
import {
  CustomDropdown,
  Field,
  SubmitButton,
  errorMessage,
} from './FormControls';

type Loan = {
  id: number | string;
  loan_number?: string;
  customer_name?: string;
  customer_mobile?: string;
  loan_status?: string;
  loan_date?: string;
  maturity_date?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_rate?: number | string;
  interest_frequency?: string;
  late_payment_interest_rate?: number | string | null;
  customer_address?: string;
  customer_code?: string;
  [key: string]: unknown;
};

type RenewalData = {
  loan: Loan;
  preview: {
    renewal_date: string;
    next_maturity_date?: string;
    period_start_date?: string;
    current_principal: number;
    regular_interest: number;
    late_payment_fee: number;
    accrued_interest: number;
    minimum_payment: number;
    total_due: number;
  };
  reviewActions?: Array<{
    id: number | string;
    action_type: string;
    notice_method?: string;
    customer_message?: string;
    notes?: string;
    created_at?: string;
  }>;
};

type LoanRenewalFlowProps = {
  loan: Loan;
  onClose: () => void;
  onLoanUpdated: (loan: Loan) => void;
  allowReview?: boolean;
};

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Card', label: 'Card' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Other', label: 'Other' },
];

const NOTICE_METHODS = [
  { value: 'sms', label: 'SMS (send outside this app)' },
  { value: 'whatsapp', label: 'WhatsApp (send outside this app)' },
  { value: 'call', label: 'Phone call' },
  { value: 'letter', label: 'Letter' },
  { value: 'in_person', label: 'In person' },
  { value: 'other', label: 'Other' },
];

function currency(value: number | string | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '—';
}

function dateText(value?: string) {
  if (!value) return '—';
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function addMonths(value: string | undefined, months: number) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const next = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDay));
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(next.getDate()).padStart(2, '0')}`;
}

function reviewIsDue(loan: Loan) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const maturity = String(loan.maturity_date || '').slice(0, 10);
  const reviewDate = addMonths(loan.loan_date, 15);
  const status = String(loan.loan_status || '').toLowerCase();
  return (
    ['active', 'suspended'].includes(status) &&
    loan.release_status !== 'Released' &&
    Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
    Boolean(maturity && reviewDate) &&
    maturity < todayKey &&
    reviewDate <= todayKey
  );
}

export default function LoanRenewalFlow({
  loan: loanRow,
  onClose,
  onLoanUpdated,
  allowReview = false,
}: LoanRenewalFlowProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [details, setDetails] = useState<RenewalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [noticeMethod, setNoticeMethod] = useState('sms');
  const [customerMessage, setCustomerMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionNotes, setReviewActionNotes] = useState('');

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get(`/loans/${loanRow.id}/renewal`);
      setDetails(data as RenewalData);
      setCustomerMessage(
        `Your loan ${data.loan.loan_number} has reached its 15-month review date. Please contact Sri Golds to discuss payment or renewal options. Any further action will follow your loan agreement and applicable process.`,
      );
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loanRow.id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const loan = details?.loan;
  const preview = details?.preview;
  const amount = Number(paymentAmount);
  const principalReduction =
    preview && Number.isFinite(amount)
      ? Math.max(
          0,
          Math.min(
            preview.current_principal,
            amount - preview.accrued_interest,
          ),
        )
      : 0;
  const canPay = Boolean(
    loan &&
      preview &&
      loan.loan_status === 'Active' &&
      preview.current_principal > 0 &&
      Number.isFinite(amount) &&
      amount > 0 &&
      amount + 0.001 >= preview.minimum_payment &&
      amount <= preview.total_due + 0.001,
  );
  const manualReviewDue = loan ? reviewIsDue(loan) : false;
  const hasNotice = details?.reviewActions?.some(
    item => item.action_type === 'notice_sent',
  );
  const address = loan
    ? [
        loan.customer_address,
        loan.customer_city,
        loan.customer_district,
        loan.customer_state,
        loan.customer_pincode,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
  const activeTerms = useMemo(
    () =>
      loan
        ? [
            [
              'Customer ID',
              String(loan.customer_code || loan.customer_id || '—'),
            ],
            ['Customer', String(loan.customer_name || '—')],
            ['Mobile', String(loan.customer_mobile || '—')],
            ['Address', address || '—'],
            ['Loan status', String(loan.loan_status || '—')],
            ['Principal', currency(loan.principal_amount)],
            ['Current balance', currency(preview?.current_principal)],
            [
              'Interest',
              `${Number(loan.interest_rate || 0).toFixed(2)}% per ${String(
                loan.interest_frequency || '',
              ).replaceAll('_', ' ')}`,
            ],
            ['Loan date', dateText(loan.loan_date)],
            ['Maturity date', dateText(loan.maturity_date)],
            ['Renewal date', dateText(preview?.renewal_date)],
          ]
        : [],
    [address, loan, preview?.current_principal, preview?.renewal_date],
  );

  const submitPayment = async () => {
    if (!canPay || !loan || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/loans/${loan.id}/renewal`, {
        payment_amount: amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
      });
      setDetails(data as RenewalData);
      setPaymentAmount('');
      setReferenceNumber('');
      onLoanUpdated(data.loan as Loan);
      showAlert(
        'Payment recorded',
        data.preview.current_principal === 0
          ? 'Loan paid in full. Record the gold handover from the Complete Loan tab.'
          : `Payment recorded. Loan renewed through ${dateText(
              data.loan.maturity_date,
            )}.`,
        { variant: 'success' },
      );
    } catch (error) {
      showAlert('Could not record payment', errorMessage(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const submitReviewAction = async (
    action: 'notice_sent' | 'suspend' | 'reinstate',
  ) => {
    if (!loan || savingReview) return;
    if (
      action === 'notice_sent' &&
      (!customerMessage.trim() || !reviewNotes.trim())
    ) {
      showAlert(
        'Review details required',
        'Enter the customer message and contact notes.',
        {
          variant: 'warning',
        },
      );
      return;
    }
    if (action !== 'notice_sent' && !reviewActionNotes.trim()) {
      showAlert(
        'Review notes required',
        'Enter a reason for this status change.',
        {
          variant: 'warning',
        },
      );
      return;
    }
    const saveAction = async () => {
      setSavingReview(true);
      try {
        const payload =
          action === 'notice_sent'
            ? {
                action,
                notice_method: noticeMethod,
                customer_message: customerMessage,
                notes: reviewNotes,
              }
            : { action, notes: reviewActionNotes };
        const { data } = await api.post(
          `/loans/${loan.id}/review-action`,
          payload,
        );
        setDetails(current =>
          current
            ? {
                ...current,
                loan: data.loan,
                reviewActions: data.reviewActions,
              }
            : current,
        );
        onLoanUpdated(data.loan as Loan);
        setReviewNotes('');
        setReviewActionNotes('');
        showAlert(
          'Review saved',
          action === 'notice_sent'
            ? 'Customer notice recorded. This app does not send SMS or WhatsApp automatically.'
            : action === 'suspend'
            ? 'Renewal suspended. No collateral action was taken.'
            : 'Renewal access reinstated.',
          { variant: 'success' },
        );
      } catch (error) {
        showAlert('Could not update loan review', errorMessage(error), {
          variant: 'error',
        });
      } finally {
        setSavingReview(false);
      }
    };

    if (action === 'suspend' || action === 'reinstate') {
      showAlert(
        action === 'suspend' ? 'Suspend renewal?' : 'Reinstate renewal?',
        action === 'suspend'
          ? 'This does not transfer ownership of or authorize taking the pledged gold.'
          : 'This restores renewal access for this loan.',
        {
          variant: 'warning',
          buttons: [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: saveAction },
          ],
        },
      );
      return;
    }
    await saveAction();
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!saving && !savingReview) onClose();
      }}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close loan renewal"
          onPress={() => {
            if (!saving && !savingReview) onClose();
          }}
          className="flex-1"
        />
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="max-h-[90%] rounded-t-3xl bg-[#F8F7F2]"
        >
          <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EAD78A]">
                Payment and Renewal
              </Text>
              <Text
                numberOfLines={1}
                className="mt-1 text-base font-extrabold text-white"
              >
                {loanRow.loan_number || `Loan ${loanRow.id}`} ·{' '}
                {loanRow.customer_name || 'Customer'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close loan renewal form"
              disabled={saving || savingReview}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <X size={20} color="#EAD78A" />
            </Pressable>
          </View>
          {loading ? (
            <View className="items-center p-8">
              <ActivityIndicator color="#07564B" />
              <Text className="mt-2 text-sm text-[#6B7E76]">
                Loading loan details...
              </Text>
            </View>
          ) : loadError || !loan || !preview ? (
            <View className="p-5">
              <Text className="text-sm text-[#B42332]">
                {loadError || 'Payment and renewal details are unavailable.'}
              </Text>
              <Pressable onPress={loadDetails} className="mt-3 self-start">
                <Text className="font-bold text-[#07564B]">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="p-4"
              className="shrink"
            >
              {manualReviewDue && allowReview ? (
                <View className="mb-4 rounded-xl border border-[#F2D98B] bg-[#FFF8E7] p-3">
                  <Text className="font-bold text-[#8A5A00]">
                    15-month account review required
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-[#70540D]">
                    Refer this unpaid loan for authorized manual review. This
                    flag does not authorize automatic collateral seizure or
                    forfeiture.
                  </Text>
                </View>
              ) : null}

              <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                <Text className="mb-3 text-sm font-extrabold text-[#173F35]">
                  Customer and saved loan terms
                </Text>
                {activeTerms.map(([label, value]) => (
                  <View
                    key={label}
                    className="flex-row justify-between gap-3 border-b border-[#F1F2EE] py-2"
                  >
                    <Text className="flex-1 text-xs text-[#6B7E76]">
                      {label}
                    </Text>
                    <Text className="flex-1 text-right text-xs font-semibold text-[#173F35]">
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mb-4 rounded-2xl border border-[#B7E4D2] bg-white p-4">
                <Text className="text-base font-extrabold text-[#173F35]">
                  Payment and renewal
                </Text>
                <Text className="mb-3 mt-1 text-xs text-[#6B7E76]">
                  Renewal date: {dateText(preview.renewal_date)}
                </Text>
                {[
                  ['Current principal', currency(preview.current_principal)],
                  ['Maturity date', dateText(loan.maturity_date)],
                  [
                    'Regular interest accrued',
                    currency(preview.regular_interest),
                  ],
                  [
                    'Overdue extra interest / late fee',
                    currency(preview.late_payment_fee),
                  ],
                  [
                    'Total interest and late fee',
                    currency(preview.accrued_interest),
                  ],
                  ['Total due', currency(preview.total_due)],
                ].map(([label, value]) => (
                  <View
                    key={label}
                    className="flex-row justify-between gap-3 border-b border-[#F1F2EE] py-2"
                  >
                    <Text className="flex-1 text-xs text-[#6B7E76]">
                      {label}
                    </Text>
                    <Text className="text-right text-xs font-bold text-[#173F35]">
                      {value}
                    </Text>
                  </View>
                ))}
                <Text className="mt-3 text-[11px] leading-4 text-[#6B7E76]">
                  Minimum interest payment: {currency(preview.minimum_payment)}.
                  Extra payment reduces principal; the remaining balance earns
                  interest at the saved rate for the next 11 months.
                </Text>
                {preview.current_principal > 0 ? (
                  <View className="mt-4">
                    <Field
                      label="Payable Amount (₹)"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="decimal-pad"
                      placeholder="Enter amount received"
                    />
                    <CustomDropdown
                      label="Payment Method"
                      value={paymentMethod}
                      options={PAYMENT_METHODS}
                      onSelect={setPaymentMethod}
                    />
                    <Field
                      label="Reference Number (optional)"
                      value={referenceNumber}
                      onChangeText={setReferenceNumber}
                      placeholder="Transaction/reference number"
                    />
                    {paymentAmount && Number.isFinite(amount) && amount > 0 ? (
                      <View className="mb-3 rounded-xl bg-[#EFF9F5] p-3">
                        <Text className="text-xs text-[#52645F]">
                          Interest covered:{' '}
                          {currency(Math.min(amount, preview.accrued_interest))}
                        </Text>
                        <Text className="mt-1 text-xs text-[#52645F]">
                          Principal reduction: {currency(principalReduction)}
                        </Text>
                        <Text className="mt-1 text-xs font-bold text-[#07564B]">
                          Principal after payment:{' '}
                          {currency(
                            preview.current_principal - principalReduction,
                          )}
                        </Text>
                      </View>
                    ) : null}
                    {!canPay && paymentAmount ? (
                      <Text className="-mt-4 mb-3 text-xs text-[#B42332]">
                        Payment must cover accrued interest and cannot exceed
                        total due.
                      </Text>
                    ) : null}
                    {loan.loan_status !== 'Active' ? (
                      <Text className="text-center text-xs text-[#6B7E76]">
                        This loan is not active and cannot be renewed.
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text className="mt-3 rounded-xl bg-[#EFF9F5] p-3 text-sm font-semibold text-[#07564B]">
                    This loan is paid in full. Complete the physical gold
                    handover from the Complete Loan tab.
                  </Text>
                )}
              </View>

              {allowReview && manualReviewDue ? (
                <View className="mb-4 rounded-2xl border border-[#F2D98B] bg-white p-4">
                  <Text className="text-sm font-extrabold text-[#173F35]">
                    Customer notice and renewal status
                  </Text>
                  <Text className="mb-3 mt-1 text-xs leading-5 text-[#6B7E76]">
                    The selected notice channel must be used outside this app.
                    The app records the notice but does not send SMS or WhatsApp
                    automatically.
                  </Text>
                  <CustomDropdown
                    label="Notice Channel"
                    value={noticeMethod}
                    options={NOTICE_METHODS}
                    onSelect={setNoticeMethod}
                  />
                  <Field
                    label="Customer Message"
                    value={customerMessage}
                    onChangeText={setCustomerMessage}
                    multiline
                  />
                  <Field
                    label="Internal Contact Notes"
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    placeholder="Record who was contacted and any response"
                    multiline
                  />
                  {loan.loan_status === 'Suspended' ? (
                    <>
                      <Text className="mb-2 rounded-lg bg-[#FFF8E7] p-3 text-xs text-[#70540D]">
                        Renewal is suspended. No collateral action has been
                        taken.
                      </Text>
                      <Field
                        label="Reinstatement Notes"
                        value={reviewActionNotes}
                        onChangeText={setReviewActionNotes}
                        multiline
                      />
                    </>
                  ) : (
                    <>
                      <Text className="mb-2 text-xs text-[#6B7E76]">
                        {hasNotice
                          ? 'A customer notice is recorded. An administrator may now suspend renewal if required by approved policy.'
                          : 'Record a customer notice before suspending renewal.'}
                      </Text>
                      <Field
                        label="Suspension Notes"
                        value={reviewActionNotes}
                        onChangeText={setReviewActionNotes}
                        placeholder="Reason for suspending renewal access"
                        multiline
                      />
                    </>
                  )}
                  {details.reviewActions?.length ? (
                    <View className="mt-4 border-t border-[#F1F2EE] pt-3">
                      <Text className="mb-2 text-xs font-extrabold uppercase text-[#6B7E76]">
                        Review Action History
                      </Text>
                      {details.reviewActions.map(item => (
                        <View
                          key={String(item.id)}
                          className="mb-2 rounded-lg bg-[#F8F7F2] p-3"
                        >
                          <Text className="text-xs font-bold text-[#173F35]">
                            {item.action_type.replaceAll('_', ' ')} ·{' '}
                            {dateText(item.created_at)}
                            {item.notice_method
                              ? ` · ${item.notice_method}`
                              : ''}
                          </Text>
                          {item.customer_message ? (
                            <Text className="mt-1 text-xs text-[#52645F]">
                              {item.customer_message}
                            </Text>
                          ) : null}
                          {item.notes ? (
                            <Text className="mt-1 text-xs text-[#6B7E76]">
                              {item.notes}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          )}
          {!loading &&
          loan &&
          preview &&
          (preview.current_principal > 0 ||
            (allowReview && manualReviewDue)) ? (
            <View className="gap-2 border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 pt-3">
              {preview.current_principal > 0 ? (
                <SubmitButton
                  label="Record Payment & Renew"
                  loading={saving}
                  onPress={submitPayment}
                  compact
                />
              ) : null}
              {allowReview && manualReviewDue ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      savingReview ||
                      !customerMessage.trim() ||
                      !reviewNotes.trim()
                    }
                    onPress={() => submitReviewAction('notice_sent')}
                    className="min-h-11 items-center justify-center rounded-xl bg-[#064A41] px-3 py-2 disabled:opacity-50"
                  >
                    <Text className="text-center text-xs font-bold text-white">
                      {savingReview
                        ? 'Saving...'
                        : 'Confirm Notice Sent & Save Record'}
                    </Text>
                  </Pressable>
                  {loan.loan_status === 'Suspended' ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingReview || !reviewActionNotes.trim()}
                      onPress={() => submitReviewAction('reinstate')}
                      className="min-h-11 items-center justify-center rounded-xl border border-[#07564B] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-[#07564B]">
                        Reinstate Renewal
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        savingReview ||
                        !hasNotice ||
                        !reviewActionNotes.trim()
                      }
                      onPress={() => submitReviewAction('suspend')}
                      className="min-h-11 items-center justify-center rounded-xl bg-[#A16207] px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-bold text-white">
                        Suspend Renewal
                      </Text>
                    </Pressable>
                  )}
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
