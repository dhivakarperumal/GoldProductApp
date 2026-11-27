import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';
import type { SubscriptionPlan } from '../Subscription/AddSubscriptionPlan';

type Duration = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
type FormStep = 'personal' | 'shop' | 'subscription' | 'login';
type FormValues = {
  ownerName: string;
  mobile: string;
  email: string;
  aadhaarNumber: string;
  shopName: string;
  gstNumber: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  notes: string;
  loginUsername: string;
  loginPassword: string;
  confirmPassword: string;
  planId: string;
  duration: Duration;
  startDate: string;
};
type FormFieldName = keyof FormValues;
type FieldErrors = Partial<Record<FormFieldName, string>>;
type DurationOption = {
  value: Duration;
  label: string;
  price:
    | 'monthly_price'
    | 'quarterly_price'
    | 'half_yearly_price'
    | 'yearly_price';
  months: number;
};

const STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const DURATION_OPTIONS: DurationOption[] = [
  { value: 'monthly', label: 'Monthly', price: 'monthly_price', months: 1 },
  {
    value: 'quarterly',
    label: 'Quarterly',
    price: 'quarterly_price',
    months: 3,
  },
  {
    value: 'half_yearly',
    label: 'Half-Yearly',
    price: 'half_yearly_price',
    months: 6,
  },
  { value: 'yearly', label: 'Yearly', price: 'yearly_price', months: 12 },
];

const STEPS: Array<{
  id: FormStep;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: 'personal', label: 'Personal', icon: UserRound },
  { id: 'shop', label: 'Shop Details', icon: Store },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'login', label: 'Login', icon: ShieldCheck },
];

function getToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    if ('response' in error) {
      const response = error.response;
      if (
        typeof response === 'object' &&
        response !== null &&
        'data' in response &&
        typeof response.data === 'object' &&
        response.data !== null &&
        'message' in response.data &&
        typeof response.data.message === 'string'
      ) {
        return response.data.message;
      }
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function usernameFromName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._@+-]/g, '')
    .slice(0, 150);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateToInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(value: string) {
  if (!isValidDate(value)) return 'Select start date';
  return dateFromInput(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getEndDate(startDate: string, duration: Duration) {
  if (!isValidDate(startDate)) return '';
  const months = DURATION_OPTIONS.find(
    option => option.value === duration,
  )?.months;
  if (!months) return '';
  const [year, month, day] = startDate.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end.toISOString().slice(0, 10);
}

function formatCurrency(value: number | string | null | undefined) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  secureTextEntry = false,
  accessory,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  secureTextEntry?: boolean;
  accessory?: React.ReactNode;
  editable?: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
        {label}
        {required ? <Text className="text-rose-600"> *</Text> : null}
      </Text>
      <View
        className={`mt-1.5 flex-row items-center rounded-xl border bg-white ${
          error ? 'border-rose-500' : 'border-[#E5E7EB]'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`min-h-11 flex-1 px-3 text-sm text-[#1F2937] ${
            multiline ? 'min-h-24 py-3' : ''
          } ${editable ? '' : 'text-[#6B7280]'}`}
        />
        {accessory}
      </View>
      {error ? (
        <Text className="mt-1 text-[10px] font-medium text-rose-700">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function ChoiceField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return (
    <View className="flex-1">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label.toLowerCase()}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(current => !current)}
        className={`mt-1.5 min-h-11 flex-row items-center justify-between rounded-xl border bg-white px-3 ${
          error ? 'border-rose-500' : 'border-[#E5E7EB]'
        }`}
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-sm ${
            selected ? 'text-[#1F2937]' : 'text-[#9CA3AF]'
          }`}
        >
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>
      {open ? (
        <ScrollView
          nestedScrollEnabled
          className="mt-1 max-h-48 rounded-xl border border-[#E5E7EB] bg-white"
        >
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              className={`border-b border-[#F3F4F6] px-3 py-2.5 ${
                option.value === value ? 'bg-[#E7F3EF]' : ''
              }`}
            >
              <Text className="text-xs font-medium text-[#374151]">
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {error ? (
        <Text className="mt-1 text-[10px] font-medium text-rose-700">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type InitialShop = {
  id: number;
  owner_name?: string;
  mobile?: string;
  email?: string;
  aadhaar_number?: string;
  shop_name?: string;
  gst_number?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  notes?: string;
  owner_username?: string;
  plan_id?: number | string;
  duration?: string;
  account_start_date?: string;
  max_branches?: number;
  max_staff?: number;
};

type AddShopsProps = {
  mode?: 'create' | 'edit';
  initialShop?: InitialShop;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export default function AddShops({
  mode = 'create',
  initialShop,
  onCancel,
  onSuccess,
}: AddShopsProps = {}) {
  const { showAlert } = useCustomAlert();
  const isEditing = mode === 'edit' && Boolean(initialShop);
  const formSteps = isEditing ? STEPS.slice(0, 2) : STEPS;
  const [form, setForm] = useState<FormValues>(() => ({
    ownerName: initialShop?.owner_name || '',
    mobile: initialShop?.mobile || '',
    email: initialShop?.email || '',
    aadhaarNumber: initialShop?.aadhaar_number || '',
    shopName: initialShop?.shop_name || '',
    gstNumber: initialShop?.gst_number || '',
    city: initialShop?.city || '',
    state: initialShop?.state || '',
    pincode: initialShop?.pincode || '',
    address: initialShop?.address || '',
    notes: initialShop?.notes || '',
    loginUsername: initialShop?.owner_username || '',
    loginPassword: '',
    confirmPassword: '',
    planId: String(initialShop?.plan_id || ''),
    duration:
      DURATION_OPTIONS.find(option => option.value === initialShop?.duration)
        ?.value || 'monthly',
    startDate:
      initialShop?.account_start_date &&
      isValidDate(initialShop.account_start_date.slice(0, 10))
        ? initialShop.account_start_date.slice(0, 10)
        : getToday(),
  }));
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() =>
    dateFromInput(getToday()),
  );

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      const { data } = await api.get('/super-admin/subscription-plans', {
        params: { pageSize: 50, status: 'active' },
      });
      const availablePlans = Array.isArray(data?.plans)
        ? (data.plans as SubscriptionPlan[])
        : [];
      setPlans(availablePlans);
      setForm(current => ({
        ...current,
        planId:
          current.planId &&
          availablePlans.some(plan => String(plan.id) === current.planId)
            ? current.planId
            : String(availablePlans[0]?.id || ''),
      }));
    } catch (error) {
      setPlansError(
        getErrorMessage(error, 'Could not load active subscription plans.'),
      );
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selectedPlan = useMemo(
    () => plans.find(plan => String(plan.id) === form.planId),
    [form.planId, plans],
  );
  const selectedDuration = DURATION_OPTIONS.find(
    option => option.value === form.duration,
  );
  const price =
    selectedPlan && selectedDuration
      ? Number(selectedPlan[selectedDuration.price] || 0)
      : 0;
  const endDate = getEndDate(form.startDate, form.duration);

  const updateField = (name: FormFieldName, value: string) => {
    setForm(current => {
      if (name === 'ownerName') {
        const previousGeneratedUsername = usernameFromName(current.ownerName);
        const shouldUpdateUsername =
          !current.loginUsername ||
          current.loginUsername === previousGeneratedUsername;
        const generatedUsername = usernameFromName(value);
        return {
          ...current,
          ownerName: value,
          loginUsername: shouldUpdateUsername
            ? generatedUsername
            : current.loginUsername,
        };
      }
      if (name === 'mobile') {
        const previousDefaultPassword = current.mobile.replace(/[\s()-]/g, '');
        const shouldUpdatePassword =
          !current.loginPassword ||
          current.loginPassword === previousDefaultPassword;
        return {
          ...current,
          mobile: value.replace(/\D/g, '').slice(0, 10),
          loginPassword: shouldUpdatePassword
            ? value.replace(/\D/g, '').slice(0, 10)
            : current.loginPassword,
          confirmPassword: shouldUpdatePassword
            ? value.replace(/\D/g, '').slice(0, 10)
            : current.confirmPassword,
        };
      }
      return { ...current, [name]: value };
    });
    setErrors(current => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const openStartDatePicker = () => {
    setPickerDate(dateFromInput(form.startDate));
    setShowStartDatePicker(true);
  };

  const handleStartDatePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'ios') {
      if (event.type === 'set' && selectedDate) {
        setPickerDate(selectedDate);
      }
      return;
    }

    if (event.type === 'set' && selectedDate) {
      updateField('startDate', dateToInput(selectedDate));
    }
    setShowStartDatePicker(false);
  };

  const validateStep = (stepIndex: number): FieldErrors => {
    const nextErrors: FieldErrors = {};
    if (stepIndex === 0) {
      if (!form.ownerName.trim()) nextErrors.ownerName = 'Name is required.';
      else if (form.ownerName.trim().length > 150) {
        nextErrors.ownerName = 'Name must be 150 characters or fewer.';
      }
      if (!/^[6-9]\d{9}$/.test(form.mobile)) {
        nextErrors.mobile = 'Enter a valid 10-digit mobile number.';
      }
      if (
        !form.email.trim() ||
        form.email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ) {
        nextErrors.email = 'Enter a valid email address.';
      }
      if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) {
        nextErrors.aadhaarNumber = 'Aadhaar must contain exactly 12 digits.';
      }
    } else if (stepIndex === 1) {
      if (!form.shopName.trim()) {
        nextErrors.shopName = 'Shop name is required.';
      } else if (form.shopName.trim().length > 150) {
        nextErrors.shopName = 'Shop name must be 150 characters or fewer.';
      }
      if (
        form.gstNumber &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(
          form.gstNumber.trim(),
        )
      ) {
        nextErrors.gstNumber = 'Enter a valid 15-character GSTIN.';
      }
      if (form.pincode && !/^[1-9]\d{5}$/.test(form.pincode)) {
        nextErrors.pincode = 'Enter a valid 6-digit pincode.';
      }
    } else if (stepIndex === 2) {
      if (!form.planId) nextErrors.planId = 'Select a subscription plan.';
      if (!isValidDate(form.startDate)) {
        nextErrors.startDate = 'Enter a valid date in YYYY-MM-DD format.';
      }
    } else if (stepIndex === 3) {
      if (!/^[A-Za-z0-9._@+-]{3,150}$/.test(form.loginUsername.trim())) {
        nextErrors.loginUsername =
          'Use 3 to 150 letters, numbers, or . _ @ + - characters.';
      }
      if (form.loginPassword.length < 8 || form.loginPassword.length > 72) {
        nextErrors.loginPassword =
          'Password must be between 8 and 72 characters.';
      }
      if (form.confirmPassword !== form.loginPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }
    return nextErrors;
  };

  const continueToNextStep = () => {
    const nextErrors = validateStep(step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please correct the highlighted fields before continuing.');
      return;
    }
    setFormError('');
    setStep(current => Math.min(current + 1, formSteps.length - 1));
  };

  const submit = async () => {
    const allErrors = formSteps.reduce<FieldErrors>(
      (combined, _step, index) => ({
        ...combined,
        ...validateStep(index),
      }),
      {},
    );
    setErrors(allErrors);
    const firstInvalidStep = formSteps.findIndex(
      (_item, index) => Object.keys(validateStep(index)).length > 0,
    );
    if (firstInvalidStep >= 0) {
      setStep(firstInvalidStep);
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }
    if (!isEditing && !selectedPlan) {
      setStep(2);
      setFormError('Select an active subscription plan before saving.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    const payload = {
      shopName: form.shopName.trim(),
      ownerName: form.ownerName.trim(),
      mobile: form.mobile,
      email: form.email.trim(),
      aadhaarNumber: form.aadhaarNumber.trim(),
      gstNumber: form.gstNumber.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      maxBranches: initialShop?.max_branches || 1,
      maxStaff: initialShop?.max_staff || 1,
      notes: form.notes.trim(),
    };

    try {
      let data;
      if (isEditing && initialShop) {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(payload));
        const response = await api.put(
          `/super-admin/gold-shops/${initialShop.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        data = response.data;
      } else {
        const response = await api.post('/super-admin/gold-shops', {
          ...payload,
          credentials: {
            username: form.loginUsername.trim(),
            password: form.loginPassword,
          },
          subscription: {
            planId: Number(form.planId),
            duration: form.duration,
            startDate: form.startDate,
          },
        });
        data = response.data;
      }
      showAlert(
        isEditing ? 'Gold shop updated' : 'Gold shop created',
        data?.message ||
          (isEditing
            ? 'The gold shop was updated successfully.'
            : 'The gold shop was registered successfully.'),
        { variant: 'success' },
      );
      if (isEditing) {
        onSuccess?.();
        onCancel?.();
        return;
      }
      setForm({
        ownerName: '',
        mobile: '',
        email: '',
        aadhaarNumber: '',
        shopName: '',
        gstNumber: '',
        city: '',
        state: '',
        pincode: '',
        address: '',
        notes: '',
        loginUsername: '',
        loginPassword: '',
        confirmPassword: '',
        planId: String(selectedPlan?.id || ''),
        duration: 'monthly',
        startDate: getToday(),
      });
      setErrors({});
      setStep(0);
      onSuccess?.();
    } catch (error) {
      const message = getErrorMessage(
        error,
        isEditing
          ? 'Could not update the gold shop.'
          : 'Could not create the gold shop.',
      );
      setFormError(message);
      showAlert(
        isEditing ? 'Unable to update shop' : 'Unable to create shop',
        message,
        { variant: 'error' },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderPersonalStep = () => (
    <View className="gap-4">
      <View>
        <Text className="text-base font-extrabold text-[#173F35]">
          Personal Details
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Enter the primary shop owner&apos;s contact information.
        </Text>
      </View>
      <FormField
        label="Owner name"
        value={form.ownerName}
        onChangeText={value => updateField('ownerName', value)}
        placeholder="Full name"
        error={errors.ownerName}
        required
      />
      <View className="flex-row gap-3">
        <FormField
          label="Mobile number"
          value={form.mobile}
          onChangeText={value => updateField('mobile', value)}
          placeholder="9876543210"
          error={errors.mobile}
          keyboardType="phone-pad"
          autoCapitalize="none"
          required
        />
        <FormField
          label="Aadhaar number"
          value={form.aadhaarNumber}
          onChangeText={value =>
            updateField('aadhaarNumber', value.replace(/\D/g, '').slice(0, 12))
          }
          placeholder="12 digits (optional)"
          error={errors.aadhaarNumber}
          keyboardType="numeric"
          autoCapitalize="none"
        />
      </View>
      <FormField
        label="Email address"
        value={form.email}
        onChangeText={value => updateField('email', value)}
        placeholder="owner@example.com"
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        required
      />
    </View>
  );

  const renderShopStep = () => (
    <View className="gap-4">
      <View>
        <Text className="text-base font-extrabold text-[#173F35]">
          Shop Details
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Add the shop&apos;s business and address information.
        </Text>
      </View>
      <FormField
        label="Shop name"
        value={form.shopName}
        onChangeText={value => updateField('shopName', value)}
        placeholder="e.g. Sri Golds"
        error={errors.shopName}
        required
      />
      <FormField
        label="GST number"
        value={form.gstNumber}
        onChangeText={value =>
          updateField('gstNumber', value.toUpperCase().slice(0, 15))
        }
        placeholder="15-character GSTIN (optional)"
        error={errors.gstNumber}
        autoCapitalize="characters"
      />
      <View className="flex-row gap-3">
        <FormField
          label="City"
          value={form.city}
          onChangeText={value => updateField('city', value)}
          placeholder="City"
        />
        <FormField
          label="Pincode"
          value={form.pincode}
          onChangeText={value =>
            updateField('pincode', value.replace(/\D/g, '').slice(0, 6))
          }
          placeholder="6-digit pincode"
          error={errors.pincode}
          keyboardType="numeric"
          autoCapitalize="none"
        />
      </View>
      <ChoiceField
        label="State / Union territory"
        value={form.state}
        placeholder="Select state"
        options={STATES_AND_UTS.map(state => ({ value: state, label: state }))}
        onSelect={value => updateField('state', value)}
      />
      <FormField
        label="Shop address"
        value={form.address}
        onChangeText={value => updateField('address', value)}
        placeholder="Street address"
        multiline
      />
      <FormField
        label="Admin notes"
        value={form.notes}
        onChangeText={value => updateField('notes', value)}
        placeholder="Internal notes about this shop"
        multiline
      />
    </View>
  );

  const renderSubscriptionStep = () => (
    <View className="gap-4">
      <View>
        <Text className="text-base font-extrabold text-[#173F35]">
          First Subscription
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Choose an active plan and subscription start date.
        </Text>
      </View>
      {plansLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#08745D" />
          <Text className="mt-2 text-xs text-[#6B7280]">
            Loading active plans...
          </Text>
        </View>
      ) : plansError ? (
        <View className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <Text className="text-xs text-rose-800">{plansError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadPlans()}
            className="mt-3 self-start rounded-lg bg-rose-700 px-3 py-2"
          >
            <Text className="text-xs font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : plans.length === 0 ? (
        <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-xs text-amber-900">
            No active subscription plans are available. Create or activate a
            plan before registering a shop.
          </Text>
        </View>
      ) : (
        <>
          <ChoiceField
            label="Subscription plan"
            value={form.planId}
            placeholder="Select a plan"
            options={plans.map(plan => ({
              value: String(plan.id),
              label: plan.plan_name,
            }))}
            onSelect={value => updateField('planId', value)}
            error={errors.planId}
          />
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
              Billing duration
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: form.duration === option.value,
                  }}
                  onPress={() => {
                    updateField('duration', option.value);
                  }}
                  className={`rounded-xl border px-3 py-2.5 ${
                    form.duration === option.value
                      ? 'border-[#08745D] bg-[#E7F3EF]'
                      : 'border-[#E5E7EB] bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      form.duration === option.value
                        ? 'text-[#07564B]'
                        : 'text-[#4B5563]'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="rounded-xl border border-[#DDEBE5] bg-[#F3F8F5] p-4">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
              Subscription price
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-[#07564B]">
              {formatCurrency(price)}
            </Text>
            <Text className="mt-1 text-[10px] text-[#6B7280]">
              {selectedDuration?.label} billing
            </Text>
          </View>
        </>
      )}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
            Start date
            <Text className="text-rose-600"> *</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose subscription start date"
            onPress={openStartDatePicker}
            className={`mt-1.5 min-h-11 flex-row items-center rounded-xl border bg-white px-3 ${
              errors.startDate ? 'border-rose-500' : 'border-[#E5E7EB]'
            }`}
          >
            <CalendarDays size={16} color="#08745D" />
            <Text className="ml-2 flex-1 text-sm text-[#1F2937]">
              {formatDateLabel(form.startDate)}
            </Text>
          </Pressable>
          {errors.startDate ? (
            <Text className="mt-1 text-[10px] font-medium text-rose-700">
              {errors.startDate}
            </Text>
          ) : null}
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563]">
            Estimated end
          </Text>
          <View className="mt-1.5 min-h-11 flex-row items-center rounded-xl border border-[#DDEBE5] bg-[#F3F8F5] px-3">
            <CalendarDays size={16} color="#08745D" />
            <Text className="ml-2 flex-1 text-sm font-semibold text-[#173F35]">
              {endDate ? formatDateLabel(endDate) : 'Select a valid start date'}
            </Text>
          </View>
        </View>
      </View>
      <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Text className="text-[11px] leading-4 text-amber-900">
          The new shop and subscription will remain pending until confirmed by
          Super Admin.
        </Text>
      </View>
    </View>
  );

  const renderLoginStep = () => (
    <View className="gap-4">
      <View>
        <Text className="text-base font-extrabold text-[#173F35]">
          Login Credentials
        </Text>
        <Text className="mt-1 text-xs text-[#6B7280]">
          Set the owner&apos;s account details for shop access.
        </Text>
      </View>
      <FormField
        label="Account email"
        value={form.email}
        onChangeText={() => {}}
        placeholder="Email address from Personal Details"
        editable={false}
      />
      <FormField
        label="Username"
        value={form.loginUsername}
        onChangeText={value => updateField('loginUsername', value)}
        placeholder="e.g. sri-golds-admin"
        error={errors.loginUsername}
        autoCapitalize="none"
        required
      />
      <FormField
        label="Password"
        value={form.loginPassword}
        onChangeText={value => updateField('loginPassword', value)}
        placeholder="At least 8 characters"
        error={errors.loginPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        required
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
            onPress={() => setShowPassword(visible => !visible)}
            className="mr-2 h-9 w-9 items-center justify-center rounded-lg"
          >
            {showPassword ? (
              <EyeOff size={17} color="#6B7280" />
            ) : (
              <Eye size={17} color="#6B7280" />
            )}
          </Pressable>
        }
      />
      <FormField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={value => updateField('confirmPassword', value)}
        placeholder="Re-enter the password"
        error={errors.confirmPassword}
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        required
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showConfirmPassword
                ? 'Hide confirm password'
                : 'Show confirm password'
            }
            onPress={() => setShowConfirmPassword(visible => !visible)}
            className="mr-2 h-9 w-9 items-center justify-center rounded-lg"
          >
            {showConfirmPassword ? (
              <EyeOff size={17} color="#6B7280" />
            ) : (
              <Eye size={17} color="#6B7280" />
            )}
          </Pressable>
        }
      />
      <View className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFA] p-3">
        <Text className="text-[11px] leading-4 text-[#4B5563]">
          Username is suggested from the owner name. The mobile number is used
          as the initial password; you can replace it before creating the shop.
        </Text>
      </View>
    </View>
  );

  const CurrentStepIcon = formSteps[step].icon;
  const stepContent = [
    renderPersonalStep,
    renderShopStep,
    renderSubscriptionStep,
    renderLoginStep,
  ][step]();

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <SafeAreaView edges={['top']} className="bg-[#153B35]">
            <View className="w-full flex-row items-center bg-[#153B35] px-5 py-4">
              {onCancel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to gold shops"
                  onPress={onCancel}
                  className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/10"
                >
                  <ArrowLeft size={21} color="#FFFFFF" />
                </Pressable>
              ) : null}
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#F4C95D]">
                  Gold Shops
                </Text>
                <Text className="mt-1 text-xl font-extrabold text-white">
                  {isEditing ? 'Edit Gold Shop' : 'Add Gold Shop'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={plansLoading}
                onRefresh={() => loadPlans()}
                tintColor="#08745D"
              />
            }
            contentContainerClassName="gap-4 px-4 pb-5 pt-4"
          >
            <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {formSteps.map((item, index) => {
                  const Icon = item.icon;
                  const active = step === index;
                  const complete = step > index;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setStep(index)}
                      className={`flex-row items-center rounded-xl border px-3 py-2 ${
                        active
                          ? 'border-[#075C51] bg-[#075C51]'
                          : 'border-[#E5E7EB] bg-white'
                      }`}
                    >
                      {complete ? (
                        <CheckCircle2 size={14} color="#059669" />
                      ) : (
                        <Icon
                          size={14}
                          color={active ? '#FFFFFF' : '#6B7280'}
                        />
                      )}
                      <Text
                        className={`ml-1.5 text-[10px] font-bold ${
                          active ? 'text-white' : 'text-[#4B5563]'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {formError ? (
              <View className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <Text className="text-xs font-semibold text-rose-800">
                  {formError}
                </Text>
              </View>
            ) : null}

            <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
              <View className="mb-4 flex-row items-center">
                <CurrentStepIcon size={18} color="#08745D" />
                <Text className="ml-2 text-sm font-extrabold text-[#173F35]">
                  Step {step + 1} of {formSteps.length}
                </Text>
              </View>
              {stepContent}
            </View>
          </ScrollView>

          <View className="flex-row gap-3 border-t border-[#E8ECE9] bg-white px-4 py-3">
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setFormError('');
                  setStep(current => Math.max(current - 1, 0));
                }}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-[#D1D5DB] bg-white"
              >
                <ArrowLeft size={16} color="#374151" />
                <Text className="ml-2 text-xs font-bold text-[#374151]">
                  Previous
                </Text>
              </Pressable>
            ) : null}
            {step < formSteps.length - 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={continueToNextStep}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-[#08745D]"
              >
                <Text className="mr-2 text-xs font-bold text-white">
                  Save &amp; Next
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={
                  submitting ||
                  (!isEditing && (plansLoading || plans.length === 0))
                }
                onPress={() => submit()}
                className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-[#08745D] ${
                  submitting ||
                  (!isEditing && (plansLoading || plans.length === 0))
                    ? 'opacity-55'
                    : ''
                }`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="mr-2 text-xs font-bold text-white">
                      {isEditing ? 'Save Changes' : 'Create Gold Shop'}
                    </Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      {Platform.OS === 'android' && showStartDatePicker ? (
        <DateTimePicker
          value={dateFromInput(form.startDate)}
          mode="date"
          display="calendar"
          onChange={handleStartDatePickerChange}
        />
      ) : null}
      <Modal
        visible={Platform.OS === 'ios' && showStartDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="items-center rounded-t-3xl bg-white pb-8 pt-4">
            <View className="mb-3 h-1 w-10 rounded-full bg-[#D1D5DB]" />
            <View className="w-full flex-row items-center justify-between px-5">
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowStartDatePicker(false)}
                className="py-2"
              >
                <Text className="text-sm font-semibold text-[#6B7280]">
                  Cancel
                </Text>
              </Pressable>
              <Text className="text-sm font-extrabold text-[#173F35]">
                Choose start date
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  updateField('startDate', dateToInput(pickerDate));
                  setShowStartDatePicker(false);
                }}
                className="py-2"
              >
                <Text className="text-sm font-bold text-[#08745D]">Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={handleStartDatePickerChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
