import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image as RNImage,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Camera, RotateCcw, Upload } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import {
  CustomDropdown,
  DatePicker,
  Field,
  SubmitButton,
  errorMessage,
} from './FormControls';

type Customer = {
  id: number | string;
  customer_code?: string;
  full_name: string;
  mobile?: string;
  alternate_mobile?: string;
  email?: string;
  kyc_status?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
};

type InterestType = {
  type_key: string;
  name?: string;
  label?: string;
  enabled?: boolean;
};

type GoldRate = {
  metal_type: string;
  purity: string;
  rate_per_gram?: number;
  rate_per_unit?: number;
  rate_unit?: string;
};

type GoldRateSet = {
  rate_date?: string;
  effective_from?: string;
  rates: GoldRate[];
};

type PickedImage = {
  uri: string;
  name: string;
  type: string;
  fileSize?: number;
};

type LoanForm = {
  jewellery_type: string;
  metal_type: string;
  gold_purity: string;
  gross_weight: string;
  stone_weight: string;
  principal_amount: string;
  interest_type: string;
  interest_rate: string;
  fixed_interest_amount: string;
  interest_frequency: string;
  custom_period_days: string;
  interest_calculation_start_date: string;
  compounding_frequency: string;
  day_count_convention: string;
  grace_period_days: string;
  late_payment_interest_rate: string;
  interest_free_days: string;
  minimum_interest_amount: string;
  maximum_interest_amount: string;
  processing_fee: string;
  other_charges: string;
  loan_date: string;
  maturity_date: string;
  payment_frequency: string;
  loan_status: string;
  notes: string;
};

type Estimate = {
  principal: number;
  interest: number;
  charges: number;
  total: number;
  days: number;
  eligibleDays: number;
  basis: string;
};

type CreateLoanProps = {
  onBack: () => void;
  onCreated: () => void;
  loanId?: number | string;
};

type SavedRateSnapshot = {
  metal_type: string;
  purity: string;
  rate: number | null;
  unit: string;
};

const JEWELLERY_TYPES = [
  { value: 'Bangles', label: 'Bangles' },
  { value: 'Chains', label: 'Chains' },
  { value: 'Necklaces', label: 'Necklaces' },
  { value: 'Earrings', label: 'Earrings' },
  { value: 'Rings', label: 'Rings' },
  { value: 'Bracelets', label: 'Bracelets' },
  { value: 'Coins & Bars', label: 'Coins & Bars' },
  { value: 'Other', label: 'Other' },
];

const METALS = ['Gold', 'Silver', 'Platinum', 'Diamond'];

const PURITY_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  Gold: [
    { value: '999', label: '24K (999)' },
    { value: '916', label: '22K (916)' },
    { value: '833', label: '20K (833)' },
    { value: '750', label: '18K (750)' },
    { value: '585', label: '14K (585)' },
  ],
  Silver: [{ value: '999', label: '999 Fine' }],
  Platinum: [
    { value: '950', label: '950' },
    { value: '900', label: '900' },
  ],
  Diamond: [
    { value: 'D-F / VVS', label: 'D-F / VVS' },
    { value: 'G-H / VS', label: 'G-H / VS' },
    { value: 'I-J / SI', label: 'I-J / SI' },
  ],
};

const INTEREST_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom_period', label: 'Custom Period' },
];

const PAYMENT_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'bullet', label: 'At Maturity (Bullet)' },
];

const COMPOUND_FREQUENCIES = INTEREST_FREQUENCIES.filter(
  option => option.value !== 'custom_period',
);

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonthsToDate(value: string, months: number) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  const next = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return localDate(next);
}

function parseLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(Number.NaN);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseLocalDate(value);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}

function emptyLoan(): LoanForm {
  const today = localDate();
  return {
    jewellery_type: '',
    metal_type: 'Gold',
    gold_purity: '',
    gross_weight: '',
    stone_weight: '0',
    principal_amount: '',
    interest_type: '',
    interest_rate: '',
    fixed_interest_amount: '',
    interest_frequency: 'monthly',
    custom_period_days: '30',
    interest_calculation_start_date: today,
    compounding_frequency: 'monthly',
    day_count_convention: 'actual_365',
    grace_period_days: '0',
    late_payment_interest_rate: '',
    interest_free_days: '0',
    minimum_interest_amount: '',
    maximum_interest_amount: '',
    processing_fee: '0',
    other_charges: '0',
    loan_date: today,
    maturity_date: addMonthsToDate(today, 11),
    payment_frequency: 'monthly',
    loan_status: 'Active',
    notes: '',
  };
}

function periodCount(
  days: number,
  frequency: string,
  convention: string,
  customDays: string,
) {
  const yearDays = convention === 'actual_365' ? 365 : 360;
  const divisor: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: yearDays / 12,
    quarterly: yearDays / 4,
    half_yearly: yearDays / 2,
    yearly: yearDays,
    custom_period: Math.max(1, Number(customDays) || 30),
  };
  return days / (divisor[frequency] || yearDays / 12);
}

function elapsedDays(from: string, to: string, convention: string) {
  if (!isValidDate(from) || !isValidDate(to) || to <= from) return 0;
  if (convention === '30_360') {
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);
    return Math.max(
      0,
      (toYear - fromYear) * 360 +
        (toMonth - fromMonth) * 30 +
        Math.min(toDay, 30) -
        Math.min(fromDay, 30),
    );
  }
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86400000
  );
}

