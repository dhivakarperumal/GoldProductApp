import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import { CustomDropdown, DatePicker, Field, SubmitButton } from '../Loans/FormControls';
import { inventoryError } from '../Products/inventory';

type Props = { onBack: () => void };
const styles = StyleSheet.create({
  floatingActionButtonLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
  },
  floatingActionButton: { zIndex: 100, elevation: 100 },
});
type DateRange = { preset: string; startDate: string; endDate: string };
type FundSummary = {
  opening_balance?: string | number;
  fund_added?: string | number;
  total_credit?: string | number;
  total_debit?: string | number;
  current_balance?: string | number;
};
type Transaction = {
  id: number | string;
  transaction_type: string;
  transaction_date: string;
  amount: string | number;
  payment_method?: string;
  admin_name?: string;
  description?: string;
  related_reference?: string;
  running_balance?: string | number;
};
type Entry = {
  transaction_type: string;
  transaction_date: string;
  amount: string;
  payment_method: string;
  description: string;
  related_reference: string;
};

const PAGE_SIZE = 20;
const TRANSACTION_TYPES = [
  { value: 'FUND_ADDED', label: 'Fund Added' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'DEBIT', label: 'Debit' },
];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function currency(value: unknown) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
}

function typeLabel(value: string) {
  return TRANSACTION_TYPES.find(type => type.value === value)?.label || value;
}

function emptyEntry(): Entry {
  return {
    transaction_type: 'FUND_ADDED',
    transaction_date: `${localDate(new Date())}T12:00`,
    amount: '',
    payment_method: 'Cash',
    description: '',
    related_reference: '',
  };
}

export function TimePickerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const insets = useSafeAreaInsets();

  const selectedTime = useMemo(() => {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(Number.isFinite(hours) ? hours : 12, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    return date;
  }, [value]);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedTime,
        mode: 'time',
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
          }
        },
      });
      return;
    }
    setDraft(selectedTime);
    setOpen(true);
  };

  return (
    <>
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">Time</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose time"
          onPress={openPicker}
          className="min-h-12 justify-center rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3">
          <Text className="text-sm text-[#173F35]">{value}</Text>
        </Pressable>
      </View>
      {Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
          <View className="flex-1 items-center justify-center bg-black/40 px-5">
            <View style={{ paddingBottom: Math.max(insets.bottom, 24) }} className="w-full rounded-3xl bg-white p-5">
              <Text className="mb-3 text-lg font-extrabold text-[#173F35]">Choose time</Text>
              <DateTimePicker
                value={draft}
                mode="time"
                display="spinner"
                onChange={(_event, date) => {
                  if (date) setDraft(date);
                }}
              />
              <View className="mt-4 flex-row justify-end gap-2">
                <Pressable onPress={() => setOpen(false)} className="rounded-xl bg-[#F3F4F1] px-4 py-3">
                  <Text className="font-bold text-[#52645F]">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(`${String(draft.getHours()).padStart(2, '0')}:${String(draft.getMinutes()).padStart(2, '0')}`);
                    setOpen(false);
                  }}
                  className="rounded-xl bg-[#07564B] px-4 py-3">
                  <Text className="font-bold text-white">Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

