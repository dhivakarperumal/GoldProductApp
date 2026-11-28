import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Pencil,
  Plus,
  Search,
  Store,
  Wallet,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import { CustomDropdown, DatePicker, Field } from '../Loans/FormControls';
import { currency, inventoryError } from '../Products/inventory';

type Props = { onBack: () => void };
type Category = { id: number | string; name: string; active?: boolean };
type Address = {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
};
type Dealer = {
  id: number | string;
  dealer_code?: string;
  name: string;
  contact_person?: string;
  email?: string | null;
  phone?: string;
  alternate_phone?: string | null;
  category_id?: number | string;
  category_name?: string;
  gstin?: string | null;
  pan?: string | null;
  billing_address?: Address | null;
  shipping_address?: Address | null;
  bank_details?: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    ifsc?: string;
  } | null;
  payable_balance?: number | string;
  receivable_balance?: number | string;
  status: string;
  credit_limit?: number | string;
  payment_terms_days?: number | string;
  notes?: string;
};
type DealerForm = {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  alternate_phone: string;
  category_id: string;
  gstin: string;
  pan: string;
  billing_address_line1: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  opening_balance: string;
  opening_balance_side: string;
  opening_metal_weight: string;
  opening_metal_type: string;
  opening_metal_purity: string;
  credit_limit: string;
  payment_terms_days: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  status: string;
  notes: string;
};
type DealerSummary = {
  dealers?: { active?: number | string };
  payables?: number | string;
  receivables?: number | string;
  purchases_this_month?: number | string;
  overdue?: { count?: number; amount?: number | string };
  pending_jobs?: number | string;
};
type PageInfo = { total: number; totalPages: number };
type StatementRow = {
  id: number | string;
  created_at: string;
  entry_number?: string;
  description?: string;
  payable_delta?: number | string;
  receivable_delta?: number | string;
  payable_balance?: number | string;
  metal_type?: string;
  purity?: string;
  movement?: string;
  weight_delta?: number | string;
  fine_gold_delta?: number | string;
  reconciliation_status?: string;
  closing_weight?: number | string;
};
type Statement = {
  financial: StatementRow[];
  metal: StatementRow[];
  generated_at?: string;
};
type DealerProfile = Dealer & {
  documents?: Array<{
    id: number | string;
    document_type: string;
    original_name: string;
    created_at: string;
  }>;
  audit?: Array<{
    id: number | string;
    action: string;
    actor?: string;
    created_at: string;
    reason?: string;
  }>;
};

const PURITIES = ['999', '916', '833', '750', '585'];
const PAGE_SIZE = 25;

function emptyForm(categoryId = ''): DealerForm {
  return {
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    alternate_phone: '',
    category_id: categoryId,
    gstin: '',
    pan: '',
    billing_address_line1: '',
    billing_city: '',
    billing_state: '',
    billing_pincode: '',
    shipping_address_line1: '',
    shipping_city: '',
    shipping_state: '',
    shipping_pincode: '',
    opening_balance: '0',
    opening_balance_side: 'payable',
    opening_metal_weight: '',
    opening_metal_type: 'Gold',
    opening_metal_purity: '916',
    credit_limit: '0',
    payment_terms_days: '0',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    status: 'Active',
    notes: '',
  };
}

function addressField(
  address: Address | null | undefined,
  field: keyof Address,
) {
  return typeof address?.[field] === 'string' ? (address[field] as string) : '';
}

function formFromDealer(dealer: Dealer, categories: Category[]): DealerForm {
  return {
    ...emptyForm(String(dealer.category_id || categories[0]?.id || '')),
    ...dealer,
    name: dealer.name || '',
    contact_person: dealer.contact_person || '',
    email: dealer.email || '',
    phone: dealer.phone || '',
    alternate_phone: dealer.alternate_phone || '',
    category_id: String(dealer.category_id || ''),
    gstin: dealer.gstin || '',
    pan: dealer.pan || '',
    billing_address_line1: addressField(dealer.billing_address, 'line1'),
    billing_city: addressField(dealer.billing_address, 'city'),
    billing_state: addressField(dealer.billing_address, 'state'),
    billing_pincode: addressField(dealer.billing_address, 'pincode'),
    shipping_address_line1: addressField(dealer.shipping_address, 'line1'),
    shipping_city: addressField(dealer.shipping_address, 'city'),
    shipping_state: addressField(dealer.shipping_address, 'state'),
    shipping_pincode: addressField(dealer.shipping_address, 'pincode'),
    credit_limit: String(dealer.credit_limit ?? 0),
    payment_terms_days: String(dealer.payment_terms_days ?? 0),
    bank_name: dealer.bank_details?.bank_name || '',
    bank_account_name: dealer.bank_details?.account_name || '',
    bank_account_number: dealer.bank_details?.account_number || '',
    bank_ifsc: dealer.bank_details?.ifsc || '',
    status: dealer.status || 'Active',
    notes: dealer.notes || '',
  };
}

function displayDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
}

export default function Dealers({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<DealerSummary | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DealerForm>(emptyForm());
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [statementDealer, setStatementDealer] = useState<Dealer | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        status: statusFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      const [categoriesResponse, summaryResponse, dealersResponse] =
        await Promise.all([
          api.get<Category[]>('/dealers/categories'),
          api.get<DealerSummary>('/dealers/summary'),
          api.get<{ dealers?: Dealer[]; pagination?: PageInfo }>('/dealers', {
            params,
          }),
        ]);
      if (
        !Array.isArray(categoriesResponse.data) ||
        !Array.isArray(dealersResponse.data.dealers)
      ) {
        throw new Error('The server returned invalid dealer data.');
      }
      setCategories(categoriesResponse.data);
      setSummary(summaryResponse.data);
      setDealers(dealersResponse.data.dealers);
      setPageInfo(
        dealersResponse.data.pagination || { total: 0, totalPages: 1 },
      );
    } catch (error) {
      setLoadError(inventoryError(error));
      if (__DEV__)
        console.warn('[Dealers] Could not load dealer management data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const activeCategories = useMemo(
    () => categories.filter(category => category.active !== false),
    [categories],
  );

  const startDealerEdit = (dealer: Dealer | null = null) => {
    setEditingDealer(dealer);
    setForm(
      dealer
        ? formFromDealer(dealer, categories)
        : emptyForm(String(activeCategories[0]?.id || '')),
    );
    setFormOpen(true);
  };

  const setField = (key: keyof DealerForm, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const saveDealer = async () => {
    if (
      !form.name.trim() ||
      !form.contact_person.trim() ||
      !form.phone.trim() ||
      !form.category_id
    ) {
      showAlert(
        'Required details missing',
        'Enter the dealer name, category, contact person, and phone number.',
        { variant: 'warning' },
      );
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      category_id: Number(form.category_id),
      billing_address: {
        line1: form.billing_address_line1,
        city: form.billing_city,
        state: form.billing_state,
        pincode: form.billing_pincode,
      },
      shipping_address: {
        line1: form.shipping_address_line1,
        city: form.shipping_city,
        state: form.shipping_state,
        pincode: form.shipping_pincode,
      },
      bank_details: {
        bank_name: form.bank_name,
        account_name: form.bank_account_name,
        account_number: form.bank_account_number,
        ifsc: form.bank_ifsc,
      },
      opening_metal_balances:
        !editingDealer && form.opening_metal_weight
          ? [
              {
                metal_type: form.opening_metal_type,
                purity: form.opening_metal_purity,
                weight: Number(form.opening_metal_weight),
              },
            ]
          : [],
    };
    try {
      if (editingDealer) {
        await api.put(`/dealers/${editingDealer.id}`, payload);
      } else {
        await api.post('/dealers', payload);
      }
      setFormOpen(false);
      showAlert(
        editingDealer ? 'Dealer updated' : 'Dealer registered',
        editingDealer
          ? 'The dealer profile has been updated.'
          : 'The dealer and opening balances have been recorded.',
        { variant: 'success' },
      );
      await loadData();
    } catch (error) {
      showAlert('Could not save dealer', inventoryError(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const openDealerProfile = async (dealer: Dealer) => {
    setProfileLoading(true);
    setProfile(null);
    try {
      const [detail, documents, audit] = await Promise.all([
        api.get<Dealer>(`/dealers/${dealer.id}`),
        api.get<DealerProfile['documents']>(`/dealers/${dealer.id}/documents`),
        api.get<DealerProfile['audit']>(`/dealers/${dealer.id}/audit`),
      ]);
      if (!Array.isArray(documents.data) || !Array.isArray(audit.data)) {
        throw new Error('The server returned invalid dealer profile history.');
      }
      setProfile({
        ...detail.data,
        documents: documents.data,
        audit: audit.data,
      });
    } catch (error) {
      showAlert('Could not load dealer profile', inventoryError(error), {
        variant: 'error',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const openStatement = async (dealer: Dealer) => {
    setStatementLoading(true);
    setStatementDealer(dealer);
    setStatement(null);
    try {
      const response = await api.get<Statement>(
        `/dealers/${dealer.id}/statement`,
      );
      if (
        !Array.isArray(response.data.financial) ||
        !Array.isArray(response.data.metal)
      ) {
        throw new Error('The server returned an invalid dealer statement.');
      }
      setStatement(response.data);
    } catch (error) {
      setStatementDealer(null);
      showAlert('Could not load dealer statement', inventoryError(error), {
        variant: 'error',
      });
    } finally {
      setStatementLoading(false);
    }
  };

  const applyDateRange = () => {
    if (
      (rangeStart && !rangeEnd) ||
      (!rangeStart && rangeEnd) ||
      (rangeStart && rangeEnd && rangeStart > rangeEnd)
    ) {
      showAlert('Invalid date range', 'Choose a valid start and end date.', {
        variant: 'warning',
      });
      return;
    }
    setPage(1);
    setDateRange({ startDate: rangeStart, endDate: rangeEnd });
  };

  const summaryCards = [
    {
      id: 'dealers-active',
      label: 'Active dealers',
      value: summary?.dealers?.active ?? '—',
      note: 'Currently active',
      icon: Store,
      palette: 'total_customers' as const,
    },
    {
      id: 'dealers-payables',
      label: 'Supplier payables',
      value: summary ? currency(summary.payables) : '—',
      note: 'Outstanding balance',
      icon: Wallet,
      palette: 'active_gold_loans' as const,
    },
    {
      id: 'dealers-receivables',
      label: 'Dealer receivables',
      value: summary ? currency(summary.receivables) : '—',
      note: 'Amount to receive',
      icon: ArrowRightLeft,
      palette: 'gold_stock_value' as const,
    },
    {
      id: 'dealers-purchases',
      label: 'Purchases this month',
      value: summary ? currency(summary.purchases_this_month) : '—',
      note: 'Monthly total',
      icon: Coins,
      palette: 'total_products' as const,
    },
    {
      id: 'dealers-overdue',
      label: 'Overdue invoices',
      value: summary
        ? `${summary.overdue?.count || 0} · ${currency(
            summary.overdue?.amount,
          )}`
        : '—',
      note: 'Invoices past due',
      icon: AlertTriangle,
      palette: 'low_stock_products' as const,
      trendUp: false,
    },
    {
      id: 'dealers-jobs',
      label: 'Open job orders',
      value: summary?.pending_jobs ?? '—',
      note: 'Awaiting completion',
      icon: ClipboardList,
      palette: 'total_categories' as const,
    },
  ];

  const closeProfile = () => setProfile(null);
  const closeStatement = () => {
    setStatement(null);
    setStatementDealer(null);
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title="Dealer Management"
        sectionLabel="More · Dealers"
        onBack={onBack}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-28"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#07564B"
          />
        }
      >
        <DashboardMetricGrid
          metrics={summaryCards.map(
            ({ id, label, value, note, icon, palette, trendUp }) => ({
              id,
              label,
              value: String(value),
              icon,
              palette,
              trend: note,
              trendUp,
            }),
          )}
        />

        <View className="mb-3 flex-row items-center rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm">
          <Search size={18} color="#A77B15" />
          <TextInput
            accessibilityLabel="Search dealers"
            value={search}
            onChangeText={value => {
              setPage(1);
              setSearch(value.slice(0, 100));
            }}
            placeholder="Search by name, ID, contact, or GSTIN"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setPage(1);
                setSearch('');
              }}
              hitSlop={8}
            >
              <X size={18} color="#6B7E76" />
            </Pressable>
          ) : null}
        </View>
        <CustomDropdown
          label="Dealer status"
          value={statusFilter}
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'On Hold', label: 'On Hold' },
          ]}
          onSelect={value => {
            setPage(1);
            setStatusFilter(value);
          }}
        />
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
          Created date range
        </Text>
        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <DatePicker
              label="From"
              value={rangeStart}
              onChange={setRangeStart}
              maximumDate={null}
            />
          </View>
          <View className="min-w-0 flex-1">
            <DatePicker
              label="To"
              value={rangeEnd}
              onChange={setRangeEnd}
              maximumDate={null}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={applyDateRange}
          className="mb-4 min-h-11 items-center justify-center rounded-xl bg-[#07564B]"
        >
          <Text className="text-sm font-bold text-white">
            {dateRange.startDate || dateRange.endDate
              ? 'Apply date range'
              : 'Apply date filter'}
          </Text>
        </Pressable>

        {loadError ? (
          <View className="mb-3 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm text-[#B42332]">{loadError}</Text>
            <Pressable onPress={loadData} className="mt-2 self-start">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {loading && dealers.length === 0 ? (
          <AdminLoadingSkeleton variant="list" />
        ) : dealers.length ? (
          dealers.map(dealer => (
            <View
              key={String(dealer.id)}
              className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4"
            >
              <View className="flex-row items-start justify-between gap-2">
                <Pressable
                  onPress={() => openDealerProfile(dealer)}
                  className="flex-1"
                >
                  <Text className="font-extrabold text-[#07564B]">
                    {dealer.name}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">
                    {dealer.dealer_code || 'Dealer'} ·{' '}
                    {dealer.category_name || 'Uncategorized'}
                  </Text>
                </Pressable>
                <Text
                  className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${
                    dealer.status === 'Active'
                      ? 'bg-[#EAF3EF] text-[#07564B]'
                      : 'bg-[#F3F4F1] text-[#6B7E76]'
                  }`}
                >
                  {dealer.status}
                </Text>
              </View>
              <View className="mt-3 border-t border-[#F1F2EE] pt-3">
                <Text className="text-sm text-[#52645F]">
                  {dealer.contact_person || 'Contact unavailable'} ·{' '}
                  {dealer.phone || 'No phone'}
                </Text>
                <Text className="mt-1 text-xs text-[#6B7E76]">
                  GSTIN: {dealer.gstin || 'Not recorded'}
                </Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                <View className="flex-1 rounded-xl bg-[#F8F7F2] p-3">
                  <Text className="text-[10px] font-bold uppercase text-[#6B7E76]">
                    Payable
                  </Text>
                  <Text className="mt-1 font-extrabold text-[#173F35]">
                    {currency(dealer.payable_balance)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-[#F8F7F2] p-3">
                  <Text className="text-[10px] font-bold uppercase text-[#6B7E76]">
                    Receivable
                  </Text>
                  <Text className="mt-1 font-extrabold text-[#173F35]">
                    {currency(dealer.receivable_balance)}
                  </Text>
                </View>
              </View>
              <View className="mt-3 flex-row justify-end gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openStatement(dealer)}
                  className="rounded-lg border border-[#E6E9E3] px-3 py-2"
                >
                  <Text className="text-xs font-bold text-[#52645F]">
                    Statement
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => startDealerEdit(dealer)}
                  className="flex-row items-center gap-1 rounded-lg bg-[#07564B] px-3 py-2"
                >
                  <Pencil size={14} color="white" />
                  <Text className="text-xs font-bold text-white">Edit</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : !loadError ? (
          <View className="items-center rounded-2xl bg-white p-8">
            <Text className="font-bold text-[#173F35]">
              No dealer records found
            </Text>
            <Text className="mt-1 text-sm text-[#6B7E76]">
              Try changing the filters or register a dealer.
            </Text>
          </View>
        ) : null}

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-[#6B7E76]">
            {pageInfo.total} dealer records · Page {page} of{' '}
            {pageInfo.totalPages}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="Previous dealer page"
              disabled={page <= 1}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40"
            >
              <ChevronLeft size={18} color="#07564B" />
            </Pressable>
            <Pressable
              accessibilityLabel="Next dealer page"
              disabled={page >= pageInfo.totalPages}
              onPress={() =>
                setPage(current => Math.min(pageInfo.totalPages, current + 1))
              }
              className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40"
            >
              <ChevronRight size={18} color="#07564B" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Register dealer"
        onPress={() => startDealerEdit()}
        className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg"
      >
        <Plus size={24} color="white" />
      </Pressable>

      <Modal
        visible={formOpen}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setFormOpen(false);
        }}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-[#F8F7F2]"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{ paddingTop: insets.top + 10 }}
            className="flex-row items-center justify-between bg-[#173F35] px-5 pb-4"
          >
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">
                Dealer Management
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-white">
                {editingDealer ? 'Update Dealer Profile' : 'Register Dealer'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close dealer form"
              disabled={saving}
              onPress={() => setFormOpen(false)}
            >
              <X size={22} color="#EAD78A" />
            </Pressable>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerClassName="p-4 pb-4"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <View className="rounded-2xl bg-white p-4">
              <Text className="mb-1 text-base font-extrabold text-[#173F35]">
                Dealer details
              </Text>
              <Text className="mb-4 text-xs leading-5 text-[#6B7E76]">
                Financial and metal opening balances are recorded once in
                separate ledgers.
              </Text>
              <Field
                label="Dealer / firm name"
                value={form.name}
                onChangeText={value => setField('name', value.slice(0, 200))}
                required
              />
              <CustomDropdown
                label="Dealer category"
                value={form.category_id}
                options={activeCategories.map(category => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                onSelect={value => setField('category_id', value)}
                placeholder={
                  activeCategories.length
                    ? 'Choose category'
                    : 'No active categories'
                }
                required
              />
              <CustomDropdown
                label="Status"
                value={form.status}
                options={['Active', 'Inactive', 'On Hold'].map(value => ({
                  value,
                  label: value,
                }))}
                onSelect={value => setField('status', value)}
              />
              <Field
                label="Contact person"
                value={form.contact_person}
                onChangeText={value =>
                  setField('contact_person', value.slice(0, 150))
                }
                required
              />
              <Field
                label="Phone"
                value={form.phone}
                onChangeText={value => setField('phone', value.slice(0, 32))}
                keyboardType="phone-pad"
                required
              />
              <Field
                label="Alternate phone"
                value={form.alternate_phone}
                onChangeText={value =>
                  setField('alternate_phone', value.slice(0, 32))
                }
                keyboardType="phone-pad"
              />
              <Field
                label="Email"
                value={form.email}
                onChangeText={value => setField('email', value.slice(0, 254))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="GSTIN"
                value={form.gstin}
                onChangeText={value =>
                  setField('gstin', value.toUpperCase().slice(0, 15))
                }
                autoCapitalize="characters"
              />
              <Field
                label="PAN"
                value={form.pan}
                onChangeText={value =>
                  setField('pan', value.toUpperCase().slice(0, 10))
                }
                autoCapitalize="characters"
              />
            </View>

            <View className="mt-4 rounded-2xl bg-white p-4">
              <Text className="mb-4 text-base font-extrabold text-[#173F35]">
                Billing Address
              </Text>
              <Field
                label="Billing address"
                value={form.billing_address_line1}
                onChangeText={value => setField('billing_address_line1', value)}
              />
              <Field
                label="Billing city"
                value={form.billing_city}
                onChangeText={value => setField('billing_city', value)}
              />
              <Field
                label="Billing state"
                value={form.billing_state}
                onChangeText={value => setField('billing_state', value)}
              />
              <Field
                label="Billing pincode"
                value={form.billing_pincode}
                onChangeText={value => setField('billing_pincode', value)}
                keyboardType="numeric"
              />
            </View>

            <View className="mt-4 rounded-2xl bg-white p-4">
              <Text className="mb-4 text-base font-extrabold text-[#173F35]">
                Shipping Address
              </Text>
              <Field
                label="Shipping address"
                value={form.shipping_address_line1}
                onChangeText={value =>
                  setField('shipping_address_line1', value)
                }
              />
              <Field
                label="Shipping city"
                value={form.shipping_city}
                onChangeText={value => setField('shipping_city', value)}
              />
              <Field
                label="Shipping state"
                value={form.shipping_state}
                onChangeText={value => setField('shipping_state', value)}
              />
              <Field
                label="Shipping pincode"
                value={form.shipping_pincode}
                onChangeText={value => setField('shipping_pincode', value)}
                keyboardType="numeric"
              />
            </View>

            <View className="mt-4 rounded-2xl bg-white p-4">
              <Text className="mb-4 text-base font-extrabold text-[#173F35]">
                Financial & Banking
              </Text>
              <Field
                label="Credit limit (₹)"
                value={form.credit_limit}
                onChangeText={value => setField('credit_limit', value)}
                keyboardType="decimal-pad"
              />
              <Field
                label="Payment terms (days)"
                value={form.payment_terms_days}
                onChangeText={value => setField('payment_terms_days', value)}
                keyboardType="numeric"
              />
              <Field
                label="Bank name"
                value={form.bank_name}
                onChangeText={value => setField('bank_name', value)}
              />
              <Field
                label="Account holder"
                value={form.bank_account_name}
                onChangeText={value => setField('bank_account_name', value)}
              />
              <Field
                label="Account number"
                value={form.bank_account_number}
                onChangeText={value => setField('bank_account_number', value)}
                keyboardType="numeric"
              />
              <Field
                label="IFSC"
                value={form.bank_ifsc}
                onChangeText={value =>
                  setField('bank_ifsc', value.toUpperCase())
                }
                autoCapitalize="characters"
              />
            </View>

            {!editingDealer ? (
              <View className="mt-4 rounded-2xl bg-white p-4">
                <Text className="mb-4 text-base font-extrabold text-[#173F35]">
                  Opening Balances
                </Text>
                <CustomDropdown
                  label="Opening financial balance side"
                  value={form.opening_balance_side}
                  options={[
                    { value: 'payable', label: 'Payable to dealer' },
                    { value: 'receivable', label: 'Receivable from dealer' },
                  ]}
                  onSelect={value => setField('opening_balance_side', value)}
                />
                <Field
                  label="Opening financial balance (₹)"
                  value={form.opening_balance}
                  onChangeText={value => setField('opening_balance', value)}
                  keyboardType="decimal-pad"
                />
                <CustomDropdown
                  label="Opening metal type"
                  value={form.opening_metal_type}
                  options={['Gold', 'Silver'].map(value => ({
                    value,
                    label: value,
                  }))}
                  onSelect={value => setField('opening_metal_type', value)}
                />
                <CustomDropdown
                  label="Opening metal purity"
                  value={form.opening_metal_purity}
                  options={PURITIES.map(value => ({ value, label: value }))}
                  onSelect={value => setField('opening_metal_purity', value)}
                />
                <Field
                  label="Opening metal weight (g, optional)"
                  value={form.opening_metal_weight}
                  onChangeText={value =>
                    setField('opening_metal_weight', value)
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}

            <View className="mt-4 rounded-2xl bg-white p-4">
              <Field
                label="Account notes"
                value={form.notes}
                onChangeText={value => setField('notes', value.slice(0, 5000))}
                multiline
              />
            </View>
          </ScrollView>
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="flex-row gap-3 border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 pt-3"
          >
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setFormOpen(false)}
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#E6E9E3] bg-white"
            >
              <Text className="font-bold text-[#52645F]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={saveDealer}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#07564B] disabled:opacity-50"
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-extrabold text-white">
                  {editingDealer ? 'Save Profile' : 'Create Dealer'}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={profileLoading || profile !== null}
        transparent
        animationType="slide"
        onRequestClose={closeProfile}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            className="max-h-[88%] rounded-t-3xl bg-[#F8F7F2]"
          >
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
              <Text className="text-lg font-extrabold text-white">
                Dealer Profile
              </Text>
              <Pressable
                accessibilityLabel="Close dealer profile"
                onPress={closeProfile}
              >
                <X size={22} color="#EAD78A" />
              </Pressable>
            </View>
            {profileLoading ? (
              <ScrollView contentContainerClassName="p-4">
                <AdminLoadingSkeleton variant="detail" />
              </ScrollView>
            ) : profile ? (
              <ScrollView
                contentContainerClassName="p-4"
                keyboardShouldPersistTaps="handled"
              >
                <View className="rounded-2xl bg-white p-4">
                  <Text className="text-xl font-extrabold text-[#173F35]">
                    {profile.name}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">
                    {profile.dealer_code} · {profile.category_name}
                  </Text>
                  <Text className="mt-3 text-sm text-[#52645F]">
                    Contact: {profile.contact_person || '—'} ·{' '}
                    {profile.phone || '—'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    Email: {profile.email || '—'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    GSTIN: {profile.gstin || '—'} · PAN: {profile.pan || '—'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    Status: {profile.status}
                  </Text>
                  <Text className="mt-3 text-xs font-bold uppercase text-[#6B7E76]">
                    Billing address
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    {[
                      profile.billing_address?.line1,
                      profile.billing_address?.city,
                      profile.billing_address?.state,
                      profile.billing_address?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </Text>
                  <Text className="mt-3 text-xs font-bold uppercase text-[#6B7E76]">
                    Private dealer documents
                  </Text>
                  {profile.documents?.length ? (
                    profile.documents.map(document => (
                      <Text
                        key={String(document.id)}
                        className="mt-2 text-sm text-[#52645F]"
                      >
                        {document.document_type}: {document.original_name}
                      </Text>
                    ))
                  ) : (
                    <Text className="mt-1 text-sm text-[#6B7E76]">
                      No documents on file.
                    </Text>
                  )}
                  <Text className="mb-1 mt-4 text-xs font-bold uppercase text-[#6B7E76]">
                    Account audit history
                  </Text>
                  {profile.audit?.length ? (
                    profile.audit.map(item => (
                      <Text
                        key={String(item.id)}
                        className="border-t border-[#F1F2EE] py-2 text-xs leading-5 text-[#52645F]"
                      >
                        {item.action} by {item.actor || 'Unknown'} ·{' '}
                        {displayDate(item.created_at)}
                        {item.reason ? ` · ${item.reason}` : ''}
                      </Text>
                    ))
                  ) : (
                    <Text className="text-sm text-[#6B7E76]">
                      No account changes recorded.
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={statementLoading || statement !== null}
        transparent
        animationType="slide"
        onRequestClose={closeStatement}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            className="max-h-[90%] rounded-t-3xl bg-[#F8F7F2]"
          >
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
              <View className="flex-1">
                <Text className="text-base font-extrabold text-white">
                  Dealer Statement
                </Text>
                <Text className="mt-1 text-xs text-[#DCE8E4]">
                  {statementDealer?.name} · money and metal shown separately
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close dealer statement"
                onPress={closeStatement}
              >
                <X size={22} color="#EAD78A" />
              </Pressable>
            </View>
            {statementLoading ? (
              <ScrollView contentContainerClassName="p-4">
                <AdminLoadingSkeleton variant="list" count={3} />
              </ScrollView>
            ) : statement ? (
              <ScrollView contentContainerClassName="p-4">
                <Text className="mb-2 text-base font-extrabold text-[#07564B]">
                  Financial ledger (₹)
                </Text>
                {statement.financial.map(row => (
                  <View
                    key={String(row.id)}
                    className="mb-2 rounded-xl bg-white p-3"
                  >
                    <Text className="font-bold text-[#173F35]">
                      {row.entry_number || 'Ledger entry'} ·{' '}
                      {displayDate(row.created_at)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#52645F]">
                      {row.description || '—'}
                    </Text>
                    <Text className="mt-2 text-xs text-[#52645F]">
                      Payable Δ {currency(row.payable_delta)} · Receivable Δ{' '}
                      {currency(row.receivable_delta)}
                    </Text>
                    <Text className="mt-1 text-xs font-bold text-[#173F35]">
                      Balance payable {currency(row.payable_balance)}
                    </Text>
                  </View>
                ))}
                {statement.financial.length === 0 ? (
                  <Text className="mb-4 rounded-xl bg-white p-4 text-sm text-[#6B7E76]">
                    No financial ledger entries for this period.
                  </Text>
                ) : null}
                <Text className="mb-2 mt-4 text-base font-extrabold text-[#07564B]">
                  Metal ledger (grams by purity)
                </Text>
                {statement.metal.map(row => (
                  <View
                    key={String(row.id)}
                    className="mb-2 rounded-xl bg-white p-3"
                  >
                    <Text className="font-bold text-[#173F35]">
                      {row.entry_number || 'Metal entry'} ·{' '}
                      {displayDate(row.created_at)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#52645F]">
                      {row.metal_type} {row.purity} ·{' '}
                      {row.movement || 'Movement'}
                    </Text>
                    <Text className="mt-2 text-xs text-[#52645F]">
                      Weight Δ {Number(row.weight_delta || 0).toFixed(3)} g ·
                      Fine-gold Δ {Number(row.fine_gold_delta || 0).toFixed(3)}{' '}
                      g
                    </Text>
                    <Text className="mt-1 text-xs text-[#52645F]">
                      {row.reconciliation_status || '—'} · Closing{' '}
                      {Number(row.closing_weight || 0).toFixed(3)} g
                    </Text>
                  </View>
                ))}
                {statement.metal.length === 0 ? (
                  <Text className="rounded-xl bg-white p-4 text-sm text-[#6B7E76]">
                    No metal ledger entries for this period.
                  </Text>
                ) : null}
                <Text className="mt-3 text-right text-[10px] text-[#6B7E76]">
                  Generated {displayDate(statement.generated_at)}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
