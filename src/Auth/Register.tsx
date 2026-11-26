import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ImagePlus,
  Store,
  UserRound,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../api';
import { useCustomAlert } from '../Components/CustomAlert';
import InnerHeader from '../Components/InnerHeader';
import { CustomDropdown, DatePicker } from '../Admin/Loans/FormControls';

type RegistrationPlan = {
  id: number | string;
  plan_name: string;
  monthly_price?: number | string;
  quarterly_price?: number | string;
  half_yearly_price?: number | string;
  yearly_price?: number | string;
};

type RegistrationForm = {
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
  planId: string;
  duration: string;
  startDate: string;
  loginUsername: string;
  loginPassword: string;
  confirmPassword: string;
};

type FormField = keyof RegistrationForm;
type PickedPhoto = { uri: string; name: string; type: string };
type Props = {
  onBack: () => void;
  onSubmitted: (email: string) => void;
};

const STEPS = [
  { title: 'Personal Details', shortTitle: 'Personal', icon: UserRound },
  { title: 'Shop Details', shortTitle: 'Shop', icon: Store },
  { title: 'Subscription', shortTitle: 'Plan', icon: CreditCard },
  { title: 'Review & Submit', shortTitle: 'Review', icon: CheckCircle2 },
];

const DURATIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

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
].map(state => ({ value: state, label: state }));

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function usernameFromOwnerName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._@+-]/g, '')
    .slice(0, 150);
}

function estimatedEndDate(startDate: string, duration: string) {
  const monthsByDuration: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    half_yearly: 6,
    yearly: 12,
  };
  const months = monthsByDuration[duration];
  if (!months || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return '';
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.toISOString().slice(0, 10) !== startDate) return '';
  const end = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function utf8ByteLength(value: string) {
  return Array.from(value).reduce((total, character) => {
    const codePoint = character.codePointAt(0) || 0;
    return total + (codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4);
  }, 0);
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
  return 'Could not submit your registration. Please try again.';
}

function validateField(field: FormField, form: RegistrationForm, selectedPlanId: string) {
  const value = form[field].trim();
  switch (field) {
    case 'ownerName':
      return !value
        ? 'Name is required.'
        : value.length > 150
          ? 'Name must be 150 characters or fewer.'
          : '';
    case 'mobile':
      return /^[6-9]\d{9}$/.test(value)
        ? ''
        : 'Enter a 10-digit mobile number starting with 6, 7, 8, or 9.';
    case 'email':
      return !value
        ? 'Email ID is required for shop login.'
        : value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? ''
          : 'Enter a valid email address.';
    case 'aadhaarNumber':
      return value && !/^\d{12}$/.test(value)
        ? 'Aadhaar number must contain exactly 12 digits.'
        : '';
    case 'shopName':
      return !value
        ? 'Shop name is required.'
        : value.length > 150
          ? 'Shop name must be 150 characters or fewer.'
          : '';
    case 'gstNumber':
      return value &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)
        ? 'Enter a valid 15-character GSTIN.'
        : '';
    case 'pincode':
      return value && !/^[1-9]\d{5}$/.test(value)
        ? 'Pincode must be a valid 6-digit Indian postal code.'
        : '';
    case 'planId':
      return selectedPlanId ? '' : 'Select a subscription plan.';
    case 'startDate': {
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        parsed.toISOString().slice(0, 10) === value
        ? ''
        : 'Enter a valid subscription start date.';
    }
    case 'loginUsername':
      return /^[A-Za-z0-9._@+-]{3,150}$/.test(value)
        ? ''
        : 'Username must be 3 to 150 letters, numbers, or . _ @ + - characters.';
    case 'loginPassword':
      return form.loginPassword.length >= 8 && utf8ByteLength(form.loginPassword) <= 72
        ? ''
        : 'Password must be at least 8 characters and no more than 72 bytes.';
    case 'confirmPassword':
      return form.confirmPassword === form.loginPassword
        ? ''
        : 'Password and confirm password do not match.';
    default:
      return '';
  }
}

