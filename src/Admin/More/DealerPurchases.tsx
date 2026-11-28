import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowDownLeft,
  Coins,
  List,
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
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import { CustomDropdown, DatePicker, Field } from '../Loans/FormControls';
import { currency, inventoryError } from '../Products/inventory';

type Props = { onBack: () => void };
type Dealer = {
  id: number | string;
  dealer_code?: string;
  name: string;
  status: string;
};
type PurchaseLine = {
  description: string;
  metal_type: string;
  purity: string;
  quantity: string;
  net_weight: string;
  rate_per_gram: string;
  negotiated_rate: boolean;
  unit_price: string;
  making_charge: string;
  wastage_charge: string;
  stone_charge: string;
  discount: string;
  tax_rate: string;
  tax_type: string;
};
type PurchaseForm = {
  dealer_id: string;
  document_type: string;
  supplier_invoice_number: string;
  linked_document_id: string;
  document_date: string;
  due_date: string;
  notes: string;
  lines: PurchaseLine[];
};
type PaymentForm = {
  dealer_id: string;
  amount: string;
  payment_date: string;
  method: string;
  reference: string;
  purchase_id: string;
  allocation: string;
  idempotency_key: string;
};
type Purchase = {
  id: number | string;
  dealer_id: number | string;
  dealer_name?: string;
  document_number: string;
  document_type: string;
  supplier_invoice_number?: string | null;
  document_date: string;
  due_date?: string | null;
  total: number | string;
  paid_amount: number | string;
  outstanding: number | string;
};
type Summary = {
  dealers?: { active?: number | string };
  payables?: number | string;
  receivables?: number | string;
  purchases_this_month?: number | string;
  overdue?: { count?: number; amount?: number | string };
  pending_jobs?: number | string;
};

const PURITIES = ['999', '916', '833', '750', '585'];
const DOC_TYPES = [
  { value: 'invoice', label: 'Supplier invoice' },
  { value: 'purchase_return', label: 'Purchase return' },
  { value: 'debit_note', label: 'Debit note (reduces payable)' },
  { value: 'credit_note', label: 'Credit note (increases payable)' },
];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function blankLine(): PurchaseLine {
  return {
    description: '',
    metal_type: 'Gold',
    purity: '916',
    quantity: '1',
    net_weight: '',
    rate_per_gram: '',
    negotiated_rate: false,
    unit_price: '',
    making_charge: '0',
    wastage_charge: '0',
    stone_charge: '0',
    discount: '0',
    tax_rate: '0',
    tax_type: 'NONE',
  };
}

function blankPurchase(): PurchaseForm {
  return {
    dealer_id: '',
    document_type: 'invoice',
    supplier_invoice_number: '',
    linked_document_id: '',
    document_date: today(),
    due_date: '',
    notes: '',
    lines: [blankLine()],
  };
}

function blankPayment(): PaymentForm {
  return {
    dealer_id: '',
    amount: '',
    payment_date: today(),
    method: 'Bank',
    reference: '',
    purchase_id: '',
    allocation: '',
    idempotency_key: `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`,
  };
}

function displayDocType(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function displayDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN');
}

