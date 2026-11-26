import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  CreditCard,
  Users,
} from 'lucide-react-native';
import api from '../../api';
import { CustomDropdown } from './FormControls';
import LoanDateRangeFilter from './LoanDateRangeFilter';
import LoanRenewalFlow from './LoanRenewalFlow';

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
  customer_occupation?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_rate?: number | string;
  maturity_date?: string;
  loan_date?: string;
  loan_status?: string;
  release_status?: string;
  grace_period_days?: number | string;
};

type DateRange = { startDate: string; endDate: string };

function currency(value: number | string | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
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

function overdueDays(loan: Loan, today = new Date()) {
  const [year, month, day] = String(loan.maturity_date || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  if (!year || !month || !day) return 0;
  const due = new Date(
    Date.UTC(
      year,
      month - 1,
      day + Math.max(0, Number(loan.grace_period_days) || 0),
    ),
  );
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.floor((todayUtc - due.getTime()) / 86400000));
}

function reviewDate(loan: Loan) {
  if (!loan.loan_date) return '';
  const [year, month, day] = loan.loan_date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const next = new Date(year, month - 1 + 15, 1);
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

function reviewDue(loan: Loan) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const maturity = String(loan.maturity_date || '').slice(0, 10);
  const status = String(loan.loan_status || '').toLowerCase();
  return (
    ['active', 'suspended'].includes(status) &&
    loan.release_status !== 'Released' &&
    Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
    maturity < todayKey &&
    Boolean(reviewDate(loan)) &&
    reviewDate(loan) <= todayKey
  );
}

export default function OverdueLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadLoans = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/loans', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid loan list.');
      }
      setLoans(data as Loan[]);
    } catch (error) {
      setLoadError(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Could not load overdue loans.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const overdueLoans = useMemo(
    () =>
      loans
        .filter(
          loan =>
            ['active', 'suspended'].includes(
              String(loan.loan_status || '').toLowerCase(),
            ) &&
            loan.release_status !== 'Released' &&
            Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
            overdueDays(loan) > 0,
        )
        .map(loan => ({ ...loan, overdue_days: overdueDays(loan) }))
        .sort((first, second) => second.overdue_days - first.overdue_days),
    [loans],
  );
  const filteredLoans = overdueLoans.filter(loan => {
    const query = search.trim().toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      String(loan.loan_status || '').toLowerCase() ===
        statusFilter.toLowerCase();
    const matchesSearch =
      !query ||
      [
        loan.loan_number,
        loan.gold_pledge_number,
        loan.customer_code,
        loan.customer_name,
        loan.customer_mobile,
        loan.customer_alternate_mobile,
        loan.customer_email,
        loan.customer_address,
        loan.customer_city,
        loan.customer_district,
        loan.customer_occupation,
        loan.guarantor_name,
        loan.guarantor_mobile,
        loan.guarantor_email,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      );
    return matchesStatus && matchesSearch;
  });
  const customerCount = new Set(overdueLoans.map(loan => loan.customer_id))
    .size;
  const outstandingTotal = overdueLoans.reduce(
    (total, loan) =>
      total + Number(loan.outstanding_principal ?? loan.principal_amount),
    0,
  );
  const reviewRequiredCount = overdueLoans.filter(reviewDue).length;

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadLoans();
            }}
            tintColor="#07564B"
          />
        }
      >
        <View className="mb-4 rounded-2xl bg-[#064A41] p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#EAD78A]">
            Loan Management
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-white">
            Overdue Loans
          </Text>
          <Text className="mt-1 text-xs leading-5 text-white/75">
            Review overdue balances and follow up with customers.
          </Text>
        </View>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {[
            {
              label: 'Overdue Loans',
              value: String(overdueLoans.length),
              icon: AlertCircle,
            },
            { label: 'Customers', value: String(customerCount), icon: Users },
            {
              label: 'Outstanding',
              value: currency(outstandingTotal),
              icon: Clock3,
            },
            {
              label: '15-Month Reviews',
              value: String(reviewRequiredCount),
              icon: CalendarDays,
            },
          ].map(({ label, value, icon: Icon }) => (
            <View
              key={label}
              className="min-h-[82px] w-[48%] flex-1 rounded-xl border border-[#ECE7D8] bg-white p-3"
            >
              <Icon size={16} color="#A77B15" />
              <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">
                {label}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-sm font-extrabold text-[#173F35]"
              >
                {loading ? '—' : value}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
          <TextInput
            accessibilityLabel="Search overdue loans and customers"
            value={search}
            onChangeText={setSearch}
            placeholder="Search loan, customer, mobile, guarantor..."
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 text-sm text-[#173F35]"
          />
        </View>
        <LoanDateRangeFilter onApply={setDateRange} />
        <CustomDropdown
          label="Loan Status"
          value={statusFilter}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Suspended', label: 'Suspended' },
          ]}
          onSelect={setStatusFilter}
        />

        {loadError ? (
          <View className="mb-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{loadError}</Text>
            <Pressable onPress={loadLoans} className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#07564B" />
            <Text className="mt-2 text-sm text-[#6B7280]">
              Loading overdue loans...
            </Text>
          </View>
        ) : filteredLoans.length ? (
          filteredLoans.map(loan => (
            <View
              key={String(loan.id)}
              className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#07564B]">
                    {loan.loan_number || `Loan ${loan.id}`}
                  </Text>
                  {loan.gold_pledge_number ? (
                    <Text className="mt-0.5 text-[10px] text-[#8A9690]">
                      Pledge {loan.gold_pledge_number}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-sm font-extrabold text-[#173F35]">
                    {loan.customer_name || 'Customer'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#6B7280]">
                    {loan.customer_mobile || 'Mobile number unavailable'}
                  </Text>
                </View>
                <View className="rounded-full bg-[#FEF2F2] px-2.5 py-1.5">
                  <Text className="text-[10px] font-bold text-[#B42332]">
                    {loan.overdue_days}{' '}
                    {loan.overdue_days === 1 ? 'day' : 'days'} overdue
                  </Text>
                </View>
              </View>
              {reviewDue(loan) ? (
                <Text className="mt-3 self-start rounded-full bg-[#FFF8E7] px-2.5 py-1 text-[10px] font-bold text-[#8A5A00]">
                  15-month review
                </Text>
              ) : null}
              <View className="mt-4 flex-row border-t border-[#F1F2EE] pt-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                    LOAN AMOUNT
                  </Text>
                  <Text className="mt-1 text-xs font-bold text-[#173F35]">
                    {currency(loan.principal_amount)}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#6B7280]">
                    {Number(loan.interest_rate || 0).toFixed(2)}% interest
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                    OUTSTANDING
                  </Text>
                  <Text className="mt-1 text-xs font-extrabold text-[#B42332]">
                    {currency(
                      loan.outstanding_principal ?? loan.principal_amount,
                    )}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                    MATURITY
                  </Text>
                  <Text className="mt-1 text-xs font-bold text-[#52645F]">
                    {dateText(loan.maturity_date)}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#6B7280]">
                    Grace: {Number(loan.grace_period_days) || 0} days
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPaymentLoan(loan)}
                className="mt-4 min-h-11 flex-row items-center justify-center rounded-xl bg-[#064A41] px-4 py-2"
              >
                <CreditCard size={16} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Pay / Renew
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
            <AlertCircle size={26} color="#A77B15" />
            <Text className="mt-3 text-sm font-bold text-[#173F35]">
              {overdueLoans.length
                ? 'No overdue loans match your filters.'
                : 'There are no overdue active loans.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {paymentLoan ? (
        <LoanRenewalFlow
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onLoanUpdated={updatedLoan =>
            setLoans(current =>
              current
                .map(loan =>
                  loan.id === updatedLoan.id
                    ? { ...loan, ...updatedLoan }
                    : loan,
                )
                .filter(
                  loan =>
                    ['active', 'suspended'].includes(
                      String(loan.loan_status || '').toLowerCase(),
                    ) &&
                    loan.release_status !== 'Released' &&
                    Number(
                      loan.outstanding_principal ?? loan.principal_amount,
                    ) > 0 &&
                    overdueDays(loan) > 0,
                ),
            )
          }
        />
      ) : null}
    </View>
  );
}
