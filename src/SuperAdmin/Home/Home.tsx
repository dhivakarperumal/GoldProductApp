import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  XCircle,
} from 'lucide-react-native';
import api from '../../api';
import type { SuperAdminTab } from '../Navigation/Bottombar';

type DashboardStats = {
  totalGoldShops?: number;
  activeGoldShops?: number;
  pendingGoldShops?: number;
  rejectedGoldShops?: number;
  totalUsers?: number;
  activeSubscriptions?: number;
  expiredSubscriptions?: number;
  totalRevenue?: number;
  changes?: {
    totalGoldShops?: number;
    totalUsers?: number;
    activeSubscriptions?: number;
    totalRevenue?: number;
  };
};

type AnalyticsItem = {
  label?: string;
  revenue?: number;
  registrations?: number;
  subscriptions?: number;
};

type DashboardAnalytics = {
  monthlyRevenue?: AnalyticsItem[];
  shopRegistrations?: AnalyticsItem[];
  subscriptionGrowth?: AnalyticsItem[];
  shopStatus?: {
    active?: number;
    expired?: number;
  };
};

type HomeProps = {
  onNavigate: (tab: SuperAdminTab) => void;
};

const numberFormatter = new Intl.NumberFormat('en-IN');
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCount(value: number | undefined) {
  return numberFormatter.format(value || 0);
}

