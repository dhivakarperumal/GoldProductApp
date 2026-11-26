import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  CreditCard,
  Gem,
  Package,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  XCircle,
} from 'lucide-react-native';
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
  id: number;
  loan_number?: string;
  customer_name?: string;
  jewellery_type?: string;
  gold_purity?: string;
  principal_amount?: string | number;
  loan_status?: string;
  loan_date?: string;
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
  id: number;
  name: string;
  category?: string;
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
};

type HomeProps = {
  onNavigate: (tab: AdminTab) => void;
};

const metricIcons = {
  total_customers: Users,
  active_gold_loans: ShieldCheck,
  today_collection: ChartNoAxesColumn,
  gold_stock_value: ShieldCheck,
  total_products: Building2,
  total_categories: Store,
  completed_loans: CalendarDays,
  low_stock_products: XCircle,
} as const;

const metricAccents: Record<string, string> = {
  total_customers: '#07564B',
  active_gold_loans: '#B8860B',
  today_collection: '#28708A',
  gold_stock_value: '#536D76',
  total_products: '#7138E8',
  total_categories: '#087D70',
  completed_loans: '#28708A',
  low_stock_products: '#A94760',
};

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

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] || Store;
  const accent = metricAccents[metric.id] || '#07564B';
  return (
    <View className="min-h-[142px] flex-1 basis-[145px] rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View
        className="mb-3 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent }}>
        <Icon size={20} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text className="text-xs font-semibold text-[#6B7280]">
        {metric.label}
      </Text>
      <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
        {metric.value}
      </Text>
      {metric.trend ? (
        <Text
          className={`mt-2 text-[10px] ${
            metric.trendUp === false ? 'text-[#A94760]' : 'text-[#6B7280]'
          }`}>
          {metric.trend}
        </Text>
      ) : null}
    </View>
  );
}

export default function Home({ onNavigate }: HomeProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [loans, setLoans] = useState<RecentLoan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    setErrorMessage('');
    const results = await Promise.allSettled([
      api.get('/dashboard', {
        params: { datePreset: 'all', startDate: '', endDate: '' },
      }),
      api.get('/gold-rates/current'),
      api.get('/loans', { params: { startDate: '', endDate: '' } }),
      api.get('/products/mine', { params: { page: 1, limit: 5 } }),
    ]);

    const errors: string[] = [];
    const [dashboardResult, ratesResult, loansResult, productsResult] = results;

    if (dashboardResult.status === 'fulfilled') {
      if (Array.isArray(dashboardResult.value.data?.stats)) {
        setDashboard(dashboardResult.value.data as DashboardData);
      } else {
        errors.push('Dashboard API returned no metrics.');
      }
    } else {
      errors.push(`Dashboard: ${getErrorMessage(dashboardResult.reason)}`);
    }

    if (ratesResult.status === 'fulfilled') {
      const currentRateSet = ratesResult.value.data;
      if (currentRateSet === null) {
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

    if (loansResult.status === 'fulfilled') {
      if (Array.isArray(loansResult.value.data)) {
        setLoans(loansResult.value.data as RecentLoan[]);
      } else {
        errors.push('Loans API returned an invalid list.');
      }
    } else {
      errors.push(`Loans: ${getErrorMessage(loansResult.reason)}`);
    }

    if (productsResult.status === 'fulfilled') {
      const productList = productsResult.value.data?.products;
      if (Array.isArray(productList)) {
        setProducts(productList as Product[]);
      } else {
        errors.push('Products API returned an invalid list.');
      }
    } else {
      errors.push(`Products: ${getErrorMessage(productsResult.reason)}`);
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
  const recentLoans = loans.slice(0, 5);

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
                  {loan.customer_name || 'Customer'}
                </Text>
                <Text className="text-xs font-bold text-[#173F35]">
                  {formatCurrency(loan.principal_amount)}
                </Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text numberOfLines={1} className="text-xs text-[#6B7280]">
                  {[loan.jewellery_type, loan.gold_purity]
                    .filter(Boolean)
                    .join(' · ') || loan.loan_number || `Loan ${loan.id}`}
                </Text>
                <Text className="ml-2 text-xs text-[#8A8F8B]">
                  {loan.loan_status || '—'} · {formatDate(loan.loan_date)}
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
                  {product.category || 'Jewellery'} · {product.total_stock || 0}{' '}
                  in stock
                </Text>
              </View>
              <Text className="text-sm font-extrabold text-[#173F35]">
                {formatCurrency(
                  product.final_selling_price ??
                    product.offer_price ??
                    product.mrp,
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