export default function FundManagement({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: '',
  });
  const [preset, setPreset] = useState('all');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [transactionType, setTransactionType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [entry, setEntry] = useState<Entry>(emptyEntry());
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      const [summaryResponse, transactionResponse] = await Promise.all([
        api.get<FundSummary>('/funds/summary', { params }),
        api.get<{ transactions?: Transaction[]; total?: number }>('/funds/transactions', {
          params: {
            ...params,
            page,
            page_size: PAGE_SIZE,
            transaction_type: transactionType,
            search: search.trim(),
          },
        }),
      ]);
      if (!Array.isArray(transactionResponse.data.transactions)) {
        throw new Error('The server returned an invalid fund transaction list.');
      }
      setSummary(summaryResponse.data);
      setTransactions(transactionResponse.data.transactions);
      setTotal(Number(transactionResponse.data.total) || 0);
    } catch (error) {
      setLoadError(inventoryError(error));
      if (__DEV__) console.warn('[FundManagement] Could not load fund data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, page, search, transactionType]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  const statCards = [
    { id: 'fund-opening', label: 'Opening Balance', value: summary?.opening_balance, detail: 'Opening ledger balance', icon: Wallet, palette: 'gold_stock_value' as const },
    { id: 'fund-added', label: 'Fund Added', value: summary?.fund_added, detail: 'Funds added to ledger', icon: Plus, palette: 'total_customers' as const },
    { id: 'fund-credits', label: 'Total Credits', value: summary?.total_credit, detail: 'Credit transactions', icon: ArrowDownLeft, palette: 'total_products' as const },
    { id: 'fund-debits', label: 'Total Debits', value: summary?.total_debit, detail: 'Debit transactions', icon: ArrowUpRight, palette: 'low_stock_products' as const, trendUp: false },
    { id: 'fund-available', label: 'Available Balance', value: summary?.current_balance, detail: 'Current ledger balance', icon: Wallet, palette: 'active_gold_loans' as const },
    { id: 'fund-entry-count', label: 'Entries Found', value: total, detail: 'Matching fund entries', icon: List, palette: 'total_categories' as const },
  ];

  const selectPreset = (value: string) => {
    setPreset(value);
    setPage(1);
    if (value === 'custom') return;
    const today = localDate(new Date());
    const ranges: Record<string, DateRange> = {
      all: { preset: 'all', startDate: '', endDate: '' },
      today: { preset: 'today', startDate: today, endDate: today },
      last7: { preset: 'last7', startDate: dateOffset(6), endDate: today },
      last30: { preset: 'last30', startDate: dateOffset(29), endDate: today },
      last90: { preset: 'last90', startDate: dateOffset(89), endDate: today },
    };
    setDateRange(ranges[value] || ranges.all);
  };

  const applyCustomRange = () => {
    if (!customRange.startDate || !customRange.endDate || customRange.startDate > customRange.endDate) {
      showAlert('Invalid date range', 'Choose a valid start and end date.', { variant: 'warning' });
      return;
    }
    setDateRange({ preset: 'custom', ...customRange });
    setPage(1);
  };

  const saveEntry = async () => {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert('Invalid amount', 'Enter an amount greater than zero.', { variant: 'warning' });
      return;
    }
    if (!entry.description.trim() || entry.description.trim().length > 2000) {
      showAlert('Description required', 'Enter a description of up to 2,000 characters.', { variant: 'warning' });
      return;
    }
    if (entry.related_reference.trim().length > 100) {
      showAlert('Reference is too long', 'The related reference must be 100 characters or fewer.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const idempotencyKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      await api.post('/funds/transactions', {
        ...entry,
        transaction_date: entry.transaction_date.length === 16
          ? `${entry.transaction_date}:00`
          : entry.transaction_date,
        amount,
        idempotency_key: idempotencyKey,
      });
      setFormOpen(false);
      setEntry(emptyEntry());
      showAlert('Fund entry recorded', 'The transaction was added to your fund ledger.', { variant: 'success' });
      setPage(1);
      await loadData();
    } catch (error) {
      showAlert('Could not save fund entry', inventoryError(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openEntryForm = () => {
    setEntry(emptyEntry());
    setFormOpen(true);
  };

  const renderTransaction = (transaction: Transaction, index: number) => {
    const isDebit = transaction.transaction_type === 'DEBIT';
    const amountColor = isDebit ? '#B42332' : '#087443';
    return (
      <View key={String(transaction.id)} className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-[#8A8F8B]">Entry {(page - 1) * PAGE_SIZE + index + 1}</Text>
            <Text className="mt-1 font-bold text-[#173F35]">{typeLabel(transaction.transaction_type)}</Text>
          </View>
          <Text style={{ color: amountColor }} className="text-base font-extrabold">{currency(transaction.amount)}</Text>
        </View>
        <Text className="mt-2 text-xs text-[#6B7E76]">{displayDate(transaction.transaction_date)}</Text>
        <View className="mt-3 border-t border-[#F1F2EE] pt-3">
          <Text className="text-sm text-[#52645F]">Payment: {transaction.payment_method || '—'}</Text>
          <Text className="mt-1 text-sm text-[#52645F]">Admin: {transaction.admin_name || '—'}</Text>
          <Text className="mt-1 text-sm text-[#52645F]">Description: {transaction.description || '—'}</Text>
          {transaction.related_reference ? (
            <Text className="mt-1 text-sm text-[#52645F]">Reference: {transaction.related_reference}</Text>
          ) : null}
          <Text className="mt-2 text-sm font-bold text-[#173F35]">
            Running Balance: {currency(transaction.running_balance)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Fund Management" sectionLabel="More" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-28"
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
        keyboardShouldPersistTaps="handled">
        <DashboardMetricGrid
          containerClassName="mb-0"
          metrics={statCards.map(({ id, label, value, detail, icon, palette, trendUp }) => ({
            id,
            label,
            value: id === 'fund-entry-count'
              ? loading ? '—' : Number(value || 0).toLocaleString('en-IN')
              : loading && value == null ? '—' : currency(value),
            icon,
            palette,
            trend: detail,
            trendUp,
          }))}
        />

        <View className="mb-3 flex-row items-center rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm">
          <Search size={18} color="#A77B15" />
          <TextInput
            accessibilityLabel="Search fund entries"
            value={search}
            onChangeText={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search description, payment method, or admin"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setSearch('');
                setPage(1);
              }}
              hitSlop={8}>
              <X size={18} color="#6B7E76" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <CustomDropdown
              label="Date range"
              value={preset}
              options={[
                { value: 'all', label: 'All time' },
                { value: 'today', label: 'Today' },
                { value: 'last7', label: 'Last 7 days' },
                { value: 'last30', label: 'Last 30 days' },
                { value: 'last90', label: 'Last 90 days' },
                { value: 'custom', label: 'Custom range' },
              ]}
              onSelect={selectPreset}
            />
          </View>
          <View className="min-w-0 flex-1">
            <CustomDropdown
              label="Transaction type"
              value={transactionType}
              options={[
                { value: 'ALL', label: 'All transaction types' },
                ...TRANSACTION_TYPES,
              ]}
              onSelect={value => {
                setTransactionType(value);
                setPage(1);
              }}
            />
          </View>
        </View>
        {preset === 'custom' ? (
          <>
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <DatePicker
                  label="Start date"
                  value={customRange.startDate}
                  onChange={value => setCustomRange(current => ({ ...current, startDate: value }))}
                  maximumDate={null}
                />
              </View>
              <View className="min-w-0 flex-1">
                <DatePicker
                  label="End date"
                  value={customRange.endDate}
                  onChange={value => setCustomRange(current => ({ ...current, endDate: value }))}
                  minimumDate={customRange.startDate ? new Date(`${customRange.startDate}T00:00:00`) : undefined}
                  maximumDate={null}
                />
              </View>
            </View>
            <Pressable onPress={applyCustomRange} className="mb-4 min-h-11 items-center justify-center rounded-xl bg-[#07564B]">
              <Text className="font-bold text-white">Apply date filter</Text>
            </Pressable>
          </>
        ) : null}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-[#52645F]">View</Text>
          <View className="flex-row rounded-xl bg-[#F3F4F1] p-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show transactions as a list"
              accessibilityState={{ selected: viewMode === 'list' }}
              onPress={() => setViewMode('list')}
              className={`h-10 w-11 items-center justify-center rounded-lg ${viewMode === 'list' ? 'bg-[#07564B]' : ''}`}>
              <List size={18} color={viewMode === 'list' ? 'white' : '#6B7E76'} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show transactions as cards"
              accessibilityState={{ selected: viewMode === 'grid' }}
              onPress={() => setViewMode('grid')}
              className={`h-10 w-11 items-center justify-center rounded-lg ${viewMode === 'grid' ? 'bg-[#07564B]' : ''}`}>
              <LayoutGrid size={18} color={viewMode === 'grid' ? 'white' : '#6B7E76'} />
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
        {loading && transactions.length === 0 ? (
          <View className="py-8"><ActivityIndicator color="#07564B" /></View>
        ) : transactions.length ? (
          <View className={viewMode === 'grid' ? 'flex-row flex-wrap justify-between' : ''}>
            {transactions.map((transaction, index) => (
              <View key={String(transaction.id)} className={viewMode === 'grid' ? 'w-[48%]' : 'w-full'}>
                {renderTransaction(transaction, index)}
              </View>
            ))}
          </View>
        ) : !loadError ? (
          <View className="items-center rounded-2xl bg-white p-8">
            <Text className="font-bold text-[#173F35]">No fund entries found</Text>
            <Text className="mt-1 text-sm text-[#6B7E76]">Try changing the filters or add a new entry.</Text>
          </View>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-[#6B7E76]">
            Showing {firstItem} to {lastItem} of {total} entries
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Previous fund page"
              disabled={page <= 1}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
              <ChevronLeft size={18} color="#07564B" />
            </Pressable>
            <Text className="text-xs font-bold text-[#52645F]">{page} / {pageCount}</Text>
            <Pressable
              accessibilityLabel="Next fund page"
              disabled={page >= pageCount}
              onPress={() => setPage(current => Math.min(pageCount, current + 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
              <ChevronRight size={18} color="#07564B" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        collapsable={false}
        style={styles.floatingActionButtonLayer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add fund entry"
          accessibilityHint="Opens the form to record a fund transaction"
          onPress={openEntryForm}
          hitSlop={10}
          style={[styles.floatingActionButton, { bottom: Math.max(insets.bottom, 20) }]}
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
          <Plus size={24} color="white" />
        </Pressable>
      </View>

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => { if (!saving) setFormOpen(false); }}>
        <View className="flex-1 bg-[#F8F7F2]">
          <View className="flex-row items-center justify-between bg-[#173F35] px-5 pb-4 pt-12">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">Fund Management</Text>
              <Text className="mt-1 text-lg font-extrabold text-white">Add Fund Entry</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close fund entry form"
              disabled={saving}
              onPress={() => setFormOpen(false)}>
              <X size={22} color="#EAD78A" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerClassName="p-4 pb-10"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            <View className="rounded-2xl bg-white p-4">
              <Text className="mb-4 text-sm text-[#6B7E76]">This entry will be attached to your admin account.</Text>
              <CustomDropdown
                label="Transaction type"
                value={entry.transaction_type}
                options={TRANSACTION_TYPES}
                onSelect={value => setEntry(current => ({ ...current, transaction_type: value }))}
                required
              />
              <DatePicker
                label="Transaction date"
                value={entry.transaction_date.slice(0, 10)}
                onChange={value => setEntry(current => ({
                  ...current,
                  transaction_date: `${value}T${current.transaction_date.slice(11, 16) || '12:00'}`,
                }))}
                maximumDate={null}
              />
              <TimePickerField
                value={entry.transaction_date.slice(11, 16) || '12:00'}
                onChange={value => setEntry(current => ({
                  ...current,
                  transaction_date: `${current.transaction_date.slice(0, 10)}T${value}`,
                }))}
              />
              <Field
                label="Amount"
                value={entry.amount}
                onChangeText={value => setEntry(current => ({ ...current, amount: value }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                required
              />
              <CustomDropdown
                label="Payment method"
                value={entry.payment_method}
                options={PAYMENT_METHODS.map(value => ({ value, label: value }))}
                onSelect={value => setEntry(current => ({ ...current, payment_method: value }))}
                required
              />
              <Field
                label="Description"
                value={entry.description}
                onChangeText={value => setEntry(current => ({ ...current, description: value }))}
                multiline
                placeholder="Describe this fund entry"
                required
              />
              <Field
                label="Related reference (optional)"
                value={entry.related_reference}
                onChangeText={value => setEntry(current => ({ ...current, related_reference: value }))}
                placeholder="Invoice, receipt, or reference number"
              />
            </View>
            <View className="mt-4">
              <SubmitButton label="Save Entry" loading={saving} onPress={saveEntry} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