function formatCurrency(value: number | undefined) {
  return currencyFormatter.format(value || 0);
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  change?: number;
  icon: typeof Store;
  accent: string;
}) {
  const isPositive = (change || 0) >= 0;
  const showChange = typeof change === 'number';

  return (
    <View className="flex-1 basis-[145px] rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View
        className="mb-3 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent }}
      >
        <Icon size={20} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text className="text-xs font-semibold text-[#6B7280]">{label}</Text>
      <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
        {value}
      </Text>
      {showChange ? (
        <View className="mt-2 flex-row items-center">
          {isPositive ? (
            <ArrowUpRight size={14} color="#059669" />
          ) : (
            <ArrowDownRight size={14} color="#DC2626" />
          )}
          <Text
            className={
              isPositive
                ? 'ml-1 text-xs font-bold text-[#059669]'
                : 'ml-1 text-xs font-bold text-[#DC2626]'
            }
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniBarChart({
  title,
  subtitle,
  values,
  currency = false,
}: {
  title: string;
  subtitle: string;
  values: AnalyticsItem[];
  currency?: boolean;
}) {
  const data = values.slice(-6);
  const numbers = data.map(
    item =>
      Number(
        currency ? item.revenue : item.registrations || item.subscriptions,
      ) || 0,
  );
  const max = Math.max(...numbers, 1);

  return (
    <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <Text className="text-base font-bold text-[#173F35]">{title}</Text>
      <Text className="mt-1 text-xs text-[#8A8F8B]">{subtitle}</Text>
      <View className="mt-5 h-36 flex-row items-end justify-between">
        {data.length > 0 ? (
          data.map((item, index) => {
            const value = numbers[index];
            const height = Math.max((value / max) * 112, 8);
            return (
              <View
                key={`${item.label || index}-${index}`}
                className="flex-1 items-center"
              >
                <Text className="mb-1 text-[9px] font-bold text-[#6B7280]">
                  {currency ? formatCurrency(value) : formatCount(value)}
                </Text>
                <View
                  className="w-[55%] rounded-t-lg bg-[#B8860B]"
                  style={{ height }}
                />
                <Text
                  numberOfLines={1}
                  className="mt-2 text-[9px] text-[#8A8F8B]"
                >
                  {item.label || '—'}
                </Text>
              </View>
            );
          })
        ) : (
          <Text className="m-auto text-sm text-[#9CA3AF]">
            No data available
          </Text>
        )}
      </View>
    </View>
  );
}

export default function Home({ onNavigate }: HomeProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMessage('');
      const [statsResponse, analyticsResponse] = await Promise.all([
        api.get('/super-admin/dashboard/stats'),
        api.get('/super-admin/dashboard/analytics'),
      ]);

      setStats(statsResponse.data?.data || null);
      setAnalytics(analyticsResponse.data?.data || null);
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Dashboard data could not be loaded.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadDashboard();
  };

  const metrics = [
    {
      label: 'Gold Shops',
      value: formatCount(stats?.totalGoldShops),
      change: stats?.changes?.totalGoldShops,
      icon: Store,
      accent: '#07564B',
    },
    {
      label: 'Active Shops',
      value: formatCount(stats?.activeGoldShops),
      icon: Building2,
      accent: '#B8860B',
    },
    {
      label: 'Pending Shops',
      value: formatCount(stats?.pendingGoldShops),
      icon: Clock3,
      accent: '#28708A',
    },
    {
      label: 'Rejected Shops',
      value: formatCount(stats?.rejectedGoldShops),
      icon: XCircle,
      accent: '#A94760',
    },
    {
      label: 'Registered Users',
      value: formatCount(stats?.totalUsers),
      change: stats?.changes?.totalUsers,
      icon: Users,
      accent: '#536D76',
    },
    {
      label: 'Active Subscriptions',
      value: formatCount(stats?.activeSubscriptions),
      change: stats?.changes?.activeSubscriptions,
      icon: ShieldCheck,
      accent: '#7138E8',
    },
    {
      label: 'Expired Subscriptions',
      value: formatCount(stats?.expiredSubscriptions),
      icon: CalendarDays,
      accent: '#087D70',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue),
      change: stats?.changes?.totalRevenue,
      icon: CreditCard,
      accent: '#C8103E',
    },
  ];

  const monthlyRevenue = analytics?.monthlyRevenue || [];
  const shopRegistrations = analytics?.shopRegistrations || [];
  const subscriptionGrowth = analytics?.subscriptionGrowth || [];
  const activeShops = analytics?.shopStatus?.active || 0;
  const expiredShops = analytics?.shopStatus?.expired || 0;

  return (
    <ScrollView
      testID="super-admin-home"
      className="flex-1 bg-[#F8F7F2]"
      contentContainerClassName="px-4 py-5"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ImageBackground
        source={require('../../Assert/Images/welcomehome.png')}
        resizeMode="cover"
        className="mb-5 overflow-hidden rounded-3xl"
      >
        <View className="min-h-[190px] flex-row items-start justify-between overflow-hidden rounded-3xl bg-[#06291F]/40 p-5">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-[#F5C451]">
              Welcome to
            </Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">
              Sri Gold Superadmin
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#F2F5F3]">
              Manage your gold retail platform from one place.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard"
            onPress={onRefresh}
            disabled={refreshing}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </ImageBackground>

      {errorMessage ? (
        <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
          <Text className="text-sm text-[#991B1B]">{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            className="mt-2 self-start"
          >
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
        {metrics.map(metric => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </View>

      <View className="mb-5 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <Text className="mb-3 text-base font-bold text-[#173F35]">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: 'Gold Shops', tab: 'G Shops' as const, icon: Store },
            {
              label: 'Subscriptions',
              tab: 'Plans' as const,
              icon: CreditCard,
            },
            {
              label: 'Revenue',
              tab: 'Revenue' as const,
              icon: ChartNoAxesColumn,
            },
            { label: 'Profile', tab: 'Profile' as const, icon: Users },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => onNavigate(item.tab)}
                className="min-h-[88px] flex-1 basis-[145px] items-center justify-center rounded-xl bg-[#F8F7F2] px-2 active:opacity-70"
              >
                <Icon size={22} color="#B8860B" />
                <Text className="mt-2 text-center text-xs font-bold text-[#374151]">
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mb-5 gap-4">
        <MiniBarChart
          title="Monthly Revenue"
          subtitle="Collected subscription payments"
          values={monthlyRevenue}
          currency
        />
        <MiniBarChart
          title="Gold Shop Registrations"
          subtitle="New shop registrations"
          values={shopRegistrations}
        />
        <MiniBarChart
          title="Subscription Growth"
          subtitle="Subscriptions created"
          values={subscriptionGrowth}
        />
      </View>

      <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <Text className="text-base font-bold text-[#173F35]">
          Active vs Expired Shops
        </Text>
        <View className="mt-4 flex-row items-center">
          <View className="mr-5 h-28 w-28 items-center justify-center rounded-full border-[14px] border-[#B8860B]">
            <Text className="text-lg font-extrabold text-[#173F35]">
              {formatCount(activeShops + expiredShops)}
            </Text>
            <Text className="text-[9px] text-[#8A8F8B]">Shops</Text>
          </View>
          <View className="flex-1">
            <View className="mb-3 flex-row justify-between">
              <Text className="text-sm text-[#6B7280]">Active</Text>
              <Text className="text-sm font-bold text-[#173F35]">
                {formatCount(activeShops)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-[#6B7280]">Expired</Text>
              <Text className="text-sm font-bold text-[#173F35]">
                {formatCount(expiredShops)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