export default function DealerPurchases({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [outstanding, setOutstanding] = useState<Purchase[]>([]);
  const [linkedInvoices, setLinkedInvoices] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formMode, setFormMode] = useState<'purchase' | 'payment' | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(
    blankPurchase(),
  );
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(blankPayment());
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const [summaryResponse, dealerResponse, purchaseResponse] =
        await Promise.all([
          api.get<Summary>('/dealers/summary'),
          api.get<{ dealers?: Dealer[] }>('/dealers', {
            params: { page: 1, limit: 100, status: 'Active' },
          }),
          api.get<{ purchases?: Purchase[] }>('/dealers/purchases', {
            params: {
              page: 1,
              limit: 50,
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            },
          }),
        ]);
      if (
        !Array.isArray(dealerResponse.data.dealers) ||
        !Array.isArray(purchaseResponse.data.purchases)
      ) {
        throw new Error('The server returned invalid dealer purchase data.');
      }
      setSummary(summaryResponse.data);
      setDealers(dealerResponse.data.dealers);
      setPurchases(purchaseResponse.data.purchases);
    } catch (error) {
      setLoadError(inventoryError(error));
      if (__DEV__)
        console.warn('[DealerPurchases] Could not load purchase data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      !formMode ||
      formMode !== 'purchase' ||
      purchaseForm.document_type === 'invoice' ||
      !purchaseForm.dealer_id
    ) {
      setLinkedInvoices([]);
      return;
    }
    let active = true;
    api
      .get<{ purchases?: Purchase[] }>('/dealers/purchases', {
        params: { dealer_id: purchaseForm.dealer_id, page: 1, limit: 100 },
      })
      .then(response => {
        if (!active) return;
        if (!Array.isArray(response.data.purchases)) {
          throw new Error(
            'The server returned an invalid supplier invoice list.',
          );
        }
        setLinkedInvoices(
          response.data.purchases.filter(
            item => item.document_type === 'invoice',
          ),
        );
      })
      .catch(error => {
        if (!active) return;
        setLinkedInvoices([]);
        showAlert('Could not load supplier invoices', inventoryError(error), {
          variant: 'error',
        });
      });
    return () => {
      active = false;
    };
  }, [formMode, purchaseForm.dealer_id, purchaseForm.document_type, showAlert]);

  const visiblePurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return purchases;
    return purchases.filter(item =>
      [
        item.document_number,
        item.dealer_name,
        item.document_type,
        item.supplier_invoice_number,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [purchases, search]);

  const activeDealers = useMemo(
    () => dealers.filter(dealer => dealer.status === 'Active'),
    [dealers],
  );

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
    setDateRange({ startDate: rangeStart, endDate: rangeEnd });
  };

  const openNewPurchase = () => {
    setPurchaseForm(blankPurchase());
    setFormMode('purchase');
    setShowActions(false);
  };

  const openPayment = async () => {
    try {
      const response = await api.get<{ purchases?: Purchase[] }>(
        '/dealers/purchases',
        {
          params: { page: 1, limit: 100 },
        },
      );
      if (!Array.isArray(response.data.purchases)) {
        throw new Error(
          'The server returned an invalid outstanding invoice list.',
        );
      }
      setOutstanding(
        response.data.purchases.filter(
          purchase =>
            purchase.document_type === 'invoice' &&
            Number(purchase.outstanding) > 0,
        ),
      );
      setPaymentForm(blankPayment());
      setFormMode('payment');
      setShowActions(false);
    } catch (error) {
      showAlert('Could not load outstanding invoices', inventoryError(error), {
        variant: 'error',
      });
    }
  };

  const setLine = (
    index: number,
    key: keyof PurchaseLine,
    value: string | boolean,
  ) => {
    setPurchaseForm(previous => ({
      ...previous,
      lines: previous.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    }));
  };

  const loadCurrentRate = async (index: number, line: PurchaseLine) => {
    try {
      const response = await api.get<{ rate_per_gram?: number | string }>(
        '/dealers/global-rate',
        {
          params: { metal_type: line.metal_type, purity: line.purity },
        },
      );
      if (
        response.data.rate_per_gram == null ||
        !Number.isFinite(Number(response.data.rate_per_gram))
      ) {
        throw new Error(
          'No current rate is configured for this metal and purity.',
        );
      }
      setLine(index, 'negotiated_rate', false);
      setLine(index, 'rate_per_gram', String(response.data.rate_per_gram));
    } catch (error) {
      setLine(index, 'rate_per_gram', '');
      showAlert(
        'Current rate unavailable',
        `${inventoryError(error)} You can enter an authorized negotiated rate.`,
        { variant: 'warning' },
      );
    }
  };

  const submitPurchase = async () => {
    if (saving) return;
    if (!purchaseForm.dealer_id) {
      showAlert(
        'Dealer required',
        'Select a dealer before posting this document.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      purchaseForm.document_type === 'invoice' &&
      !purchaseForm.supplier_invoice_number.trim()
    ) {
      showAlert(
        'Invoice number required',
        'Enter the supplier invoice number.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      purchaseForm.document_type !== 'invoice' &&
      !purchaseForm.linked_document_id
    ) {
      showAlert(
        'Original invoice required',
        'Select the original supplier invoice for this adjustment.',
        { variant: 'warning' },
      );
      return;
    }
    if (purchaseForm.lines.some(line => !line.description.trim())) {
      showAlert(
        'Line description required',
        'Enter a description for every purchase line.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      purchaseForm.lines.some(line =>
        line.metal_type === 'Other'
          ? !Number.isFinite(Number(line.quantity)) ||
            Number(line.quantity) <= 0
          : !Number.isFinite(Number(line.net_weight)) ||
            Number(line.net_weight) <= 0,
      )
    ) {
      showAlert(
        'Valid quantity required',
        'Enter a positive quantity or net weight for every line.',
        { variant: 'warning' },
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...purchaseForm,
        dealer_id: Number(purchaseForm.dealer_id),
        lines: purchaseForm.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity || 1),
          net_weight: Number(line.net_weight || 0),
          rate_per_gram: Number(line.rate_per_gram || 0),
          unit_price: Number(line.unit_price || 0),
          making_charge: Number(line.making_charge || 0),
          wastage_charge: Number(line.wastage_charge || 0),
          stone_charge: Number(line.stone_charge || 0),
          discount: Number(line.discount || 0),
          tax_rate: Number(line.tax_rate || 0),
        })),
      };
      const response = await api.post<{
        document_number: string;
        total: number | string;
      }>('/dealers/purchases', payload);
      setFormMode(null);
      setPurchaseForm(blankPurchase());
      await loadData();
      showAlert(
        'Purchase document posted',
        `${response.data.document_number} · ${currency(response.data.total)}`,
        { variant: 'success' },
      );
    } catch (error) {
      showAlert('Could not post purchase document', inventoryError(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async () => {
    const amount = Number(paymentForm.amount);
    const allocation = Number(paymentForm.allocation);
    const selectedInvoice = outstanding.find(
      item => String(item.id) === paymentForm.purchase_id,
    );
    if (!paymentForm.dealer_id || !Number.isFinite(amount) || amount <= 0) {
      showAlert(
        'Payment details required',
        'Select a dealer and enter a payment amount greater than zero.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      paymentForm.purchase_id &&
      (!Number.isFinite(allocation) || allocation <= 0 || allocation > amount)
    ) {
      showAlert(
        'Invalid allocation',
        'The invoice allocation must be positive and no greater than the payment amount.',
        { variant: 'warning' },
      );
      return;
    }
    if (selectedInvoice && allocation > Number(selectedInvoice.outstanding)) {
      showAlert(
        'Allocation exceeds invoice balance',
        'The allocation cannot be greater than the selected invoice outstanding amount.',
        { variant: 'warning' },
      );
      return;
    }
    setSaving(true);
    try {
      await api.post('/dealers/payments', {
        dealer_id: Number(paymentForm.dealer_id),
        amount,
        payment_date: paymentForm.payment_date,
        method: paymentForm.method,
        reference: paymentForm.reference,
        idempotency_key: paymentForm.idempotency_key,
        allocations:
          paymentForm.purchase_id && paymentForm.allocation
            ? [
                {
                  purchase_id: Number(paymentForm.purchase_id),
                  amount: allocation,
                },
              ]
            : [],
      });
      setFormMode(null);
      await loadData();
      showAlert(
        'Payment posted',
        'The payment was recorded in the dealer ledger.',
        { variant: 'success' },
      );
    } catch (error) {
      showAlert('Could not post payment', inventoryError(error), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    const rows = [
      [
        'Document',
        'Dealer',
        'Type',
        'Date',
        'Due date',
        'Total',
        'Paid',
        'Outstanding',
      ],
      ...visiblePurchases.map(item => [
        item.document_number,
        item.dealer_name || '',
        item.document_type,
        item.document_date,
        item.due_date || '',
        item.total,
        item.paid_amount,
        item.outstanding,
      ]),
    ];
    const escapeCsv = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    try {
      await Share.share({ title: 'Dealer purchases', message: csv });
    } catch (error) {
      showAlert('Could not export purchases', inventoryError(error), {
        variant: 'error',
      });
    }
  };

  const summaryCards = [
    {
      id: 'purchase-dealers',
      label: 'Active dealers',
      value: summary?.dealers?.active ?? '—',
      note: 'Currently active',
      icon: Store,
      palette: 'total_customers' as const,
    },
    {
      id: 'purchase-payables',
      label: 'Supplier payables',
      value: summary ? currency(summary.payables) : '—',
      note: 'Outstanding balance',
      icon: Wallet,
      palette: 'active_gold_loans' as const,
    },
    {
      id: 'purchase-receivables',
      label: 'Dealer receivables',
      value: summary ? currency(summary.receivables) : '—',
      note: 'Amount to receive',
      icon: ArrowDownLeft,
      palette: 'gold_stock_value' as const,
    },
    {
      id: 'purchase-monthly',
      label: 'Purchases this month',
      value: summary ? currency(summary.purchases_this_month) : '—',
      note: 'Monthly total',
      icon: Coins,
      palette: 'total_products' as const,
    },
    {
      id: 'purchase-overdue',
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
      id: 'purchase-pending-jobs',
      label: 'Pending Jobs',
      value: summary?.pending_jobs ?? '—',
      note: 'Awaiting completion',
      icon: List,
      palette: 'total_categories' as const,
    },
  ];

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title="Dealer Purchases & Payables"
        sectionLabel="More · Dealers"
        onBack={onBack}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-32"
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
          containerClassName="mb-4"
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
            accessibilityLabel="Search purchase documents"
            value={search}
            onChangeText={value => setSearch(value.slice(0, 100))}
            placeholder="Search document, dealer, or invoice"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch('')}
              hitSlop={8}
            >
              <X size={18} color="#6B7E76" />
            </Pressable>
          ) : null}
        </View>
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
          Document date range
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
        <View className="mb-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={applyDateRange}
            className="min-h-11 flex-1 items-center justify-center rounded-xl bg-[#07564B]"
          >
            <Text className="text-sm font-bold text-white">
              {dateRange.startDate || dateRange.endDate
                ? 'Apply date range'
                : 'Apply date filter'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={exportCsv}
            className="min-h-11 flex-1 items-center justify-center rounded-xl border border-[#DDBB57] bg-white"
          >
            <Text className="text-sm font-bold text-[#173F35]">Export CSV</Text>
          </Pressable>
        </View>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-[#52645F]">View</Text>
          <View className="flex-row rounded-xl bg-[#F3F4F1] p-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show purchases as a list"
              accessibilityState={{ selected: viewMode === 'list' }}
              onPress={() => setViewMode('list')}
              className={`h-10 px-4 items-center justify-center rounded-lg ${
                viewMode === 'list' ? 'bg-[#07564B]' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  viewMode === 'list' ? 'text-white' : 'text-[#6B7E76]'
                }`}
              >
                List
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show purchases as cards"
              accessibilityState={{ selected: viewMode === 'grid' }}
              onPress={() => setViewMode('grid')}
              className={`h-10 px-4 items-center justify-center rounded-lg ${
                viewMode === 'grid' ? 'bg-[#07564B]' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  viewMode === 'grid' ? 'text-white' : 'text-[#6B7E76]'
                }`}
              >
                Cards
              </Text>
            </Pressable>
          </View>
        </View>

        {loadError ? (
          <View className="mb-3 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm text-[#B42332]">{loadError}</Text>
            <Pressable onPress={loadData} className="mt-2 self-start">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {loading && purchases.length === 0 ? (
          <ActivityIndicator className="py-8" color="#07564B" />
        ) : visiblePurchases.length ? (
          visiblePurchases.map((item, index) =>
            viewMode === 'list' ? (
              <View
                key={String(item.id)}
                className="mb-2 rounded-xl border border-[#E6E9E3] bg-white p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-extrabold text-[#07564B]">
                      {item.document_number}
                    </Text>
                    <Text className="mt-1 text-xs text-[#52645F]">
                      {item.dealer_name || '—'} ·{' '}
                      {displayDocType(item.document_type)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#6B7E76]">
                      {displayDate(item.document_date)} · Due{' '}
                      {displayDate(item.due_date)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-extrabold text-[#173F35]">
                      {currency(item.outstanding)}
                    </Text>
                    <Text className="text-[10px] text-[#6B7E76]">
                      Outstanding
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 border-t border-[#F1F2EE] pt-2 text-xs text-[#6B7E76]">
                  Invoice ref: {item.supplier_invoice_number || '—'} · Paid{' '}
                  {currency(item.paid_amount)} of {currency(item.total)}
                </Text>
              </View>
            ) : (
              <View
                key={String(item.id)}
                className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase text-[#6B7E76]">
                      Entry {index + 1}
                    </Text>
                    <Text className="mt-1 font-extrabold text-[#07564B]">
                      {item.document_number}
                    </Text>
                    <Text className="mt-1 text-[10px] font-semibold uppercase text-[#6B7E76]">
                      {displayDocType(item.document_type)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-extrabold text-[#173F35]">
                      {currency(item.outstanding)}
                    </Text>
                    <Text className="text-[10px] text-[#6B7E76]">
                      Outstanding
                    </Text>
                  </View>
                </View>
                <View className="mt-3 border-t border-[#F1F2EE] pt-3">
                  <Text className="text-sm text-[#52645F]">
                    Dealer: {item.dealer_name || '—'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    Invoice ref: {item.supplier_invoice_number || '—'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#52645F]">
                    Date: {displayDate(item.document_date)} · Due:{' '}
                    {displayDate(item.due_date)}
                  </Text>
                </View>
                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1 rounded-xl bg-[#F8F7F2] p-3">
                    <Text className="text-[10px] font-bold uppercase text-[#6B7E76]">
                      Amount
                    </Text>
                    <Text className="mt-1 font-bold text-[#173F35]">
                      {currency(item.total)}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-[#F8F7F2] p-3">
                    <Text className="text-[10px] font-bold uppercase text-[#6B7E76]">
                      Paid
                    </Text>
                    <Text className="mt-1 font-bold text-[#173F35]">
                      {currency(item.paid_amount)}
                    </Text>
                  </View>
                </View>
              </View>
            ),
          )
        ) : !loadError ? (
          <View className="items-center rounded-2xl bg-white p-8">
            <Text className="font-bold text-[#173F35]">
              {purchases.length
                ? 'No matching documents'
                : 'No purchase documents posted'}
            </Text>
            <Text className="mt-1 text-sm text-[#6B7E76]">
              Try changing the filters or add a new purchase document.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {showActions ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close purchase actions"
          onPress={() => setShowActions(false)}
          className="absolute inset-0 bg-black/20"
        />
      ) : null}
      {showActions ? (
        <View
          style={{ bottom: 92 }}
          className="absolute right-5 items-end gap-3"
        >
          <Pressable
            accessibilityRole="button"
            onPress={openPayment}
            className="flex-row items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg"
          >
            <Wallet size={18} color="#07564B" />
            <Text className="text-sm font-bold text-[#173F35]">
              Record Payment
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={openNewPurchase}
            className="flex-row items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg"
          >
            <Plus size={18} color="#07564B" />
            <Text className="text-sm font-bold text-[#173F35]">
              New Purchase
            </Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          showActions ? 'Close purchase actions' : 'Open purchase actions'
        }
        accessibilityState={{ expanded: showActions }}
        onPress={() => setShowActions(open => !open)}
        style={{ bottom: 20 }}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg"
      >
        {showActions ? (
          <X size={24} color="white" />
        ) : (
          <Plus size={24} color="white" />
        )}
      </Pressable>

      <Modal
        visible={formMode !== null}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setFormMode(null);
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
                Dealer Purchases & Payables
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-white">
                {formMode === 'payment'
                  ? 'Record Dealer Payment'
                  : 'Post Supplier Document'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close purchase form"
              disabled={saving}
              onPress={() => setFormMode(null)}
            >
              <X size={22} color="#EAD78A" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerClassName="p-4 pb-10"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {formMode === 'purchase' ? (
              <>
                <View className="rounded-2xl bg-white p-4">
                  <Text className="mb-1 text-base font-extrabold text-[#173F35]">
                    Supplier document
                  </Text>
                  <Text className="mb-4 text-xs leading-5 text-[#6B7E76]">
                    Rates and taxes are captured on each line when posted.
                  </Text>
                  <CustomDropdown
                    label="Dealer"
                    value={purchaseForm.dealer_id}
                    options={activeDealers.map(dealer => ({
                      value: String(dealer.id),
                      label: `${dealer.dealer_code || ''} ${
                        dealer.dealer_code ? '— ' : ''
                      }${dealer.name}`,
                    }))}
                    onSelect={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        dealer_id: value,
                        linked_document_id: '',
                      }))
                    }
                    placeholder="Select active dealer"
                    required
                  />
                  <CustomDropdown
                    label="Document type"
                    value={purchaseForm.document_type}
                    options={DOC_TYPES}
                    onSelect={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        document_type: value,
                        linked_document_id: '',
                      }))
                    }
                    required
                  />
                  <Field
                    label="Supplier invoice number"
                    value={purchaseForm.supplier_invoice_number}
                    onChangeText={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        supplier_invoice_number: value.slice(0, 80),
                      }))
                    }
                    required={purchaseForm.document_type === 'invoice'}
                  />
                  <DatePicker
                    label="Document date"
                    value={purchaseForm.document_date}
                    onChange={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        document_date: value,
                      }))
                    }
                    maximumDate={null}
                  />
                  <DatePicker
                    label="Due date"
                    value={purchaseForm.due_date}
                    onChange={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        due_date: value,
                      }))
                    }
                    minimumDate={
                      purchaseForm.document_date
                        ? new Date(`${purchaseForm.document_date}T00:00:00`)
                        : undefined
                    }
                    maximumDate={null}
                  />
                  {purchaseForm.document_type !== 'invoice' ? (
                    <CustomDropdown
                      label="Original supplier invoice"
                      value={purchaseForm.linked_document_id}
                      options={linkedInvoices.map(item => ({
                        value: String(item.id),
                        label: `${item.document_number} · ${
                          item.supplier_invoice_number || ''
                        } · ${currency(item.total)}`,
                      }))}
                      onSelect={value =>
                        setPurchaseForm(previous => ({
                          ...previous,
                          linked_document_id: value,
                        }))
                      }
                      placeholder={
                        linkedInvoices.length
                          ? 'Select original invoice'
                          : 'No invoices available'
                      }
                      required
                    />
                  ) : null}
                </View>

                {purchaseForm.lines.map((line, index) => (
                  <View key={index} className="mt-4 rounded-2xl bg-white p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="font-extrabold text-[#07564B]">
                        Invoice line {index + 1}
                      </Text>
                      {purchaseForm.lines.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setPurchaseForm(previous => ({
                              ...previous,
                              lines: previous.lines.filter(
                                (_item, lineIndex) => lineIndex !== index,
                              ),
                            }))
                          }
                        >
                          <Text className="text-xs font-bold text-[#B42332]">
                            Remove line
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Field
                      label="Description"
                      value={line.description}
                      onChangeText={value =>
                        setLine(index, 'description', value.slice(0, 500))
                      }
                      required
                    />
                    <CustomDropdown
                      label="Metal"
                      value={line.metal_type}
                      options={['Gold', 'Silver', 'Other'].map(value => ({
                        value,
                        label: value,
                      }))}
                      onSelect={value => setLine(index, 'metal_type', value)}
                    />
                    {line.metal_type !== 'Other' ? (
                      <CustomDropdown
                        label="Purity"
                        value={line.purity}
                        options={(line.metal_type === 'Gold'
                          ? PURITIES
                          : ['999']
                        ).map(value => ({ value, label: value }))}
                        onSelect={value => {
                          setLine(index, 'purity', value);
                          setLine(index, 'rate_per_gram', '');
                        }}
                        placeholder="Choose purity"
                        required
                      />
                    ) : null}
                    <Field
                      label={
                        line.metal_type === 'Other'
                          ? 'Quantity'
                          : 'Net weight (g)'
                      }
                      value={
                        line.metal_type === 'Other'
                          ? line.quantity
                          : line.net_weight
                      }
                      onChangeText={value =>
                        setLine(
                          index,
                          line.metal_type === 'Other'
                            ? 'quantity'
                            : 'net_weight',
                          value,
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.000"
                      required
                    />
                    {line.metal_type !== 'Other' ? (
                      <>
                        <Field
                          label="Active rate (₹ / g)"
                          value={line.rate_per_gram}
                          onChangeText={value => {
                            setLine(index, 'rate_per_gram', value);
                            setLine(index, 'negotiated_rate', true);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="Load current rate or enter negotiated rate"
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => loadCurrentRate(index, line)}
                          className="mb-4 min-h-10 items-center justify-center rounded-xl border border-[#07564B]"
                        >
                          <Text className="text-xs font-bold text-[#07564B]">
                            Use Current Rate
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Field
                        label="Unit price (₹)"
                        value={line.unit_price}
                        onChangeText={value =>
                          setLine(index, 'unit_price', value)
                        }
                        keyboardType="decimal-pad"
                      />
                    )}
                    <Field
                      label="Making charge (₹)"
                      value={line.making_charge}
                      onChangeText={value =>
                        setLine(index, 'making_charge', value)
                      }
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Wastage charge (₹)"
                      value={line.wastage_charge}
                      onChangeText={value =>
                        setLine(index, 'wastage_charge', value)
                      }
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Stone charge (₹)"
                      value={line.stone_charge}
                      onChangeText={value =>
                        setLine(index, 'stone_charge', value)
                      }
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Discount (₹)"
                      value={line.discount}
                      onChangeText={value => setLine(index, 'discount', value)}
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="GST rate (%)"
                      value={line.tax_rate}
                      onChangeText={value => setLine(index, 'tax_rate', value)}
                      keyboardType="decimal-pad"
                    />
                    <CustomDropdown
                      label="Tax treatment"
                      value={line.tax_type}
                      options={[
                        { value: 'NONE', label: 'No tax' },
                        {
                          value: 'CGST_SGST',
                          label: 'Intra-state CGST + SGST',
                        },
                        { value: 'IGST', label: 'Inter-state IGST' },
                      ]}
                      onSelect={value => setLine(index, 'tax_type', value)}
                    />
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setPurchaseForm(previous => ({
                      ...previous,
                      lines: [...previous.lines, blankLine()],
                    }))
                  }
                  className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-xl border border-[#07564B] bg-white"
                >
                  <Plus size={16} color="#07564B" />
                  <Text className="text-sm font-bold text-[#07564B]">
                    Add line item
                  </Text>
                </Pressable>
                <View className="mt-4 rounded-2xl bg-white p-4">
                  <Field
                    label="Internal notes"
                    value={purchaseForm.notes}
                    onChangeText={value =>
                      setPurchaseForm(previous => ({
                        ...previous,
                        notes: value.slice(0, 1000),
                      }))
                    }
                    multiline
                  />
                </View>
                <Pressable
                  disabled={saving}
                  onPress={submitPurchase}
                  className="mt-4 min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#07564B] disabled:opacity-50"
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-extrabold text-white">
                      Post Document
                    </Text>
                  )}
                </Pressable>
              </>
            ) : formMode === 'payment' ? (
              <View className="rounded-2xl bg-white p-4">
                <Text className="mb-1 text-base font-extrabold text-[#173F35]">
                  Record dealer payment
                </Text>
                <Text className="mb-4 text-xs leading-5 text-[#6B7E76]">
                  Unallocated remainder is posted as dealer advance /
                  receivable.
                </Text>
                <CustomDropdown
                  label="Dealer"
                  value={paymentForm.dealer_id}
                  options={dealers.map(dealer => ({
                    value: String(dealer.id),
                    label: dealer.name,
                  }))}
                  onSelect={value =>
                    setPaymentForm(previous => ({
                      ...previous,
                      dealer_id: value,
                      purchase_id: '',
                      allocation: '',
                    }))
                  }
                  placeholder="Select dealer"
                  required
                />
                <Field
                  label="Payment amount (₹)"
                  value={paymentForm.amount}
                  onChangeText={value =>
                    setPaymentForm(previous => ({ ...previous, amount: value }))
                  }
                  keyboardType="decimal-pad"
                  required
                />
                <DatePicker
                  label="Payment date"
                  value={paymentForm.payment_date}
                  onChange={value =>
                    setPaymentForm(previous => ({
                      ...previous,
                      payment_date: value,
                    }))
                  }
                  maximumDate={null}
                />
                <CustomDropdown
                  label="Method"
                  value={paymentForm.method}
                  options={['Bank', 'UPI', 'Cheque', 'Cash'].map(value => ({
                    value,
                    label: value,
                  }))}
                  onSelect={value =>
                    setPaymentForm(previous => ({ ...previous, method: value }))
                  }
                />
                <Field
                  label="Payment reference"
                  value={paymentForm.reference}
                  onChangeText={value =>
                    setPaymentForm(previous => ({
                      ...previous,
                      reference: value.slice(0, 120),
                    }))
                  }
                />
                <CustomDropdown
                  label="Allocate to invoice (optional)"
                  value={paymentForm.purchase_id}
                  options={[
                    { value: '', label: 'Keep as unallocated advance' },
                    ...outstanding
                      .filter(
                        item =>
                          String(item.dealer_id) === paymentForm.dealer_id,
                      )
                      .map(item => ({
                        value: String(item.id),
                        label: `${item.document_number} · due ${currency(
                          item.outstanding,
                        )}`,
                      })),
                  ]}
                  onSelect={value => {
                    const invoice = outstanding.find(
                      item => String(item.id) === value,
                    );
                    setPaymentForm(previous => ({
                      ...previous,
                      purchase_id: value,
                      allocation: invoice ? String(invoice.outstanding) : '',
                    }));
                  }}
                />
                {paymentForm.purchase_id ? (
                  <Field
                    label="Allocation amount (₹)"
                    value={paymentForm.allocation}
                    onChangeText={value =>
                      setPaymentForm(previous => ({
                        ...previous,
                        allocation: value,
                      }))
                    }
                    keyboardType="decimal-pad"
                    required
                  />
                ) : null}
                <View className="mt-2 flex-row gap-3">
                  <Pressable
                    disabled={saving}
                    onPress={() => setFormMode(null)}
                    className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#E6E9E3]"
                  >
                    <Text className="font-bold text-[#52645F]">Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={saving}
                    onPress={submitPayment}
                    className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#07564B] disabled:opacity-50"
                  >
                    {saving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-extrabold text-white">
                        Post Payment
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
