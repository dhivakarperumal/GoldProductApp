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
  CalendarDays,
  Check,
  Coins,
  Eye,
  HandCoins,
  IndianRupee,
  Pencil,
  Percent,
  Printer,
  Trash2,
  Users,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import CompleteLoan from './CompleteLoan';
import GoldRelease from './GoldRelease';
import KycReview from './KycReview';
import LoanStatCard from './LoanStatCard';
import LoanListFilters from './LoanListFilters';
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

type DateRange = { startDate: string; endDate: string };

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
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeSection, setActiveSection] = useState<LoanSection>('all');
  const [actionLoanId, setActionLoanId] = useState<number | string | null>(null);

  const loadLoans = useCallback(async () => {
    setLoadError('');
    try {
      const response = await api.get('/loans', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
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
  }, [dateRange]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const visibleLoans = useMemo(() => {
    const search = query.trim().toLowerCase();
    return loans.filter(loan => {
      const matchesSearch =
        !search ||
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
        );
      const matchesStatus =
        statusFilter === 'All' ||
        displayLoanStatus(loan).toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [loans, query, statusFilter]);
  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(loans.map(displayLoanStatus))).sort(
      (left, right) => left.localeCompare(right),
    );
    if (statusFilter !== 'All' && !statuses.includes(statusFilter)) {
      statuses.push(statusFilter);
    }
    return [
      { value: 'All', label: 'All Statuses' },
      ...statuses.map(status => ({ value: status, label: status })),
    ];
  }, [loans, statusFilter]);

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
  const outstandingTotal = loans.reduce((total, loan) => {
    const amount = Number(
      loan.outstanding_principal ?? loan.principal_amount,
    );
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

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
      <View className="mx-4 my-2 rounded-full border border-[#F1D577] bg-[#FFF8E6] p-1 shadow-sm">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center"
        >
          {LOAN_SECTIONS.map((section, index) => {
            const selected = activeSection === section.value;
            return (
              <View
                key={section.value}
                className="flex-row items-center"
              >
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setActiveSection(section.value);
                    setShowCreateOptions(false);
                  }}
                  className={`mx-1 min-h-10 justify-center px-3.5 ${
                    selected
                      ? 'rounded-full bg-[#07564B]'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selected ? 'text-white' : 'text-[#52645F]'
                    }`}
                  >
                    {section.label}
                  </Text>
                </Pressable>
                {index < LOAN_SECTIONS.length - 1 ? (
                  <View className="mx-1 h-5 w-px bg-[#E8CD81]" />
                ) : null}
              </View>
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
            <View className="mb-4 flex-row flex-wrap gap-3">
              {[
                { label: 'Total Loans', value: loans.length, icon: HandCoins },
                { label: 'Active', value: activeCount, icon: Check },
                {
                  label: 'Completed',
                  value: completedCount,
                  icon: CalendarDays,
                },
                {
                  label: 'Outstanding Balance',
                  value: formatCurrency(outstandingTotal),
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
                    label === 'Total Loans'
                      ? 'Current portfolio'
                      : label === 'Active'
                      ? 'Active accounts'
                      : label === 'Completed'
                      ? 'Paid loans'
                      : 'Current balance'
                  }
                  paletteIndex={index}
                />
              ))}
            </View>

            <LoanListFilters
              search={query}
              onSearchChange={setQuery}
              searchAccessibilityLabel="Search loans"
              searchPlaceholder="Search loan or customer"
              onDateRangeChange={setDateRange}
              statusLabel="Loan Status"
              statusValue={statusFilter}
              statusOptions={statusOptions}
              onStatusChange={setStatusFilter}
            />

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
              <AdminLoadingSkeleton variant="list" />
            ) : visibleLoans.length > 0 ? (
              visibleLoans.map(loan => (
                <View
                  key={String(loan.id)}
                  className="mb-3 rounded-2xl border border-[#DDBB57] bg-white p-4 shadow-sm"
                >
                  <View className="flex-row items-start">
                    <View className="mr-3 mt-1 h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#E2B94F] bg-[#07564B] shadow-sm">
                      <HandCoins size={24} color="#FFE08A" strokeWidth={2.2} />
                    </View>
                    <View className="flex-1 pr-3">
                      <View className="self-start rounded-full border border-[#F2D98B] bg-[#FFF3C4] px-3 py-1">
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-[#8A5A00]">
                          {loan.loan_number || `Loan ${loan.id}`}
                        </Text>
                      </View>
                      <Text className="mt-1 text-base font-extrabold text-[#173F35]">
                        {loan.customer_name || 'Customer'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-[#6B7280]">
                        {loan.customer_code ||
                          loan.customer_mobile ||
                          'Customer details unavailable'}
                      </Text>
                    </View>
                    <View className="rounded-full border border-[#CFE6D5] bg-[#EFF9F5] px-2.5 py-1.5">
                      <Text className="text-[10px] font-bold text-[#07564B]">
                        {displayLoanStatus(loan)}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-4 flex-row border-t border-[#E8D596] pt-3">
                    <View className="min-w-0 flex-1 flex-row items-center border-r border-[#E8D596] pr-2">
                      <Coins size={19} color="#07564B" />
                      <View className="ml-1.5 min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          className="text-[9px] font-semibold text-[#8A8F8B]">
                          OUTSTANDING
                        </Text>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          className="mt-1 text-xs font-extrabold text-[#173F35]">
                          {formatCurrency(
                            loan.outstanding_principal ?? loan.principal_amount,
                          )}
                        </Text>
                      </View>
                    </View>
                    <View className="min-w-0 flex-1 flex-row items-center border-r border-[#E8D596] px-2">
                      <Percent size={19} color="#A77B15" />
                      <View className="ml-1.5 min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          className="text-[9px] font-semibold text-[#8A8F8B]">
                          INTEREST
                        </Text>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          className="mt-1 text-xs font-bold text-[#52645F]">
                          {loan.interest_rate ?? '—'}%
                        </Text>
                      </View>
                    </View>
                    <View className="min-w-0 flex-1 flex-row items-center pl-2">
                      <CalendarDays size={19} color="#A77B15" />
                      <View className="ml-1.5 min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          className="text-[9px] font-semibold text-[#8A8F8B]">
                          MATURITY
                        </Text>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          className="mt-1 text-[10px] font-bold text-[#52645F]">
                          {formatDate(loan.maturity_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {loan.jewellery_type || loan.gold_purity ? (
                    <Text className="mt-3 text-xs text-[#6B7280]">
                      {[loan.jewellery_type, loan.gold_purity]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row justify-end gap-2 border-t border-[#E9E2CC] pt-3">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View loan ${loan.loan_number || loan.id}`}
                      onPress={() => onViewLoan(loan.id)}
                      className="h-10 w-10 items-center justify-center rounded-xl border border-[#D6E8DE] bg-[#EAF3EF]">
                      <Eye size={20} color="#07564B" />
                    </Pressable>
                    {Number(loan.outstanding_principal ?? loan.principal_amount) > 0 &&
                    loan.loan_status?.toLowerCase() !== 'completed' &&
                    loan.release_status !== 'Released' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit loan ${loan.loan_number || loan.id}`}
                        onPress={() => onEditLoan(loan.id)}
                        className="h-10 w-10 items-center justify-center rounded-xl border border-[#CFE0F5] bg-[#EFF6FF]">
                        <Pencil size={20} color="#1D4ED8" />
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Print loan agreement PDF ${loan.loan_number || loan.id}`}
                      disabled={actionLoanId !== null}
                      onPress={() => handlePrintLoan(loan)}
                      className="h-10 w-10 items-center justify-center rounded-xl border border-[#F2D98B] bg-[#FFF8E7] disabled:opacity-50">
                      {actionLoanId === loan.id ? (
                        <ActivityIndicator size="small" color="#8A5A00" />
                      ) : (
                        <Printer size={20} color="#8A5A00" />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete loan ${loan.loan_number || loan.id}`}
                      disabled={actionLoanId !== null}
                      onPress={() => confirmDeleteLoan(loan)}
                      className="h-10 w-10 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] disabled:opacity-50">
                      <Trash2 size={20} color="#B42332" />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
                <HandCoins size={28} color="#A77B15" />
                <Text className="mt-3 text-sm font-bold text-[#173F35]">
                  {query.trim() ||
                  statusFilter !== 'All' ||
                  dateRange.startDate ||
                  dateRange.endDate
                    ? 'No loans match your filters.'
                    : 'No loans created yet.'}
                </Text>
                <Text className="mt-1 text-center text-xs text-[#6B7280]">
                  Use the + button to create a loan or add a customer.
                </Text>
              </View>
            )}
          </ScrollView>

          {showCreateOptions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close create options"
              onPress={() => setShowCreateOptions(false)}
              className="absolute inset-0 bg-black/20"
            />
          ) : null}
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