function calculateEstimate(form: LoanForm, principal: number): Estimate | null {
  const rate = Number(form.interest_rate);
  if (
    !form.interest_type ||
    !(principal > 0) ||
    !(rate >= 0) ||
    !form.interest_calculation_start_date ||
    !form.maturity_date
  ) {
    return null;
  }

  const days = elapsedDays(
    form.interest_calculation_start_date,
    form.maturity_date,
    form.day_count_convention,
  );
  const eligibleDays = Math.max(
    0,
    days - Number(form.interest_free_days || 0) - Number(form.grace_period_days || 0),
  );
  const periods = periodCount(
    eligibleDays,
    form.interest_frequency,
    form.day_count_convention,
    form.custom_period_days,
  );
  let interest = 0;
  let basis = 'Original principal';

  if (form.interest_type === 'compound') {
    const compoundPeriods = periodCount(
      eligibleDays,
      form.compounding_frequency || 'monthly',
      form.day_count_convention,
      form.custom_period_days,
    );
    const ratePerCompoundPeriod =
      (rate / 100) * (periods / Math.max(compoundPeriods, Number.EPSILON));
    interest = principal * ((1 + ratePerCompoundPeriod) ** compoundPeriods - 1);
    basis = `Original principal, compounded ${compoundPeriods.toFixed(2)} periods`;
  } else if (form.interest_type === 'fixed') {
    interest = Number(form.fixed_interest_amount || 0) * periods;
    basis = 'Configured fixed amount per interest period';
  } else if (form.interest_type === 'reducing_balance') {
    const paymentPeriods =
      form.payment_frequency === 'bullet'
        ? 1
        : Math.max(
            1,
            periodCount(
              eligibleDays,
              form.payment_frequency,
              form.day_count_convention,
              form.custom_period_days,
            ),
          );
    const principalPerPeriod = principal / paymentPeriods;
    for (let index = 0; index < paymentPeriods; index += 1) {
      const outstanding = Math.max(0, principal - principalPerPeriod * index);
      interest += outstanding * (rate / 100) * (periods / paymentPeriods);
    }
    basis = `Estimated equal-principal schedule across ${paymentPeriods.toFixed(0)} payment periods`;
  } else {
    interest = principal * (rate / 100) * periods;
    if (form.interest_type === 'flat') {
      basis = 'Original principal for the full agreed term';
    } else if (form.interest_type === 'slab_based') {
      basis = 'Rate entered for the selected principal slab';
    } else if (form.interest_type === 'custom') {
      basis = 'Administrator-entered rate and selected period';
    } else {
      basis = `Original principal, ${form.interest_frequency.replaceAll('_', ' ')} rate period`;
    }
  }

  if (Number(form.minimum_interest_amount) > 0) {
    interest = Math.max(interest, Number(form.minimum_interest_amount));
  }
  if (Number(form.maximum_interest_amount) > 0) {
    interest = Math.min(interest, Number(form.maximum_interest_amount));
  }
  interest = Math.round(interest * 100) / 100;
  const charges =
    Number(form.processing_fee || 0) + Number(form.other_charges || 0);

  return {
    principal,
    interest,
    charges,
    total: principal + interest + charges,
    days,
    eligibleDays,
    basis,
  };
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4 shadow-sm">
      <View className="mb-4 flex-row items-center border-b border-[#F0F1ED] pb-3">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-[#EFF9F5]">
          <Text className="text-xs font-black text-[#07564B]">{number}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-[#173F35]">{title}</Text>
          <Text className="mt-0.5 text-xs text-[#6B7E76]">{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

export default function CreateLoan({
  onBack,
  onCreated,
  loanId,
}: CreateLoanProps) {
  const { showAlert } = useCustomAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [rateSet, setRateSet] = useState<GoldRateSet | null>(null);
  const [form, setForm] = useState<LoanForm>(emptyLoan);
  const [savedRateSnapshot, setSavedRateSnapshot] =
    useState<SavedRateSnapshot | null>(null);
  const [otherJewelleryType, setOtherJewelleryType] = useState('');
  const [loanAmountMode, setLoanAmountMode] = useState<'auto' | 'manual'>('auto');
  const [customerId, setCustomerId] = useState('');
  const [goldImage, setGoldImage] = useState<PickedImage | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [ratesError, setRatesError] = useState('');
  const [fundBalance, setFundBalance] = useState<number | null>(null);
  const [fundBalanceError, setFundBalanceError] = useState('');
  const [fundBalanceLoading, setFundBalanceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const loadOptions = useCallback(async () => {
    setOptionsError('');
    setLoadingOptions(true);
    try {
      const [customerResponse, interestResponse, loanResponse] = await Promise.all([
        api.get('/customers'),
        api.get('/loans/interest-types'),
        loanId ? api.get(`/loans/${loanId}`) : Promise.resolve(null),
      ]);
      if (!Array.isArray(customerResponse.data) || !Array.isArray(interestResponse.data)) {
        throw new Error('The server returned invalid customer or interest-type data.');
      }

      const methods = interestResponse.data as InterestType[];
      const loan = loanResponse?.data as Record<string, unknown> | undefined;
      setCustomers(customerResponse.data as Customer[]);
      setInterestTypes(
        methods.filter(
          type =>
            type.enabled ||
            (typeof loan?.interest_type === 'string' &&
              type.type_key === loan.interest_type),
        ),
      );
      if (loanId && (!loan || !loan.id || !loan.customer_id)) {
        throw new Error('The loan could not be found.');
      }

      if (loan) {
        const savedJewelleryType = String(loan.jewellery_type || '');
        const knownJewelleryType = JEWELLERY_TYPES.some(
          option => option.value === savedJewelleryType && option.value !== 'Other',
        );
        const fieldValue = (key: keyof LoanForm, fallback = '') =>
          loan[key] == null ? fallback : String(loan[key]);
        const savedMetalType = String(loan.metal_type || 'Gold');
        const savedPurity = String(loan.gold_purity || '');
        const savedRate =
          loan.gold_rate_per_gram == null
            ? null
            : Number(loan.gold_rate_per_gram);
        setCustomerId(String(loan.customer_id));
        setLoanAmountMode('manual');
        setOtherJewelleryType(knownJewelleryType ? '' : savedJewelleryType);
        setSavedRateSnapshot({
          metal_type: savedMetalType,
          purity: savedPurity,
          rate: Number.isFinite(savedRate) ? savedRate : null,
          unit: String(loan.rate_unit || (savedMetalType === 'Diamond' ? 'carat' : 'gram')),
        });
        setForm({
          ...emptyLoan(),
          jewellery_type: savedJewelleryType
            ? knownJewelleryType
              ? savedJewelleryType
              : 'Other'
            : '',
          metal_type: savedMetalType,
          gold_purity: savedPurity,
          gross_weight: fieldValue('gross_weight'),
          stone_weight: fieldValue('stone_weight', '0'),
          principal_amount: fieldValue('principal_amount'),
          interest_type: fieldValue('interest_type'),
          interest_rate: fieldValue('interest_rate'),
          fixed_interest_amount: fieldValue('fixed_interest_amount'),
          interest_frequency: fieldValue('interest_frequency', 'monthly'),
          custom_period_days: fieldValue('custom_period_days', '30'),
          interest_calculation_start_date: fieldValue(
            'interest_calculation_start_date',
            fieldValue('loan_date'),
          ).slice(0, 10),
          compounding_frequency: fieldValue('compounding_frequency', 'monthly'),
          day_count_convention: fieldValue('day_count_convention', 'actual_365'),
          grace_period_days: fieldValue('grace_period_days', '0'),
          late_payment_interest_rate: fieldValue('late_payment_interest_rate'),
          interest_free_days: fieldValue('interest_free_days', '0'),
          minimum_interest_amount: fieldValue('minimum_interest_amount'),
          maximum_interest_amount: fieldValue('maximum_interest_amount'),
          processing_fee: fieldValue('processing_fee', '0'),
          other_charges: fieldValue('other_charges', '0'),
          loan_date: fieldValue('loan_date').slice(0, 10),
          maturity_date: fieldValue('maturity_date').slice(0, 10),
          payment_frequency: fieldValue('payment_frequency', 'monthly'),
          loan_status: fieldValue('loan_status', 'Active'),
          notes: fieldValue('notes'),
        });
      } else {
        setCustomerId('');
        setLoanAmountMode('auto');
        setOtherJewelleryType('');
        setSavedRateSnapshot(null);
        setForm(current => ({
          ...emptyLoan(),
          interest_type:
            current.interest_type || methods.find(type => type.enabled)?.type_key || '',
        }));
      }

      try {
        const ratesResponse = await api.get('/gold-rates/current');
        const rateData = ratesResponse.data as GoldRateSet | null;
        if (!rateData || !Array.isArray(rateData.rates)) {
          throw new Error('The server returned invalid active metal-rate data.');
        }
        setRateSet(rateData);
        setGoldRates(rateData.rates);
        setRatesError('');
      } catch (error) {
        setRateSet(null);
        setGoldRates([]);
        setRatesError(errorMessage(error));
      }
    } catch (error) {
      setOptionsError(errorMessage(error));
      if (__DEV__) console.warn('[Loans] Could not load create-loan options:', error);
    } finally {
      setLoadingOptions(false);
    }
  }, [loanId]);

  const refreshFundBalance = useCallback(async () => {
    setFundBalanceLoading(true);
    setFundBalanceError('');
    try {
      const { data } = await api.get('/funds/summary');
      const balance = Number(data.current_balance);
      if (!Number.isFinite(balance)) {
        throw new Error('The server returned an invalid fund balance.');
      }
      setFundBalance(balance);
      return balance;
    } catch (error) {
      const message = errorMessage(error);
      setFundBalanceError(message);
      throw new Error(message);
    } finally {
      setFundBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    refreshFundBalance().catch(error => {
      if (__DEV__) console.warn('[Loans] Could not load fund balance:', error);
    });
  }, [loadOptions, refreshFundBalance]);

  const setField = (field: keyof LoanForm, value: string) => {
    setForm(current => {
      if (field === 'loan_date') {
        return {
          ...current,
          loan_date: value,
          maturity_date: addMonthsToDate(value, 11),
          interest_calculation_start_date:
            current.interest_calculation_start_date === current.loan_date
              ? value
              : current.interest_calculation_start_date,
        };
      }
      if (field === 'metal_type') {
        return { ...current, metal_type: value, gold_purity: '' };
      }
      return { ...current, [field]: value };
    });
  };

  const customersOptions = useMemo(
    () =>
      customers.map(customer => ({
        value: String(customer.id),
        label: `${customer.customer_code || `ID ${customer.id}`} · ${customer.full_name}${customer.mobile ? ` · ${customer.mobile}` : ''}`,
      })),
    [customers],
  );
  const selectedCustomer = customers.find(
    customer => String(customer.id) === customerId,
  );
  const enabledInterestTypes = interestTypes;
  const interestOptions = enabledInterestTypes.map(type => ({
    value: type.type_key,
    label: type.label || type.name || type.type_key.replaceAll('_', ' '),
  }));
  const matchingRates = goldRates.filter(
    rate => rate.metal_type === form.metal_type,
  );
  const purityOptions = [
    ...(PURITY_OPTIONS[form.metal_type] || []),
    ...matchingRates
      .filter(
        rate =>
          !(PURITY_OPTIONS[form.metal_type] || []).some(
            option => option.value === String(rate.purity),
          ),
      )
      .map(rate => ({ value: String(rate.purity), label: String(rate.purity) })),
    ...(savedRateSnapshot?.metal_type === form.metal_type &&
    ![
      ...(PURITY_OPTIONS[form.metal_type] || []).map(option => option.value),
      ...matchingRates.map(rate => String(rate.purity)),
    ].includes(savedRateSnapshot.purity)
      ? [{ value: savedRateSnapshot.purity, label: savedRateSnapshot.purity }]
      : []),
  ];
  const selectedRate = matchingRates.find(
    rate => String(rate.purity) === form.gold_purity,
  );
  const isOriginalRateSnapshot =
    savedRateSnapshot?.metal_type === form.metal_type &&
    savedRateSnapshot.purity === form.gold_purity;
  const appliedRate = isOriginalRateSnapshot
    ? Number(savedRateSnapshot.rate || 0)
    : Number(selectedRate?.rate_per_unit ?? selectedRate?.rate_per_gram ?? 0);
  const rateUnit = isOriginalRateSnapshot
    ? savedRateSnapshot.unit
    : selectedRate?.rate_unit || (form.metal_type === 'Diamond' ? 'carat' : 'gram');
  const weightUnit = rateUnit === 'carat' ? 'ct' : 'g';
  const grossWeight = Number(form.gross_weight || 0);
  const stoneWeight = Number(form.stone_weight || 0);
  const netWeight = Math.max(0, grossWeight - stoneWeight);
  const goldValuation = netWeight * appliedRate;
  const calculatedLoanAmount =
    goldValuation > 0 ? (Math.round(goldValuation * 50) / 100).toFixed(2) : '';
  const loanAmount =
    loanAmountMode === 'auto' ? calculatedLoanAmount : form.principal_amount;
  const estimate = calculateEstimate(form, Number(loanAmount));
  const startDate = parseLocalDate(form.loan_date);
  const maturityPreviousDay = parseLocalDate(form.maturity_date);
  if (!Number.isNaN(maturityPreviousDay.getTime())) {
    maturityPreviousDay.setDate(maturityPreviousDay.getDate() - 1);
  }

  const pickGoldImage = async (camera: boolean) => {
    try {
      const { launchCamera, launchImageLibrary } = await import('react-native-image-picker');
      const result = await (camera ? launchCamera : launchImageLibrary)({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorMessage) {
        showAlert('Image unavailable', result.errorMessage, { variant: 'error' });
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert('Image unavailable', 'Choose a PNG or JPG image and try again.', {
          variant: 'error',
        });
        return;
      }
      const type = asset.type || 'image/jpeg';
      if (!['image/jpeg', 'image/png'].includes(type)) {
        showAlert('Unsupported image', 'Gold images must be PNG or JPG.', {
          variant: 'warning',
        });
        return;
      }
      if ((asset.fileSize || 0) > 5 * 1024 * 1024) {
        showAlert('Image too large', 'Gold images must be 5 MB or smaller.', {
          variant: 'warning',
        });
        return;
      }
      setGoldImage({
        uri: asset.uri,
        type,
        name: asset.fileName || `pledged-gold.${type === 'image/png' ? 'png' : 'jpg'}`,
        fileSize: asset.fileSize,
      });
    } catch (error) {
      showAlert('Image unavailable', errorMessage(error), { variant: 'error' });
    }
  };

  const saveLoan = async () => {
    const gross = Number(form.gross_weight);
    const stone = Number(form.stone_weight || 0);
    const amount = Number(loanAmount);
    const rate = Number(form.interest_rate);

    if (!selectedCustomer) {
      showAlert('Customer required', 'Select a registered customer for this loan.', {
        variant: 'warning',
      });
      return;
    }
    if (!form.jewellery_type || (form.jewellery_type === 'Other' && !otherJewelleryType.trim())) {
      showAlert('Jewellery type required', 'Select or specify the pledged jewellery type.', {
        variant: 'warning',
      });
      return;
    }
    if (
      !form.gold_purity ||
      (!(appliedRate > 0) && !isOriginalRateSnapshot)
    ) {
      showAlert(
        'Active metal rate required',
        'Select a purity or quality with an active rate before saving the loan.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      !Number.isFinite(gross) ||
      !Number.isFinite(stone) ||
      !(gross > 0) ||
      stone < 0 ||
      stone >= gross
    ) {
      showAlert(
        'Invalid weight',
        'Gross weight must be greater than stone weight, and stone weight cannot be negative.',
        { variant: 'warning' },
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert('Loan amount required', 'Enter a loan amount greater than zero.', {
        variant: 'warning',
      });
      return;
    }
    if (!form.interest_type) {
      showAlert('Interest type required', 'Choose an enabled interest type.', {
        variant: 'warning',
      });
      return;
    }
    if (form.interest_type !== 'fixed' && !form.interest_rate.trim()) {
      showAlert('Interest rate required', 'Enter a valid non-negative interest rate.', {
        variant: 'warning',
      });
      return;
    }
    if (form.interest_rate.trim() && (!Number.isFinite(rate) || rate < 0)) {
      showAlert('Invalid interest rate', 'Enter a valid non-negative interest rate.', {
        variant: 'warning',
      });
      return;
    }
    if (
      form.interest_type === 'fixed' &&
      !(Number(form.fixed_interest_amount) > 0)
    ) {
      showAlert(
        'Fixed interest required',
        'Enter the fixed interest amount per interest period.',
        { variant: 'warning' },
      );
      return;
    }
    if (
      form.interest_frequency === 'custom_period' &&
      (!Number.isInteger(Number(form.custom_period_days)) ||
        Number(form.custom_period_days) < 1 ||
        Number(form.custom_period_days) > 3650)
    ) {
      showAlert('Invalid interest period', 'Enter a custom period between 1 and 3650 days.', {
        variant: 'warning',
      });
      return;
    }
    if (
      !isValidDate(form.loan_date) ||
      !isValidDate(form.maturity_date) ||
      form.maturity_date <= form.loan_date
    ) {
      showAlert('Invalid loan dates', 'Maturity date must be after the loan date.', {
        variant: 'warning',
      });
      return;
    }
    if (
      !isValidDate(form.interest_calculation_start_date) ||
      form.interest_calculation_start_date < form.loan_date ||
      form.interest_calculation_start_date >= form.maturity_date
    ) {
      showAlert(
        'Invalid calculation start date',
        'Calculation start date must be on or after the loan date and before maturity.',
        { variant: 'warning' },
      );
      return;
    }
    const latePaymentRate = Number(form.late_payment_interest_rate);
    if (
      form.late_payment_interest_rate.trim() &&
      (!Number.isFinite(latePaymentRate) || latePaymentRate < 0)
    ) {
      showAlert('Invalid late payment rate', 'Enter a non-negative late payment rate.', {
        variant: 'warning',
      });
      return;
    }
    const otherCharges = Number(form.other_charges);
    if (
      form.other_charges.trim() &&
      (!Number.isFinite(otherCharges) || otherCharges < 0)
    ) {
      showAlert('Invalid charges', 'Other authorized charges cannot be negative.', {
        variant: 'warning',
      });
      return;
    }
    const processingFee = Number(form.processing_fee);
    if (
      form.processing_fee.trim() &&
      (!Number.isFinite(processingFee) || processingFee < 0)
    ) {
      showAlert('Invalid processing fee', 'Processing fee cannot be negative.', {
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      if (!loanId) {
        let latestBalance = fundBalance;
        try {
          latestBalance = await refreshFundBalance();
        } catch (error) {
          showAlert('Fund balance unavailable', errorMessage(error), { variant: 'error' });
          return;
        }
        if (latestBalance != null && amount > latestBalance + 0.001) {
          showAlert(
            'Insufficient funds',
            `Loan amount exceeds available fund balance (${currency(latestBalance)}).`,
            { variant: 'warning' },
          );
          return;
        }
      }

      const payload: Record<string, string> = {
        customer_id: String(selectedCustomer.id),
        jewellery_type:
          form.jewellery_type === 'Other'
            ? otherJewelleryType.trim()
            : form.jewellery_type,
        metal_type: form.metal_type,
        gold_purity: form.gold_purity,
        gross_weight: form.gross_weight,
        stone_weight: form.stone_weight || '0',
        net_gold_weight: netWeight.toFixed(3),
        gold_valuation: goldValuation.toFixed(2),
        rate_unit: rateUnit,
        principal_amount: amount.toFixed(2),
        loan_amount_mode: loanAmountMode,
        interest_type: form.interest_type,
        interest_rate: form.interest_type === 'fixed' ? form.interest_rate || '0' : form.interest_rate,
        fixed_interest_amount: form.fixed_interest_amount,
        interest_frequency: form.interest_frequency,
        custom_period_days: form.custom_period_days,
        interest_calculation_start_date: form.interest_calculation_start_date,
        compounding_frequency: form.compounding_frequency,
        day_count_convention: form.day_count_convention,
        grace_period_days: form.grace_period_days,
        late_payment_interest_rate: form.late_payment_interest_rate,
        interest_free_days: form.interest_free_days,
        minimum_interest_amount: form.minimum_interest_amount,
        maximum_interest_amount: form.maximum_interest_amount,
        processing_fee: form.processing_fee || '0',
        other_charges: form.other_charges || '0',
        loan_date: form.loan_date,
        maturity_date: form.maturity_date,
        payment_frequency: form.payment_frequency,
        loan_status: form.loan_status,
        notes: form.notes,
      };

      let requestBody: FormData | Record<string, string> = payload;
      if (goldImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
        formData.append('gold_image', goldImage);
        requestBody = formData;
      }

      const request = loanId
        ? api.put(`/loans/${loanId}`, requestBody, {
            ...(goldImage
              ? { headers: { 'Content-Type': 'multipart/form-data' } }
              : {}),
          })
        : api.post('/loans', requestBody, {
        ...(goldImage
          ? { headers: { 'Content-Type': 'multipart/form-data' } }
          : {}),
      });
      await request;
      showAlert(
        loanId ? 'Loan updated' : 'Loan created',
        loanId ? 'The loan was updated successfully.' : 'The loan was created successfully.',
        {
        variant: 'success',
        buttons: [{ text: 'Done', onPress: onCreated }],
        },
      );
    } catch (error) {
      if (__DEV__) console.warn('[Loans] Could not save loan:', error);
      showAlert(
        loanId ? 'Could not update loan' : 'Could not create loan',
        errorMessage(error),
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(emptyLoan());
    setOtherJewelleryType('');
    setLoanAmountMode('auto');
    setCustomerId('');
    setGoldImage(null);
    setSavedRateSnapshot(null);
  };

  const remainingBalance =
    fundBalance == null
      ? null
      : fundBalance - (loanId ? 0 : Number(loanAmount) || 0);
  const interestLabel =
    interestOptions.find(option => option.value === form.interest_type)?.label || '—';
  const rateLabel =
    form.interest_type === 'fixed'
      ? `${currency(Number(form.fixed_interest_amount || 0))} / ${form.interest_frequency.replaceAll('_', ' ')}`
      : `${Number(form.interest_rate || 0)}% / ${form.interest_frequency.replaceAll('_', ' ')}`;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerHeader
        title={loanId ? 'Edit Gold Loan' : 'Create Gold Loan'}
        onBack={onBack}
      />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 20 }}
        automaticallyAdjustKeyboardInsets>
        <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
          Add customer details, record pledged jewellery and define the loan terms.
        </Text>

        {optionsError ? (
          <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{optionsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                loadOptions();
              }}
              className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry loading options</Text>
            </Pressable>
          </View>
        ) : null}
        {loadingOptions ? (
          <AdminLoadingSkeleton variant="compact" className="mb-4" />
        ) : null}

        <Section
          number="01"
          title="Customer"
          subtitle="Choose the registered customer for this loan.">
          {customers.length > 0 ? (
            <CustomDropdown
              label="Select Customer"
              value={customerId}
              options={customersOptions}
              onSelect={setCustomerId}
              placeholder="Select a Customer"
              required
              searchable
            />
          ) : (
            <View className="rounded-xl bg-[#FFF8E7] p-3">
              <Text className="text-sm text-[#70540D]">
                {loadingOptions
                  ? 'Loading registered customers...'
                  : 'No customers are available. Create a customer before creating a loan.'}
              </Text>
            </View>
          )}
          {selectedCustomer ? (
            <View className="rounded-xl border border-[#A7D6C9] bg-[#EFF9F5] p-3">
              <Text className="text-sm font-bold text-[#173F35]">
                {selectedCustomer.full_name}
              </Text>
              <Text className="mt-1 text-xs text-[#52645F]">
                {selectedCustomer.customer_code || `ID ${selectedCustomer.id}`}
                {selectedCustomer.mobile ? ` · ${selectedCustomer.mobile}` : ''}
                {selectedCustomer.kyc_status ? ` · KYC ${selectedCustomer.kyc_status}` : ''}
              </Text>
              {selectedCustomer.address ? (
                <Text className="mt-1 text-xs text-[#52645F]">
                  {[
                    selectedCustomer.address,
                    selectedCustomer.city,
                    selectedCustomer.district,
                    selectedCustomer.state,
                    selectedCustomer.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Section>

        <Section
          number="02"
          title="Pledged Jewellery"
          subtitle="Enter the collateral details to calculate its current valuation.">
          {rateSet ? (
            <Text className="mb-4 rounded-lg bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#065F46]">
              Global rate set effective {dateLabel(rateSet.rate_date || rateSet.effective_from)}.
              Valuation uses eligible net {form.metal_type.toLowerCase()} weight × its configured
              rate; retail charges are excluded.
            </Text>
          ) : null}
          {ratesError ? (
            <Text className="mb-4 rounded-lg bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
              Could not load active rates: {ratesError}
            </Text>
          ) : null}
          <CustomDropdown
            label="Jewellery Type"
            value={form.jewellery_type}
            options={JEWELLERY_TYPES}
            onSelect={value => setField('jewellery_type', value)}
            placeholder="Select jewellery category"
            required
          />
          {form.jewellery_type === 'Other' ? (
            <Field
              label="Specify Jewellery Type"
              value={otherJewelleryType}
              onChangeText={setOtherJewelleryType}
              required
            />
          ) : null}
          <CustomDropdown
            label="Metal Type"
            value={form.metal_type}
            options={METALS.map(metal => ({ value: metal, label: metal }))}
            onSelect={value => setField('metal_type', value)}
            required
          />
          <CustomDropdown
            label={`${form.metal_type} Purity / Quality`}
            value={form.gold_purity}
            options={purityOptions}
            onSelect={value => setField('gold_purity', value)}
            placeholder={`Select ${form.metal_type.toLowerCase()} purity / quality`}
            required
          />
          <Text className="mb-2 -mt-2 text-[11px] text-[#83918B]">
            Select the {form.metal_type.toLowerCase()} purity or quality matching its active rate.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                label={`Gross Weight (${weightUnit})`}
                value={form.gross_weight}
                onChangeText={value => setField('gross_weight', value)}
                keyboardType="decimal-pad"
                required
              />
            </View>
            <View className="flex-1">
              <Field
                label={`Stone Weight (${weightUnit})`}
                value={form.stone_weight}
                onChangeText={value => setField('stone_weight', value)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                label={`Net ${form.metal_type} Weight (${weightUnit})`}
                value={netWeight.toFixed(3)}
                onChangeText={() => {}}
                readOnly
              />
            </View>
            <View className="flex-1">
              <Field
                label={`${form.metal_type} Rate / ${rateUnit === 'carat' ? 'Carat' : 'Gram'} (₹)`}
                value={appliedRate > 0 ? appliedRate.toFixed(2) : ''}
                onChangeText={() => {}}
                placeholder="Rate from active metal rates"
                readOnly
              />
            </View>
          </View>
          <Field
            label={`${form.metal_type} Valuation (₹)`}
            value={goldValuation.toFixed(2)}
            onChangeText={() => {}}
            readOnly
            required
          />

          <View className="mb-4 rounded-xl border border-[#B7E4D2] bg-[#F5FCF8] p-3.5">
            <Text className="mb-2 text-xs font-bold text-[#173F35]">Loan Amount (₹) *</Text>
            <View className="mb-3 flex-row rounded-lg border border-[#DCE7E1] bg-white p-1">
              {([
                ['auto', 'Auto calculate (50%)'],
                ['manual', 'Enter manually'],
              ] as const).map(([mode, label]) => {
                const active = loanAmountMode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setLoanAmountMode(mode);
                      if (mode === 'manual' && !form.principal_amount) {
                        setField('principal_amount', calculatedLoanAmount);
                      }
                    }}
                    className={`flex-1 items-center rounded-md px-2 py-2 ${
                      active ? 'bg-[#064A41]' : 'bg-white'
                    }`}>
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-white' : 'text-[#52645F]'
                      }`}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {loanAmountMode === 'auto' ? (
              <>
                <Field
                  label="Calculated Loan Amount"
                  value={calculatedLoanAmount}
                  onChangeText={() => {}}
                  placeholder="Enter weight and select an active metal rate"
                  readOnly
                />
                <Text className="mb-3 -mt-3 text-[11px] text-[#6B7E76]">
                  {calculatedLoanAmount
                    ? `Available loan amount: 50% of pledged metal value (${currency(goldValuation)}).`
                    : 'Select a purity with an active metal rate and enter the pledged weight to calculate the loan amount.'}
                </Text>
              </>
            ) : (
              <Field
                label="Loan Amount (₹)"
                value={form.principal_amount}
                onChangeText={value => setField('principal_amount', value)}
                keyboardType="decimal-pad"
                placeholder="Enter loan amount"
                required
              />
            )}
            <View className="rounded-lg border border-[#D8F0E4] bg-white p-3">
              <View className="mb-2 flex-row justify-between">
                <Text className="flex-1 text-[11px] text-[#6B7E76]">Available Fund Balance</Text>
                <Text className="flex-1 text-center text-[11px] text-[#6B7E76]">Loan Amount</Text>
                <Text className="flex-1 text-right text-[11px] text-[#6B7E76]">
                  Remaining Balance
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="flex-1 text-xs font-bold text-[#064A41]">
                  {fundBalance == null
                    ? fundBalanceLoading
                      ? 'Loading...'
                      : 'Unavailable'
                    : currency(fundBalance)}
                </Text>
                <Text className="flex-1 text-center text-xs font-bold text-[#173F35]">
                  {Number(loanAmount) > 0 ? currency(Number(loanAmount)) : '—'}
                </Text>
                <Text
                  className={`flex-1 text-right text-xs font-bold ${
                    remainingBalance != null && remainingBalance < 0
                      ? 'text-[#B91C1C]'
                      : 'text-[#173F35]'
                  }`}>
                  {remainingBalance == null ? '—' : currency(remainingBalance)}
                </Text>
              </View>
            </View>
            {fundBalanceError ? (
              <Text className="mt-2 text-xs text-[#B91C1C]">
                Fund balance unavailable: {fundBalanceError}
              </Text>
            ) : null}
          </View>

          <View className="rounded-xl border border-dashed border-[#C8D2CC] bg-[#FAFBFA] p-3.5">
            <Text className="text-xs font-bold text-[#52645F]">
              Gold Image <Text className="font-normal">(optional, PNG or JPG up to 5 MB)</Text>
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  pickGoldImage(false);
                }}
                className="min-h-10 flex-row items-center rounded-lg border border-[#DDE5E0] bg-white px-3">
                <Upload size={15} color="#07564B" />
                <Text className="ml-2 text-xs font-bold text-[#52645F]">
                  {goldImage ? 'Choose another image' : 'Upload gold image'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  pickGoldImage(true);
                }}
                className="min-h-10 flex-row items-center rounded-lg border border-[#A7D6C9] bg-white px-3">
                <Camera size={15} color="#07564B" />
                <Text className="ml-2 text-xs font-bold text-[#07564B]">Take photo</Text>
              </Pressable>
            </View>
            {goldImage ? (
              <View className="mt-3 flex-row items-center">
                <RNImage
                  source={{ uri: goldImage.uri }}
                  className="h-20 w-20 rounded-lg"
                  resizeMode="cover"
                />
                <View className="ml-3 flex-1">
                  <Text numberOfLines={2} className="text-xs font-semibold text-[#173F35]">
                    {goldImage.name}
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#6B7E76]">
                    {goldImage.fileSize
                      ? `${(goldImage.fileSize / (1024 * 1024)).toFixed(2)} MB`
                      : 'Selected image'}
                  </Text>
                  <Pressable onPress={() => setGoldImage(null)} className="mt-2 self-start">
                    <Text className="text-xs font-bold text-[#B91C1C]">Remove image</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </Section>

        <Section
          number="03"
          title="Interest & Contract Terms"
          subtitle="Set the interest method, rate and authorized charges.">
          {interestOptions.length > 0 ? (
            <CustomDropdown
              label="Interest Type"
              value={form.interest_type}
              options={interestOptions}
              onSelect={value => setField('interest_type', value)}
              required
            />
          ) : (
            <Text className="mb-4 rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
              No interest methods are enabled. Enable an interest method before creating a loan.
            </Text>
          )}
          {form.interest_type !== 'fixed' ? (
            <Field
              label="Interest Rate (%)"
              value={form.interest_rate}
              onChangeText={value => setField('interest_rate', value)}
              keyboardType="decimal-pad"
              required
            />
          ) : null}
          <CustomDropdown
            label="Interest Calculation Frequency"
            value={form.interest_frequency}
            options={INTEREST_FREQUENCIES}
            onSelect={value => setField('interest_frequency', value)}
            required
          />
          {form.interest_frequency === 'custom_period' ? (
            <Field
              label="Custom Period (days)"
              value={form.custom_period_days}
              onChangeText={value => setField('custom_period_days', value)}
              keyboardType="numeric"
              required
            />
          ) : null}
          {form.interest_type === 'fixed' ? (
            <Field
              label="Fixed Interest Amount (₹/period)"
              value={form.fixed_interest_amount}
              onChangeText={value => setField('fixed_interest_amount', value)}
              keyboardType="decimal-pad"
              required
            />
          ) : null}
          {form.interest_type === 'compound' ? (
            <CustomDropdown
              label="Compounding Frequency"
              value={form.compounding_frequency}
              options={COMPOUND_FREQUENCIES}
              onSelect={value => setField('compounding_frequency', value)}
              required
            />
          ) : null}
          <DatePicker
            label="Calculation Start Date"
            value={form.interest_calculation_start_date}
            onChange={value => setField('interest_calculation_start_date', value)}
            minimumDate={startDate}
            maximumDate={Number.isNaN(maturityPreviousDay.getTime()) ? null : maturityPreviousDay}
          />
          <Field
            label={`Late Payment Rate (% / ${form.interest_frequency.replaceAll('_', ' ')})`}
            value={form.late_payment_interest_rate}
            onChangeText={value => setField('late_payment_interest_rate', value)}
            keyboardType="decimal-pad"
            placeholder="Optional"
          />
          <Text className="-mt-3 mb-4 text-[11px] text-[#83918B]">
            Optional simple charge on outstanding principal, applied from the day after maturity.
            It is not compounded.
          </Text>
          <CustomDropdown
            label="Loan Status"
            value={form.loan_status}
            options={
              loanId
                ? [
                    { value: 'Active', label: 'Active' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Inactive', label: 'Inactive' },
                    { value: 'Completed', label: 'Completed' },
                  ]
                : [
                    { value: 'Active', label: 'Active' },
                    { value: 'Pending', label: 'Pending' },
                  ]
            }
            onSelect={value => setField('loan_status', value)}
            required
          />
          <Field
            label="Processing Fee (₹)"
            value={form.processing_fee}
            onChangeText={value => setField('processing_fee', value)}
            keyboardType="decimal-pad"
          />
          <Field
            label="Other Authorized Charges (₹)"
            value={form.other_charges}
            onChangeText={value => setField('other_charges', value)}
            keyboardType="decimal-pad"
          />
        </Section>

        <Section
          number="04"
          title="Loan Schedule"
          subtitle="Choose the loan dates and repayment frequency.">
          <Field
            label="Loan Number"
            value="Auto-generated on save"
            onChangeText={() => {}}
            readOnly
          />
          <DatePicker
            label="Loan Date"
            value={form.loan_date}
            onChange={value => setField('loan_date', value)}
          />
          <Field
            label="Maturity Date"
            value={
              isValidDate(form.maturity_date)
                ? parseLocalDate(form.maturity_date).toLocaleDateString('en-US')
                : ''
            }
            onChangeText={() => {}}
            placeholder="Automatically set to 11 months after the loan date"
            readOnly
            required
          />
          <Text className="-mt-3 mb-4 text-[11px] text-[#83918B]">
            Automatically set to 11 months after the loan date.
          </Text>
          <CustomDropdown
            label="Payment Frequency"
            value={form.payment_frequency}
            options={PAYMENT_FREQUENCIES}
            onSelect={value => setField('payment_frequency', value)}
            required
          />
          <Field
            label="Notes"
            value={form.notes}
            onChangeText={value => setField('notes', value)}
            placeholder="Enter any additional loan notes (optional)"
            multiline
          />
        </Section>

        <View className="mb-4 rounded-2xl border border-[#F2D98B] bg-[#FFFDF5] p-4">
          <View className="mb-4 flex-row items-center border-b border-[#F5E9BF] pb-3">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-[#FFF2C2]">
              <Text className="text-xs font-black text-[#8A5A00]">05</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-[#173F35]">
                Estimated Interest Preview
              </Text>
              <Text className="mt-0.5 text-xs text-[#6B7E76]">
                Review the estimated amount due at maturity before saving.
              </Text>
            </View>
          </View>
          {estimate ? (
            <View className="rounded-xl border border-[#F5E9BF] bg-white p-3">
              {[
                ['Principal Amount', currency(estimate.principal)],
                ['Interest Type', interestLabel],
                ['Applicable Rate', rateLabel],
                ['Accrued Interest at Maturity', currency(estimate.interest)],
                ['Processing Fee', currency(Number(form.processing_fee || 0))],
                ['Other Charges', currency(estimate.charges)],
                ['Payments Received', currency(0)],
                ['Outstanding Principal', currency(estimate.principal)],
              ].map(([label, value]) => (
                <View
                  key={label}
                  className="flex-row items-center justify-between border-b border-[#F1F2EE] py-2.5">
                  <Text className="flex-1 text-xs text-[#6B7E76]">{label}</Text>
                  <Text className="ml-3 text-right text-sm font-semibold text-[#173F35]">
                    {value}
                  </Text>
                </View>
              ))}
              <View className="mt-3 rounded-lg bg-[#FFF8E7] p-3">
                <Text className="text-xs font-bold text-[#52645F]">
                  Total Amount Due · Settlement Estimate
                </Text>
                <Text className="mt-1 text-lg font-extrabold text-[#173F35]">
                  {currency(estimate.total)}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold text-[#8A5A00]">
                  Estimated at maturity
                </Text>
              </View>
              <Text className="mt-3 text-[11px] leading-4 text-[#6B7E76]">
                {form.interest_calculation_start_date} to {form.maturity_date}:{' '}
                {estimate.days} convention days; {estimate.eligibleDays} interest-bearing days
                after configured grace and interest-free days.
              </Text>
              <Text className="mt-1 text-[11px] leading-4 text-[#6B7E76]">
                Principal basis: {estimate.basis}. Values are estimates and assume no payments
                received; review the agreed contract terms before disbursement.
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-[#6B7E76]">
              Enter the loan amount, interest rate, and dates to see the estimate.
            </Text>
          )}
        </View>

      </ScrollView>
      <View className="flex-row gap-2 border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 py-3">
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onBack}
          className="min-h-11 flex-1 items-center justify-center rounded-xl border border-[#DDBB57] bg-white px-3">
          <Text className="text-sm font-bold text-[#173F35]">Cancel</Text>
        </Pressable>
        {!loanId ? (
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={resetForm}
            className="min-h-11 flex-1 flex-row items-center justify-center rounded-xl border border-[#A7D6C9] bg-[#EFF9F5] px-3">
            <RotateCcw size={15} color="#07564B" />
            <Text className="ml-1.5 text-sm font-bold text-[#173F35]">Reset</Text>
          </Pressable>
        ) : null}
        <View className="flex-[1.4] justify-center">
          <SubmitButton
            label={loanId ? 'Update Loan' : 'Save Loan'}
            loading={saving}
            onPress={saveLoan}
            compact
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
