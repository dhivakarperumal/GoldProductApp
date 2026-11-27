import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';

const FEATURE_OPTIONS = [
  ['goldInventory', 'Gold Inventory'],
  ['silverInventory', 'Silver Inventory'],
  ['purchaseManagement', 'Purchase Management'],
  ['salesBilling', 'Sales & Billing'],
  ['customerManagement', 'Customer Management'],
  ['supplierManagement', 'Supplier Management'],
  ['goldRateManagement', 'Gold Rate Management'],
  ['stockManagement', 'Stock Management'],
  ['barcodeManagement', 'Barcode Management'],
  ['invoicePrinting', 'Invoice Printing'],
  ['reportsAnalytics', 'Reports & Analytics'],
  ['backupExport', 'Backup & Export'],
] as const;

export type SubscriptionPlan = {
  id: string | number;
  plan_name: string;
  plan_code: string;
  description?: string;
  monthly_price?: number | string | null;
  quarterly_price?: number | string | null;
  half_yearly_price?: number | string | null;
  yearly_price?: number | string | null;
  setup_fee?: number | string | null;
  free_trial_days?: number | null;
  max_branches?: number | null;
  max_staff?: number | null;
  max_users?: number | null;
  max_products?: number | null;
  max_monthly_invoices?: number | null;
  grace_period_days?: number | null;
  status: string;
  is_featured?: boolean | number;
  display_order?: number;
  features?: Record<string, boolean>;
  active_subscriptions?: number;
  created_at?: string;
  history?: Array<{
    id: string | number;
    changed_by_name?: string;
    changed_at?: string;
  }>;
};

export type SubscriptionPlanPayload = {
  planName: string;
  planCode: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  halfYearlyPrice: number;
  yearlyPrice: number;
  setupFee: number;
  freeTrialDays: number;
  maxBranches: number | null;
  maxStaff: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyInvoices: number | null;
  gracePeriodDays: number;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  displayOrder: number;
  features: Record<string, boolean>;
};

type PlanFormProps = {
  initialPlan?: SubscriptionPlan | null;
  mode: 'create' | 'edit';
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SubscriptionPlanPayload) => void;
};

type FormValues = {
  planName: string;
  planCode: string;
  description: string;
  monthlyPrice: string;
  quarterlyPrice: string;
  halfYearlyPrice: string;
  yearlyPrice: string;
  setupFee: string;
  freeTrialDays: string;
  maxBranches: string;
  maxStaff: string;
  maxUsers: string;
  maxProducts: string;
  maxMonthlyInvoices: string;
  gracePeriodDays: string;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  displayOrder: string;
  features: Record<string, boolean>;
};

const emptyFeatures = Object.fromEntries(
  FEATURE_OPTIONS.map(([key]) => [key, false]),
) as Record<string, boolean>;

const emptyForm: FormValues = {
  planName: '',
  planCode: '',
  description: '',
  monthlyPrice: '',
  quarterlyPrice: '',
  halfYearlyPrice: '',
  yearlyPrice: '',
  setupFee: '0',
  freeTrialDays: '0',
  maxBranches: '',
  maxStaff: '',
  maxUsers: '',
  maxProducts: '',
  maxMonthlyInvoices: '',
  gracePeriodDays: '0',
  status: 'active',
  isFeatured: false,
  displayOrder: '0',
  features: emptyFeatures,
};

const inputClass =
  'mt-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#1F2937]';

function toFormValues(plan: SubscriptionPlan | null | undefined): FormValues {
  if (!plan) return { ...emptyForm, features: { ...emptyFeatures } };

  const asString = (value: number | string | null | undefined) =>
    value == null ? '' : String(value);

  return {
    planName: plan.plan_name || '',
    planCode: plan.plan_code || '',
    description: plan.description || '',
    monthlyPrice: asString(plan.monthly_price),
    quarterlyPrice: asString(plan.quarterly_price),
    halfYearlyPrice: asString(plan.half_yearly_price),
    yearlyPrice: asString(plan.yearly_price),
    setupFee: asString(plan.setup_fee ?? 0),
    freeTrialDays: asString(plan.free_trial_days ?? 0),
    maxBranches: asString(plan.max_branches),
    maxStaff: asString(plan.max_staff),
    maxUsers: asString(plan.max_users),
    maxProducts: asString(plan.max_products),
    maxMonthlyInvoices: asString(plan.max_monthly_invoices),
    gracePeriodDays: asString(plan.grace_period_days ?? 0),
    status: plan.status === 'inactive' ? 'inactive' : 'active',
    isFeatured: Boolean(plan.is_featured),
    displayOrder: asString(plan.display_order ?? 0),
    features: { ...emptyFeatures, ...(plan.features || {}) },
  };
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-bold text-[#4B5563]">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'auto'}
        maxLength={multiline ? 5000 : 80}
        placeholderTextColor="#9CA3AF"
        className={`${inputClass} ${multiline ? 'min-h-24' : ''}`}
      />
    </View>
  );
}

