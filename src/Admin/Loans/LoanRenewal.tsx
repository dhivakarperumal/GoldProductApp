import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  CalendarDays,
  Layers,
  ShieldCheck,
} from 'lucide-react-native';
import api from '../../api';
import LoanListFilters from './LoanListFilters';
import LoanStatCard from './LoanStatCard';
import LoanRenewalFlow from './LoanRenewalFlow';

type Loan = {
  id: number | string;
  loan_number?: string;
  customer_id?: number | string;
  customer_name?: string;
  customer_code?: string;
  customer_mobile?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  interest_rate?: number | string;
  interest_frequency?: string;
  maturity_date?: string;
  loan_date?: string;
  loan_status?: string;
  release_status?: string;
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

function reviewDate(value?: string) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  const result = new Date(year, month - 1 + 15, 1);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(result.getDate()).padStart(2, '0')}`;
}

function isReviewDue(loan: Loan) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const maturity = String(loan.maturity_date || '').slice(0, 10);
  const dueDate = reviewDate(loan.loan_date);
  return (
    ['active', 'suspended'].includes(
      String(loan.loan_status || '').toLowerCase(),
    ) &&
    loan.release_status !== 'Released' &&
    Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
    Boolean(maturity && dueDate) &&
    maturity < todayKey &&
    dueDate <= todayKey
  );
}

export default function LoanRenewal() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
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
      setLoans(
        (data as Loan[]).filter(
          loan =>
            ['Active', 'Suspended'].includes(String(loan.loan_status)) &&
            loan.release_status !== 'Released' &&
            Number(loan.outstanding_principal ?? loan.principal_amount) > 0,
        ),
      );
    } catch (error) {
      setLoadError(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Could not load loans for renewal.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const filteredLoans = loans.filter(loan => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        loan.loan_number,
        loan.customer_name,
        loan.customer_code,
        loan.customer_mobile,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      );
    const matchesStatus =
      statusFilter === 'All' ||
      String(loan.loan_status || '').toLowerCase() ===
        statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const maturingToday = loans.filter(
    loan => String(loan.maturity_date || '').slice(0, 10) === todayKey,
  ).length;
  const pastMaturity = loans.filter(loan => {
    const maturity = String(loan.maturity_date || '').slice(0, 10);
    return Boolean(maturity) && maturity < todayKey;
  }).length;
  const reviewsDue = loans.filter(isReviewDue).length;

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
        <View className="mb-3 flex-row flex-wrap gap-3">
          {[
            { label: 'Total Loans', value: loans.length, icon: Layers },
            {
              label: 'Maturing Today',
              value: maturingToday,
              icon: CalendarDays,
            },
            { label: 'Past Maturity', value: pastMaturity, icon: AlertCircle },
            { label: '15-Month Reviews', value: reviewsDue, icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }, index) => (
            <LoanStatCard
              key={label}
              id={label}
              label={label}
              value={loading ? '—' : value}
              icon={Icon}
              trend={
                label === 'Total Loans'
                  ? 'Loans in review'
                  : label === 'Maturing Today'
                  ? 'Due today'
                  : label === 'Past Maturity'
                  ? 'Past due'
                  : 'Review due'
              }
              paletteIndex={index}
            />
          ))}
        </View>

        <LoanListFilters
          search={search}
          onSearchChange={setSearch}
          searchAccessibilityLabel="Search loans for renewal"
          searchPlaceholder="Search loan number or customer"
          onDateRangeChange={setDateRange}
          statusLabel="Loan Status"
          statusValue={statusFilter}
          statusOptions={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Suspended', label: 'Suspended' },
          ]}
          onStatusChange={setStatusFilter}
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
              Loading loans...
            </Text>
          </View>
        ) : filteredLoans.length ? (
          filteredLoans.map(loan => (
            <View
              key={String(loan.id)}
              className="mb-3 rounded-2xl border border-[#DDBB57] bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#07564B]">
                    {loan.loan_number || `Loan ${loan.id}`}
                  </Text>
                  <Text className="mt-1 text-sm font-extrabold text-[#173F35]">
                    {loan.customer_name || 'Customer'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#6B7280]">
                    {loan.customer_code || 'ID unavailable'} ·{' '}
                    {loan.customer_mobile || 'No mobile'}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1.5 ${
                    loan.loan_status === 'Active'
                      ? 'bg-[#EFF9F5]'
                      : 'bg-[#FFF8E7]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      loan.loan_status === 'Active'
                        ? 'text-[#07564B]'
                        : 'text-[#8A5A00]'
                    }`}
                  >
                    {loan.loan_status}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row border-t border-[#F1F2EE] pt-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                    PRINCIPAL
                  </Text>
                  <Text className="mt-1 text-xs font-bold text-[#173F35]">
                    {currency(loan.principal_amount)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                    BALANCE
                  </Text>
                  <Text className="mt-1 text-xs font-extrabold text-[#173F35]">
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
                </View>
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F2EE] pt-3">
                <Text className="text-xs text-[#6B7E76]">
                  {Number(loan.interest_rate || 0).toFixed(2)}% /{' '}
                  {String(loan.interest_frequency || '').replaceAll('_', ' ')}
                </Text>
              </View>
              <View className="mt-3 flex-row justify-end gap-2">
                {loan.loan_status === 'Active' ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Pay loan ${
                        loan.loan_number || loan.id
                      }`}
                      onPress={() => setSelectedLoan(loan)}
                      className="min-h-10 items-center justify-center rounded-lg bg-[#064A41] px-4 py-2"
                    >
                      <Text className="text-xs font-bold text-white">Pay</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View renewal for loan ${
                        loan.loan_number || loan.id
                      }`}
                      onPress={() => setSelectedLoan(loan)}
                      className="min-h-10 items-center justify-center rounded-lg bg-[#EFF9F5] px-4 py-2"
                    >
                      <Text className="text-xs font-bold text-[#07564B]">
                        Renew
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Review loan ${
                      loan.loan_number || loan.id
                    }`}
                    onPress={() => setSelectedLoan(loan)}
                    className="min-h-10 items-center justify-center rounded-lg bg-[#FFF8E7] px-4 py-2"
                  >
                    <Text className="text-xs font-bold text-[#8A5A00]">
                      {isReviewDue(loan) ? 'Review' : 'Renewal Details'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
            <Layers size={26} color="#A77B15" />
            <Text className="mt-3 text-center text-sm font-bold text-[#173F35]">
              {loans.length
                ? 'No loans match your filters.'
                : 'No active loans are available for renewal.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedLoan ? (
        <LoanRenewalFlow
          loan={selectedLoan}
          allowReview
          onClose={() => setSelectedLoan(null)}
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
                    ) > 0,
                ),
            )
          }
        />
      ) : null}
    </View>
  );
}
