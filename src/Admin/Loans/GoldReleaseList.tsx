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
import { CheckCircle2, Clock3, Users } from 'lucide-react-native';
import api from '../../api';
import { CustomDropdown, errorMessage } from './FormControls';
import GoldReleaseFlow from './GoldReleaseFlow';
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
  }, [completionPage]);

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
                  : completionPage
                  ? 'Released or completed'
                  : 'Ready for release'
              }
              paletteIndex={index}
            />
          ))}
        </View>

        <View className="mb-3 rounded-xl border border-[#E6E9E3] bg-white px-3">
          <TextInput
            accessibilityLabel="Search gold release records"
            value={search}
            onChangeText={setSearch}
            placeholder="Search loan, customer, mobile, pledge..."
            placeholderTextColor="#9AA6A1"
            className="min-h-12 text-sm text-[#173F35]"
          />
        </View>
        <CustomDropdown
          label="Release Status"
          value={statusFilter}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Awaiting Gold Release', label: 'Awaiting Gold Release' },
            ...(completionPage
              ? [{ value: 'Completed', label: 'Completed' }]
              : []),
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
              Loading loans...
            </Text>
          </View>
        ) : filteredLoans.length ? (
          filteredLoans.map(loan => {
            const completed = isCompleted(loan);
            return (
              <Pressable
                key={String(loan.id)}
                accessibilityRole="button"
                onPress={() => setSelectedLoan(loan)}
                className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
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
                  <Text className="text-xs font-extrabold text-[#07564B]">
                    {completed
                      ? 'View Completion Record ›'
                      : completionPage
                      ? 'Complete Loan ›'
                      : 'Prepare Release ›'}
                  </Text>
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
