import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckCircle,
  Copy,
  Eye,
  Layers,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  XCircle,
  X,
} from 'lucide-react-native';
import api from '../../api';
import AddSubscriptionPlan, {
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from './AddSubscriptionPlan';

type Summary = {
  total_plans?: number;
  active_plans?: number;
  inactive_plans?: number;
  total_shops_using?: number;
};

type Pagination = {
  page: number;
  totalPages: number;
  total: number;
};

type ModalState = 'create' | 'edit' | 'view' | null;
type ViewMode = 'table' | 'card';
const PAGE_SIZE = 10;

type SubscriptionsProps = {
  onPlanFormVisibilityChange: (visible: boolean) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function formatAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function SummaryCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof Layers;
  tone: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  const styles = {
    emerald: {
      border: 'border-emerald-100',
      glow: 'bg-emerald-100/70',
      icon: 'bg-emerald-50',
      iconColor: '#08745D',
      caption: 'text-emerald-700',
      marker: 'bg-emerald-500',
    },
    blue: {
      border: 'border-sky-100',
      glow: 'bg-sky-100/70',
      icon: 'bg-sky-50',
      iconColor: '#0369A1',
      caption: 'text-sky-700',
      marker: 'bg-sky-500',
    },
    amber: {
      border: 'border-amber-100',
      glow: 'bg-amber-100/70',
      icon: 'bg-amber-50',
      iconColor: '#B45309',
      caption: 'text-amber-700',
      marker: 'bg-amber-500',
    },
    violet: {
      border: 'border-violet-100',
      glow: 'bg-violet-100/70',
      icon: 'bg-violet-50',
      iconColor: '#7C3AED',
      caption: 'text-violet-700',
      marker: 'bg-violet-500',
    },
  }[tone];

  return (
    <View
      className={`relative min-h-[150px] flex-1 basis-[155px] overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ${styles.border}`}
    >
      <View
        pointerEvents="none"
        className={`absolute -right-6 -top-7 h-20 w-20 rounded-full ${styles.glow}`}
      />
      <View className="relative">
        <View className="flex-row items-start justify-between">
          <Text
            numberOfLines={2}
            className="flex-1 pr-2 text-[10px] font-extrabold uppercase leading-4 tracking-[0.8px] text-[#64748B]"
          >
            {label}
          </Text>
          <View
            className={`h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
          >
            <Icon size={19} color={styles.iconColor} strokeWidth={2.2} />
          </View>
        </View>
        <Text className="mt-3 text-[28px] font-black leading-8 tracking-tight text-[#173F35]">
          {Number(value || 0).toLocaleString('en-IN')}
        </Text>
        <View className="mt-3 flex-row items-center">
          <View className={`mr-2 h-1.5 w-1.5 rounded-full ${styles.marker}`} />
          <Text
            numberOfLines={1}
            className={`flex-1 text-[10px] font-semibold ${styles.caption}`}
          >
            {caption}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${
        active ? 'bg-[#DCFCE7]' : 'bg-[#F3F4F6]'
      }`}
    >
      <Text
        className={`text-[10px] font-bold capitalize ${
          active ? 'text-[#166534]' : 'text-[#4B5563]'
        }`}
      >
        {status || 'unknown'}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-[#E5E7EB] p-3">
      <Text className="text-[10px] font-bold uppercase text-[#9CA3AF]">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-[#1F2937]">
        {value || '—'}
      </Text>
    </View>
  );
}

export default function Subscriptions({
  onPlanFormVisibilityChange,
}: SubscriptionsProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const requestId = useRef(0);

  const loadPlans = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/subscription-plans', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          search: search.trim(),
          status,
        },
      });
      if (currentRequest !== requestId.current) return;
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setSummary(data?.summary || {});
      setPagination({
        page: Number(data?.pagination?.page) || page,
        totalPages: Math.max(1, Number(data?.pagination?.totalPages) || 1),
        total: Number(data?.pagination?.total) || 0,
      });
    } catch (error) {
      if (currentRequest === requestId.current) {
        Alert.alert(
          'Unable to load plans',
          getErrorMessage(error, 'Could not load subscription plans.'),
        );
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlans();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadPlans]);

  const openCreate = () => {
    setSelected(null);
    setModal('create');
    onPlanFormVisibilityChange(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setSelected(plan);
    setModal('edit');
    onPlanFormVisibilityChange(true);
  };

  const savePlan = async (payload: SubscriptionPlanPayload) => {
    setSubmitting(true);
    try {
      const response =
        modal === 'edit' && selected
          ? await api.put(
              `/super-admin/subscription-plans/${selected.id}`,
              payload,
            )
          : await api.post('/super-admin/subscription-plans', payload);
      Alert.alert(
        'Saved',
        response.data?.message || 'Subscription plan saved successfully.',
      );
      setModal(null);
      onPlanFormVisibilityChange(false);
      await loadPlans();
    } catch (error) {
      Alert.alert(
        'Unable to save plan',
        getErrorMessage(error, 'Could not save subscription plan.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const viewPlan = async (plan: SubscriptionPlan) => {
    try {
      const { data } = await api.get(
        `/super-admin/subscription-plans/${plan.id}`,
      );
      if (!data?.plan) {
        Alert.alert('Plan unavailable', 'Plan details were not returned.');
        return;
      }
      setSelected(data.plan);
      setModal('view');
    } catch (error) {
      Alert.alert(
        'Unable to load plan',
        getErrorMessage(error, 'Could not load plan details.'),
      );
    }
  };

  const toggleStatus = (plan: SubscriptionPlan) => {
    const next = plan.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${next === 'active' ? 'Activate' : 'Deactivate'} plan?`,
      `${plan.plan_name} will be ${next}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next === 'active' ? 'Activate' : 'Deactivate',
          style: next === 'inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.patch(
                `/super-admin/subscription-plans/${plan.id}/status`,
                { status: next },
              );
              await loadPlans();
            } catch (error) {
              Alert.alert(
                'Unable to update plan',
                getErrorMessage(error, 'Could not update plan status.'),
              );
            }
          },
        },
      ],
    );
  };

  const duplicatePlan = (plan: SubscriptionPlan) => {
    Alert.alert('Duplicate plan?', `Create a copy of ${plan.plan_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            await api.post(
              `/super-admin/subscription-plans/${plan.id}/duplicate`,
            );
            await loadPlans();
          } catch (error) {
            Alert.alert(
              'Unable to duplicate plan',
              getErrorMessage(error, 'Could not duplicate subscription plan.'),
            );
          }
        },
      },
    ]);
  };

  const deletePlan = (plan: SubscriptionPlan) => {
    Alert.alert(
      'Delete plan?',
      `Delete ${plan.plan_name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/super-admin/subscription-plans/${plan.id}`);
              await loadPlans();
            } catch (error) {
              Alert.alert(
                'Unable to delete plan',
                getErrorMessage(error, 'Could not delete subscription plan.'),
              );
            }
          },
        },
      ],
    );
  };

  const renderActions = (plan: SubscriptionPlan) => (
    <View className="flex-row items-center gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${plan.plan_name}`}
        onPress={() => viewPlan(plan)}
        className="rounded-lg bg-[#F3F4F6] p-2"
      >
        <Eye size={16} color="#4B5563" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${plan.plan_name}`}
        onPress={() => openEdit(plan)}
        className="rounded-lg bg-[#EFF6FF] p-2"
      >
        <Pencil size={16} color="#1D4ED8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Duplicate ${plan.plan_name}`}
        onPress={() => duplicatePlan(plan)}
        className="rounded-lg bg-[#F5F3FF] p-2"
      >
        <Copy size={16} color="#6D28D9" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          plan.status === 'active' ? 'Deactivate plan' : 'Activate plan'
        }
        onPress={() => toggleStatus(plan)}
        className="rounded-lg bg-[#FFFBEB] px-2.5 py-2"
      >
        <Text className="text-[10px] font-bold text-[#92400E]">
          {plan.status === 'active' ? 'Deactivate' : 'Activate'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${plan.plan_name}`}
        onPress={() => deletePlan(plan)}
        className="rounded-lg bg-[#FEF2F2] p-2"
      >
        <Trash2 size={16} color="#B91C1C" />
      </Pressable>
    </View>
  );

  const renderPlan = (plan: SubscriptionPlan) => (
    <View
      key={plan.id}
      className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-bold text-[#08745D]">
            {plan.plan_code || 'No plan code'}
          </Text>
          <Text className="mt-1 text-base font-extrabold text-[#173F35]">
            {plan.plan_name}
          </Text>
          {plan.is_featured ? (
            <Text className="mt-1 text-[10px] font-bold uppercase text-[#A16207]">
              Featured Plan
            </Text>
          ) : null}
        </View>
        <StatusBadge status={plan.status} />
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-[#F3F4F6] pt-3">
        <View>
          <Text className="text-[10px] text-[#9CA3AF]">Monthly</Text>
          <Text className="mt-0.5 text-sm font-bold text-[#1F2937]">
            {formatAmount(plan.monthly_price)}
          </Text>
        </View>
        <View>
          <Text className="text-[10px] text-[#9CA3AF]">Active Shops</Text>
          <Text className="mt-0.5 text-sm font-bold text-[#1F2937]">
            {Number(plan.active_subscriptions || 0)}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row justify-end">{renderActions(plan)}</View>
    </View>
  );

  const renderTablePlan = (plan: SubscriptionPlan, index: number) => (
    <View
      key={plan.id}
      className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4"
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-[10px] font-bold text-[#9CA3AF]">
          #{(page - 1) * PAGE_SIZE + index + 1} · ID {String(plan.id)}
        </Text>
        <StatusBadge status={plan.status} />
      </View>
      <Text className="mt-2 text-base font-extrabold text-[#173F35]">
        {plan.plan_name}
      </Text>
      <Text className="mt-0.5 text-xs text-[#6B7280]">
        {plan.plan_code || 'No plan code'}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-4">
        <Text className="text-xs text-[#4B5563]">
          Monthly: {formatAmount(plan.monthly_price)}
        </Text>
        <Text className="text-xs text-[#4B5563]">
          Active: {Number(plan.active_subscriptions || 0)}
        </Text>
        <Text className="text-xs text-[#4B5563]">
          Created: {formatDate(plan.created_at)}
        </Text>
      </View>
      <View className="mt-3 items-end">{renderActions(plan)}</View>
    </View>
  );

  const totalPages = Math.max(1, pagination.totalPages);

  if (modal === 'create' || modal === 'edit') {
    return (
      <AddSubscriptionPlan
        key={`${modal}-${selected?.id ?? 'new'}`}
        mode={modal}
        initialPlan={selected}
        submitting={submitting}
        onCancel={() => {
          setModal(null);
          onPlanFormVisibilityChange(false);
        }}
        onSubmit={savePlan}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPlans();
            }}
            tintColor="#08745D"
          />
        }
        contentContainerClassName="px-4 pb-24 pt-4"
      >
        <View className="mb-4 flex-row items-center rounded-2xl bg-[#123B32] p-5">
          <View className="mr-3 h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
            <Layers size={25} color="#F5C451" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-[#F5C451]">
              Super Admin · Control Center
            </Text>
            <Text className="mt-1 text-xl font-black text-white">
              Subscription plan portfolio
            </Text>
            <Text className="mt-1 text-xs leading-5 text-white/75">
              Manage pricing, plan availability, and shop subscriptions from one place.
            </Text>
          </View>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-3">
          <SummaryCard
            label="Total Plans"
            value={summary.total_plans || 0}
            caption="Plans in catalog"
            icon={Layers}
            tone="emerald"
          />
          <SummaryCard
            label="Active Plans"
            value={summary.active_plans || 0}
            caption="Available to shops"
            icon={CheckCircle}
            tone="blue"
          />
          <SummaryCard
            label="Inactive Plans"
            value={summary.inactive_plans || 0}
            caption="Not currently available"
            icon={XCircle}
            tone="amber"
          />
          <SummaryCard
            label="Shops Using Plans"
            value={summary.total_shops_using || 0}
            caption="Current plan usage"
            icon={Store}
            tone="violet"
          />
        </View>

        <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-3">
          <View className="flex-row items-center rounded-xl border border-[#E5E7EB] px-3">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              accessibilityLabel="Search subscription plans"
              value={search}
              onChangeText={value => {
                setPage(1);
                setSearch(value);
              }}
              placeholder="Search plan name or code..."
              className="min-h-11 flex-1 px-2 text-sm text-[#1F2937]"
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch('')}
                className="p-1"
              >
                <X size={16} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row gap-2">
              {(['all', 'active', 'inactive'] as const).map(value => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === value }}
                  onPress={() => {
                    setPage(1);
                    setStatus(value);
                  }}
                  className={`rounded-full px-3 py-1.5 ${
                    status === value ? 'bg-[#08745D]' : 'bg-[#F3F4F6]'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold capitalize ${
                      status === value ? 'text-white' : 'text-[#4B5563]'
                    }`}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row overflow-hidden rounded-lg border border-[#E5E7EB]">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Card view"
                accessibilityState={{ selected: viewMode === 'card' }}
                onPress={() => setViewMode('card')}
                className={`p-2 ${
                  viewMode === 'card' ? 'bg-[#E7F3EF]' : 'bg-white'
                }`}
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === 'card' ? '#08745D' : '#9CA3AF'}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="List view"
                accessibilityState={{ selected: viewMode === 'table' }}
                onPress={() => setViewMode('table')}
                className={`p-2 ${
                  viewMode === 'table' ? 'bg-[#E7F3EF]' : 'bg-white'
                }`}
              >
                <List
                  size={16}
                  color={viewMode === 'table' ? '#08745D' : '#9CA3AF'}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {loading && plans.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#08745D" />
            <Text className="mt-3 text-sm text-[#6B7280]">
              Loading subscription plans...
            </Text>
          </View>
        ) : plans.length === 0 ? (
          <View className="items-center rounded-2xl bg-white px-5 py-10">
            <Text className="text-center text-sm font-semibold text-[#6B7280]">
              No subscription plans found. Create one to get started.
            </Text>
          </View>
        ) : viewMode === 'card' ? (
          plans.map(renderPlan)
        ) : (
          plans.map(renderTablePlan)
        )}

        <View className="mt-1 flex-row items-center justify-between rounded-xl bg-white px-4 py-3">
          <Text className="text-xs text-[#6B7280]">
            {pagination.total} total plans
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={page <= 1 || loading}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              className={`rounded-lg border border-[#E5E7EB] px-3 py-2 ${
                page <= 1 || loading ? 'opacity-40' : ''
              }`}
            >
              <Text className="text-xs font-semibold text-[#374151]">
                Previous
              </Text>
            </Pressable>
            <Text className="self-center text-xs text-[#6B7280]">
              {page} / {totalPages}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={page >= totalPages || loading}
              onPress={() =>
                setPage(current => Math.min(totalPages, current + 1))
              }
              className={`rounded-lg border border-[#E5E7EB] px-3 py-2 ${
                page >= totalPages || loading ? 'opacity-40' : ''
              }`}
            >
              <Text className="text-xs font-semibold text-[#374151]">Next</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create subscription plan"
        onPress={openCreate}
        className="absolute bottom-5 right-5 z-20 h-14 w-14 items-center justify-center rounded-full bg-[#F5C451] shadow-lg"
        style={{ elevation: 8 }}
      >
        <Plus size={32} color="#173F35" strokeWidth={4} />
      </Pressable>

      {modal === 'view' && selected ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setModal(null)}
          statusBarTranslucent
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="max-h-[85%] rounded-t-3xl bg-white">
              <View className="flex-row items-center justify-between rounded-t-3xl bg-[#153B35] px-5 py-4">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-extrabold text-white">
                    {selected.plan_name}
                  </Text>
                  <Text className="mt-1 text-xs text-white/75">
                    {selected.plan_code}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close plan details"
                  onPress={() => setModal(null)}
                  className="rounded-full p-2"
                >
                  <X size={20} color="#FFFFFF" />
                </Pressable>
              </View>
              <ScrollView contentContainerClassName="p-4">
                <View className="flex-row flex-wrap gap-2">
                  <DetailRow
                    label="Description"
                    value={selected.description || '—'}
                  />
                  <DetailRow label="Status" value={selected.status || '—'} />
                  <DetailRow
                    label="Monthly"
                    value={formatAmount(selected.monthly_price)}
                  />
                  <DetailRow
                    label="Quarterly"
                    value={formatAmount(selected.quarterly_price)}
                  />
                  <DetailRow
                    label="Half-Yearly"
                    value={formatAmount(selected.half_yearly_price)}
                  />
                  <DetailRow
                    label="Yearly"
                    value={formatAmount(selected.yearly_price)}
                  />
                  <DetailRow
                    label="Setup Fee"
                    value={formatAmount(selected.setup_fee)}
                  />
                  <DetailRow
                    label="Free Trial"
                    value={`${selected.free_trial_days || 0} days`}
                  />
                  <DetailRow
                    label="Branches"
                    value={
                      selected.max_branches == null
                        ? 'Unlimited'
                        : String(selected.max_branches)
                    }
                  />
                  <DetailRow
                    label="Staff"
                    value={
                      selected.max_staff == null
                        ? 'Unlimited'
                        : String(selected.max_staff)
                    }
                  />
                  <DetailRow
                    label="Users"
                    value={
                      selected.max_users == null
                        ? 'Unlimited'
                        : String(selected.max_users)
                    }
                  />
                  <DetailRow
                    label="Products"
                    value={
                      selected.max_products == null
                        ? 'Unlimited'
                        : String(selected.max_products)
                    }
                  />
                  <DetailRow
                    label="Monthly Invoices"
                    value={
                      selected.max_monthly_invoices == null
                        ? 'Unlimited'
                        : String(selected.max_monthly_invoices)
                    }
                  />
                  <DetailRow
                    label="Grace Period"
                    value={`${selected.grace_period_days || 0} days`}
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(selected.created_at)}
                  />
                  <DetailRow
                    label="Featured"
                    value={selected.is_featured ? 'Yes' : 'No'}
                  />
                </View>

                <View className="mt-5">
                  <Text className="text-sm font-extrabold text-[#173F35]">
                    Enabled Features
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {Object.entries(selected.features || {})
                      .filter(([, enabled]) => Boolean(enabled))
                      .map(([key]) => (
                        <View
                          key={key}
                          className="rounded-full bg-[#DCFCE7] px-3 py-1.5"
                        >
                          <Text className="text-xs font-semibold text-[#166534]">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </Text>
                        </View>
                      ))}
                    {!Object.values(selected.features || {}).some(Boolean) ? (
                      <Text className="text-xs text-[#6B7280]">
                        No features enabled.
                      </Text>
                    ) : null}
                  </View>
                </View>

                {selected.history && selected.history.length > 0 ? (
                  <View className="mt-5">
                    <Text className="text-sm font-extrabold text-[#173F35]">
                      Modification History
                    </Text>
                    {selected.history.map(item => (
                      <Text
                        key={item.id}
                        className="mt-2 rounded-xl border border-[#E5E7EB] p-3 text-xs text-[#6B7280]"
                      >
                        {item.changed_by_name || 'System'} ·{' '}
                        {formatDate(item.changed_at)}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
