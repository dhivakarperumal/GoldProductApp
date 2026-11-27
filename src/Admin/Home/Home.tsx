import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  CreditCard,
  Gem,
  IndianRupee,
  LayoutDashboard,
  Package,
  RefreshCw,
  Store,
  Users,
  XCircle,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import api from '../../api';
import type { AdminTab } from '../Navigation/AdminTabBar';

type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
};

type RecentLoan = {
  id: number | string;
  loan_number?: string;
  customer?: string;
  customer_name?: string;
  jewellery?: string;
  jewellery_type?: string;
  gold_purity?: string;
  principal_amount?: string | number;
  amount?: string | number;
  status?: string;
  loan_status?: string;
  loan_date?: string;
  date?: string;
};

type RevenueTrend = {
  label: string;
  revenue: number;
};

type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_unit?: string | number;
  rate_per_gram?: string | number;
  rate_unit?: string;
};

type Product = {
  id: number | string;
  name: string;
  cat?: string;
  category?: string;
  price?: string | number | null;
  final_selling_price?: string | number | null;
  offer_price?: string | number | null;
  mrp?: string | number | null;
  total_stock?: number;
  stock_status?: string;
};

type DashboardData = {
  stats: DashboardMetric[];
  loanStatusCounts?: Record<string, number>;
  revenueTrends?: RevenueTrend[];
  goldRates?: GoldRate[];
  recentLoans?: RecentLoan[];
  topProducts?: Product[];
};

type HomeProps = {
  onNavigate: (tab: AdminTab) => void;
};

const metricIcons = {
  total_customers: Users,
  active_gold_loans: IndianRupee,
  today_collection: CalendarDays,
  gold_stock_value: Gem,
  total_products: Package,
  total_categories: LayoutDashboard,
  completed_loans: CalendarDays,
  low_stock_products: XCircle,
} as const;

type MetricPalette = {
  start: string;
  middle: string;
  end: string;
  glow: string;
  border: string;
};

const metricPalettes: Record<string, MetricPalette> = {
  total_customers: {
    start: '#003D15',
    middle: '#006B29',
    end: '#002E12',
    glow: '#98FF4F',
    border: '#F6D25D',
  },
  active_gold_loans: {
    start: '#542700',
    middle: '#925500',
    end: '#3D1A00',
    glow: '#FFD33F',
    border: '#FFE071',
  },
  today_collection: {
    start: '#650447',
    middle: '#A0006C',
    end: '#3D0759',
    glow: '#FF79D4',
    border: '#FFD66E',
  },
  gold_stock_value: {
    start: '#003C47',
    middle: '#006B78',
    end: '#002A41',
    glow: '#53F2E0',
    border: '#FFD66E',
  },
  total_products: {
    start: '#793100',
    middle: '#B95700',
    end: '#5A2200',
    glow: '#FFD34D',
    border: '#FFE071',
  },
  total_categories: {
    start: '#470862',
    middle: '#79118D',
    end: '#35074F',
    glow: '#FF75DC',
    border: '#FFD66E',
  },
  completed_loans: {
    start: '#043955',
    middle: '#0A5B80',
    end: '#032843',
    glow: '#64DCFF',
    border: '#FFD66E',
  },
  low_stock_products: {
    start: '#60142A',
    middle: '#8B243C',
    end: '#3E0D24',
    glow: '#FF8AA3',
    border: '#FFD66E',
  },
};

