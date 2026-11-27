import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Store,
  UserRound,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Geolocation, {
  PositionError,
  type GeoPosition,
} from 'react-native-geolocation-service';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import api from '../api';
import { useCustomAlert } from '../Components/CustomAlert';
import { CustomDropdown, DatePicker } from '../Admin/Loans/FormControls';
import useKeyboardScroll from './useKeyboardScroll';

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

const DURATIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const STEPS = [
  { title: 'Personal Details', shortTitle: 'Personal', icon: UserRound },
  { title: 'Shop Details', shortTitle: 'Shop', icon: Store },
  { title: 'Subscription', shortTitle: 'Plan', icon: CreditCard },
  { title: 'Review & Submit', shortTitle: 'Review', icon: CheckCircle2 },
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

function matchIndianState(value: string) {
  const normalizedValue = value.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalizedValue) return '';
  return (
    STATES_AND_UTS.find(option => {
      const normalizedState = option.value.toLowerCase().replace(/[^a-z]/g, '');
      return (
        normalizedValue === normalizedState ||
        normalizedValue.includes(normalizedState) ||
        normalizedState.includes(normalizedValue)
      );
    })?.value || ''
  );
}

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
  labelAction,
  onFocus,
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
  labelAction?: ReactNode;
  onFocus?: (input: TextInputInstance) => void;
}) {
  const inputRef = useRef<TextInputInstance>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-3.5">
      <View className="mb-1.5 ml-1 flex-row items-center justify-between">
        <Text
          style={styles.fieldLabel}
          className="text-xs font-bold uppercase tracking-[0.8px]">
          {label}
          {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
        </Text>
        {labelAction}
      </View>
      <View
        style={[
          styles.inputRow,
          error
            ? styles.inputRowError
            : isFocused
              ? styles.inputRowFocused
              : styles.inputRowIdle,
        ]}
        className="flex-row items-center rounded-2xl px-4">
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            if (inputRef.current) onFocus?.(inputRef.current);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="rgba(220, 236, 228, 0.65)"
          selectionColor="#F5C451"
          ref={inputRef}
          secureTextEntry={secureTextEntry}
          value={value}
          style={editable ? styles.inputText : styles.inputTextDisabled}
          className={`flex-1 text-[15px] font-medium ${
            multiline ? 'min-h-24 py-3.5' : 'py-3.5'
          }`}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {rightAction}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={styles.errorText}
          className="mt-1.5 ml-1 text-xs font-medium">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function Register({ onBack, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
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
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const { scrollViewRef, onInputFocus, onScroll } = useKeyboardScroll();

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

  const fetchCurrentLocation = async () => {
    if (fetchingLocation) return;

    setFetchingLocation(true);
    setCurrentLocation('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        if (
          permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
            PermissionsAndroid.RESULTS.GRANTED &&
          permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          throw new Error(
            'Location permission was denied. Allow location access in settings and try again.',
          );
        }
      } else {
        const authorization = await Geolocation.requestAuthorization('whenInUse');
        if (authorization !== 'granted') {
          throw new Error(
            'Location permission was denied. Allow location access in settings and try again.',
          );
        }
      }

      const position = await new Promise<GeoPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 10000);
      const params = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        lat: String(position.coords.latitude),
        lon: String(position.coords.longitude),
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SriGoldSuite/0.0.1 (registration location lookup)',
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(
          'OpenStreetMap could not look up this location. Please try again.',
        );
      }

      const result: unknown = await response.json();
      if (
        typeof result !== 'object' ||
        result === null ||
        !('address' in result) ||
        typeof result.address !== 'object' ||
        result.address === null
      ) {
        throw new Error('No address details were found for this location.');
      }

      const address = result.address as Record<string, unknown>;
      const addressValue = (...keys: string[]) => {
        for (const key of keys) {
          if (typeof address[key] === 'string') return address[key];
        }
        return '';
      };
      const street = [
        addressValue('house_number'),
        addressValue('road', 'pedestrian', 'residential'),
      ]
        .filter(Boolean)
        .join(' ');
      const locality = addressValue('neighbourhood', 'suburb', 'quarter');
      const shopAddress =
        [street, locality].filter(Boolean).join(', ') ||
        ('display_name' in result && typeof result.display_name === 'string'
          ? result.display_name
          : '');
      const city = addressValue(
        'city',
        'town',
        'village',
        'municipality',
        'city_district',
        'county',
      );
      const state = matchIndianState(addressValue('state'));
      const postalCode = addressValue('postcode').replace(/\D/g, '');
      const pincode = /^[1-9]\d{5}$/.test(postalCode) ? postalCode : '';

      setForm(current => ({
        ...current,
        address: shopAddress,
        city,
        state,
        pincode,
      }));
      setCurrentLocation(
        'Location fields filled where available. Please verify them before saving.',
      );
    } catch (error) {
      let message = getErrorMessage(error);
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === PositionError.PERMISSION_DENIED) {
          message =
            'Location permission was denied. Allow location access in settings and try again.';
        } else if (error.code === PositionError.POSITION_UNAVAILABLE) {
          message = 'Your current location is unavailable.';
        } else if (error.code === PositionError.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        message = 'Location lookup timed out. Please try again.';
      } else if (error instanceof TypeError) {
        message = 'Could not connect to OpenStreetMap. Please try again.';
      }
      showAlert('Location unavailable', message, { variant: 'error' });
    } finally {
      if (timeout) clearTimeout(timeout);
      setFetchingLocation(false);
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

  const StepIcon = STEPS[activeStep].icon;

  return (
    <View className="flex-1 bg-[#063A2E]">
      <StatusBar barStyle="light-content" />
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no"
        source={require('../Assert/Images/Welcome/welcomebg3.png')}
        resizeMode="cover"
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundScrim} />

      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={[
              styles.pageContainer,
              { paddingBottom: Math.max(insets.bottom + 12, 16) },
            ]}
            className="flex-1 px-5 pt-3">
            <View className="w-full max-w-md flex-1 self-center">
              <View className="mb-3 items-center">
                <View style={styles.logoHalo} className="rounded-full p-1">
                  <View
                    style={styles.logoFrame}
                    className="h-16 w-16 overflow-hidden rounded-full">
                    <Image
                      accessibilityLabel="Sri GoldSuite logo"
                      source={require('../Assert/Images/App icon.png')}
                      resizeMode="cover"
                      className="h-full w-full"
                    />
                  </View>
                </View>
                <Text
                  style={styles.eyebrowText}
                  className="mt-2 text-[10px] font-bold tracking-[3px]">
                  SRI GOLDSUITE
                </Text>
                <Text
                  style={styles.titleText}
                  className="mt-0.5 text-center text-2xl font-extrabold tracking-tight">
                  Register your gold shop
                </Text>
              </View>

              <View
                style={styles.stepperBar}
                className="mb-3.5 flex-row rounded-2xl p-1">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const selected = index === activeStep;
                  return (
                    <Pressable
                      key={step.title}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setActiveStep(index)}
                      style={
                        selected ? styles.stepTabActive : styles.stepTabIdle
                      }
                      className="min-h-10 flex-1 items-center justify-center rounded-xl px-1">
                      <View className="flex-row items-center">
                        <Icon
                          size={13}
                          color={selected ? '#FFFFFF' : '#D7EAE1'}
                        />
                        <Text
                          numberOfLines={1}
                          style={
                            selected
                              ? styles.stepTabTextActive
                              : styles.stepTabTextIdle
                          }
                          className="ml-1 text-[10px] font-bold">
                          {step.shortTitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.card} className="min-h-0 flex-1">
                <View pointerEvents="none" style={styles.glassTintLayer} />
                <View pointerEvents="none" style={styles.glassSheenTop} />
                <View pointerEvents="none" style={styles.glassGlowGold} />
                <View
                  style={styles.cardAccentBar}
                  className="mb-3 self-center"
                />

                <ScrollView
                  ref={scrollViewRef}
                  className="flex-1"
                  contentContainerClassName="flex-grow"
                  automaticallyAdjustKeyboardInsets
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  onScroll={onScroll}
                  scrollEventThrottle={16}>
                  {plansLoading ? (
                    <View
                      style={styles.infoBanner}
                      className="mb-4 flex-row items-center rounded-2xl p-3">
                      <ActivityIndicator size="small" color="#F5C451" />
                      <Text
                        style={styles.infoBannerText}
                        className="ml-3 text-sm">
                        Loading subscription plans...
                      </Text>
                    </View>
                  ) : null}
                  {!plansLoading && (plansError || plans.length === 0) ? (
                    <View
                      style={styles.errorBanner}
                      className="mb-4 rounded-2xl p-3">
                      <Text
                        accessibilityRole="alert"
                        style={styles.errorBannerText}
                        className="text-sm">
                        {plansError ||
                          'Registration is unavailable because there are no active subscription plans.'}
                      </Text>
                      {plansError ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setRetryPlans(count => count + 1)}
                          style={styles.retryButton}
                          className="mt-3 self-start rounded-xl px-4 py-2">
                          <Text className="text-xs font-bold text-white">
                            Try again
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <View
                    style={styles.stepHeaderRow}
                    className="mb-4 flex-row items-center justify-between pb-3">
                    <View className="flex-row items-center">
                      <View
                        style={styles.stepHeaderIconBox}
                        className="mr-3 h-9 w-9 items-center justify-center rounded-xl">
                        <StepIcon size={17} color="#F5C451" />
                      </View>
                      <Text
                        style={styles.stepHeaderTitle}
                        className="text-base font-extrabold">
                        {STEPS[activeStep].title}
                      </Text>
                    </View>
                    <View
                      style={styles.stepCounterPill}
                      className="rounded-full px-2.5 py-1">
                      <Text
                        style={styles.stepCounterText}
                        className="text-[11px] font-bold">
                        {activeStep + 1} / {STEPS.length}
                      </Text>
                    </View>
                  </View>

                  {activeStep === 0 ? (
                    <View className="mb-3">
                      <InputField
                        label="Name"
                        onFocus={onInputFocus}
                        value={form.ownerName}
                        onChangeText={value => setField('ownerName', value)}
                        error={fieldErrors.ownerName}
                        required
                        maxLength={150}
                        placeholder="Full name"
                      />
                      <InputField
                        label="Mobile number"
                        onFocus={onInputFocus}
                        value={form.mobile}
                        onChangeText={value =>
                          setField(
                            'mobile',
                            value.replace(/\D/g, '').slice(0, 10),
                          )
                        }
                        error={fieldErrors.mobile}
                        required
                        keyboardType="number-pad"
                        maxLength={10}
                        placeholder="9876543210"
                      />
                      <InputField
                        label="Email ID"
                        onFocus={onInputFocus}
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
                        onFocus={onInputFocus}
                        value={form.aadhaarNumber}
                        onChangeText={value =>
                          setField(
                            'aadhaarNumber',
                            value.replace(/\D/g, '').slice(0, 12),
                          )
                        }
                        error={fieldErrors.aadhaarNumber}
                        keyboardType="number-pad"
                        maxLength={12}
                        placeholder="12-digit Aadhaar number"
                      />
                      <View className="mt-1">
                        <Text
                          style={styles.fieldLabel}
                          className="mb-2 ml-1 text-xs font-bold uppercase tracking-[0.8px]">
                          Profile photo
                        </Text>
                        {photo ? (
                          <View
                            style={styles.photoSelectedCard}
                            className="flex-row items-center rounded-2xl p-3">
                            <Image
                              source={{ uri: photo.uri }}
                              className="h-14 w-14 rounded-xl"
                            />
                            <Text
                              numberOfLines={1}
                              style={styles.photoNameText}
                              className="mx-3 flex-1 text-xs font-medium">
                              {photo.name}
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Remove profile photo"
                              onPress={() => setPhoto(null)}
                              style={styles.photoRemoveButton}
                              className="rounded-xl px-3 py-2">
                              <Text
                                style={styles.photoRemoveText}
                                className="text-xs font-bold">
                                Remove
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            onPress={chooseProfilePhoto}
                            style={styles.photoDropzone}
                            className="min-h-20 items-center justify-center rounded-2xl px-3 py-3.5 active:opacity-80">
                            <ImagePlus size={22} color="#F5C451" />
                            <Text
                              style={styles.photoDropTitle}
                              className="mt-1.5 text-sm font-bold">
                              Choose profile photo
                            </Text>
                            <Text
                              style={styles.photoDropHint}
                              className="mt-0.5 text-[11px]">
                              JPG or PNG, up to 5 MB (optional)
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ) : activeStep === 1 ? (
                    <View className="mb-3">
                      <InputField
                        label="Shop name"
                        onFocus={onInputFocus}
                        value={form.shopName}
                        onChangeText={value => setField('shopName', value)}
                        error={fieldErrors.shopName}
                        required
                        maxLength={150}
                        placeholder="e.g. Sri Golds"
                      />
                      <InputField
                        label="GST number"
                        onFocus={onInputFocus}
                        value={form.gstNumber}
                        onChangeText={value =>
                          setField('gstNumber', value.toUpperCase())
                        }
                        error={fieldErrors.gstNumber}
                        autoCapitalize="characters"
                        maxLength={15}
                        placeholder="15-character GSTIN"
                      />
                      <InputField
                        label="City"
                        onFocus={onInputFocus}
                        value={form.city}
                        onChangeText={value => setField('city', value)}
                        maxLength={100}
                        placeholder="City"
                        labelAction={
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Fetch current location"
                            testID="register-fetch-location"
                            disabled={fetchingLocation}
                            onPress={fetchCurrentLocation}
                            style={styles.locationButton}
                            className="flex-row items-center rounded-xl px-2.5 py-1.5 disabled:opacity-60">
                            {fetchingLocation ? (
                              <ActivityIndicator size="small" color="#F5C451" />
                            ) : (
                              <MapPin size={14} color="#F5C451" />
                            )}
                            <Text
                              style={styles.locationButtonText}
                              className="ml-1 text-[11px] font-bold">
                              {fetchingLocation
                                ? 'Fetching location...'
                                : 'Fetch current location'}
                            </Text>
                          </Pressable>
                        }
                      />
                      <CustomDropdown
                        label="State"
                        value={form.state}
                        options={STATES_AND_UTS}
                        onSelect={value => setField('state', value)}
                        placeholder="Select state"
                        searchable
                        variant="glass"
                      />
                      <InputField
                        label="Pincode"
                        onFocus={onInputFocus}
                        value={form.pincode}
                        onChangeText={value =>
                          setField(
                            'pincode',
                            value.replace(/\D/g, '').slice(0, 6),
                          )
                        }
                        error={fieldErrors.pincode}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="6-digit pincode"
                      />
                      <View>
                        <InputField
                          label="Shop address"
                          onFocus={onInputFocus}
                          value={form.address}
                          onChangeText={value => setField('address', value)}
                          multiline
                          maxLength={5000}
                          placeholder="Street address"
                        />
                        {currentLocation ? (
                          <View className="mb-3 -mt-2 flex-row flex-wrap items-center">
                            <Text
                              style={styles.helperText}
                              className="text-[11px]">
                              {currentLocation}{' '}
                            </Text>
                            <Text
                              style={styles.helperTextBold}
                              className="text-[11px] font-semibold">
                              © OpenStreetMap contributors
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : activeStep === 2 ? (
                    <View className="mb-3">
                      <Text
                        style={styles.helperText}
                        className="mb-3 text-xs leading-5">
                        Select a plan and duration. Payment remains pending
                        until it is confirmed by the Super Admin.
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
                        variant="glass"
                      />
                      {fieldErrors.planId ? (
                        <Text
                          accessibilityRole="alert"
                          style={styles.errorText}
                          className="mb-3 -mt-3 text-xs font-medium">
                          {fieldErrors.planId}
                        </Text>
                      ) : null}
                      <CustomDropdown
                        label="Duration"
                        value={form.duration}
                        options={DURATIONS}
                        onSelect={value => setField('duration', value)}
                        required
                        variant="glass"
                      />
                      <View
                        style={styles.priceCard}
                        className="mb-3 rounded-2xl p-3.5">
                        <Text
                          style={styles.fieldLabel}
                          className="text-xs font-bold uppercase tracking-[0.8px]">
                          Subscription price
                        </Text>
                        <Text
                          style={styles.priceValue}
                          className="mt-1 text-xl font-extrabold">
                          {Number.isFinite(price)
                            ? `₹${price.toLocaleString('en-IN')}`
                            : 'Not configured'}
                        </Text>
                      </View>
                      <View
                        style={styles.summaryCard}
                        className="mb-3 rounded-2xl p-3.5">
                        <Text
                          style={styles.fieldLabel}
                          className="text-xs font-bold uppercase tracking-[0.8px]">
                          Estimated end date
                        </Text>
                        <Text
                          style={styles.summaryValue}
                          className="mt-1 text-sm font-semibold">
                          {endDate
                            ? formatDate(endDate)
                            : 'Select a valid start date'}
                        </Text>
                      </View>
                      <DatePicker
                        label="Start date"
                        value={form.startDate}
                        onChange={value => setField('startDate', value)}
                        maximumDate={null}
                        variant="glass"
                      />
                      {fieldErrors.startDate ? (
                        <Text
                          accessibilityRole="alert"
                          style={styles.errorText}
                          className="-mt-3 mb-3 text-xs font-medium">
                          {fieldErrors.startDate}
                        </Text>
                      ) : null}
                      <View
                        style={styles.statusCardEmerald}
                        className="mb-3 rounded-2xl p-3.5">
                        <Text
                          style={styles.fieldLabel}
                          className="text-xs font-bold uppercase tracking-[0.8px]">
                          Approval status
                        </Text>
                        <Text
                          style={styles.statusValueEmerald}
                          className="mt-1 text-sm font-semibold">
                          Pending
                        </Text>
                      </View>
                      <View
                        style={styles.summaryCard}
                        className="rounded-2xl p-3.5">
                        <Text
                          style={styles.fieldLabel}
                          className="text-xs font-bold uppercase tracking-[0.8px]">
                          Payment status
                        </Text>
                        <Text
                          style={styles.summaryValueMuted}
                          className="mt-1 text-sm font-semibold">
                          Pending Super Admin confirmation
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <InputField
                        label="Email ID"
                        onFocus={onInputFocus}
                        value={form.email}
                        onChangeText={() => undefined}
                        autoCapitalize="none"
                        editable={false}
                        placeholder="Filled from Personal Details"
                      />
                      <InputField
                        label="Username"
                        onFocus={onInputFocus}
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
                        onFocus={onInputFocus}
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
                            accessibilityLabel={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                            onPress={() => setShowPassword(visible => !visible)}
                            className="ml-2 h-10 w-10 items-center justify-center rounded-xl active:opacity-70">
                            {showPassword ? (
                              <EyeOff size={18} color="#F5C451" />
                            ) : (
                              <Eye size={18} color="#F5C451" />
                            )}
                          </Pressable>
                        }
                      />
                      <InputField
                        label="Confirm password"
                        onFocus={onInputFocus}
                        value={form.confirmPassword}
                        onChangeText={value =>
                          setField('confirmPassword', value)
                        }
                        error={fieldErrors.confirmPassword}
                        required
                        autoCapitalize="none"
                        secureTextEntry={!showConfirmPassword}
                        placeholder="Re-enter the password"
                        rightAction={
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              showConfirmPassword
                                ? 'Hide confirm password'
                                : 'Show confirm password'
                            }
                            onPress={() =>
                              setShowConfirmPassword(visible => !visible)
                            }
                            className="ml-2 h-10 w-10 items-center justify-center rounded-xl active:opacity-70">
                            {showConfirmPassword ? (
                              <EyeOff size={18} color="#F5C451" />
                            ) : (
                              <Eye size={18} color="#F5C451" />
                            )}
                          </Pressable>
                        }
                      />
                      <Text
                        style={styles.helperText}
                        className="mt-1 text-xs leading-5">
                        Email is filled from Personal Details, and the username
                        is filled from the owner name. Your login account will
                        be created only after Super Admin approval.
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View className="mt-4 flex-row justify-between gap-3">
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeStep === 0 || submitting}
                    onPress={() => setActiveStep(step => Math.max(step - 1, 0))}
                    style={styles.previousButton}
                    className="min-h-12 min-w-[118px] flex-row items-center justify-center rounded-2xl px-4 disabled:opacity-40">
                    <ArrowLeft size={16} color="#F5E6B8" />
                    <Text
                      style={styles.previousButtonText}
                      className="ml-2 text-sm font-bold">
                      Previous
                    </Text>
                  </Pressable>
                  {activeStep < STEPS.length - 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={goNext}
                      style={styles.primaryButton}
                      className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl px-5 active:opacity-90">
                      <Text className="mr-2 text-sm font-bold text-white">
                        Save &amp; Next
                      </Text>
                      <ArrowRight size={17} color="#FFFFFF" />
                    </Pressable>
                  ) : (
                    <Pressable
                      testID="register-submit"
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled:
                          submitting || plansLoading || plans.length === 0,
                      }}
                      disabled={
                        submitting || plansLoading || plans.length === 0
                      }
                      onPress={submitRegistration}
                      style={[
                        styles.primaryButton,
                        submitting || plansLoading || plans.length === 0
                          ? styles.primaryButtonDisabled
                          : null,
                      ]}
                      className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl px-5 active:opacity-90">
                      {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <CheckCircle2 size={17} color="#FFFFFF" />
                      )}
                      <Text className="ml-2 text-sm font-bold text-white">
                        {submitting ? 'Submitting...' : 'Save Gold Shop'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                className="mt-3.5 items-center py-1.5">
                <Text style={styles.footerPrompt} className="text-sm">
                  Already have an account?{' '}
                  <Text style={styles.footerLink} className="font-bold">
                    Sign in
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backgroundScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 34, 26, 0.16)',
  },
  pageContainer: {
    flex: 1,
  },
  logoHalo: {
    backgroundColor: '#073327',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 196, 81, 0.55)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  logoFrame: {
    backgroundColor: '#06452D',
    borderWidth: 2,
    borderColor: '#F5C451',
  },
  eyebrowText: {
    color: '#F5C451',
  },
  titleText: {
    color: '#FFFFFF',
  },
  stepperBar: {
    backgroundColor: 'rgba(5, 36, 28, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.32)',
  },
  stepTabActive: {
    backgroundColor: '#C48F0E',
  },
  stepTabIdle: {
    backgroundColor: 'transparent',
  },
  stepTabTextActive: {
    color: '#FFFFFF',
  },
  stepTabTextIdle: {
    color: '#D7EAE1',
  },
  card: {
    backgroundColor: 'rgba(6, 46, 35, 0.52)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.38)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.38)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  glassTintLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
  },
  glassSheenTop: {
    position: 'absolute',
    top: -45,
    left: -30,
    right: 40,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  glassGlowGold: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 196, 81, 0.12)',
  },
  cardAccentBar: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#F5C451',
  },
  stepHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 230, 168, 0.22)',
  },
  stepHeaderIconBox: {
    backgroundColor: 'rgba(245, 196, 81, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.38)',
  },
  stepHeaderTitle: {
    color: '#FFFFFF',
  },
  stepCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.3)',
  },
  stepCounterText: {
    color: '#F5E6B8',
  },
  fieldLabel: {
    color: '#F5E6B8',
  },
  requiredAsterisk: {
    color: '#FCA5A5',
  },
  inputRow: {
    borderWidth: 1.5,
  },
  inputRowIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(245, 224, 158, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.32)',
  },
  inputRowFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderColor: '#F5C451',
  },
  inputRowError: {
    backgroundColor: 'rgba(127, 29, 29, 0.28)',
    borderColor: '#F87171',
  },
  inputText: {
    color: '#FFFFFF',
  },
  inputTextDisabled: {
    color: 'rgba(215, 234, 225, 0.72)',
  },
  errorText: {
    color: '#FECACA',
  },
  infoBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.3)',
  },
  infoBannerText: {
    color: '#D7EAE1',
  },
  errorBanner: {
    backgroundColor: 'rgba(127, 29, 29, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.45)',
  },
  errorBannerText: {
    color: '#FEE2E2',
  },
  retryButton: {
    backgroundColor: '#C48F0E',
  },
  photoSelectedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.35)',
  },
  photoNameText: {
    color: '#FFFFFF',
  },
  photoRemoveButton: {
    backgroundColor: 'rgba(127, 29, 29, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.4)',
  },
  photoRemoveText: {
    color: '#FECACA',
  },
  photoDropzone: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(245, 196, 81, 0.48)',
  },
  photoDropTitle: {
    color: '#FFFFFF',
  },
  photoDropHint: {
    color: '#CBE0D7',
  },
  locationButton: {
    backgroundColor: 'rgba(245, 196, 81, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.42)',
  },
  locationButtonText: {
    color: '#F5E6B8',
  },
  helperText: {
    color: '#CBE0D7',
  },
  helperTextBold: {
    color: '#F5E6B8',
  },
  priceCard: {
    backgroundColor: 'rgba(245, 196, 81, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.42)',
  },
  priceValue: {
    color: '#F5C451',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.28)',
  },
  summaryValue: {
    color: '#FFFFFF',
  },
  summaryValueMuted: {
    color: '#D7EAE1',
  },
  statusCardEmerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.35)',
  },
  statusValueEmerald: {
    color: '#A7F3D0',
  },
  previousButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.4)',
  },
  previousButtonText: {
    color: '#F5E6B8',
  },
  primaryButton: {
    backgroundColor: '#C48F0E',
    borderWidth: 0,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  footerPrompt: {
    color: '#D7EAE1',
  },
  footerLink: {
    color: '#F5C451',
  },
});
