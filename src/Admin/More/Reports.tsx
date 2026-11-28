import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import {
  FileSpreadsheet,
  Gem,
  Package,
  Share2,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import { CustomDropdown, DatePicker } from '../Loans/FormControls';
import { shareCsvFile } from '../../utils/shareCsv';

type Props = { onBack: () => void };
type DateRange = { preset: string; startDate: string; endDate: string };
type ReportMetric = {
  id: string;
  label: string;
  value: string | number;
  trend?: string;
};
type RevenueTrend = { label: string; date?: string; revenue: number | string };
type ReportLoan = {
  id: number | string;
  customer?: string;
  jewellery?: string;
  amount?: string | number;
  rawAmount?: number;
  status?: string;
  date?: string;
};
type ReportProduct = {
  id: number | string;
  name: string;
  cat?: string;
  sales?: number | string;
  price?: number | string | null;
  amount?: number | string | null;
};
type ReportsData = {
  stats: ReportMetric[];
  loanStatusCounts?: Record<string, number>;
  totalLoansCount?: number;
  recentLoans?: ReportLoan[];
  topProducts?: ReportProduct[];
  revenueTrends?: RevenueTrend[];
};

const RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Date Range' },
];

const STAT_CARDS = [
  { id: 'total_customers', icon: UsersRound, palette: 'total_customers' },
  { id: 'active_gold_loans', icon: Wallet, palette: 'active_gold_loans' },
  { id: 'total_products', icon: Package, palette: 'total_products' },
  { id: 'gold_stock_value', icon: Gem, palette: 'gold_stock_value' },
] as const;

const DISPLAYED_STATUSES = ['Active', 'Processing', 'Pending', 'Overdue'];

function dateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function resolveDatePreset(preset: string): DateRange {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = (startOfToday.getDay() + 6) % 7;
  const ranges: Record<string, [Date, Date]> = {
    today: [startOfToday, startOfToday],
    yesterday: [shiftDays(startOfToday, -1), shiftDays(startOfToday, -1)],
    this_week: [shiftDays(startOfToday, -weekday), shiftDays(startOfToday, 6 - weekday)],
    last_week: [shiftDays(startOfToday, -weekday - 7), shiftDays(startOfToday, -weekday - 1)],
    this_month: [
      new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1),
      new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0),
    ],
    last_month: [
      new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1),
      new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0),
    ],
    this_year: [new Date(startOfToday.getFullYear(), 0, 1), new Date(startOfToday.getFullYear(), 11, 31)],
    last_year: [new Date(startOfToday.getFullYear() - 1, 0, 1), new Date(startOfToday.getFullYear() - 1, 11, 31)],
  };
  const range = ranges[preset];
  return range
    ? { preset, startDate: dateString(range[0]), endDate: dateString(range[1]) }
    : { preset: 'all', startDate: '', endDate: '' };
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Report data could not be loaded.';
}

function displayCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && value.includes('₹')) return value;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : String(value);
}

function quoteCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function createReportCsv(data: ReportsData, rangeLabel: string) {
  const rows: unknown[][] = [
    ['Gold Shop Report', rangeLabel],
    [],
    ['Metric', 'Value', 'Details'],
    ...(data.stats || []).map(metric => [metric.label, metric.value, metric.trend || '']),
    ['Total loans', data.totalLoansCount ?? 0, 'Filtered total'],
    ...Object.entries(data.loanStatusCounts || {}).map(([status, count]) => [`${status} loans`, count, 'Filtered count']),
    [],
    ['Sales Trend'],
    ['Period', 'Sales (INR)', 'Date'],
    ...(data.revenueTrends || []).map(item => [item.label, item.revenue, item.date || '']),
    [],
    ['Loan Activity'],
    ['Loan ID', 'Customer', 'Jewellery', 'Amount', 'Status', 'Date'],
    ...(data.recentLoans || []).map(loan => [
      loan.id,
      loan.customer,
      loan.jewellery,
      loan.rawAmount || loan.amount,
      loan.status,
      loan.date,
    ]),
    [],
    ['Products'],
    ['Product', 'Category', 'Sales', 'Price'],
    ...(data.topProducts || []).map(product => [
      product.name,
      product.cat,
      product.sales,
      product.price ?? product.amount,
    ]),
  ];
  return rows.map(row => row.map(quoteCsv).join(',')).join('\n');
}

