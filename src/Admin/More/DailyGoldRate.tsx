import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { CustomDropdown, DatePicker, Field } from '../Loans/FormControls';
import { inventoryError } from '../Products/inventory';
import { TimePickerField } from './FundManagement';

type Props = { onBack: () => void };
type RateField = {
  key: string;
  label: string;
  metal: string;
  purity: string;
  unit: 'gram' | 'carat';
};
type RateValues = Record<string, string>;
type RateBatch = {
  id: number | string;
  batch_id: string;
  status: 'Draft' | 'Active' | 'Archived';
  rate_date: string;
  effective_from: string;
  making_charge_type: string;
  making_charge_value: string | number;
  wastage_percentage: string | number;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string;
  version?: number;
  rates: Array<{
    id?: number;
    metal_type: string;
    purity: string;
    rate_per_gram: number | string;
    rate_per_unit?: number | string;
    rate_unit?: string;
  }>;
};
type RateHistoryItem = {
  id: number | string;
  batch_id: string;
  metal_type: string;
  purity: string;
  rate_unit: string;
  previous_rate?: number | string | null;
  new_rate?: number | string | null;
  action: string;
  reason: string;
  changed_by?: string;
  updated_by_name?: string;
  changed_at: string;
};
type RateForm = {
  id: number | string | null;
  expected_version: number | null;
  status: string;
  rate_date: string;
  effective_from: string;
  making_charge_type: string;
  making_charge_value: string;
  wastage_percentage: string;
  reason: string;
  rates: RateValues;
  created_by?: string;
  created_by_name?: string;
  created_at?: string | null;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string | null;
};

const RATE_FIELDS: RateField[] = [
  { key: 'gold_999', label: 'Gold 24K (999)', metal: 'Gold', purity: '999', unit: 'gram' },
  { key: 'gold_916', label: 'Gold 22K (916)', metal: 'Gold', purity: '916', unit: 'gram' },
  { key: 'gold_833', label: 'Gold 20K (833)', metal: 'Gold', purity: '833', unit: 'gram' },
  { key: 'gold_750', label: 'Gold 18K (750)', metal: 'Gold', purity: '750', unit: 'gram' },
  { key: 'gold_585', label: 'Gold 14K (585)', metal: 'Gold', purity: '585', unit: 'gram' },
  { key: 'silver_999', label: 'Silver 999', metal: 'Silver', purity: '999', unit: 'gram' },
  { key: 'platinum_950', label: 'Platinum 950', metal: 'Platinum', purity: '950', unit: 'gram' },
  { key: 'platinum_900', label: 'Platinum 900', metal: 'Platinum', purity: '900', unit: 'gram' },
  { key: 'diamond_df_vvs', label: 'Diamond D–F / VVS', metal: 'Diamond', purity: 'D-F / VVS', unit: 'carat' },
  { key: 'diamond_gh_vs', label: 'Diamond G–H / VS', metal: 'Diamond', purity: 'G-H / VS', unit: 'carat' },
  { key: 'diamond_ij_si', label: 'Diamond I–J / SI', metal: 'Diamond', purity: 'I-J / SI', unit: 'carat' },
];
const RATE_METALS = ['Gold', 'Silver', 'Platinum', 'Diamond'];
const HISTORY_PAGE_SIZE = 10;

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateTime(date: Date) {
  return `${localDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function currency(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
}

function displayDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
}

function formatRateDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function blankForm(): RateForm {
  const now = new Date();
  return {
    id: null,
    expected_version: null,
    status: 'Draft',
    rate_date: localDate(now),
    effective_from: localDateTime(now),
    making_charge_type: 'Percentage',
    making_charge_value: '',
    wastage_percentage: '',
    reason: '',
    rates: Object.fromEntries(RATE_FIELDS.map(({ key }) => [key, ''])),
    created_by: undefined,
    created_by_name: '',
    created_at: null,
    updated_by: undefined,
    updated_by_name: '',
    updated_at: null,
  };
}

function formFromBatch(batch: RateBatch): RateForm {
  const parsedEffective = new Date(batch.effective_from);
  return {
    ...blankForm(),
    id: batch.id,
    expected_version: batch.version || null,
    status: batch.status,
    rate_date: String(batch.rate_date).slice(0, 10),
    effective_from: Number.isNaN(parsedEffective.getTime())
      ? localDateTime(new Date())
      : localDateTime(parsedEffective),
    making_charge_type: batch.making_charge_type,
    making_charge_value: String(batch.making_charge_value),
    wastage_percentage: String(batch.wastage_percentage),
    created_by: batch.created_by,
    created_by_name: batch.created_by_name || '',
    created_at: batch.created_at || null,
    updated_by: batch.updated_by,
    updated_by_name: batch.updated_by_name || '',
    updated_at: batch.updated_at || null,
    rates: Object.fromEntries(RATE_FIELDS.map(({ key, metal, purity }) => {
      const rate = batch.rates.find(item =>
        item.metal_type.toLowerCase() === metal.toLowerCase() && item.purity === purity,
      );
      return [key, rate ? String(rate.rate_per_unit ?? rate.rate_per_gram) : ''];
    })),
  };
}

function nextAvailableRateDate(batches: RateBatch[]) {
  const dates = batches
    .map(batch => batch.rate_date.slice(0, 10))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const latest = dates[dates.length - 1];
  if (!latest || latest < localDate(new Date())) return localDate(new Date());
  const next = new Date(`${latest}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return localDate(next);
}

