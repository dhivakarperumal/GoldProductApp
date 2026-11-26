import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Pencil, Printer } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { errorMessage } from './FormControls';
import { LoanAgreementData, printLoanAgreement } from './loanActions';

type Props = {
  loanId: number | string;
  onBack: () => void;
  onEdit: () => void;
};

function currency(value: string | number | null | undefined) {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : String(value);
}

function date(value?: string) {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl bg-[#F8F9F6] p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#83918B]">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-bold text-[#173F35]">{value || '—'}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <Text className="mb-3 text-base font-extrabold text-[#173F35]">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export default function LoanDetails({ loanId, onBack, onEdit }: Props) {
  const { showAlert } = useCustomAlert();
  const [loan, setLoan] = useState<LoanAgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadLoan = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await api.get(`/loans/${loanId}`, {
          signal: controller.signal,
        });
        if (!response.data || !response.data.id) {
          throw new Error('The server returned invalid loan details.');
        }
        if (!controller.signal.aborted) {
          setLoan(response.data as LoanAgreementData);
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadLoan();
    return () => controller.abort();
  }, [loanId, retryKey]);

  const canEdit =
    loan !== null &&
    Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
    loan.loan_status !== 'Completed' &&
    loan.loan_status !== 'completed' &&
    loan.release_status !== 'Released';

  const handlePrint = async () => {
    if (!loan) return;
    setPrinting(true);
    try {
      await printLoanAgreement(loan);
    } catch (error) {
      showAlert('Could not prepare loan agreement', errorMessage(error), {
        variant: 'error',
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title={loan?.loan_number || 'Loan Details'}
        sectionLabel="All Loans"
        onBack={onBack}
      />
      {loading && !loan ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#07564B" />
          <Text className="mt-3 text-sm text-[#6B7E76]">Loading loan details...</Text>
        </View>
      ) : loadError && !loan ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-sm text-[#991B1B]">{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryKey(key => key + 1)}
            className="rounded-xl bg-[#07564B] px-5 py-3">
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : loan ? (
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8">
          {loadError ? (
            <Text className="mb-3 rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
              {loadError}
            </Text>
          ) : null}
          <View className="mb-4 rounded-2xl bg-[#173F35] p-5">
            <Text className="text-xs font-bold uppercase tracking-widest text-[#EAD78A]">
              Gold Loan
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-white">
              {loan.loan_number || `Loan ${loan.id}`}
            </Text>
            <Text className="mt-2 text-sm text-[#DCE8E4]">
              {loan.release_status === 'Released'
                ? 'Completed · Gold Released'
                : loan.release_status === 'Pending Release' &&
                    Number(loan.outstanding_principal ?? loan.principal_amount) === 0
                  ? 'Paid · Awaiting Gold Release'
                  : loan.loan_status || 'Unknown'}
              {loan.maturity_date ? ` · Maturity ${date(loan.maturity_date)}` : ''}
            </Text>
            <View className="mt-4 flex-row gap-2">
              {canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onEdit}
                  className="min-h-11 flex-1 flex-row items-center justify-center rounded-xl bg-white px-3">
                  <Pencil size={16} color="#07564B" />
                  <Text className="ml-2 text-sm font-bold text-[#07564B]">Edit Loan</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={printing}
                onPress={handlePrint}
                className="min-h-11 flex-1 flex-row items-center justify-center rounded-xl bg-[#B8860B] px-3 disabled:opacity-60">
                {printing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Printer size={16} color="white" />
                )}
                <Text className="ml-2 text-sm font-bold text-white">Print / Share PDF</Text>
              </Pressable>
            </View>
          </View>

          <Section title="Customer">
            <Detail label="Customer ID" value={loan.customer_code || String(loan.customer_id || '—')} />
            <Detail label="Full Name" value={loan.customer_name || '—'} />
            <Detail label="Mobile" value={loan.customer_mobile || '—'} />
            <Detail label="Alternate Mobile" value={loan.customer_alternate_mobile || '—'} />
            <Detail label="Email" value={loan.customer_email || '—'} />
            <Detail label="Date of Birth" value={date(loan.customer_date_of_birth)} />
            <Detail label="Gender" value={loan.customer_gender || '—'} />
            <Detail label="Occupation" value={loan.customer_occupation || '—'} />
            <Detail label="KYC Status" value={loan.customer_kyc_status || '—'} />
            <Detail
              label="Address"
              value={
                [
                  loan.customer_address,
                  loan.customer_city,
                  loan.customer_district,
                  loan.customer_state,
                  loan.customer_pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <Detail label="Guarantor" value={loan.guarantor_name || '—'} />
            <Detail label="Guarantor Mobile" value={loan.guarantor_mobile || '—'} />
            <Detail label="Guarantor Email" value={loan.guarantor_email || '—'} />
            <Detail
              label="Guarantor Relationship"
              value={loan.guarantor_relationship || '—'}
            />
            <Detail label="Guarantor Address" value={loan.guarantor_address || '—'} />
          </Section>

          <Section title="Pledged Jewellery & Loan Amount">
            <Detail label="Pledge Number" value={loan.gold_pledge_number || '—'} />
            <Detail label="Jewellery Type" value={loan.jewellery_type || '—'} />
            <Detail label="Metal Type" value={loan.metal_type || 'Gold'} />
            <Detail label="Purity / Quality" value={loan.gold_purity || '—'} />
            <Detail
              label="Gross Weight"
              value={`${loan.gross_weight ?? '—'} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`}
            />
            <Detail
              label="Stone Weight"
              value={`${loan.stone_weight ?? '—'} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`}
            />
            <Detail
              label="Net Weight"
              value={`${loan.net_gold_weight ?? '—'} ${loan.rate_unit === 'carat' ? 'ct' : 'g'}`}
            />
            <Detail
              label="Applied Rate Snapshot"
              value={
                loan.gold_rate_per_gram == null
                  ? 'Not recorded'
                  : `${currency(loan.gold_rate_per_gram)} / ${loan.rate_unit === 'carat' ? 'carat' : 'g'}`
              }
            />
            {loan.gold_rate_date ? (
              <Detail label="Rate Date" value={date(loan.gold_rate_date)} />
            ) : null}
            <Detail label="Gold Valuation" value={currency(loan.gold_valuation)} />
            <Detail label="Principal Amount" value={currency(loan.principal_amount)} />
            <Detail
              label="Outstanding Principal"
              value={currency(loan.outstanding_principal ?? loan.principal_amount)}
            />
          </Section>

          <Section title="Contract Terms">
            <Detail label="Interest Type" value={loan.interest_type || '—'} />
            <Detail
              label="Interest Rate"
              value={`${loan.interest_rate ?? '—'}% / ${loan.interest_frequency || '—'}`}
            />
            {loan.fixed_interest_amount != null ? (
              <Detail label="Fixed Interest Amount" value={currency(loan.fixed_interest_amount)} />
            ) : null}
            {loan.custom_period_days != null ? (
              <Detail label="Custom Interest Period" value={`${loan.custom_period_days} days`} />
            ) : null}
            {loan.compounding_frequency ? (
              <Detail label="Compounding Frequency" value={loan.compounding_frequency} />
            ) : null}
            <Detail
              label="Calculation Start"
              value={date(loan.interest_calculation_start_date)}
            />
            <Detail label="Day-Count Convention" value={loan.day_count_convention || '—'} />
            <Detail label="Payment Frequency" value={loan.payment_frequency || '—'} />
            <Detail label="Loan Date" value={date(loan.loan_date)} />
            <Detail label="Maturity Date" value={date(loan.maturity_date)} />
            <Detail label="Grace Period" value={`${loan.grace_period_days ?? 0} days`} />
            <Detail label="Interest-Free Period" value={`${loan.interest_free_days ?? 0} days`} />
            <Detail
              label="Late Payment Rate"
              value={
                loan.late_payment_interest_rate == null
                  ? 'Not set'
                  : `${loan.late_payment_interest_rate}%`
              }
            />
            {loan.minimum_interest_amount != null ? (
              <Detail label="Minimum Interest" value={currency(loan.minimum_interest_amount)} />
            ) : null}
            {loan.maximum_interest_amount != null ? (
              <Detail label="Maximum Interest" value={currency(loan.maximum_interest_amount)} />
            ) : null}
            <Detail label="Processing Fee" value={currency(loan.processing_fee)} />
            <Detail label="Other Charges" value={currency(loan.other_charges)} />
            <Detail label="Notes" value={loan.notes || '—'} />
          </Section>
        </ScrollView>
      ) : null}
    </View>
  );
}