const styles = StyleSheet.create({
  metricCard: {
    aspectRatio: 1.75,
    borderWidth: 1.5,
    elevation: 5,
    shadowColor: '#FFC837',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.58,
    shadowRadius: 6,
  },
  metricIcon: {
    elevation: 4,
    shadowColor: '#FFD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
});

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Dashboard data could not be loaded.';
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function MetricCardArtwork({
  id,
  palette,
}: {
  id: string;
  palette: MetricPalette;
}) {
  const gradientId = `metric-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const glowId = `${gradientId}-glow`;
  const goldGlowId = `${gradientId}-gold-glow`;
  const shineId = `${gradientId}-shine`;

  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="0 0 220 112"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={palette.start} />
          <Stop offset="48%" stopColor={palette.middle} />
          <Stop offset="100%" stopColor={palette.end} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={palette.glow} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={goldGlowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFF3A6" stopOpacity="0.85" />
          <Stop offset="42%" stopColor="#FFC629" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#FFC629" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={shineId} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E5970E" stopOpacity="0" />
          <Stop offset="45%" stopColor="#FFD454" stopOpacity="0.72" />
          <Stop offset="58%" stopColor="#FFF8D6" stopOpacity="0.98" />
          <Stop offset="72%" stopColor="#FFCF39" stopOpacity="0.75" />
          <Stop offset="100%" stopColor="#FFF4B0" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width="220" height="112" rx="19" fill={`url(#${gradientId})`} />
      <Circle cx="16" cy="104" r="52" fill={`url(#${glowId})`} opacity="0.62" />
      <Circle cx="205" cy="18" r="54" fill={`url(#${glowId})`} opacity="0.46" />
      <Circle cx="9" cy="14" r="28" fill={`url(#${goldGlowId})`} opacity="0.42" />
      <Circle cx="218" cy="106" r="42" fill={`url(#${goldGlowId})`} opacity="0.78" />
      <Path
        d="M126 119 C157 105 177 84 235 62"
        fill="none"
        stroke={`url(#${shineId})`}
        strokeWidth="23"
        opacity="0.62"
      />
      <Path
        d="M149 119 C174 103 192 88 235 72"
        fill="none"
        stroke="#FFD54B"
        strokeWidth="9"
        opacity="0.78"
      />
      <Path
        d="M167 118 C187 104 204 91 235 80"
        fill="none"
        stroke={`url(#${shineId})`}
        strokeWidth="4"
        opacity="0.92"
      />
      <Path
        d="M171 111 C190 98 207 86 220 79"
        fill="none"
        stroke="#FFF9D7"
        strokeWidth="1.4"
        opacity="0.9"
      />
      <Rect
        x="1"
        y="1"
        width="218"
        height="110"
        rx="18"
        fill="none"
        stroke="#FFF0A6"
        strokeOpacity="0.68"
        strokeWidth="1.5"
      />
    </Svg>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] || Store;
  const palette = metricPalettes[metric.id] || {
    start: '#064D42',
    middle: '#087A68',
    end: '#063A37',
    glow: '#75F0C1',
    border: '#F6D25D',
  };
  const TrendIcon = metric.trendUp === false ? ArrowDown : ArrowUp;
  const trendColor = metric.trendUp === false ? '#E53935' : '#2EAD48';

  return (
    <View
      testID={`dashboard-metric-${metric.id}`}
      className="min-h-[104px] flex-1 basis-[45%] overflow-hidden rounded-[20px] border p-3"
      style={[
        styles.metricCard,
        { backgroundColor: palette.start, borderColor: palette.border },
      ]}>
      <MetricCardArtwork id={metric.id} palette={palette} />
      <View className="flex-row items-start">
        <View
          className="mr-2 h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#FFE078] bg-black/20"
          style={styles.metricIcon}>
          <Icon size={23} color="#FFE08A" strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1 pt-0.5">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className="text-[11px] font-semibold leading-[14px] text-white">
            {metric.label}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="mt-0.5 text-[21px] font-black text-[#FFE28A]">
            {metric.value}
          </Text>
        </View>
        <View className="ml-1 h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/10">
          <ChevronRight size={15} color="#FFF4C7" />
        </View>
      </View>
      {metric.trend ? (
        <View className="absolute bottom-2 left-[58px] right-2 flex-row items-center rounded-full bg-black/25 py-1 pl-1 pr-2">
          <View
            className="mr-1 h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: trendColor }}>
            <TrendIcon size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="min-w-0 flex-1 text-[9px] font-bold text-white">
            {metric.trend}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function Home({ onNavigate }: HomeProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [loans, setLoans] = useState<RecentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    setErrorMessage('');
    const results = await Promise.allSettled([
      api.get('/dashboard', {
        params: { datePreset: 'all', startDate: '', endDate: '' },
      }),
      api.get('/loans'),
      api.get('/gold-rates/current'),
    ]);

    const errors: string[] = [];
    const [dashboardResult, loansResult, ratesResult] = results;

    if (dashboardResult.status === 'fulfilled') {
      if (Array.isArray(dashboardResult.value.data?.stats)) {
        setDashboard(dashboardResult.value.data as DashboardData);
      } else {
        errors.push('Dashboard API returned no metrics.');
      }
    } else {
      errors.push(`Dashboard: ${getErrorMessage(dashboardResult.reason)}`);
    }

    if (loansResult.status === 'fulfilled') {
      if (Array.isArray(loansResult.value.data)) {
        setLoans(loansResult.value.data as RecentLoan[]);
      } else {
        errors.push('Loans API returned an invalid list.');
      }
    } else {
      errors.push(`Loans: ${getErrorMessage(loansResult.reason)}`);
    }

    if (ratesResult.status === 'fulfilled') {
      const currentRateSet = ratesResult.value.data;
      if (currentRateSet === null || currentRateSet?.rates?.length === 0) {
        const dashboardRates =
          dashboardResult.status === 'fulfilled' &&
          Array.isArray(dashboardResult.value.data?.goldRates)
            ? dashboardResult.value.data.goldRates
            : [];
        setGoldRates(dashboardRates);
      } else if (Array.isArray(currentRateSet?.rates)) {
        setGoldRates(currentRateSet.rates);
      } else {
        errors.push('Gold rates API returned an invalid response.');
      }
    } else {
      errors.push(`Gold rates: ${getErrorMessage(ratesResult.reason)}`);
    }

    setErrorMessage(errors.join(' '));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const revenueTrends = dashboard?.revenueTrends || [];
  const maxRevenue = Math.max(...revenueTrends.map(item => item.revenue), 1);
  const loanStatuses = Object.entries(dashboard?.loanStatusCounts || {});
  const recentLoans = (
    loans.length > 0 ? loans : dashboard?.recentLoans || []
  ).slice(0, 5);
  const products = dashboard?.topProducts || [];
  return (
    <ScrollView
      testID="admin-home"
      className="flex-1 bg-[#F8F7F2]"
      contentContainerClassName="px-4 py-5"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View className="mb-5 overflow-hidden rounded-3xl bg-[#173F35] p-5">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
          Welcome to
        </Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">
          Admin Dashboard
        </Text>
        <Text className="mt-2 text-sm text-[#DCE8E4]">
          Your shop overview, inventory, and gold loan activity.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh dashboard"
          onPress={onRefresh}
          disabled={refreshing}
          className="mt-4 h-10 w-10 items-center justify-center self-end rounded-full border border-white/30 bg-white/10">
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {errorMessage ? (
        <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
          <Text className="text-sm text-[#991B1B]">{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            className="mt-2 self-start">
            <Text className="text-sm font-bold text-[#991B1B]">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View className="mb-5 items-center py-4">
          <ActivityIndicator color="#B8860B" />
        </View>
      ) : null}

      <View className="mb-3 flex-row items-center">
        <View className="h-px flex-1 bg-[#D7AA3D]" />
        <View className="mx-3 h-2 w-2 rotate-45 bg-[#D7AA3D]" />
        <Text className="text-base font-extrabold text-[#173F35]">Overview</Text>
        <View className="mx-3 h-2 w-2 rotate-45 bg-[#D7AA3D]" />
        <View className="h-px flex-1 bg-[#D7AA3D]" />
      </View>
      <Text className="mb-3 -mt-2 text-center text-xs text-[#8A8F8B]">
        Track your key numbers
      </Text>
      <View className="mb-5 flex-row flex-wrap gap-3">
        {(dashboard?.stats || []).map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </View>

      <View className="mb-5 rounded-2xl bg-[#003B3B] p-4">
        <View className="mb-3 flex-row items-center">
          <Gem size={18} color="#F5C45E" />
          <Text className="ml-2 text-base font-bold text-white">
            Precious Metal Rates
          </Text>
        </View>
        {goldRates.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {goldRates.map(rate => (
              <View
                key={`${rate.metal_type}-${rate.purity}`}
                className="min-w-[30%] flex-1 rounded-xl border border-white/10 bg-white/10 p-3">
                <Text className="text-[10px] font-semibold text-[#DCE8E4]">
                  {rate.metal_type} · {rate.purity}
                </Text>
                <Text className="mt-1 text-sm font-extrabold text-white">
                  {formatCurrency(rate.rate_per_unit ?? rate.rate_per_gram)}
                  <Text className="text-[10px] font-medium text-[#DCE8E4]">
                    {' '}
                    /{rate.rate_unit === 'carat' ? 'ct' : 'g'}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-[#DCE8E4]">
            No active metal rates are configured.
          </Text>
        )}
      </View>

      <View className="mb-5 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <Text className="text-base font-bold text-[#173F35]">
          Revenue Overview
        </Text>
        <Text className="mt-1 text-xs text-[#8A8F8B]">
          Shop billing activity
        </Text>
        <View className="mt-5 h-36 flex-row items-end justify-between">
          {revenueTrends.length > 0 ? (
            revenueTrends.slice(-6).map((item, index) => (
              <View
                key={`${item.label}-${index}`}
                className="flex-1 items-center">
                <Text className="mb-1 text-[9px] font-bold text-[#6B7280]">
                  ₹{Math.round(item.revenue).toLocaleString('en-IN')}
                </Text>
                <View
                  className="w-[55%] rounded-t-lg bg-[#B8860B]"
                  style={{
                    height: Math.max((item.revenue / maxRevenue) * 112, 8),
                  }}
                />
                <Text
                  numberOfLines={1}
                  className="mt-2 text-[9px] text-[#8A8F8B]">
                  {item.label}
                </Text>
              </View>
            ))
          ) : (
            <Text className="m-auto text-sm text-[#9CA3AF]">
              No revenue data available
            </Text>
          )}
        </View>
      </View>

      <View className="mb-5 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <Text className="mb-3 text-base font-bold text-[#173F35]">
          Loan Status
        </Text>
        {loanStatuses.length > 0 ? (
          loanStatuses.map(([status, count]) => (
            <View
              key={status}
              className="flex-row justify-between border-b border-[#F3F0E8] py-3 last:border-b-0">
              <Text className="text-sm text-[#6B7280]">{status}</Text>
              <Text className="text-sm font-bold text-[#173F35]">
                {Number(count).toLocaleString('en-IN')}
              </Text>
            </View>
          ))
        ) : (
          <Text className="py-3 text-sm text-[#9CA3AF]">
            No loan data available
          </Text>
        )}
      </View>

      <View className="mb-5 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-[#173F35]">
            Recent Loans
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate('Loans')}>
            <Text className="text-xs font-bold text-[#A77B15]">View all</Text>
          </Pressable>
        </View>
        {recentLoans.length > 0 ? (
          recentLoans.map(loan => (
            <View
              key={loan.id}
              className="border-b border-[#F3F0E8] py-3 last:border-b-0">
              <View className="flex-row items-center justify-between">
                <Text
                  numberOfLines={1}
                  className="flex-1 pr-2 text-sm font-bold text-[#173F35]">
                  {loan.customer_name || loan.customer || 'Customer'}
                </Text>
                <Text className="text-xs font-bold text-[#173F35]">
                  {typeof loan.amount === 'string' && loan.amount.includes('₹')
                    ? loan.amount
                    : formatCurrency(loan.amount ?? loan.principal_amount)}
                </Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text numberOfLines={1} className="text-xs text-[#6B7280]">
                  {[loan.jewellery_type, loan.gold_purity]
                    .filter(Boolean)
                    .join(' · ') ||
                    loan.jewellery ||
                    loan.loan_number ||
                    `Loan ${loan.id}`}
                </Text>
                <Text className="ml-2 text-xs text-[#8A8F8B]">
                  {loan.loan_status || loan.status || '—'} ·{' '}
                  {loan.date || formatDate(loan.loan_date)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="py-3 text-sm text-[#9CA3AF]">
            No recent loans
          </Text>
        )}
      </View>

      <View className="mb-5 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-[#173F35]">
            Latest Products
          </Text>
          <Package size={18} color="#A77B15" />
        </View>
        {products.length > 0 ? (
          products.map(product => (
            <View
              key={product.id}
              className="flex-row items-center justify-between border-b border-[#F3F0E8] py-3 last:border-b-0">
              <View className="flex-1 pr-3">
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-[#173F35]">
                  {product.name}
                </Text>
                <Text className="mt-1 text-xs text-[#8A8F8B]">
                  {product.category || product.cat || 'Jewellery'}
                  {product.total_stock !== undefined
                    ? ` · ${product.total_stock} in stock`
                    : ''}
                </Text>
              </View>
              <Text className="text-sm font-extrabold text-[#173F35]">
                {formatCurrency(
                  product.final_selling_price ??
                    product.offer_price ??
                    product.mrp ??
                    product.price,
                )}
              </Text>
            </View>
          ))
        ) : (
          <Text className="py-3 text-sm text-[#9CA3AF]">
            No products found.
          </Text>
        )}
      </View>

      <View className="mb-2 flex-row flex-wrap gap-3">
        {[
          {
            label: 'Orders',
            tab: 'Orders' as const,
            icon: ChartNoAxesColumn,
          },
          { label: 'Loans', tab: 'Loans' as const, icon: Store },
          { label: 'Products', tab: 'Products' as const, icon: CreditCard },
        ].map(({ label, tab, icon: Icon }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => onNavigate(tab)}
            className="min-h-[88px] flex-1 basis-[100px] items-center justify-center rounded-xl border border-[#ECE7D8] bg-white px-2">
            <Icon size={22} color="#B8860B" />
            <Text className="mt-2 text-center text-xs font-bold text-[#374151]">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