export default function DailyGoldRate({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<RateBatch | null>(null);
  const [batches, setBatches] = useState<RateBatch[]>([]);
  const [history, setHistory] = useState<RateHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [batchPage, setBatchPage] = useState(1);
  const [changePage, setChangePage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RateForm>(blankForm());
  const [reasonOption, setReasonOption] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<number | string | null>(null);

  const batchPageCount = Math.max(1, Math.ceil(batches.length / HISTORY_PAGE_SIZE));
  const changePageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const visibleBatchPage = Math.min(batchPage, batchPageCount);
  const visibleChangePage = Math.min(changePage, changePageCount);
  const visibleBatches = batches.slice(
    (visibleBatchPage - 1) * HISTORY_PAGE_SIZE,
    visibleBatchPage * HISTORY_PAGE_SIZE,
  );
  const visibleHistory = history.slice(
    (visibleChangePage - 1) * HISTORY_PAGE_SIZE,
    visibleChangePage * HISTORY_PAGE_SIZE,
  );

  const loadData = useCallback(async () => {
    setLoadError('');
    const [currentResult, historyResult] = await Promise.allSettled([
      api.get<RateBatch | null>('/gold-rates/current'),
      api.get<{ batches?: RateBatch[]; history?: RateHistoryItem[] }>('/gold-rates/history'),
    ]);
    const errors: string[] = [];
    if (currentResult.status === 'fulfilled') {
      setCurrent(currentResult.value.data || null);
    } else {
      errors.push(`Current rates: ${inventoryError(currentResult.reason)}`);
      if (__DEV__) console.warn('[DailyGoldRate] Could not load current rates:', currentResult.reason);
    }
    if (historyResult.status === 'fulfilled') {
      const data = historyResult.value.data;
      if (!Array.isArray(data.batches) || !Array.isArray(data.history)) {
        errors.push('The server returned invalid rate history.');
      } else {
        setBatches(data.batches);
        setHistory(data.history);
      }
    } else {
      errors.push(`Rate history: ${inventoryError(historyResult.reason)}`);
      if (__DEV__) console.warn('[DailyGoldRate] Could not load rate history:', historyResult.reason);
    }
    setLoadError(errors.join('\n'));
    setLoading(false);
    setRefreshing(false);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof RateForm>(key: K, value: RateForm[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const setRate = (key: string, value: string) => {
    setForm(previous => ({ ...previous, rates: { ...previous.rates, [key]: value } }));
  };

  const openNewForm = () => {
    setForm({ ...blankForm(), rate_date: nextAvailableRateDate(batches) });
    setReasonOption('');
    setFormOpen(true);
  };

  const editBatch = (batch: RateBatch) => {
    const batchForm = formFromBatch(batch);
    const isDraft = batch.status === 'Draft';
    setForm({
      ...batchForm,
      id: isDraft ? batchForm.id : null,
      expected_version: isDraft ? batchForm.expected_version : null,
      status: 'Draft',
      rate_date: isDraft ? batchForm.rate_date : nextAvailableRateDate(batches),
      effective_from: isDraft ? batchForm.effective_from : localDateTime(new Date()),
      reason: '',
    });
    setReasonOption('');
    setFormOpen(true);
  };

  const deleteDraft = (batch: RateBatch) => {
    if (batch.status !== 'Draft' || deletingBatchId !== null) return;
    showAlert('Delete draft rate set?', `Delete the draft for ${formatRateDate(batch.rate_date)}? This cannot be undone.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingBatchId(batch.id);
            try {
              await api.delete(`/gold-rates/${batch.id}`);
              if (form.id === batch.id) {
                setForm(blankForm());
                setFormOpen(false);
              }
              await loadData();
              showAlert('Draft deleted', 'The draft rate set was deleted.', { variant: 'success' });
            } catch (error) {
              showAlert('Could not delete draft', inventoryError(error), { variant: 'error' });
            } finally {
              setDeletingBatchId(null);
            }
          },
        },
      ],
    });
  };

  const saveAndActivate = async () => {
    if (!form.reason.trim()) {
      showAlert('Reason required', 'Select or enter a reason for this rate change.', { variant: 'warning' });
      return;
    }
    if (!form.rate_date || !form.effective_from) {
      showAlert('Schedule required', 'Choose both the rate date and effective date/time.', { variant: 'warning' });
      return;
    }
    const missingRate = RATE_FIELDS.find(({ key }) =>
      !form.rates[key] || !Number.isFinite(Number(form.rates[key])) || Number(form.rates[key]) <= 0,
    );
    if (missingRate) {
      showAlert('Rate required', `Enter a positive rate for ${missingRate.label}.`, { variant: 'warning' });
      return;
    }
    const makingCharge = Number(form.making_charge_value);
    const wastage = Number(form.wastage_percentage);
    if (!Number.isFinite(makingCharge) || makingCharge < 0 || makingCharge > 10000000) {
      showAlert('Invalid making charge', 'Enter a value between 0 and 10,000,000.', { variant: 'warning' });
      return;
    }
    if (!Number.isFinite(wastage) || wastage < 0 || wastage > 100) {
      showAlert('Invalid wastage', 'Wastage percentage must be between 0 and 100.', { variant: 'warning' });
      return;
    }
    const reason = form.reason.trim();
    showAlert(
      'Activate these rates?',
      'Applicable product prices will be recalculated. Previously issued invoices will retain their saved prices.',
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save & activate',
            onPress: async () => {
              setSaving(true);
              try {
                const payload = {
                  ...form,
                  making_charge_value: makingCharge,
                  wastage_percentage: wastage,
                  rates: Object.fromEntries(
                    Object.entries(form.rates).map(([key, value]) => [key, Number(value)]),
                  ),
                };
                const draftResponse = form.id
                  ? await api.put<RateBatch>(`/gold-rates/${form.id}`, {
                      ...payload,
                      expected_version: form.expected_version,
                    })
                  : await api.post<RateBatch>('/gold-rates', payload);
                setForm({ ...formFromBatch(draftResponse.data), reason });
                const activatedResponse = await api.post<RateBatch & {
                  price_recalculation?: { updated?: number };
                }>(`/gold-rates/${draftResponse.data.id}/activate`, { reason });
                const updatedCount = activatedResponse.data.price_recalculation?.updated;
                setForm(blankForm());
                setFormOpen(false);
                setReasonOption('');
                await loadData();
                showAlert(
                  'Rates activated',
                  Number.isInteger(updatedCount)
                    ? `${updatedCount} product prices recalculated. Invoice history was preserved.`
                    : 'Rates are active for their effective time. Invoice history was preserved.',
                  { variant: 'success' },
                );
              } catch (error) {
                showAlert('Could not activate rates', inventoryError(error), { variant: 'error' });
              } finally {
                setSaving(false);
              }
            },
          },
        ],
      },
    );
  };

  const currentStatus = loading ? 'Loading' : current?.status || 'Not configured';

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Daily Gold Rate" sectionLabel="More · Settings" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#07564B"
          />
        }>
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-[#173F35]">Daily Precious Rates</Text>
            <Text className="mt-1 text-sm text-[#6B7E76]">Manage your shop’s active and scheduled rates.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openNewForm}
            className="ml-2 flex-row items-center gap-2 rounded-xl bg-[#07564B] px-3 py-3">
            <Plus size={18} color="white" />
            <Text className="text-xs font-extrabold text-white">New Rate Set</Text>
          </Pressable>
        </View>

        <View className="mb-4 rounded-2xl bg-[#07564B] p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#C5E7DA]">
                Currently applied rate set
              </Text>
              <Text className="mt-2 text-base font-extrabold text-white">
                {loading
                  ? 'Loading current rates...'
                  : current
                    ? `${formatRateDate(current.rate_date)} · effective ${displayDate(current.effective_from)}`
                    : 'No active rate has been configured.'}
              </Text>
              {current ? (
                <Text className="mt-2 text-xs leading-5 text-[#DCE8E4]">
                  Created by {current.created_by_name || current.created_by || 'Unknown'} · {displayDate(current.created_at)}
                  {'\n'}Updated by {current.updated_by_name || current.updated_by || 'Unknown'} · {displayDate(current.updated_at)}
                </Text>
              ) : null}
            </View>
            <Text className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{currentStatus}</Text>
          </View>
          {current ? (
            <>
              {RATE_METALS.map(metal => (
                <View key={metal} className="mt-4 border-t border-white/15 pt-3">
                  <Text className="mb-2 text-sm font-bold text-[#EAD78A]">{metal}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {RATE_FIELDS.filter(field => field.metal === metal).map(field => {
                      const rate = current.rates.find(item =>
                        item.metal_type.toLowerCase() === metal.toLowerCase() &&
                        item.purity === field.purity,
                      );
                      return (
                        <View key={field.key} className="min-w-[45%] flex-1 rounded-xl bg-white/10 p-3">
                          <Text className="text-[10px] font-semibold text-[#DCE8E4]">{field.label}</Text>
                          <Text className="mt-1 text-sm font-extrabold text-white">
                            {rate ? `${currency(rate.rate_per_unit ?? rate.rate_per_gram)} / ${field.unit === 'carat' ? 'ct' : 'g'}` : 'Not set'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View className="mt-4 flex-row gap-2 border-t border-white/15 pt-3">
                <View className="flex-1 rounded-xl bg-white/10 p-3">
                  <Text className="text-[10px] font-semibold text-[#DCE8E4]">Default Making Charge</Text>
                  <Text className="mt-1 font-extrabold text-white">
                    {current.making_charge_type === 'Percentage'
                      ? `${Number(current.making_charge_value).toLocaleString('en-IN')}%`
                      : currency(current.making_charge_value)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-white/10 p-3">
                  <Text className="text-[10px] font-semibold text-[#DCE8E4]">Wastage</Text>
                  <Text className="mt-1 font-extrabold text-white">{Number(current.wastage_percentage).toLocaleString('en-IN')}%</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {loadError ? (
          <View className="mb-4 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm leading-5 text-[#B42332]">{loadError}</Text>
            <Pressable onPress={loadData} className="mt-2 self-start">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {historyLoading ? (
          <ActivityIndicator className="py-5" color="#07564B" />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setHistoryOpen(open => !open)}
              className="mb-4 self-end flex-row items-center gap-2 rounded-xl border border-[#E6E9E3] bg-white px-4 py-3">
              <Eye size={17} color="#07564B" />
              <Text className="text-sm font-bold text-[#173F35]">
                {historyOpen ? 'Hide Rate History' : 'View Rate History'}
              </Text>
            </Pressable>
            {historyOpen ? (
              <>
                <Text className="mb-3 text-lg font-extrabold text-[#173F35]">Rate Sets</Text>
                {visibleBatches.map(batch => (
                  <View key={batch.batch_id} className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 font-extrabold text-[#173F35]">{formatRateDate(batch.rate_date)}</Text>
                      <Text className={`rounded-full px-3 py-1 text-xs font-bold ${
                        batch.status === 'Active'
                          ? 'bg-[#EAF3EF] text-[#07564B]'
                          : batch.status === 'Draft'
                            ? 'bg-[#FFF5D9] text-[#8A6413]'
                            : 'bg-[#F3F4F1] text-[#6B7E76]'
                      }`}>{batch.status}</Text>
                    </View>
                    <Text className="mt-2 text-xs leading-5 text-[#6B7E76]">
                      Effective {displayDate(batch.effective_from)}
                      {'\n'}Created by {batch.created_by_name || batch.created_by || 'Unknown'} · {displayDate(batch.created_at)}
                      {'\n'}Updated by {batch.updated_by_name || batch.updated_by || 'Unknown'} · {displayDate(batch.updated_at)}
                    </Text>
                    <View className="mt-3 flex-row gap-2">
                      {batch.status === 'Draft' || batch.status === 'Active' ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => editBatch(batch)}
                          className="flex-row items-center gap-1 rounded-lg bg-[#EAF3EF] px-3 py-2">
                          <Pencil size={15} color="#07564B" />
                          <Text className="text-xs font-bold text-[#07564B]">{batch.status === 'Draft' ? 'Edit' : 'Edit rates'}</Text>
                        </Pressable>
                      ) : null}
                      {batch.status === 'Draft' ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={deletingBatchId !== null}
                          onPress={() => deleteDraft(batch)}
                          className="flex-row items-center gap-1 rounded-lg bg-[#FFF1F0] px-3 py-2 disabled:opacity-50">
                          <Trash2 size={15} color="#B42332" />
                          <Text className="text-xs font-bold text-[#B42332]">
                            {deletingBatchId === batch.id ? 'Deleting…' : 'Delete'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
                {batches.length === 0 ? (
                  <View className="mb-4 rounded-2xl bg-white p-5">
                    <Text className="text-sm text-[#6B7E76]">No rate sets found.</Text>
                  </View>
                ) : null}
                <View className="mb-5 flex-row items-center justify-between">
                  <Text className="text-xs text-[#6B7E76]">Page {visibleBatchPage} of {batchPageCount}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityLabel="Previous rate sets"
                      disabled={visibleBatchPage <= 1}
                      onPress={() => setBatchPage(page => Math.max(1, page - 1))}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
                      <ChevronLeft size={18} color="#07564B" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Next rate sets"
                      disabled={visibleBatchPage >= batchPageCount}
                      onPress={() => setBatchPage(page => Math.min(batchPageCount, page + 1))}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
                      <ChevronRight size={18} color="#07564B" />
                    </Pressable>
                  </View>
                </View>

                <Text className="mb-3 text-lg font-extrabold text-[#173F35]">Rate Changes</Text>
                {visibleHistory.map(item => (
                  <View key={String(item.id)} className="mb-2 rounded-xl border border-[#E6E9E3] bg-white p-3">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="flex-1 font-bold text-[#173F35]">{item.metal_type} {item.purity} / {item.rate_unit === 'carat' ? 'ct' : 'g'}</Text>
                      <Text className="text-xs font-bold text-[#07564B]">{item.action}</Text>
                    </View>
                    <Text className="mt-1 text-xs text-[#6B7E76]">{displayDate(item.changed_at)}</Text>
                    <Text className="mt-2 text-sm text-[#52645F]">
                      {item.previous_rate == null ? '—' : currency(item.previous_rate)}
                      {' → '}
                      {item.new_rate == null ? '—' : currency(item.new_rate)}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7E76]">
                      {item.updated_by_name || item.changed_by || 'Unknown'} · {item.reason}
                    </Text>
                  </View>
                ))}
                {history.length === 0 ? (
                  <View className="mb-4 rounded-2xl bg-white p-5">
                    <Text className="text-sm text-[#6B7E76]">No rate changes have been recorded.</Text>
                  </View>
                ) : null}
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-xs text-[#6B7E76]">Changes page {visibleChangePage} of {changePageCount}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityLabel="Previous rate changes"
                      disabled={visibleChangePage <= 1}
                      onPress={() => setChangePage(page => Math.max(1, page - 1))}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
                      <ChevronLeft size={18} color="#07564B" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Next rate changes"
                      disabled={visibleChangePage >= changePageCount}
                      onPress={() => setChangePage(page => Math.min(changePageCount, page + 1))}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white disabled:opacity-40">
                      <ChevronRight size={18} color="#07564B" />
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => { if (!saving) setFormOpen(false); }}>
        <KeyboardAvoidingView
          className="flex-1 bg-[#F8F7F2]"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ paddingTop: insets.top + 10 }} className="flex-row items-center justify-between bg-[#173F35] px-5 pb-4">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">Settings · Pricing</Text>
              <Text className="mt-1 text-lg font-extrabold text-white">{form.id ? 'Update Draft Rates' : 'Create Rate Set'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close rate set form"
              disabled={saving}
              onPress={() => setFormOpen(false)}>
              <X size={22} color="#EAD78A" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerClassName="p-4 pb-10"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-1 text-base font-extrabold text-[#173F35]">Schedule & charges</Text>
              {form.id ? (
                <Text className="mb-3 text-xs text-[#6B7E76]">Draft #{form.id} · version {form.expected_version || '—'}</Text>
              ) : null}
              {!form.id && current ? (
                <Text className="mb-3 text-xs leading-5 text-[#6B7E76]">
                  Active rates are copied into a new draft. The rate date is set to the next available date.
                </Text>
              ) : null}
              <DatePicker
                label="Rate Date"
                value={form.rate_date}
                onChange={value => setField('rate_date', value)}
                maximumDate={null}
              />
              <DatePicker
                label="Effective Date"
                value={form.effective_from.slice(0, 10)}
                onChange={value => setField('effective_from', `${value}T${form.effective_from.slice(11, 16) || '12:00'}`)}
                maximumDate={null}
              />
              <TimePickerField
                value={form.effective_from.slice(11, 16) || '12:00'}
                onChange={value => setField('effective_from', `${form.effective_from.slice(0, 10)}T${value}`)}
              />
              <CustomDropdown
                label="Making Charge Type"
                value={form.making_charge_type}
                options={[
                  { value: 'Percentage', label: 'Percentage' },
                  { value: 'Fixed Amount', label: 'Fixed Amount' },
                ]}
                onSelect={value => setField('making_charge_type', value)}
                required
              />
              <Field
                label={`Default Making Charge (${form.making_charge_type === 'Percentage' ? '%' : '₹'})`}
                value={form.making_charge_value}
                onChangeText={value => setField('making_charge_value', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                required
              />
              <Field
                label="Wastage Percentage"
                value={form.wastage_percentage}
                onChangeText={value => setField('wastage_percentage', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                required
              />
            </View>

            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-1 text-base font-extrabold text-[#173F35]">Metal & diamond prices</Text>
              <Text className="mb-4 text-xs leading-5 text-[#6B7E76]">Enter a positive price for every listed purity.</Text>
              {RATE_METALS.map(metal => (
                <View key={metal} className="mb-4 border-t border-[#F1F2EE] pt-4 first:border-t-0 first:pt-0">
                  <Text className="mb-3 font-extrabold text-[#07564B]">{metal}</Text>
                  {RATE_FIELDS.filter(field => field.metal === metal).map(field => (
                    <Field
                      key={field.key}
                      label={`${field.label} (₹ / ${field.unit === 'carat' ? 'ct' : 'g'})`}
                      value={form.rates[field.key]}
                      onChangeText={value => setRate(field.key, value)}
                      keyboardType="decimal-pad"
                      placeholder="Enter price"
                      required
                    />
                  ))}
                </View>
              ))}
            </View>

            <View className="mb-4 rounded-2xl bg-white p-4">
              <Text className="mb-1 text-base font-extrabold text-[#173F35]">Audit & activation</Text>
              <Text className="mb-4 text-xs leading-5 text-[#6B7E76]">Record why the rate set is changing for the audit trail.</Text>
              <CustomDropdown
                label="Reason for change"
                value={reasonOption}
                options={[
                  { value: 'Daily market price update', label: 'Daily market price update' },
                  { value: 'Market price correction', label: 'Market price correction' },
                  { value: 'Other', label: 'Other' },
                ]}
                onSelect={value => {
                  setReasonOption(value);
                  setField('reason', value === 'Other' ? '' : value);
                }}
                placeholder="Select a reason"
                required
              />
              {reasonOption === 'Other' ? (
                <Field
                  label="Enter reason"
                  value={form.reason}
                  onChangeText={value => setField('reason', value.slice(0, 500))}
                  placeholder="Reason for this rate change"
                  required
                />
              ) : null}
              <Text className="rounded-xl bg-[#FFF8E6] p-3 text-xs leading-5 text-[#6B5212]">
                Review pending work before activation. Product prices applicable to this rate set may be recalculated; saved invoice history is preserved.
              </Text>
              {form.id ? (
                <Text className="mt-3 text-xs leading-5 text-[#6B7E76]">
                  Created by {form.created_by_name || form.created_by || 'Unknown'} · {displayDate(form.created_at)}
                  {'\n'}Updated by {form.updated_by_name || form.updated_by || 'Unknown'} · {displayDate(form.updated_at)}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setFormOpen(false)}
                className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#E6E9E3] bg-white">
                <Text className="font-bold text-[#52645F]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={saveAndActivate}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#07564B] disabled:opacity-50">
                {saving ? <ActivityIndicator color="white" /> : <Save size={17} color="white" />}
                <Text className="font-extrabold text-white">{saving ? 'Saving…' : 'Save & Activate'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