function InputField({
  label,
  value,
  onChangeText,
  error,
  required,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  editable = true,
  rightAction,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  rightAction?: ReactNode;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label}
        {required ? <Text className="text-red-600"> *</Text> : null}
      </Text>
      <View
        className={`flex-row items-center rounded-xl border bg-white px-3.5 ${
          error ? 'border-red-400' : 'border-[#E6E9E3]'
        }`}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA6A1"
          secureTextEntry={secureTextEntry}
          value={value}
          className={`flex-1 py-3 text-sm text-[#173F35] ${
            multiline ? 'min-h-24' : 'min-h-12'
          }`}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {rightAction}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="mt-1 text-xs text-red-700">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function Register({ onBack, onSubmitted }: Props) {
  const { showAlert } = useCustomAlert();
  const [form, setForm] = useState<RegistrationForm>({
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
    planId: '',
    duration: 'monthly',
    startDate: localDate(),
    loginUsername: '',
    loginPassword: '',
    confirmPassword: '',
  });
  const [plans, setPlans] = useState<RegistrationPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [retryPlans, setRetryPlans] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPlansLoading(true);
    setPlansError('');
    api
      .get('/auth/registration-plans', { signal: controller.signal })
      .then(response => {
        const data = response.data;
        if (!Array.isArray(data?.plans)) {
          throw new TypeError('Registration plans response is invalid.');
        }
        setPlans(data.plans);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setPlansError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlansLoading(false);
      });
    return () => controller.abort();
  }, [retryPlans]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeStep > 0) {
        setActiveStep(step => step - 1);
      } else {
        onBack();
      }
      return true;
    });
    return () => subscription.remove();
  }, [activeStep, onBack]);

  const selectedPlanId = form.planId || String(plans[0]?.id || '');
  const selectedPlan = useMemo(
    () => plans.find(plan => String(plan.id) === selectedPlanId),
    [plans, selectedPlanId],
  );
  const price = selectedPlan
    ? Number(selectedPlan[`${form.duration}_price` as keyof RegistrationPlan])
    : Number.NaN;
  const endDate = estimatedEndDate(form.startDate, form.duration);

  const setField = (field: FormField, value: string) => {
    setForm(current => {
      if (field === 'ownerName') {
        const previousAutomaticUsername = usernameFromOwnerName(current.ownerName);
        const shouldUpdateUsername =
          !current.loginUsername || current.loginUsername === previousAutomaticUsername;
        return {
          ...current,
          ownerName: value,
          loginUsername: shouldUpdateUsername
            ? usernameFromOwnerName(value)
            : current.loginUsername,
        };
      }
      return { ...current, [field]: value };
    });
    setFieldErrors(current => ({ ...current, [field]: undefined }));
  };

  const validateSteps = (steps: number[]) => {
    const fieldsByStep: FormField[][] = [
      ['ownerName', 'mobile', 'email', 'aadhaarNumber'],
      ['shopName', 'gstNumber', 'pincode'],
      ['planId', 'startDate'],
      ['loginUsername', 'loginPassword', 'confirmPassword'],
    ];
    const errors: Partial<Record<FormField, string>> = {};
    let firstInvalidStep: number | null = null;
    for (const step of steps) {
      for (const field of fieldsByStep[step]) {
        const error = validateField(field, form, selectedPlanId);
        if (error) {
          errors[field] = error;
          if (firstInvalidStep === null) firstInvalidStep = step;
        }
      }
    }
    setFieldErrors(errors);
    if (firstInvalidStep !== null) {
      setActiveStep(firstInvalidStep);
      return false;
    }
    return true;
  };

  const chooseProfilePhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorMessage) {
        showAlert('Photo unavailable', result.errorMessage, { variant: 'error' });
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert('Photo unavailable', 'Choose a JPG or PNG image and try again.', {
          variant: 'error',
        });
        return;
      }
      const mimeType = asset.type === 'image/png' ? 'image/png' : 'image/jpeg';
      if (asset.type && !['image/jpeg', 'image/jpg', 'image/png'].includes(asset.type)) {
        showAlert('Unsupported photo', 'Profile photos must be JPG or PNG images.', {
          variant: 'warning',
        });
        return;
      }
      if ((asset.fileSize || 0) > 5 * 1024 * 1024) {
        showAlert('Photo is too large', 'Choose a profile photo no larger than 5 MB.', {
          variant: 'warning',
        });
        return;
      }
      setPhoto({
        uri: asset.uri,
        name: asset.fileName || `profile-photo.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
        type: mimeType,
      });
    } catch (error) {
      showAlert('Photo unavailable', getErrorMessage(error), { variant: 'error' });
    }
  };

  const submitRegistration = async () => {
    if (submitting || !validateSteps([0, 1, 2, 3])) return;
    const payload = {
      shopName: form.shopName.trim(),
      ownerName: form.ownerName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim().toLowerCase(),
      aadhaarNumber: form.aadhaarNumber.trim(),
      credentials: {
        username: form.loginUsername.trim(),
        password: form.loginPassword,
      },
      gstNumber: form.gstNumber.trim().toUpperCase(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      maxBranches: 1,
      maxStaff: 1,
      notes: '',
      subscription: {
        planId: Number(selectedPlanId),
        duration: form.duration,
        startDate: form.startDate,
      },
    };
    const body = new FormData();
    body.append('payload', JSON.stringify(payload));
    if (photo) {
      body.append('profilePhoto', {
        uri: photo.uri,
        name: photo.name,
        type: photo.type,
      });
    }

    setSubmitting(true);
    try {
      await api.post('/auth/shop-registration', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSubmitted(payload.email);
    } catch (error) {
      showAlert('Registration could not be submitted', getErrorMessage(error), {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (validateSteps([activeStep])) {
      setActiveStep(step => Math.min(step + 1, STEPS.length - 1));
    }
  };

  if (plansLoading || plansError || plans.length === 0) {
    return (
      <View className="flex-1 bg-[#F8F7F2]">
        <InnerHeader
          title="Register your gold shop"
          sectionLabel="Shop registration"
          onBack={onBack}
          backAccessibilityLabel="Back to sign in"
        />
        <View className="flex-1 justify-center px-6">
          <View className="rounded-3xl border border-[#EAE7DC] bg-white p-6">
            {plansLoading ? (
              <>
                <ActivityIndicator color="#07564B" />
                <Text className="mt-4 text-center text-sm text-[#6B7280]">
                  Loading subscription plans...
                </Text>
              </>
            ) : (
              <>
                <Text accessibilityRole="alert" className="text-center text-sm text-[#991B1B]">
                  {plansError ||
                    'Registration is unavailable because there are no active subscription plans.'}
                </Text>
                {plansError ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRetryPlans(count => count + 1)}
                    className="mt-5 items-center rounded-xl bg-[#07564B] px-5 py-3">
                    <Text className="font-bold text-white">Try again</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={onBack} className="mt-4 py-2">
                  <Text className="text-center text-sm font-bold text-[#07564B]">
                    Back to sign in
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  const StepIcon = STEPS[activeStep].icon;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerHeader
        title="Register your gold shop"
        sectionLabel="Shop registration"
        onBack={onBack}
        backAccessibilityLabel="Back to sign in"
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-1"
        keyboardShouldPersistTaps="handled">
        <View className="mb-4 items-center">
          <Image
            accessibilityLabel="Sri Golds logo"
            source={require('../Assert/Images/App icon.png')}
            resizeMode="cover"
            className="mb-2 h-16 w-16 rounded-full border-2 border-[#F5E6A8]"
          />
          <Text className="text-center text-xl font-extrabold text-[#173F35]">
            Create an account
          </Text>
          <Text className="mt-1 text-center text-sm leading-5 text-[#6B7280]">
            Register your gold shop to manage customers, products, and billing with ease.
          </Text>
          <View className="mt-2 flex-row items-center">
            <Text className="text-xs text-[#6B7280]">Already have an account? </Text>
            <Pressable accessibilityRole="button" onPress={onBack}>
              <Text className="text-xs font-bold text-[#07564B]">Sign in</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-4 flex-row rounded-xl bg-[#07564B] p-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const selected = index === activeStep;
            return (
              <Pressable
                key={step.title}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveStep(index)}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg px-1 ${
                  selected ? 'bg-white' : ''
                }`}>
                <View className="flex-row items-center">
                  <Icon size={14} color={selected ? '#07564B' : '#FFFFFF'} />
                  <Text
                    numberOfLines={1}
                    className={`ml-1 text-[10px] font-bold ${
                      selected ? 'text-[#07564B]' : 'text-white'
                    }`}>
                    {step.shortTitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="rounded-2xl border border-[#EAE7DC] bg-white p-4 shadow-sm">
          <View className="mb-4 flex-row items-center border-b border-[#E8EEE9] pb-3">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#EFF9F5]">
              <StepIcon size={18} color="#07564B" />
            </View>
            <Text className="text-base font-extrabold text-[#173F35]">
              {STEPS[activeStep].title}
            </Text>
          </View>

          {activeStep === 0 ? (
            <>
              <InputField
                label="Name"
                value={form.ownerName}
                onChangeText={value => setField('ownerName', value)}
                error={fieldErrors.ownerName}
                required
                maxLength={150}
                placeholder="Full name"
              />
              <InputField
                label="Mobile number"
                value={form.mobile}
                onChangeText={value =>
                  setField('mobile', value.replace(/\D/g, '').slice(0, 10))
                }
                error={fieldErrors.mobile}
                required
                keyboardType="number-pad"
                maxLength={10}
                placeholder="9876543210"
              />
              <InputField
                label="Email ID"
                value={form.email}
                onChangeText={value => setField('email', value)}
                error={fieldErrors.email}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={255}
                placeholder="owner@example.com"
              />
              <InputField
                label="Aadhaar number"
                value={form.aadhaarNumber}
                onChangeText={value =>
                  setField('aadhaarNumber', value.replace(/\D/g, '').slice(0, 12))
                }
                error={fieldErrors.aadhaarNumber}
                keyboardType="number-pad"
                maxLength={12}
                placeholder="12-digit Aadhaar number"
              />
              <View className="mt-1">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
                  Profile photo
                </Text>
                {photo ? (
                  <View className="flex-row items-center rounded-xl border border-[#DCE8E3] bg-[#F8FBF9] p-3">
                    <Image source={{ uri: photo.uri }} className="h-14 w-14 rounded-lg" />
                    <Text numberOfLines={1} className="mx-3 flex-1 text-xs text-[#52645F]">
                      {photo.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove profile photo"
                      onPress={() => setPhoto(null)}
                      className="rounded-lg bg-white px-3 py-2">
                      <Text className="text-xs font-bold text-[#991B1B]">Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={chooseProfilePhoto}
                    className="min-h-20 items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-3">
                    <ImagePlus size={22} color="#07564B" />
                    <Text className="mt-1 text-sm font-bold text-[#07564B]">
                      Choose profile photo
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-[#6B7280]">
                      JPG or PNG, up to 5 MB (optional)
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : activeStep === 1 ? (
            <>
              <InputField
                label="Shop name"
                value={form.shopName}
                onChangeText={value => setField('shopName', value)}
                error={fieldErrors.shopName}
                required
                maxLength={150}
                placeholder="e.g. Sri Golds"
              />
              <InputField
                label="GST number"
                value={form.gstNumber}
                onChangeText={value => setField('gstNumber', value.toUpperCase())}
                error={fieldErrors.gstNumber}
                autoCapitalize="characters"
                maxLength={15}
                placeholder="15-character GSTIN"
              />
              <InputField
                label="City"
                value={form.city}
                onChangeText={value => setField('city', value)}
                maxLength={100}
                placeholder="City"
              />
              <CustomDropdown
                label="State"
                value={form.state}
                options={STATES_AND_UTS}
                onSelect={value => setField('state', value)}
                placeholder="Select state"
                searchable
              />
              <InputField
                label="Pincode"
                value={form.pincode}
                onChangeText={value =>
                  setField('pincode', value.replace(/\D/g, '').slice(0, 6))
                }
                error={fieldErrors.pincode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit pincode"
              />
              <InputField
                label="Shop address"
                value={form.address}
                onChangeText={value => setField('address', value)}
                multiline
                maxLength={5000}
                placeholder="Street address"
              />
            </>
          ) : activeStep === 2 ? (
            <>
              <Text className="mb-3 text-xs leading-5 text-[#6B7280]">
                Select a plan and duration. Payment remains pending until it is confirmed by the
                Super Admin.
              </Text>
              <CustomDropdown
                label="Subscription plan"
                value={selectedPlanId}
                options={plans.map(plan => ({
                  value: String(plan.id),
                  label: plan.plan_name,
                }))}
                onSelect={value => setField('planId', value)}
                placeholder="Select a subscription plan"
                required
              />
              {fieldErrors.planId ? (
                <Text accessibilityRole="alert" className="mb-3 -mt-3 text-xs text-red-700">
                  {fieldErrors.planId}
                </Text>
              ) : null}
              <CustomDropdown
                label="Duration"
                value={form.duration}
                options={DURATIONS}
                onSelect={value => setField('duration', value)}
                required
              />
              <View className="mb-3 rounded-xl bg-emerald-50 p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-[#52645F]">
                  Subscription price
                </Text>
                <Text className="mt-1 text-xl font-extrabold text-[#07564B]">
                  {Number.isFinite(price) ? `₹${price.toLocaleString('en-IN')}` : 'Not configured'}
                </Text>
              </View>
              <View className="mb-3 rounded-xl border border-[#E6E9E3] bg-[#F8F9F6] p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-[#52645F]">
                  Estimated end date
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#173F35]">
                  {endDate ? formatDate(endDate) : 'Select a valid start date'}
                </Text>
              </View>
              <DatePicker
                label="Start date"
                value={form.startDate}
                onChange={value => setField('startDate', value)}
                maximumDate={null}
              />
              {fieldErrors.startDate ? (
                <Text accessibilityRole="alert" className="-mt-3 mb-3 text-xs text-red-700">
                  {fieldErrors.startDate}
                </Text>
              ) : null}
              <View className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-[#52645F]">
                  Approval status
                </Text>
                <Text className="mt-1 text-sm font-semibold text-emerald-800">Pending</Text>
              </View>
              <View className="rounded-xl border border-[#E6E9E3] bg-[#F8F9F6] p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-[#52645F]">
                  Payment status
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#52645F]">
                  Pending Super Admin confirmation
                </Text>
              </View>
            </>
          ) : (
            <>
              <View className="mb-4 rounded-xl bg-[#F0F8F5] p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-[#07564B]">
                  Registration summary
                </Text>
                <Text className="mt-2 text-sm font-semibold text-[#173F35]">
                  {form.ownerName || 'Owner name'} · {form.mobile || 'Mobile number'}
                </Text>
                <Text className="mt-1 text-xs text-[#52645F]">
                  {form.email || 'Email'} · {form.shopName || 'Shop name'}
                </Text>
                <Text className="mt-1 text-xs text-[#52645F]">
                  {selectedPlan?.plan_name || 'Subscription plan'} ·{' '}
                  {DURATIONS.find(duration => duration.value === form.duration)?.label} ·{' '}
                  {formatDate(form.startDate)}
                </Text>
              </View>
              <InputField
                label="Email ID"
                value={form.email}
                onChangeText={() => undefined}
                autoCapitalize="none"
                editable={false}
              />
              <InputField
                label="Username"
                value={form.loginUsername}
                onChangeText={value => setField('loginUsername', value)}
                error={fieldErrors.loginUsername}
                required
                autoCapitalize="none"
                maxLength={150}
                placeholder="e.g. sri-golds-admin"
              />
              <InputField
                label="Password"
                value={form.loginPassword}
                onChangeText={value => setField('loginPassword', value)}
                error={fieldErrors.loginPassword}
                required
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                placeholder="At least 8 characters"
                rightAction={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowPassword(visible => !visible)}
                    className="ml-2 h-10 w-10 items-center justify-center">
                    {showPassword ? (
                      <EyeOff size={18} color="#A77B15" />
                    ) : (
                      <Eye size={18} color="#A77B15" />
                    )}
                  </Pressable>
                }
              />
              <InputField
                label="Confirm password"
                value={form.confirmPassword}
                onChangeText={value => setField('confirmPassword', value)}
                error={fieldErrors.confirmPassword}
                required
                autoCapitalize="none"
                secureTextEntry={!showConfirmPassword}
                placeholder="Re-enter the password"
                rightAction={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    onPress={() => setShowConfirmPassword(visible => !visible)}
                    className="ml-2 h-10 w-10 items-center justify-center">
                    {showConfirmPassword ? (
                      <EyeOff size={18} color="#A77B15" />
                    ) : (
                      <Eye size={18} color="#A77B15" />
                    )}
                  </Pressable>
                }
              />
              <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
                Email is filled from Personal Details, and the username is filled from the owner
                name. Your login account will be created only after Super Admin approval.
              </Text>
            </>
          )}
        </View>

        <View className="mt-4 flex-row justify-between gap-3">
          <Pressable
            accessibilityRole="button"
            disabled={activeStep === 0 || submitting}
            onPress={() => setActiveStep(step => Math.max(step - 1, 0))}
            className="min-h-12 min-w-[120px] flex-row items-center justify-center rounded-full border border-[#07564B] px-4 disabled:opacity-40">
            <ArrowLeft size={16} color="#07564B" />
            <Text className="ml-2 text-sm font-bold text-[#07564B]">Previous</Text>
          </Pressable>
          {activeStep < STEPS.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={goNext}
              className="min-h-12 min-w-[150px] flex-row items-center justify-center rounded-full bg-[#064A41] px-5">
              <Text className="mr-2 text-sm font-bold text-white">Save &amp; Next</Text>
              <ArrowRight size={17} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={submitRegistration}
              className="min-h-12 min-w-[160px] flex-row items-center justify-center rounded-full bg-[#064A41] px-5 disabled:opacity-60">
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ArrowRight size={17} color="#FFFFFF" />
              )}
              <Text className="ml-2 text-sm font-bold text-white">
                {submitting ? 'Submitting...' : 'Save Gold Shop'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
