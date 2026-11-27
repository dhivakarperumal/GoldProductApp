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
  CalendarDays,
  Check,
  Eye,
  HandCoins,
  Pencil,
  Printer,
  Trash2,
  Users,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import CompleteLoan from './CompleteLoan';
import GoldRelease from './GoldRelease';
import KycReview from './KycReview';
import LoanStatCard from './LoanStatCard';
import LoanRenewal from './LoanRenewal';
import { printLoanAgreement } from './loanActions';
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
  onViewLoan: (loanId: number | string) => void;
  onEditLoan: (loanId: number | string) => void;
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

function displayLoanStatus(loan: Loan) {
      if (loan.release_status === 'Released') return 'Completed';
      if (
        loan.release_status === 'Pending Release' &&
        Number(loan.outstanding_principal ?? loan.principal_amount) === 0
      ) {
        return 'Awaiting Gold Release';
      }
      return loan.loan_status || 'Unknown';
}

function actionErrorMessage(error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
      ) {
        return error.response.data.message;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        return error.message;
      }
      return 'Please try again.';
}

export default function Loans({
      onCreateLoan,
      onCreateCustomer,
      onViewLoan,
      onEditLoan,
}: LoansProps) {
      const { showAlert } = useCustomAlert();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeSection, setActiveSection] = useState<LoanSection>('all');
  const [actionLoanId, setActionLoanId] = useState<number | string | null>(null);

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
    loan =>
      String(loan.loan_status || '').toLowerCase() === 'active' &&
      !(
        loan.release_status === 'Pending Release' &&
        Number(loan.outstanding_principal ?? loan.principal_amount) === 0
      ),
  ).length;
  const completedCount = loans.filter(
    loan =>
      loan.release_status === 'Released' ||
      String(loan.loan_status || '').toLowerCase() === 'completed',
  ).length;

  const deleteLoan = async (loan: Loan) => {
    setActionLoanId(loan.id);
    try {
      await api.delete(`/loans/${loan.id}`);
      setLoans(currentLoans =>
        currentLoans.filter(item => String(item.id) !== String(loan.id)),
      );
      showAlert('Loan deleted', `Loan ${loan.loan_number || loan.id} was deleted.`, {
        variant: 'success',
      });
    } catch (error) {
      showAlert('Could not delete loan', actionErrorMessage(error), {
        variant: 'error',
      });
    } finally {
      setActionLoanId(null);
    }
  };

  const confirmDeleteLoan = (loan: Loan) => {
    if (actionLoanId !== null) return;
    showAlert(
      'Delete this loan?',
      `Permanently delete loan ${loan.loan_number || loan.id}? This action cannot be undone.`,
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteLoan(loan);
            },
          },
        ],
      },
    );
  };

  const handlePrintLoan = async (loan: Loan) => {
    setActionLoanId(loan.id);
    try {
      await printLoanAgreement(loan.id);
    } catch (error) {
      showAlert('Could not prepare loan agreement', actionErrorMessage(error), {
        variant: 'error',
      });
    } finally {
      setActionLoanId(null);
    }
  };

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
                <LoanStatCard
                  key={label}
                  label={label}
                  value={loading ? '—' : value}
                  icon={Icon}
                />
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
                        {displayLoanStatus(loan)}
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
                  <View className="mt-4 flex-row flex-wrap gap-2 border-t border-[#F1F2EE] pt-3">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View loan ${loan.loan_number || loan.id}`}
                      onPress={() => onViewLoan(loan.id)}
                      className="min-h-10 flex-1 flex-row items-center justify-center rounded-lg bg-[#EAF3EF] px-3">
                      <Eye size={15} color="#07564B" />
                      <Text className="ml-1.5 text-xs font-bold text-[#07564B]">View</Text>
                    </Pressable>
                    {Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
                    loan.loan_status?.toLowerCase() !== 'completed' &&
                    loan.release_status !== 'Released' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit loan ${loan.loan_number || loan.id}`}
                        onPress={() => onEditLoan(loan.id)}
                        className="min-h-10 flex-1 flex-row items-center justify-center rounded-lg bg-[#EFF6FF] px-3">
                        <Pencil size={15} color="#1D4ED8" />
                        <Text className="ml-1.5 text-xs font-bold text-[#1D4ED8]">Edit</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Print loan agreement PDF ${loan.loan_number || loan.id}`}
                      disabled={actionLoanId !== null}
                      onPress={() => handlePrintLoan(loan)}
                      className="min-h-10 flex-1 flex-row items-center justify-center rounded-lg bg-[#FFF8E7] px-3 disabled:opacity-50">
                      {actionLoanId === loan.id ? (
                        <ActivityIndicator size="small" color="#8A5A00" />
                      ) : (
                        <Printer size={15} color="#8A5A00" />
                      )}
                      <Text className="ml-1.5 text-xs font-bold text-[#8A5A00]">Print PDF</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete loan ${loan.loan_number || loan.id}`}
                      disabled={actionLoanId !== null}
                      onPress={() => confirmDeleteLoan(loan)}
                      className="min-h-10 flex-row items-center justify-center rounded-lg bg-[#FEF2F2] px-3 disabled:opacity-50">
                      <Trash2 size={15} color="#B42332" />
                      <Text className="ml-1.5 text-xs font-bold text-[#B42332]">Delete</Text>
                    </Pressable>
                  </View>
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