export default function Reports({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const [preset, setPreset] = useState('all');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: '',
  });
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadReports = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await api.get('/dashboard', {
          params: {
            datePreset: dateRange.preset,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
          signal: controller.signal,
        });
        if (!Array.isArray(response.data?.stats)) {
          throw new Error('Dashboard API returned no report metrics.');
        }
        if (!controller.signal.aborted) setReportsData(response.data as ReportsData);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadReports();
    return () => controller.abort();
  }, [dateRange, retryKey]);

  const rangeLabel = useMemo(() => {
    if (dateRange.preset === 'custom') {
      return `${dateRange.startDate} – ${dateRange.endDate}`;
    }
    return RANGE_OPTIONS.find(option => option.value === dateRange.preset)?.label || 'All Time';
  }, [dateRange]);
  const chartValues = reportsData?.revenueTrends || [];
  const chartMax = Math.max(...chartValues.map(item => Number(item.revenue) || 0), 1);
  const chartTotal = chartValues.reduce((total, item) => total + (Number(item.revenue) || 0), 0);
  const statsById = new Map((reportsData?.stats || []).map(metric => [metric.id, metric]));
  const statuses = reportsData?.loanStatusCounts || {};

  const shareSummary = async () => {
    if (!reportsData) return;
    const message = [
      `Gold Shop Report — ${rangeLabel}`,
      ...reportsData.stats.map(metric => `${metric.label}: ${metric.value}`),
      `Total loans: ${reportsData.totalLoansCount ?? 0}`,
    ].join('\n');
    try {
      await Share.share({ title: 'Gold Shop Report', message });
    } catch (error) {
      showAlert('Could not share report', getErrorMessage(error), { variant: 'error' });
    }
  };

  const shareCsv = async () => {
    if (!reportsData) return;
    try {
      const fileRange = rangeLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'all-time';
      await shareCsvFile({
        fileName: `gold-shop-report-${fileRange}.csv`,
        title: 'Gold Shop Report CSV',
        contents: createReportCsv(reportsData, rangeLabel),
      });
    } catch (error) {
      showAlert('Could not share report data', getErrorMessage(error), { variant: 'error' });
    }
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Reports" sectionLabel="Admin insights" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => setRetryKey(key => key + 1)}
            tintColor="#07564B"
          />
        }>
        <View className="mb-4">
          <CustomDropdown
            label="Date range"
            value={preset}
            options={RANGE_OPTIONS}
            onSelect={value => {
              setPreset(value);
              setRangeError('');
              if (value !== 'custom') setDateRange(resolveDatePreset(value));
            }}
          />
          {preset === 'custom' ? (
            <>
              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <DatePicker
                    label="Start date"
                    value={customRange.startDate}
                    maximumDate={null}
                    initialDate={new Date()}
                    onChange={value => setCustomRange(current => ({ ...current, startDate: value }))}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <DatePicker
                    label="End date"
                    value={customRange.endDate}
                    minimumDate={
                      customRange.startDate
                        ? new Date(`${customRange.startDate}T00:00:00`)
                        : undefined
                    }
                    maximumDate={null}
                    initialDate={new Date()}
                    onChange={value => setCustomRange(current => ({ ...current, endDate: value }))}
                  />
                </View>
              </View>
              {rangeError ? (
                <Text accessibilityRole="alert" className="mb-3 text-xs font-semibold text-rose-700">
                  {rangeError}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!customRange.startDate || !customRange.endDate) {
                    setRangeError('Choose both start and end dates.');
                    return;
                  }
                  if (customRange.startDate > customRange.endDate) {
                    setRangeError('Start date cannot be later than end date.');
                    return;
                  }
                  setRangeError('');
                  setDateRange({ preset: 'custom', ...customRange });
                }}
                className="mb-2 items-center rounded-xl bg-[#07564B] px-4 py-3">
                <Text className="font-bold text-white">Apply Filter</Text>
              </Pressable>
            </>
          ) : null}
          <Text className="mb-2 text-xs font-medium text-[#6B7E76]">Showing: {rangeLabel}</Text>
        </View>

        {errorMessage ? (
          <View className="mb-4 items-center rounded-2xl border border-rose-200 bg-white p-5">
            <Text className="mb-3 text-center text-sm text-rose-700">{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetryKey(key => key + 1)}
              className="rounded-xl bg-[#07564B] px-5 py-3">
              <Text className="font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !reportsData ? (
          <AdminLoadingSkeleton variant="dashboard" />
        ) : null}

        {reportsData ? (
          <>
            <DashboardMetricGrid
              metrics={STAT_CARDS.flatMap(({ id, icon, palette }) => {
                const metric = statsById.get(id);
                return metric
                  ? [
                      {
                        id: `report-${id}`,
                        label: metric.label,
                        value: metric.value,
                        icon,
                        palette,
                        trend: metric.trend || rangeLabel,
                      },
                    ]
                  : [];
              })}
            />

            <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4 shadow-sm">
              <View className="mb-4 flex-row items-start justify-between">
                <View>
                  <Text className="text-base font-extrabold text-[#173F35]">Sales trend</Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">Revenue for selected period</Text>
                </View>
                <Text className="text-sm font-extrabold text-[#07564B]">
                  {displayCurrency(chartTotal)}
                </Text>
              </View>
              {chartValues.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="h-48 flex-row items-end border-b border-[#E6E9E3]">
                    {chartValues.map((item, index) => {
                      const revenue = Number(item.revenue) || 0;
                      const barHeight = revenue > 0 ? Math.max((revenue / chartMax) * 86, 4) : 0;
                      const showLabel =
                        chartValues.length <= 8 ||
                        index % Math.ceil(chartValues.length / 8) === 0 ||
                        index === chartValues.length - 1;
                      return (
                        <View key={`${item.date || item.label}-${index}`} className="h-full w-12 items-center justify-end">
                          <View className="w-full flex-1 items-center justify-end pb-7">
                            <View
                              className="w-6 rounded-t-lg bg-[#0A806B]"
                              style={{ height: `${barHeight}%` }}
                            />
                          </View>
                          <Text className="absolute bottom-1 text-[9px] text-[#6B7E76]">
                            {showLabel ? item.label : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <Text className="py-8 text-center text-sm text-[#6B7E76]">
                  No sales recorded for this period.
                </Text>
              )}
            </View>

            <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4 shadow-sm">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-[#173F35]">Loan status</Text>
                <Text className="text-xs font-semibold text-[#6B7E76]">
                  Total: {reportsData.totalLoansCount ?? 0}
                </Text>
              </View>
              {DISPLAYED_STATUSES.map(status => {
                const count = Number(statuses[status]) || 0;
                const total = Math.max(
                  ...DISPLAYED_STATUSES.map(name => Number(statuses[name]) || 0),
                  1,
                );
                return (
                  <View key={status} className="mb-3">
                    <View className="mb-1 flex-row justify-between">
                      <Text className="text-sm text-[#52645F]">{status}</Text>
                      <Text className="text-sm font-bold text-[#173F35]">{count}</Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-[#EDF1EC]">
                      <View
                        className="h-full rounded-full bg-[#0A806B]"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4 shadow-sm">
              <Text className="mb-3 text-base font-extrabold text-[#173F35]">Recent loans</Text>
              {(reportsData.recentLoans || []).length ? (
                reportsData.recentLoans?.map(loan => (
                  <View key={loan.id} className="border-t border-[#F1F2EE] py-3">
                    <View className="flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="font-bold text-[#173F35]">{loan.customer || 'Customer'}</Text>
                        <Text className="mt-1 text-xs text-[#6B7E76]">
                          {loan.id} · {loan.jewellery || 'Jewellery'}
                        </Text>
                        <Text className="mt-1 text-xs text-[#6B7E76]">{loan.date || '—'}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-extrabold text-[#07564B]">
                          {displayCurrency(loan.amount ?? loan.rawAmount)}
                        </Text>
                        <Text className="mt-1 text-xs font-semibold text-[#A77B15]">
                          {loan.status || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="py-4 text-center text-sm text-[#6B7E76]">No loans found.</Text>
              )}
            </View>

            <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4 shadow-sm">
              <Text className="mb-3 text-base font-extrabold text-[#173F35]">Top products</Text>
              {(reportsData.topProducts || []).length ? (
                reportsData.topProducts?.map(product => (
                  <View
                    key={product.id}
                    className="flex-row items-center justify-between border-t border-[#F1F2EE] py-3">
                    <View className="mr-3 flex-1">
                      <Text className="font-bold text-[#173F35]">{product.name}</Text>
                      <Text className="mt-1 text-xs text-[#6B7E76]">
                        {product.cat || 'Jewellery'}
                        {product.sales !== undefined ? ` · Sales: ${product.sales}` : ''}
                      </Text>
                    </View>
                    <Text className="font-extrabold text-[#07564B]">
                      {displayCurrency(product.price ?? product.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="py-4 text-center text-sm text-[#6B7E76]">No products found.</Text>
              )}
            </View>

            <View className="mb-4 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={shareSummary}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-[#07564B] px-3">
                <Share2 size={17} color="white" />
                <Text className="ml-2 text-sm font-bold text-white">Share Report</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={shareCsv}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-[#A77B15] px-3">
                <FileSpreadsheet size={17} color="white" />
                <Text className="ml-2 text-sm font-bold text-white">Share CSV</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
