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
import { CalendarDays, Check, HandCoins, Users } from 'lucide-react-native';
import api from '../../api';
import CompleteLoan from './CompleteLoan';
import GoldRelease from './GoldRelease';
import KycReview from './KycReview';
import LoanRenewal from './LoanRenewal';
import OverdueLoans from './OverdueLoans';

type LoanSection =
  | 'all'
  | 'kyc'
  | 'overdue'
  | 'renewal'
  | 'goldRelease'
  | 'complete';

const LOAN_SECTIONS: { value: LoanSection; label: string }[] = [
  { value: 'all', label: 'All Loans' },
  { value: 'kyc', label: 'KYC Review' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'goldRelease', label: 'Gold Release' },
  { value: 'complete', label: 'Complete Loan' },
];

type Loan = {
  id: number | string;
  loan_number?: string;
  customer_name?: string;
  customer_code?: string;
  customer_mobile?: string;
  principal_amount?: string | number;
  outstanding_principal?: string | number;
  interest_rate?: string | number;
  maturity_date?: string;
  loan_status?: string;
  release_status?: string;
  jewellery_type?: string;
  gold_purity?: string;
};

type LoansProps = {
  onCreateLoan: () => void;
  onCreateCustomer: () => void;
};

function formatCurrency(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

export default function Loans({ onCreateLoan, onCreateCustomer }: LoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeSection, setActiveSection] = useState<LoanSection>('all');

  const loadLoans = useCallback(async () => {
    setLoadError('');
    try {
      const response = await api.get('/loans');
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid loan list.');
      }
      setLoans(response.data as Loan[]);
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Could not load loans.';
      setLoadError(message);
      if (__DEV__) console.warn('[Loans] Could not load loans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const visibleLoans = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return loans;
    return loans.filter(loan =>
      [
        loan.loan_number,
        loan.customer_name,
        loan.customer_code,
        loan.customer_mobile,
        loan.loan_status,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(search),
      ),
    );
  }, [loans, query]);

  const activeCount = loans.filter(
    loan => String(loan.loan_status || '').toLowerCase() === 'active',
  ).length;
  const completedCount = loans.filter(
    loan =>
      loan.release_status === 'Released' ||
      String(loan.loan_status || '').toLowerCase() === 'completed',
  ).length;

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <View className="border-b border-[#E6E9E3] bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-3"
        >
          {LOAN_SECTIONS.map(section => {
            const selected = activeSection === section.value;
            return (
              <Pressable
                key={section.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setActiveSection(section.value);
                  setShowCreateOptions(false);
                }}
                className={`mr-1 min-h-12 justify-center border-b-[3px] px-3 ${
                  selected ? 'border-[#07564B]' : 'border-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selected ? 'text-[#07564B]' : 'text-[#718078]'
                  }`}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeSection === 'all' ? (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-28 pt-5"
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
            <View className="mb-4 rounded-3xl bg-[#173F35] p-5">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
                Shop Administration
              </Text>
              <Text className="mt-1 text-2xl font-extrabold text-white">
                All Loans
              </Text>
              <Text className="mt-2 text-sm text-[#DCE8E4]">
                Manage customer gold loans and balances.
              </Text>
            </View>

            <View className="mb-4 flex-row gap-3">
              {[
                { label: 'Total Loans', value: loans.length, icon: HandCoins },
                { label: 'Active', value: activeCount, icon: Check },
                {
                  label: 'Completed',
                  value: completedCount,
                  icon: CalendarDays,
                },
              ].map(({ label, value, icon: Icon }) => (
                <View
                  key={label}
                  className="min-h-[88px] flex-1 rounded-2xl border border-[#ECE7D8] bg-white p-3"
                >
                  <Icon size={17} color="#A77B15" />
                  <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">
                    {label}
                  </Text>
                  <Text className="mt-0.5 text-lg font-extrabold text-[#173F35]">
                    {loading ? '—' : value}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mb-4 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
              <Text className="text-lg text-[#8A9690]">⌕</Text>
              <TextInput
                accessibilityLabel="Search loans"
                value={query}
                onChangeText={setQuery}
                placeholder="Search loan or customer"
                placeholderTextColor="#9AA6A1"
                className="min-h-12 flex-1 px-2 text-sm text-[#173F35]"
              />
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery('')}
                >
                  <Text className="px-2 text-lg text-[#6B7280]">×</Text>
                </Pressable>
              ) : null}
            </View>

            {loadError ? (
              <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                <Text className="text-sm text-[#991B1B]">{loadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={loadLoans}
                  className="mt-2 self-start"
                >
                  <Text className="text-sm font-bold text-[#991B1B]">
                    Retry
                  </Text>
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
            ) : visibleLoans.length > 0 ? (
              visibleLoans.map(loan => (
                <View
                  key={String(loan.id)}
                  className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs font-bold uppercase tracking-wide text-[#A77B15]">
                        {loan.loan_number || `Loan ${loan.id}`}
                      </Text>
                      <Text className="mt-1 text-base font-extrabold text-[#173F35]">
                        {loan.customer_name || 'Customer'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-[#6B7280]">
                        {loan.customer_code ||
                          loan.customer_mobile ||
                          'Customer details unavailable'}
                      </Text>
                    </View>
                    <View className="rounded-full bg-[#EFF9F5] px-2.5 py-1.5">
                      <Text className="text-[10px] font-bold text-[#07564B]">
                        {loan.release_status === 'Released'
                          ? 'Completed'
                          : loan.loan_status || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-4 flex-row border-t border-[#F1F2EE] pt-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                        OUTSTANDING
                      </Text>
                      <Text className="mt-1 text-sm font-extrabold text-[#173F35]">
                        {formatCurrency(
                          loan.outstanding_principal ?? loan.principal_amount,
                        )}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                        INTEREST
                      </Text>
                      <Text className="mt-1 text-sm font-bold text-[#52645F]">
                        {loan.interest_rate ?? '—'}%
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-[#8A8F8B]">
                        MATURITY
                      </Text>
                      <Text className="mt-1 text-xs font-bold text-[#52645F]">
                        {formatDate(loan.maturity_date)}
                      </Text>
                    </View>
                  </View>
                  {loan.jewellery_type || loan.gold_purity ? (
                    <Text className="mt-3 text-xs text-[#6B7280]">
                      {[loan.jewellery_type, loan.gold_purity]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
                <HandCoins size={28} color="#A77B15" />
                <Text className="mt-3 text-sm font-bold text-[#173F35]">
                  {loans.length
                    ? 'No loans match your search.'
                    : 'No loans created yet.'}
                </Text>
                <Text className="mt-1 text-center text-xs text-[#6B7280]">
                  Use the + button to create a loan or add a customer.
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="absolute bottom-5 right-4 items-end">
            {showCreateOptions ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create a loan"
                  onPress={() => {
                    setShowCreateOptions(false);
                    onCreateLoan();
                  }}
                  className="mb-3 min-h-12 flex-row items-center rounded-full bg-white px-5 shadow-lg"
                >
                  <HandCoins size={17} color="#07564B" />
                  <Text className="ml-2 text-sm font-extrabold text-[#173F35]">
                    Create Loan
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create a customer"
                  onPress={() => {
                    setShowCreateOptions(false);
                    onCreateCustomer();
                  }}
                  className="mb-3 min-h-12 flex-row items-center rounded-full bg-white px-5 shadow-lg"
                >
                  <Users size={17} color="#07564B" />
                  <Text className="ml-2 text-sm font-extrabold text-[#173F35]">
                    Create Customer
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close create options"
                  onPress={() => setShowCreateOptions(false)}
                  className="h-14 w-14 items-center justify-center rounded-full bg-[#B8860B] shadow-lg"
                >
                  <Text className="text-2xl font-bold text-white">×</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create loan or customer"
                accessibilityState={{ expanded: showCreateOptions }}
                onPress={() => setShowCreateOptions(true)}
                className="h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg"
              >
                <Text className="text-3xl font-light text-white">+</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : activeSection === 'overdue' ? (
        <OverdueLoans />
      ) : activeSection === 'renewal' ? (
        <LoanRenewal />
      ) : activeSection === 'kyc' ? (
        <KycReview />
      ) : activeSection === 'goldRelease' ? (
        <GoldRelease />
      ) : (
        <CompleteLoan />
      )}
    </View>
  );
}
