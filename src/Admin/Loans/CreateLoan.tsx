import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { ChoiceChips, Field, SubmitButton, errorMessage } from './FormControls';

type Customer = {
  id: number | string;
  customer_code?: string;
  full_name: string;
  mobile?: string;
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

type CreateLoanProps = {
  onBack: () => void;
  onCreated: () => void;
};

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonths(date: Date, months: number) {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return localDate(date);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function emptyLoan(): LoanForm {
  const date = new Date();
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
    loan_date: localDate(date),
    maturity_date: addMonths(new Date(date), 11),
  };
}

export default function CreateLoan({ onBack, onCreated }: CreateLoanProps) {
  const { showAlert } = useCustomAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interestTypes, setInterestTypes] = useState<InterestType[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRate[]>([]);
  const [form, setForm] = useState<LoanForm>(emptyLoan);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOptions = useCallback(async () => {
    setOptionsError('');
    try {
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
      const methods = interestResponse.data as InterestType[];
      setCustomers(customerResponse.data as Customer[]);
      setInterestTypes(methods);
      setGoldRates(rates as GoldRate[]);
      setForm(current => ({
        ...current,
        interest_type:
          current.interest_type || methods.find(type => type.enabled)?.type_key || '',
        gold_purity: current.gold_purity || rates[0]?.purity || '',
        metal_type: rates[0]?.metal_type || current.metal_type,
      }));
    } catch (error) {
      setOptionsError(errorMessage(error));
      if (__DEV__) console.warn('[Loans] Could not load create-loan options:', error);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const setField = (field: keyof LoanForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const saveLoan = async () => {
    const grossWeight = Number(form.gross_weight);
    const stoneWeight = Number(form.stone_weight || 0);
    const interestRate = Number(form.interest_rate);
    if (!form.customer_id) {
      showAlert('Customer required', 'Select a customer for this loan.', { variant: 'warning' });
      return;
    }
    if (!form.jewellery_type.trim() || !form.gold_purity.trim()) {
      showAlert('Pledged gold required', 'Enter the jewellery type and purity.', { variant: 'warning' });
      return;
    }
    if (!(grossWeight > 0) || stoneWeight < 0 || grossWeight <= stoneWeight) {
      showAlert('Invalid weight', 'Gross weight must be greater than stone weight.', { variant: 'warning' });
      return;
    }
    if (!(Number(form.principal_amount) > 0)) {
      showAlert('Loan amount required', 'Enter a loan amount greater than zero.', { variant: 'warning' });
      return;
    }
    if (
      !Number.isFinite(interestRate) ||
      (form.interest_type !== 'fixed' && !form.interest_rate.trim()) ||
      (form.interest_rate.trim() && interestRate < 0)
    ) {
      showAlert('Interest rate required', 'Enter a valid non-negative interest rate.', { variant: 'warning' });
      return;
    }
    if (!form.interest_type) {
      showAlert('Interest method required', 'Choose an enabled interest method.', { variant: 'warning' });
      return;
    }
    if (
      !validDate(form.loan_date) ||
      !validDate(form.maturity_date) ||
      form.maturity_date <= form.loan_date
    ) {
      showAlert('Invalid loan dates', 'Maturity date must be after the loan date. Use YYYY-MM-DD.', { variant: 'warning' });
      return;
    }
    const activeRate = goldRates.find(
      rate =>
        rate.metal_type === form.metal_type &&
        String(rate.purity) === form.gold_purity,
    );
    if (!activeRate) {
      showAlert(
        'Gold rate unavailable',
        `No active ${form.metal_type.toLowerCase()} rate matches the selected purity. Configure daily rates first.`,
        { variant: 'warning' },
      );
      return;
    }
    if (
      form.interest_type === 'fixed' &&
      !(Number(form.fixed_interest_amount) > 0)
    ) {
      showAlert('Fixed interest required', 'Enter the fixed interest amount per period.', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/loans', {
        customer_id: form.customer_id,
        jewellery_type: form.jewellery_type.trim(),
        metal_type: form.metal_type,
        gold_purity: form.gold_purity,
        gross_weight: form.gross_weight,
        stone_weight: form.stone_weight || '0',
        net_gold_weight: (grossWeight - stoneWeight).toFixed(3),
        principal_amount: form.principal_amount,
        loan_amount_mode: 'manual',
        interest_type: form.interest_type,
        interest_rate: form.interest_rate,
        fixed_interest_amount: form.fixed_interest_amount || undefined,
        interest_frequency: 'monthly',
        custom_period_days: '30',
        interest_calculation_start_date: form.loan_date,
        compounding_frequency: 'monthly',
        day_count_convention: 'actual_365',
        grace_period_days: '0',
        late_payment_interest_rate: '',
        interest_free_days: '0',
        minimum_interest_amount: '',
        maximum_interest_amount: '',
        processing_fee: '0',
        other_charges: '0',
        loan_date: form.loan_date,
        maturity_date: form.maturity_date,
        payment_frequency: 'monthly',
        loan_status: 'Active',
        notes: '',
      });
      showAlert('Loan created', 'The loan was created successfully.', {
        variant: 'success',
        buttons: [{ text: 'Done', onPress: onCreated }],
      });
    } catch (error) {
      if (__DEV__) console.warn('[Loans] Could not create loan:', error);
      showAlert('Could not create loan', errorMessage(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const matchingRates = goldRates.filter(rate => rate.metal_type === form.metal_type);
  const selectedCustomer = customers.find(
    customer => String(customer.id) === form.customer_id,
  );
  const enabledInterestTypes = interestTypes.filter(type => type.enabled);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerHeader title="Create Gold Loan" onBack={onBack} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-8">
        <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
          Select a registered customer, record pledged jewellery, and enter the agreed loan terms.
        </Text>

        {optionsError ? (
          <View className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-sm text-[#991B1B]">{optionsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadOptions}
              className="mt-2 self-start">
              <Text className="text-sm font-bold text-[#991B1B]">Retry loading options</Text>
            </Pressable>
          </View>
        ) : null}
        {loadingOptions ? (
          <View className="mb-4 flex-row items-center py-2">
            <ActivityIndicator color="#07564B" />
            <Text className="ml-2 text-sm text-[#6B7280]">Loading loan options...</Text>
          </View>
        ) : null}

        <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
          Select customer *
        </Text>
        {selectedCustomer ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setField('customer_id', '')}
            className="mb-4 rounded-xl border border-[#A7D6C9] bg-[#EFF9F5] p-3.5">
            <Text className="text-sm font-bold text-[#173F35]">{selectedCustomer.full_name}</Text>
            <Text className="mt-1 text-xs text-[#6B7280]">
              {selectedCustomer.customer_code || `ID ${selectedCustomer.id}`} · {selectedCustomer.mobile || 'Mobile unavailable'}
              {'  ·  Change'}
            </Text>
          </Pressable>
        ) : customers.length > 0 ? (
          <View className="mb-4 max-h-52 rounded-xl border border-[#E6E9E3] bg-white">
            <ScrollView nestedScrollEnabled>
              {customers.map(customer => (
                <Pressable
                  key={String(customer.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${customer.full_name}`}
                  onPress={() => setField('customer_id', String(customer.id))}
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
            <Text className="text-sm text-[#70540D]">
              {loadingOptions ? 'Loading registered customers...' : 'Create a customer before creating a loan.'}
            </Text>
          </View>
        )}

        <Field label="Jewellery type" value={form.jewellery_type} onChangeText={value => setField('jewellery_type', value)} placeholder="e.g. Necklace" required />
        <ChoiceChips
          label="Metal"
          value={form.metal_type}
          options={['Gold', 'Silver', 'Platinum', 'Diamond'].map(value => ({ value, label: value }))}
          onSelect={value => {
            setField('metal_type', value);
            setField('gold_purity', goldRates.find(rate => rate.metal_type === value)?.purity || '');
          }}
        />
        {matchingRates.length > 0 ? (
          <ChoiceChips
            label="Purity"
            value={form.gold_purity}
            options={matchingRates.map(rate => ({
              value: String(rate.purity),
              label: String(rate.purity),
            }))}
            onSelect={value => setField('gold_purity', value)}
          />
        ) : (
          <Field label="Purity" value={form.gold_purity} onChangeText={value => setField('gold_purity', value)} placeholder="e.g. 22K" required />
        )}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Gross weight (g)" value={form.gross_weight} onChangeText={value => setField('gross_weight', value)} keyboardType="decimal-pad" required />
          </View>
          <View className="flex-1">
            <Field label="Stone weight (g)" value={form.stone_weight} onChangeText={value => setField('stone_weight', value)} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Loan amount (₹)" value={form.principal_amount} onChangeText={value => setField('principal_amount', value)} keyboardType="decimal-pad" required />
        {enabledInterestTypes.length > 0 ? (
          <ChoiceChips
            label="Interest method"
            value={form.interest_type}
            options={enabledInterestTypes.map(type => ({
              value: type.type_key,
              label: type.label || type.name || type.type_key.replaceAll('_', ' '),
            }))}
            onSelect={value => setField('interest_type', value)}
          />
        ) : (
          <Text className="mb-4 text-sm text-[#A94760]">
            No enabled interest methods are available.
          </Text>
        )}
        <Field label="Interest rate (%)" value={form.interest_rate} onChangeText={value => setField('interest_rate', value)} keyboardType="decimal-pad" required={form.interest_type !== 'fixed'} />
        {form.interest_type === 'fixed' ? (
          <Field label="Fixed interest per period (₹)" value={form.fixed_interest_amount} onChangeText={value => setField('fixed_interest_amount', value)} keyboardType="decimal-pad" required />
        ) : null}
        <Field label="Loan date (YYYY-MM-DD)" value={form.loan_date} onChangeText={value => setField('loan_date', value)} required />
        <Field label="Maturity date (YYYY-MM-DD)" value={form.maturity_date} onChangeText={value => setField('maturity_date', value)} required />
        <SubmitButton label="Create Loan" loading={saving} onPress={saveLoan} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
