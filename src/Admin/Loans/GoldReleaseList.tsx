import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Users,
} from 'lucide-react-native';
import api from '../../api';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import { errorMessage } from './FormControls';
import GoldReleaseFlow from './GoldReleaseFlow';
import LoanListFilters from './LoanListFilters';
import LoanStatCard from './LoanStatCard';

type Loan = {
  id: number | string;
  loan_number?: string;
  gold_pledge_number?: string;
  customer_id?: number | string;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  principal_amount?: number | string;
  outstanding_principal?: number | string;
  maturity_date?: string;
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

function isCompleted(loan: Loan) {
  return loan.release_status === 'Released' || loan.loan_status === 'Completed';
}

export default function GoldReleaseList({
  completionPage,
}: {
  completionPage: boolean;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadLoans = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get(
        completionPage ? '/loans' : '/loans/gold-release',
        {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        },
      );
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid gold release list.');
      }
      const eligible = (data as Loan[]).filter(loan => {
        const balance = Number(
          loan.outstanding_principal ?? loan.principal_amount,
        );
        if (balance !== 0) return false;
        if (!completionPage) return loan.release_status !== 'Released';
        const completed = isCompleted(loan);
        return completed || loan.release_status === 'Pending Release';
      });
      setLoans(eligible);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [completionPage, dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const filteredLoans = useMemo(
    () =>
      loans.filter(loan => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [
            loan.loan_number,
            loan.customer_name,
            loan.customer_code,
            loan.customer_mobile,
            loan.gold_pledge_number,
          ].some(value =>
            String(value || '')
              .toLowerCase()
              .includes(query),
          );
        const status = isCompleted(loan)
          ? 'Completed'
          : 'Awaiting Gold Release';
        return (
          matchesSearch && (statusFilter === 'All' || status === statusFilter)
        );
      }),
    [loans, search, statusFilter],
  );
  const completedCount = loans.filter(isCompleted).length;
  const awaitingCount = loans.length - completedCount;
  const customerCount = new Set(
    loans.map(loan => loan.customer_id).filter(Boolean),
  ).size;
  const principalValue = loans.reduce((total, loan) => {
    const amount = Number(loan.principal_amount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

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
            {
              label: completionPage
                ? 'Completion Records'
                : 'Eligible for Release',
              value: loans.length,
              icon: CheckCircle2,
            },
            { label: 'Awaiting Handover', value: awaitingCount, icon: Clock3 },
            { label: 'Customers', value: customerCount, icon: Users },
            {
              label: 'Principal Value',
              value: currency(principalValue),
              icon: IndianRupee,
            },
          ].map(({ label, value, icon: Icon }, index) => (
            <LoanStatCard
              key={label}
              id={label}
              label={label}
              value={loading ? '—' : value}
              icon={Icon}
              trend={
                label === 'Awaiting Handover'
                  ? 'Physical handover'
                  : label === 'Customers'
                  ? 'Eligible customers'
                  : label === 'Principal Value'
                  ? 'Loan amount'
                  : completionPage
                  ? 'Released or completed'
                  : 'Ready for release'
              }
              paletteIndex={index}
            />
          ))}
        </View>

        <LoanListFilters
          search={search}
          onSearchChange={setSearch}
          searchAccessibilityLabel="Search gold release records"
          searchPlaceholder="Search loan, customer, mobile, pledge..."
          onDateRangeChange={setDateRange}
          statusLabel="Release Status"
          statusValue={statusFilter}
          statusOptions={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Awaiting Gold Release', label: 'Awaiting Gold Release' },
            ...(completionPage
              ? [{ value: 'Completed', label: 'Completed' }]
              : []),
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
          <AdminLoadingSkeleton variant="list" />
        ) : filteredLoans.length ? (
          filteredLoans.map(loan => {
            const completed = isCompleted(loan);
            return (
              <Pressable
                key={String(loan.id)}
                accessibilityRole="button"
                onPress={() => setSelectedLoan(loan)}
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
                    <Text className="mt-0.5 text-xs text-[#6B7E76]">
                      {loan.customer_code || 'ID unavailable'} ·{' '}
                      {loan.customer_mobile || 'No mobile'}
                    </Text>
                  </View>
                  <View
                    className={`rounded-full px-2.5 py-1.5 ${
                      completed ? 'bg-[#EFF9F5]' : 'bg-[#FFF8E7]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        completed ? 'text-[#07564B]' : 'text-[#8A5A00]'
                      }`}
                    >
                      {completed ? 'Completed' : 'Awaiting Release'}
                    </Text>
                  </View>
                </View>
                <View className="mt-4 flex-row border-t border-[#F1F2EE] pt-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                      PLEDGE NUMBER
                    </Text>
                    <Text className="mt-1 text-xs font-bold text-[#173F35]">
                      {loan.gold_pledge_number || '—'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                      OUTSTANDING
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
                <View className="mt-3 flex-row justify-end border-t border-[#F1F2EE] pt-3">
                  <View className="min-h-10 flex-row items-center rounded-xl bg-[#07564B] px-3 py-2">
                    <Text className="mr-2 text-xs font-extrabold text-white">
                      {completed
                        ? 'View Completion Record'
                        : completionPage
                        ? 'Complete Loan'
                        : 'Prepare Release'}
                    </Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
            <CheckCircle2 size={26} color="#A77B15" />
            <Text className="mt-3 text-center text-sm font-bold text-[#173F35]">
              {loans.length
                ? 'No loans match your filters.'
                : completionPage
                ? 'No fully paid or completed loans are available.'
                : 'No fully paid loans are awaiting gold release.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedLoan ? (
        <GoldReleaseFlow
          loan={selectedLoan}
          completionPage={completionPage}
          onClose={() => setSelectedLoan(null)}
          onReleased={updatedLoan =>
            setLoans(current =>
              completionPage
                ? current.map(loan =>
                    loan.id === updatedLoan.id
                      ? { ...loan, ...updatedLoan }
                      : loan,
                  )
                : current.filter(loan => loan.id !== updatedLoan.id),
            )
          }
        />
      ) : null}
    </View>
  );
}
