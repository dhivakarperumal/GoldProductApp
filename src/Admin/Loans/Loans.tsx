import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';

type Customer = {
  id: number | string;
  customer_code?: string;
  full_name: string;
  mobile?: string;
};

type Loan = {
  id: number | string;
  loan_number?: string;
  customer_name?: string;
  customer_code?: string;
  customer_mobile?: string;
  principal_amount?: string | number;
  outstanding_principal?: string | number;
  interest_rate?: string | number;
  maturity_date?: string;
  loan_status?: string;
  release_status?: string;
  jewellery_type?: string;
  gold_purity?: string;
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
  rate_unit?: string;
  rate_per_unit?: string | number;
  rate_per_gram?: string | number;
};

type LoanForm = {
  customer_id: string;
  jewellery_type: string;
  metal_type: string;
  gold_purity: string;
  gross_weight: string;
  stone_weight: string;
  principal_amount: string;
  interest_type: string;
  interest_rate: string;
  fixed_interest_amount: string;
  loan_date: string;
  maturity_date: string;
};

type CustomerForm = {
  customer_type: string;
  full_name: string;
  mobile: string;
  email: string;
  gender: string;
  occupation: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  guarantor_name: string;
  guarantor_mobile: string;
  guarantor_relationship: string;
};

type FormMode = 'loan' | 'customer' | null;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function dateAfterMonths(months: number) {
  const date = new Date();
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function createLoanForm(): LoanForm {
  return {
    customer_id: '',
    jewellery_type: '',
    metal_type: 'Gold',
    gold_purity: '',
    gross_weight: '',
    stone_weight: '0',
    principal_amount: '',
    interest_type: '',
    interest_rate: '',
    fixed_interest_amount: '',
    loan_date: today(),
    maturity_date: dateAfterMonths(11),
  };
}

function createCustomerForm(): CustomerForm {
  return {
    customer_type: 'Individual',
    full_name: '',
    mobile: '',
    email: '',
    gender: '',
    occupation: '',
    address: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    guarantor_name: '',
    guarantor_mobile: '',
    guarantor_relationship: '',
  };
}

function errorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Please try again.';
}

function formatCurrency(value: string | number | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required = false,
  multiline = false,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad';
  required?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#9AA6A1"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3 text-sm text-[#173F35] ${multiline ? 'min-h-[88px]' : 'min-h-[48px]'}`}
      />
    </View>
  );
}

