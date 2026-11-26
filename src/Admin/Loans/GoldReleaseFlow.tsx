import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { Field, errorMessage } from './FormControls';

type Loan = {
  id: number | string;
  loan_number?: string;
  gold_pledge_number?: string;
  customer_id?: number | string;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_alternate_mobile?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  customer_kyc_status?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  gross_weight?: number | string;
  stone_weight?: number | string;
  net_gold_weight?: number | string;
  rate_unit?: string;
  gold_valuation?: number | string;
  gold_rate_per_gram?: number | string | null;
  gold_rate_date?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  loan_date?: string;
  maturity_date?: string;
  loan_status?: string;
  release_status?: string;
  gold_image_url?: string | null;
  [key: string]: unknown;
};

type Release = {
  released_at?: string;
  released_to?: string;
  confirmed_customer_signature?: boolean;
  signed_document_url?: string;
  notes?: string;
};

type ReleaseDetails = { loan: Loan; release: Release | null };

type SignedDocument = {
  uri: string;
  name: string;
  type: string;
  size: number | null;
};

type GoldReleaseFlowProps = {
  loan: Loan;
  completionPage: boolean;
  onClose: () => void;
  onReleased: (loan: Loan) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

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
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function documentMimeType(type: string | null, name: string | null) {
  if (type && ACCEPTED_TYPES.includes(type)) return type;
  const extension = name?.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  return '';
}

export default function GoldReleaseFlow({
  loan: loanRow,
  completionPage,
  onClose,
  onReleased,
}: GoldReleaseFlowProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [recipient, setRecipient] = useState(loanRow.customer_name || '');
  const [notes, setNotes] = useState('');
  const [signedDocument, setSignedDocument] = useState<SignedDocument | null>(
    null,
  );
  const [signatureReceived, setSignatureReceived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadDetails = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const { data } = await api.get(`/loans/${loanRow.id}/gold-release`);
      setDetails(data as ReleaseDetails);
      setRecipient(data.release?.released_to || data.loan.customer_name || '');
      setNotes(data.release?.notes || '');
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
  const release = details?.release;
  const outstanding = Number(
    loan?.outstanding_principal ?? loan?.principal_amount,
  );
  const fullyPaid = Boolean(
    loan && Number.isFinite(outstanding) && outstanding === 0,
  );

  const selectDocument = async () => {
    try {
      const [document] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
        mode: 'import',
      });
      if (!document.hasRequestedType) {
        showAlert(
          'Unsupported document',
          'Choose a PDF, JPG, or PNG signed release form.',
          { variant: 'warning' },
        );
        return;
      }
      const mimeType = documentMimeType(document.type, document.name);
      if (!ACCEPTED_TYPES.includes(mimeType)) {
        showAlert(
          'Unsupported document',
          'Choose a PDF, JPG, or PNG signed release form.',
          { variant: 'warning' },
        );
        return;
      }
      if (document.size != null && document.size > MAX_FILE_SIZE) {
        showAlert(
          'Document too large',
          'The signed release document must be 10 MB or smaller.',
          {
            variant: 'warning',
          },
        );
        return;
      }
      setSignedDocument({
        uri: document.uri,
        name:
          document.name ||
          `signed-release.${
            mimeType === 'application/pdf'
              ? 'pdf'
              : mimeType === 'image/png'
              ? 'png'
              : 'jpg'
          }`,
        type: mimeType,
        size: document.size,
      });
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      showAlert('Could not choose document', errorMessage(error), {
        variant: 'error',
      });
    }
  };

  const recordRelease = async () => {
    if (
      !loan ||
      !fullyPaid ||
      release ||
      !signatureReceived ||
      !recipient.trim() ||
      !signedDocument ||
      saving
    ) {
      return;
    }
    if (recipient.trim().length > 150) {
      showAlert(
        'Recipient name too long',
        'The recipient name must be 150 characters or fewer.',
        {
          variant: 'warning',
        },
      );
      return;
    }
    if (notes.length > 2000) {
      showAlert(
        'Release notes too long',
        'Release notes must be 2,000 characters or fewer.',
        {
          variant: 'warning',
        },
      );
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('released_to', recipient.trim());
      formData.append('notes', notes);
      formData.append('customer_signature_received', 'true');
      formData.append('signed_document', signedDocument);
      const { data } = await api.post(
        `/loans/${loan.id}/gold-release`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      setDetails(data as ReleaseDetails);
      onReleased(data.loan as Loan);
      showAlert(
        'Gold release recorded',
        'The gold handover is recorded and the loan is completed.',
        {
          variant: 'success',
        },
      );
    } catch (error) {
      showAlert('Could not record gold release', errorMessage(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

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
  const unit = loan?.rate_unit === 'carat' ? 'ct' : 'g';

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close gold release details"
          disabled={saving}
          onPress={onClose}
          className="flex-1"
        />
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="max-h-[92%] rounded-t-3xl bg-[#F8F7F2]"
        >
          <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EAD78A]">
                {completionPage ? 'Complete Loan' : 'Gold Release'}
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
              disabled={saving}
              onPress={onClose}
              className="rounded-full bg-white/10 px-3 py-2"
            >
              <Text className="font-bold text-white">Close</Text>
            </Pressable>
          </View>
          {loading ? (
            <View className="items-center p-8">
              <ActivityIndicator color="#07564B" />
              <Text className="mt-2 text-sm text-[#6B7E76]">
                Loading gold release details...
              </Text>
            </View>
          ) : !loan ? (
            <View className="p-5">
              <Text className="text-sm text-[#B42332]">
                {loadError || 'Gold release details are unavailable.'}
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
              <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                <Text className="mb-3 text-sm font-extrabold text-[#173F35]">
                  Verify Customer, Loan, and Pledged Jewellery
                </Text>
                {[
                  ['Customer ID', loan.customer_code || loan.customer_id],
                  ['Customer', loan.customer_name],
                  ['Mobile', loan.customer_mobile],
                  ['Alternate mobile', loan.customer_alternate_mobile],
                  ['KYC status', loan.customer_kyc_status],
                  ['Address', address],
                  ['Loan number', loan.loan_number],
                  ['Pledge number', loan.gold_pledge_number],
                  [
                    'Jewellery',
                    `${loan.jewellery_type || '—'} · ${
                      loan.metal_type || 'Gold'
                    }`,
                  ],
                  ['Purity / quality', loan.gold_purity],
                  ['Gross weight', `${loan.gross_weight ?? '—'} ${unit}`],
                  ['Stone weight', `${loan.stone_weight || 0} ${unit}`],
                  ['Net weight', `${loan.net_gold_weight ?? '—'} ${unit}`],
                  ['Loan amount', currency(loan.principal_amount)],
                  ['Outstanding balance', currency(outstanding)],
                  ['Loan date', dateText(loan.loan_date)],
                  ['Maturity date', dateText(loan.maturity_date)],
                  ['Gold valuation', currency(loan.gold_valuation)],
                  [
                    'Rate snapshot',
                    loan.gold_rate_per_gram == null
                      ? '—'
                      : `${currency(loan.gold_rate_per_gram)} / ${unit}`,
                  ],
                  ['Rate date', dateText(loan.gold_rate_date)],
                ].map(([label, value]) => (
                  <View
                    key={label}
                    className="flex-row justify-between gap-3 border-b border-[#F1F2EE] py-2"
                  >
                    <Text className="flex-1 text-xs text-[#6B7E76]">
                      {label}
                    </Text>
                    <Text className="flex-1 text-right text-xs font-semibold text-[#173F35]">
                      {String(value || '—')}
                    </Text>
                  </View>
                ))}
              </View>

              {release ? (
                <View className="rounded-2xl border border-[#A7D6C9] bg-[#EFF9F5] p-4">
                  <Text className="text-sm font-extrabold text-[#07564B]">
                    Completed · Gold released
                  </Text>
                  <Text className="mt-2 text-xs text-[#173F35]">
                    Released to: {release.released_to || '—'}
                  </Text>
                  <Text className="mt-1 text-xs text-[#173F35]">
                    Release date: {dateText(release.released_at)}
                  </Text>
                  <Text className="mt-1 text-xs text-[#173F35]">
                    Customer signature confirmed:{' '}
                    {release.confirmed_customer_signature ? 'Yes' : 'No'}
                  </Text>
                  {release.notes ? (
                    <Text className="mt-2 text-xs text-[#52645F]">
                      Release notes: {release.notes}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View className="rounded-2xl border border-[#E6E9E3] bg-white p-4">
                  <Text className="text-sm font-extrabold text-[#173F35]">
                    Print and Record Handover
                  </Text>
                  <Text className="mb-3 mt-1 text-xs leading-5 text-[#6B7E76]">
                    Verify the recipient, obtain the signed release form, then
                    record the physical handover. A loan cannot be completed
                    until the balance is fully paid.
                  </Text>
                  {!fullyPaid ? (
                    <Text className="mb-3 rounded-lg bg-[#FEF2F2] p-3 text-xs font-semibold text-[#991B1B]">
                      Gold release is locked until the outstanding balance is
                      fully paid.
                    </Text>
                  ) : null}
                  <Field
                    label="Gold Received By"
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="Name of recipient"
                    required
                  />
                  <Field
                    label="Release Notes (optional)"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional release notes"
                    multiline
                  />
                  <Text className="mb-2 text-xs font-bold text-[#52645F]">
                    Upload Signed Release Document
                  </Text>
                  <Text className="mb-3 -mt-1 text-[11px] leading-4 text-[#6B7E76]">
                    Required before completing the loan. Accepted: PDF, JPG, or
                    PNG (max 10 MB).
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!fullyPaid || saving}
                    onPress={selectDocument}
                    className="mb-3 min-h-12 items-center justify-center rounded-xl border border-dashed border-[#A7D6C9] bg-[#EFF9F5] px-3 py-3 disabled:opacity-50"
                  >
                    <Text className="text-center text-sm font-bold text-[#07564B]">
                      {signedDocument
                        ? 'Choose a different document'
                        : 'Choose signed document'}
                    </Text>
                  </Pressable>
                  {signedDocument ? (
                    <View className="mb-3 rounded-lg bg-[#F8F7F2] p-3">
                      <Text
                        numberOfLines={2}
                        className="text-xs font-semibold text-[#173F35]"
                      >
                        {signedDocument.name}
                      </Text>
                      <Text className="mt-1 text-[10px] text-[#6B7E76]">
                        {signedDocument.size == null
                          ? signedDocument.type
                          : `${(signedDocument.size / (1024 * 1024)).toFixed(
                              2,
                            )} MB · ${signedDocument.type}`}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: signatureReceived,
                      disabled: !fullyPaid || saving,
                    }}
                    disabled={!fullyPaid || saving}
                    onPress={() => setSignatureReceived(value => !value)}
                    className="mb-4 flex-row items-start rounded-xl border border-[#F2D98B] bg-[#FFF8E7] p-3 disabled:opacity-50"
                  >
                    <View
                      className={`mr-2 mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                        signatureReceived
                          ? 'border-[#07564B] bg-[#07564B]'
                          : 'border-[#9AA6A1] bg-white'
                      }`}
                    >
                      {signatureReceived ? (
                        <Check size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text className="flex-1 text-xs leading-5 text-[#70540D]">
                      I verified the signed physical release form, recipient
                      identity, and actual handover of the pledged gold.
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      !fullyPaid ||
                      !signatureReceived ||
                      !recipient.trim() ||
                      !signedDocument ||
                      saving
                    }
                    onPress={recordRelease}
                    className="min-h-12 items-center justify-center rounded-xl bg-[#064A41] px-4 py-3 disabled:opacity-50"
                  >
                    <Text className="text-center text-sm font-extrabold text-white">
                      {saving
                        ? 'Recording Release...'
                        : 'Confirm Gold Released & Complete Loan'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