function numberValue(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function AddSubscriptionPlan({
  initialPlan = null,
  mode,
  submitting,
  onCancel,
  onSubmit,
}: PlanFormProps) {
  const { showAlert } = useCustomAlert();
  const [form, setForm] = useState(() => toFormValues(initialPlan));

  const payload = useMemo<SubscriptionPlanPayload>(
    () => ({
      planName: form.planName.trim(),
      planCode: form.planCode.trim(),
      description: form.description.trim(),
      monthlyPrice: numberValue(form.monthlyPrice),
      quarterlyPrice: numberValue(form.quarterlyPrice),
      halfYearlyPrice: numberValue(form.halfYearlyPrice),
      yearlyPrice: numberValue(form.yearlyPrice),
      setupFee: numberValue(form.setupFee),
      freeTrialDays: numberValue(form.freeTrialDays),
      maxBranches:
        form.maxBranches === '' ? null : numberValue(form.maxBranches),
      maxStaff: form.maxStaff === '' ? null : numberValue(form.maxStaff),
      maxUsers: form.maxUsers === '' ? null : numberValue(form.maxUsers),
      maxProducts:
        form.maxProducts === '' ? null : numberValue(form.maxProducts),
      maxMonthlyInvoices:
        form.maxMonthlyInvoices === ''
          ? null
          : numberValue(form.maxMonthlyInvoices),
      gracePeriodDays: numberValue(form.gracePeriodDays),
      status: form.status,
      isFeatured: form.isFeatured,
      displayOrder: numberValue(form.displayOrder),
      features: form.features,
    }),
    [form],
  );

  const updateField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => setForm(current => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    if (!form.planName.trim()) {
      showAlert(
        'Plan name required',
        'Enter a name for this subscription plan.',
        { variant: 'warning' },
      );
      return;
    }
    onSubmit(payload);
  };

  const numericFields = [
    ['Monthly Price (₹)', 'monthlyPrice', 'decimal-pad', 'e.g. 999.00'],
    ['Quarterly Price (₹)', 'quarterlyPrice', 'decimal-pad', 'e.g. 2699.00'],
    ['Half-Yearly Price (₹)', 'halfYearlyPrice', 'decimal-pad', 'e.g. 4999.00'],
    ['Yearly Price (₹)', 'yearlyPrice', 'decimal-pad', 'e.g. 8999.00'],
    ['Setup Fee (₹)', 'setupFee', 'decimal-pad', 'e.g. 500.00'],
    ['Free Trial (days)', 'freeTrialDays', 'numeric', 'e.g. 7'],
    ['Grace Period (days)', 'gracePeriodDays', 'numeric', 'e.g. 3'],
  ] as const;

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} className="bg-[#153B35]">
        <View className="w-full flex-row items-center bg-[#153B35] px-5 py-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to subscription plans"
            onPress={onCancel}
            className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft size={21} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#F4C95D]">
              Subscription Plans
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-white">
              {mode === 'edit'
                ? 'Edit Subscription Plan'
                : 'Add Subscription Plan'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-4 pb-8 pt-4"
        >
          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-4 text-base font-extrabold text-[#173F35]">
              Basic Information
            </Text>
            <Field
              label="Plan Name *"
              value={form.planName}
              onChangeText={value => updateField('planName', value)}
              placeholder="e.g. Gold Premium"
            />
            <Field
              label="Description"
              value={form.description}
              onChangeText={value => updateField('description', value)}
              placeholder="Briefly describe what this plan includes..."
              multiline
            />
          </View>

          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-4 text-base font-extrabold text-[#173F35]">
              Pricing and Limits
            </Text>
            {numericFields.map(([label, key, keyboardType, placeholder]) => (
              <Field
                key={key}
                label={label}
                value={form[key]}
                onChangeText={value => updateField(key, value)}
                keyboardType={keyboardType}
                placeholder={placeholder}
              />
            ))}
          </View>

          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-3 text-base font-extrabold text-[#173F35]">
              Plan Settings
            </Text>
            <View className="mb-3">
              <Text className="mb-2 text-xs font-bold text-[#4B5563]">
                Plan Status
              </Text>
              <View className="flex-row gap-2">
                {(['active', 'inactive'] as const).map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.status === status }}
                    onPress={() => updateField('status', status)}
                    className={`rounded-xl px-4 py-2.5 ${
                      form.status === status ? 'bg-[#08745D]' : 'bg-[#F3F4F6]'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold capitalize ${
                        form.status === status ? 'text-white' : 'text-[#4B5563]'
                      }`}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="flex-row items-center justify-between border-t border-[#F3F4F6] py-3">
              <Text className="text-sm font-semibold text-[#374151]">
                Featured Plan
              </Text>
              <Switch
                value={form.isFeatured}
                onValueChange={value => updateField('isFeatured', value)}
                trackColor={{ false: '#D1D5DB', true: '#82BDAE' }}
                thumbColor={form.isFeatured ? '#08745D' : '#F9FAFB'}
              />
            </View>
          </View>

          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-2 text-base font-extrabold text-[#173F35]">
              Feature Permissions
            </Text>
            {FEATURE_OPTIONS.map(([key, label]) => (
              <View
                key={key}
                className="flex-row items-center justify-between border-b border-[#F3F4F6] py-2.5"
              >
                <Text className="flex-1 text-sm text-[#374151]">{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  value={Boolean(form.features[key])}
                  onValueChange={value =>
                    setForm(current => ({
                      ...current,
                      features: { ...current.features, [key]: value },
                    }))
                  }
                  trackColor={{ false: '#D1D5DB', true: '#82BDAE' }}
                  thumbColor={form.features[key] ? '#08745D' : '#F9FAFB'}
                />
              </View>
            ))}
          </View>

          <View className="mb-2 flex-row justify-end gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="min-h-11 items-center justify-center rounded-xl border border-[#D1D5DB] px-5"
            >
              <Text className="text-sm font-bold text-[#4B5563]">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={handleSubmit}
              className={`min-h-11 items-center justify-center rounded-xl bg-[#08745D] px-5 ${
                submitting ? 'opacity-50' : ''
              }`}
            >
              <Text className="text-sm font-bold text-white">
                {submitting
                  ? 'Saving...'
                  : mode === 'edit'
                  ? 'Save Changes'
                  : 'Create Plan'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