function ChoiceChips({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label} *
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              className={`rounded-full border px-3.5 py-2.5 ${selected ? 'border-[#07564B] bg-[#07564B]' : 'border-[#E6E9E3] bg-white'}`}>
              <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#52645F]'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      className="mb-6 min-h-12 flex-row items-center justify-center rounded-xl bg-[#07564B] px-4 py-3 disabled:opacity-60">
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Check size={17} color="#FFFFFF" />
          <Text className="ml-2 text-sm font-extrabold text-white">{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loanForm, setLoanForm] = useState<LoanForm>(createLoanForm);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(createCustomerForm);
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerPhoto, setCustomerPhoto] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [optionsError, setOptionsError] = useState('');

  const loadLoans = useCallback(async () => {
    const response = await api.get('/loans');
    if (!Array.isArray(response.data)) {
      throw new Error('The server returned an invalid loan list.');
    }
    setLoans(response.data as Loan[]);
  }, []);

  const loadOptions = useCallback(async () => {
    const [customerResponse, interestResponse, ratesResponse] = await Promise.all([
      api.get('/customers'),
      api.get('/loans/interest-types'),
      api.get('/gold-rates/current'),
    ]);
    if (!Array.isArray(customerResponse.data) || !Array.isArray(interestResponse.data)) {
      throw new Error('The server returned invalid customer or interest-type data.');
    }
    const rates = Array.isArray(ratesResponse.data?.rates)
      ? ratesResponse.data.rates
      : [];
    setCustomers(customerResponse.data as Customer[]);
    setInterestTypes(interestResponse.data as InterestType[]);
    setGoldRates(rates as GoldRate[]);
    setOptionsError('');
    setLoanForm(current => ({
      ...current,
      interest_type:
        current.interest_type ||
        (interestResponse.data as InterestType[]).find(type => type.enabled)?.type_key ||
        '',
      gold_purity: current.gold_purity || rates[0]?.purity || '',
    }));
  }, []);

  const loadPage = useCallback(async () => {
    setLoadError('');
    try {
      await Promise.all([loadLoans(), loadOptions()]);
    } catch (error) {
      const message = errorMessage(error);
      setLoadError(message);
      if (__DEV__) console.warn('[Loans] Could not load loan data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLoans, loadOptions]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const visibleLoans = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return loans;
    return loans.filter(loan =>
      [
        loan.loan_number,
        loan.customer_name,
        loan.customer_code,
        loan.customer_mobile,
        loan.loan_status,
      ].some(value => String(value || '').toLowerCase().includes(search)),
    );
  }, [loans, query]);

  const activeCount = loans.filter(
    loan => String(loan.loan_status || '').toLowerCase() === 'active',
  ).length;
  const completedCount = loans.filter(
    loan =>
      loan.release_status === 'Released' ||
      String(loan.loan_status || '').toLowerCase() === 'completed',
  ).length;

  const openForm = (mode: Exclude<FormMode, null>) => {
    setShowCreateOptions(false);
    setFormMode(mode);
    setOptionsError('');
    if (mode === 'loan') {
      setLoanForm({
        ...createLoanForm(),
        interest_type:
          interestTypes.find(type => type.enabled)?.type_key ||
          interestTypes[0]?.type_key ||
          '',
        gold_purity: goldRates[0]?.purity || '',
        metal_type: goldRates[0]?.metal_type || 'Gold',
      });
      loadOptions().catch(error => {
        const message = errorMessage(error);
        setOptionsError(message);
        Alert.alert('Unable to load loan options', message);
      });
    } else {
      setCustomerForm(createCustomerForm());
      setCustomerPassword('');
      setCustomerPhoto(null);
      setCustomerPhotoUrl('');
    }
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setOptionsError('');
  };

  const setLoanField = (field: keyof LoanForm, value: string) => {
    setLoanForm(current => ({ ...current, [field]: value }));
  };

  const setCustomerField = (field: keyof CustomerForm, value: string) => {
    setCustomerForm(current => ({ ...current, [field]: value }));
  };

  const chooseCustomerPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.8,
    });
    if (result.didCancel) return;
    if (result.errorMessage) {
      Alert.alert('Photo unavailable', result.errorMessage);
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Photo unavailable', 'Choose a PNG or JPG image and try again.');
      return;
    }
    const type = asset.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png'].includes(type)) {
      Alert.alert('Unsupported photo', 'Customer photos must be JPG or PNG.');
      return;
    }
    setCustomerPhoto({
      uri: asset.uri,
      name: asset.fileName || `customer-photo.${type === 'image/png' ? 'png' : 'jpg'}`,
      type,
    });
    setCustomerPhotoUrl('');
  };

  const saveCustomer = async () => {
    const requiredValues = [
      customerForm.full_name,
      customerForm.mobile,
      customerForm.email,
      customerForm.gender,
      customerForm.address,
      customerForm.city,
      customerForm.district,
      customerForm.state,
      customerForm.pincode,
      customerForm.guarantor_name,
      customerForm.guarantor_mobile,
      customerForm.guarantor_relationship,
    ];
    if (requiredValues.some(value => !value.trim())) {
      Alert.alert('Required information', 'Complete all fields marked with *.');
      return;
    }
    const password = customerPassword.trim() || customerForm.mobile.trim();
    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Enter a password with at least 8 characters. By default, the customer mobile number is used.',
      );
      return;
    }
    if (!customerPhotoUrl && !customerPhoto) {
      Alert.alert('Customer photo required', 'Choose a JPG or PNG customer photo.');
      return;
    }

    setSaving(true);
    try {
      let photoUrl = customerPhotoUrl;
      if (!photoUrl && customerPhoto) {
        const photoData = new FormData();
        photoData.append('photo', customerPhoto);
        const uploadResponse = await api.post('/loan-customers/photos', photoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = uploadResponse.data?.photo_url;
        if (typeof photoUrl !== 'string' || !photoUrl) {
          throw new Error('The server did not return the uploaded photo reference.');
        }
        setCustomerPhotoUrl(photoUrl);
      }

      const response = await api.post('/loan-customers', {
        ...customerForm,
        full_name: customerForm.full_name.trim(),
        mobile: customerForm.mobile.trim(),
        email: customerForm.email.trim(),
        password,
        photo_url: photoUrl,
        kyc_status: 'Pending',
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Customer could not be saved.');
      }
      Alert.alert('Customer created', `${customerForm.full_name} was added successfully.`);
      setFormMode(null);
      setCustomerForm(createCustomerForm());
      await loadOptions();
    } catch (error) {
      const message = errorMessage(error);
      if (__DEV__) console.warn('[Loans] Could not create customer:', error);
      Alert.alert('Could not create customer', message);
    } finally {
      setSaving(false);
    }
  };

  const saveLoan = async () => {
    const grossWeight = Number(loanForm.gross_weight);
    const stoneWeight = Number(loanForm.stone_weight || 0);
    if (!loanForm.customer_id) {
      Alert.alert('Customer required', 'Select a customer for this loan.');
      return;
    }
    if (!loanForm.jewellery_type.trim() || !loanForm.gold_purity.trim()) {
      Alert.alert('Pledged gold required', 'Enter the jewellery type and purity.');
      return;
    }
    if (!(grossWeight > 0) || stoneWeight < 0 || grossWeight <= stoneWeight) {
      Alert.alert('Invalid weight', 'Gross weight must be greater than stone weight.');
      return;
    }
    const interestRate = Number(loanForm.interest_rate);
    if (
      !(Number(loanForm.principal_amount) > 0) ||
      !Number.isFinite(interestRate) ||
      (loanForm.interest_type !== 'fixed' && !loanForm.interest_rate.trim()) ||
      (loanForm.interest_rate.trim() && interestRate < 0)
    ) {
      Alert.alert('Loan terms required', 'Enter a valid loan amount and interest rate.');
      return;
    }
    if (!loanForm.interest_type) {
      Alert.alert('Interest method required', 'Choose an enabled interest method.');
      return;
    }
    if (
      !isValidDate(loanForm.loan_date) ||
      !isValidDate(loanForm.maturity_date) ||
      loanForm.maturity_date <= loanForm.loan_date
    ) {
      Alert.alert('Invalid loan dates', 'Maturity date must be after the loan date.');
      return;
    }
    const activeRate = goldRates.find(
      rate =>
        rate.metal_type === loanForm.metal_type &&
        String(rate.purity) === loanForm.gold_purity,
    );
    if (!activeRate) {
      Alert.alert(
        'Gold rate unavailable',
        `No active ${loanForm.metal_type.toLowerCase()} rate matches the selected purity. Configure daily rates first.`,
      );
      return;
    }
    if (loanForm.interest_type === 'fixed' && !(Number(loanForm.fixed_interest_amount) > 0)) {
      Alert.alert('Fixed interest required', 'Enter the fixed interest amount per period.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/loans', {
        customer_id: loanForm.customer_id,
        jewellery_type: loanForm.jewellery_type.trim(),
        metal_type: loanForm.metal_type,
        gold_purity: loanForm.gold_purity,
        gross_weight: loanForm.gross_weight,
        stone_weight: loanForm.stone_weight || '0',
        net_gold_weight: (grossWeight - stoneWeight).toFixed(3),
        principal_amount: loanForm.principal_amount,
        loan_amount_mode: 'manual',
        interest_type: loanForm.interest_type,
        interest_rate: loanForm.interest_rate,
        fixed_interest_amount: loanForm.fixed_interest_amount || undefined,
        interest_frequency: 'monthly',
        custom_period_days: '30',
        interest_calculation_start_date: loanForm.loan_date,
        compounding_frequency: 'monthly',
        day_count_convention: 'actual_365',
        grace_period_days: '0',
        late_payment_interest_rate: '',
        interest_free_days: '0',
        minimum_interest_amount: '',
        maximum_interest_amount: '',
        processing_fee: '0',
        other_charges: '0',
        loan_date: loanForm.loan_date,
        maturity_date: loanForm.maturity_date,
        payment_frequency: 'monthly',
        loan_status: 'Active',
        notes: '',
      });
      setFormMode(null);
      setLoanForm(createLoanForm());
      await loadLoans();
      Alert.alert('Loan created', `${response.data?.loan_number || 'The loan'} was created successfully.`);
    } catch (error) {
      const message = errorMessage(error);
      if (__DEV__) console.warn('[Loans] Could not create loan:', error);
      Alert.alert('Could not create loan', message);
    } finally {
      setSaving(false);
    }
  };

  const renderLoanForm = () => {
    const matchingRates = goldRates.filter(rate => rate.metal_type === loanForm.metal_type);
    const chosenCustomer = customers.find(
      customer => String(customer.id) === loanForm.customer_id,
    );
    return (
      <>
        <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
          Select a registered customer, record pledged jewellery, and enter the agreed loan terms.
        </Text>
        {optionsError ? (
          <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{optionsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                loadOptions().catch(error => setOptionsError(errorMessage(error)))
              }
              className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry loading options</Text>
            </Pressable>
          </View>
        ) : null}
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
          Select customer *
        </Text>
        {chosenCustomer ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setLoanField('customer_id', '')}
            className="mb-4 flex-row items-center justify-between rounded-xl border border-[#A7D6C9] bg-[#EFF9F5] p-3.5">
            <View>
              <Text className="text-sm font-bold text-[#173F35]">{chosenCustomer.full_name}</Text>
              <Text className="mt-1 text-xs text-[#6B7280]">
                {chosenCustomer.customer_code || `ID ${chosenCustomer.id}`} · {chosenCustomer.mobile || 'Mobile unavailable'}
              </Text>
            </View>
            <ChevronDown size={18} color="#07564B" />
          </Pressable>
        ) : customers.length > 0 ? (
          <View className="mb-4 max-h-52 rounded-xl border border-[#E6E9E3] bg-white">
            <ScrollView nestedScrollEnabled>
              {customers.map(customer => (
                <Pressable
                  key={String(customer.id)}
                  accessibilityRole="button"
                  onPress={() => setLoanField('customer_id', String(customer.id))}
                  className="border-b border-[#F1F2EE] px-3.5 py-3">
                  <Text className="text-sm font-bold text-[#173F35]">{customer.full_name}</Text>
                  <Text className="mt-0.5 text-xs text-[#6B7280]">
                    {customer.customer_code || `ID ${customer.id}`} · {customer.mobile || 'Mobile unavailable'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View className="mb-4 rounded-xl bg-[#FFF8E7] p-3">
            <Text className="text-sm text-[#70540D]">Create a customer before creating a loan.</Text>
          </View>
        )}

        <Field label="Jewellery type" value={loanForm.jewellery_type} onChangeText={value => setLoanField('jewellery_type', value)} placeholder="e.g. Necklace" required />
        <ChoiceChips
          label="Metal"
          value={loanForm.metal_type}
          options={['Gold', 'Silver', 'Platinum', 'Diamond'].map(value => ({ value, label: value }))}
          onSelect={value => {
            setLoanField('metal_type', value);
            setLoanField(
              'gold_purity',
              goldRates.find(rate => rate.metal_type === value)?.purity || '',
            );
          }}
        />
        {matchingRates.length > 0 ? (
          <ChoiceChips
            label="Purity"
            value={loanForm.gold_purity}
            options={matchingRates.map(rate => ({
              value: String(rate.purity),
              label: String(rate.purity),
            }))}
            onSelect={value => setLoanField('gold_purity', value)}
          />
        ) : (
          <Field label="Purity" value={loanForm.gold_purity} onChangeText={value => setLoanField('gold_purity', value)} placeholder="e.g. 22K" required />
        )}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Gross weight (g)" value={loanForm.gross_weight} onChangeText={value => setLoanField('gross_weight', value)} keyboardType="decimal-pad" required />
          </View>
          <View className="flex-1">
            <Field label="Stone weight (g)" value={loanForm.stone_weight} onChangeText={value => setLoanField('stone_weight', value)} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Loan amount (₹)" value={loanForm.principal_amount} onChangeText={value => setLoanField('principal_amount', value)} keyboardType="decimal-pad" required />
        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
          Interest method *
        </Text>
        {interestTypes.filter(type => type.enabled).length > 0 ? (
          <View className="mb-4 flex-row flex-wrap gap-2">
            {interestTypes.filter(type => type.enabled).map(type => {
              const selected = loanForm.interest_type === type.type_key;
              return (
                <Pressable
                  key={type.type_key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setLoanField('interest_type', type.type_key)}
                  className={`rounded-full border px-3.5 py-2.5 ${selected ? 'border-[#07564B] bg-[#07564B]' : 'border-[#E6E9E3] bg-white'}`}>
                  <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#52645F]'}`}>
                    {type.label || type.name || type.type_key.replaceAll('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text className="mb-4 text-sm text-[#A94760]">No enabled interest methods are available.</Text>
        )}
        <Field
          label="Interest rate (%)"
          value={loanForm.interest_rate}
          onChangeText={value => setLoanField('interest_rate', value)}
          keyboardType="decimal-pad"
          required
        />
        {loanForm.interest_type === 'fixed' ? (
          <Field
            label="Fixed interest per period (₹)"
            value={loanForm.fixed_interest_amount}
            onChangeText={value => setLoanField('fixed_interest_amount', value)}
            keyboardType="decimal-pad"
            required
          />
        ) : null}
        <Field label="Loan date (YYYY-MM-DD)" value={loanForm.loan_date} onChangeText={value => setLoanField('loan_date', value)} required />
        <Field label="Maturity date (YYYY-MM-DD)" value={loanForm.maturity_date} onChangeText={value => setLoanField('maturity_date', value)} required />
        <ActionButton label="Create Loan" onPress={saveLoan} loading={saving} />
      </>
    );
  };

  const renderCustomerForm = () => (
    <>
      <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
        Add the borrower’s contact, address, guarantor, and photo details.
      </Text>
      <ChoiceChips
        label="Customer type"
        value={customerForm.customer_type}
        options={[
          { value: 'Individual', label: 'Individual' },
          { value: 'Business', label: 'Business' },
        ]}
        onSelect={value => setCustomerField('customer_type', value)}
      />
      <Field label="Full name" value={customerForm.full_name} onChangeText={value => setCustomerField('full_name', value)} required />
      <Field label="Mobile" value={customerForm.mobile} onChangeText={value => setCustomerField('mobile', value)} keyboardType="phone-pad" required />
      <Field label="Email" value={customerForm.email} onChangeText={value => setCustomerField('email', value)} keyboardType="email-address" autoCapitalize="none" required />
      <Field label="Password (defaults to mobile)" value={customerPassword} onChangeText={setCustomerPassword} autoCapitalize="none" placeholder="Leave blank to use mobile number" />
      <ChoiceChips
        label="Gender"
        value={customerForm.gender}
        options={['Male', 'Female', 'Other'].map(value => ({ value, label: value }))}
        onSelect={value => setCustomerField('gender', value)}
      />
      <Field label="Occupation" value={customerForm.occupation} onChangeText={value => setCustomerField('occupation', value)} />
      <Field label="Address" value={customerForm.address} onChangeText={value => setCustomerField('address', value)} multiline required />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="City" value={customerForm.city} onChangeText={value => setCustomerField('city', value)} required />
        </View>
        <View className="flex-1">
          <Field label="District" value={customerForm.district} onChangeText={value => setCustomerField('district', value)} required />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="State" value={customerForm.state} onChangeText={value => setCustomerField('state', value)} required />
        </View>
        <View className="flex-1">
          <Field label="Pincode" value={customerForm.pincode} onChangeText={value => setCustomerField('pincode', value)} keyboardType="numeric" required />
        </View>
      </View>
      <Text className="mb-3 mt-1 text-sm font-extrabold text-[#173F35]">Guarantor details</Text>
      <Field label="Guarantor name" value={customerForm.guarantor_name} onChangeText={value => setCustomerField('guarantor_name', value)} required />
      <Field label="Guarantor mobile" value={customerForm.guarantor_mobile} onChangeText={value => setCustomerField('guarantor_mobile', value)} keyboardType="phone-pad" required />
      <Field label="Relationship" value={customerForm.guarantor_relationship} onChangeText={value => setCustomerField('guarantor_relationship', value)} required />
      <Pressable
        accessibilityRole="button"
        onPress={chooseCustomerPhoto}
        className="mb-5 min-h-14 flex-row items-center justify-center rounded-xl border border-dashed border-[#A7BDB4] bg-white px-4 py-3">
        {customerPhoto ? (
          <Image
            source={{ uri: customerPhoto.uri }}
            className="mr-3 h-12 w-12 rounded-lg"
          />
        ) : null}
        <Text className="text-sm font-bold text-[#07564B]">
          {customerPhoto ? 'Change customer photo' : 'Choose customer photo *'}
        </Text>
      </Pressable>
      <ActionButton label="Create Customer" onPress={saveCustomer} loading={saving} />
    </>
  );

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <ScrollView
        testID="admin-loans"
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPage();
            }}
            tintColor="#07564B"
          />
        }>
        <View className="mb-4 rounded-3xl bg-[#173F35] p-5">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
            Shop Administration
          </Text>
          <Text className="mt-1 text-2xl font-extrabold text-white">All Loans</Text>
          <Text className="mt-2 text-sm text-[#DCE8E4]">
            Manage customer gold loans and balances.
          </Text>
        </View>

        <View className="mb-4 flex-row gap-3">
          {[
            { label: 'Total Loans', value: loans.length, icon: CircleDollarSign },
            { label: 'Active', value: activeCount, icon: Check },
            { label: 'Completed', value: completedCount, icon: CalendarDays },
          ].map(({ label, value, icon: Icon }) => (
            <View
              key={label}
              className="min-h-[88px] flex-1 rounded-2xl border border-[#ECE7D8] bg-white p-3">
              <Icon size={17} color="#A77B15" />
              <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">{label}</Text>
              <Text className="mt-0.5 text-lg font-extrabold text-[#173F35]">
                {loading ? '—' : value}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-4 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
          <Search size={18} color="#8A9690" />
          <TextInput
            accessibilityLabel="Search loans"
            value={query}
            onChangeText={setQuery}
            placeholder="Search loan or customer"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-2 text-sm text-[#173F35]"
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
              <X size={17} color="#6B7280" />
            </Pressable>
          ) : null}
        </View>

        {loadError ? (
          <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadPage}
              className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#07564B" />
            <Text className="mt-2 text-sm text-[#6B7280]">Loading loans...</Text>
          </View>
        ) : visibleLoans.length > 0 ? (
          visibleLoans.map(loan => (
            <View
              key={String(loan.id)}
              className="mb-3 rounded-2xl border border-[#ECE7D8] bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#A77B15]">
                    {loan.loan_number || `Loan ${loan.id}`}
                  </Text>
                  <Text className="mt-1 text-base font-extrabold text-[#173F35]">
                    {loan.customer_name || 'Customer'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#6B7280]">
                    {loan.customer_code || loan.customer_mobile || 'Customer details unavailable'}
                  </Text>
                </View>
                <View className="rounded-full bg-[#EFF9F5] px-2.5 py-1.5">
                  <Text className="text-[10px] font-bold text-[#07564B]">
                    {loan.release_status === 'Released'
                      ? 'Completed'
                      : loan.loan_status || 'Unknown'}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row border-t border-[#F1F2EE] pt-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">OUTSTANDING</Text>
                  <Text className="mt-1 text-sm font-extrabold text-[#173F35]">
                    {formatCurrency(loan.outstanding_principal ?? loan.principal_amount)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">INTEREST</Text>
                  <Text className="mt-1 text-sm font-bold text-[#52645F]">
                    {loan.interest_rate ?? '—'}%
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-[#8A8F8B]">MATURITY</Text>
                  <Text className="mt-1 text-xs font-bold text-[#52645F]">
                    {formatDate(loan.maturity_date)}
                  </Text>
                </View>
              </View>
              {loan.jewellery_type || loan.gold_purity ? (
                <Text className="mt-3 text-xs text-[#6B7280]">
                  {[loan.jewellery_type, loan.gold_purity].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white px-5 py-10">
            <CircleDollarSign size={28} color="#A77B15" />
            <Text className="mt-3 text-sm font-bold text-[#173F35]">
              {loans.length ? 'No loans match your search.' : 'No loans created yet.'}
            </Text>
            <Text className="mt-1 text-center text-xs text-[#6B7280]">
              Use the + button to create a loan or add a customer.
            </Text>
          </View>
        )}
      </ScrollView>

      {showCreateOptions ? (
        <View className="absolute bottom-5 right-4 items-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a loan"
            onPress={() => openForm('loan')}
            className="mb-3 min-h-12 flex-row items-center rounded-full bg-white px-5 shadow-lg">
            <CircleDollarSign size={17} color="#07564B" />
            <Text className="ml-2 text-sm font-extrabold text-[#173F35]">Create Loan</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a customer"
            onPress={() => openForm('customer')}
            className="mb-3 min-h-12 flex-row items-center rounded-full bg-white px-5 shadow-lg">
            <UserPlus size={17} color="#07564B" />
            <Text className="ml-2 text-sm font-extrabold text-[#173F35]">Create Customer</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close create options"
            onPress={() => setShowCreateOptions(false)}
            className="h-14 w-14 items-center justify-center rounded-full bg-[#B8860B] shadow-lg">
            <X size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create loan or customer"
          accessibilityState={{ expanded: showCreateOptions }}
          onPress={() => setShowCreateOptions(true)}
          className="absolute bottom-5 right-4 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
          <Plus size={25} color="#FFFFFF" />
        </Pressable>
      )}

      <Modal
        visible={formMode !== null}
        animationType="slide"
        onRequestClose={closeForm}>
        <KeyboardAvoidingView
          className="flex-1 bg-[#F8F7F2]"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-row items-center border-b border-[#ECE7D8] bg-white px-4 pb-4 pt-12">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to all loans"
              onPress={closeForm}
              disabled={saving}
              className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F4F7F3]">
              <ArrowLeft size={20} color="#173F35" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#A77B15]">
                Loan Management
              </Text>
              <Text className="mt-0.5 text-lg font-extrabold text-[#173F35]">
                {formMode === 'loan' ? 'Create Gold Loan' : 'Create Customer'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close form"
              onPress={closeForm}
              disabled={saving}
              className="h-10 w-10 items-center justify-center rounded-full">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-4 pb-8 pt-5">
            {formMode === 'loan' ? renderLoanForm() : renderCustomerForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
