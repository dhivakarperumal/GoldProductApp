import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { Field, FormHeader, ChoiceChips, SubmitButton, errorMessage } from './FormControls';

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

type CustomerPhoto = {
  uri: string;
  name: string;
  type: string;
};

type CreateCustomerProps = {
  onBack: () => void;
  onCreated: () => void;
};

function emptyCustomer(): CustomerForm {
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

export default function CreateCustomer({ onBack, onCreated }: CreateCustomerProps) {
  const { showAlert } = useCustomAlert();
  const [form, setForm] = useState<CustomerForm>(emptyCustomer);
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<CustomerPhoto | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof CustomerForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const choosePhoto = async () => {
    try {
      const { launchImageLibrary } = await import('react-native-image-picker');
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
        showAlert('Photo unavailable', 'Choose a JPG or PNG image and try again.', { variant: 'error' });
        return;
      }
      const type = asset.type || 'image/jpeg';
      if (!['image/jpeg', 'image/png'].includes(type)) {
        showAlert('Unsupported photo', 'Customer photos must be JPG or PNG.', { variant: 'warning' });
        return;
      }
      setPhoto({
        uri: asset.uri,
        name: asset.fileName || `customer-photo.${type === 'image/png' ? 'png' : 'jpg'}`,
        type,
      });
      setPhotoUrl('');
    } catch (error) {
      showAlert('Photo unavailable', errorMessage(error), { variant: 'error' });
    }
  };

  const saveCustomer = async () => {
    const requiredValues = [
      form.full_name,
      form.mobile,
      form.email,
      form.gender,
      form.address,
      form.city,
      form.district,
      form.state,
      form.pincode,
      form.guarantor_name,
      form.guarantor_mobile,
      form.guarantor_relationship,
    ];
    if (requiredValues.some(value => !value.trim())) {
      showAlert('Required information', 'Complete all fields marked with *.', { variant: 'warning' });
      return;
    }
    const customerPassword = password.trim() || form.mobile.trim();
    if (customerPassword.length < 8) {
      showAlert(
        'Password too short',
        'Enter a password with at least 8 characters. By default, the customer mobile number is used.',
        { variant: 'warning' },
      );
      return;
    }
    if (!photoUrl && !photo) {
      showAlert('Customer photo required', 'Choose a JPG or PNG customer photo.', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      let savedPhotoUrl = photoUrl;
      if (!savedPhotoUrl && photo) {
        const photoData = new FormData();
        photoData.append('photo', photo);
        const uploadResponse = await api.post('/loan-customers/photos', photoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedPhotoUrl = uploadResponse.data?.photo_url;
        if (typeof savedPhotoUrl !== 'string' || !savedPhotoUrl) {
          throw new Error('The server did not return the uploaded photo reference.');
        }
        setPhotoUrl(savedPhotoUrl);
      }

      const response = await api.post('/loan-customers', {
        ...form,
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        password: customerPassword,
        photo_url: savedPhotoUrl,
        kyc_status: 'Pending',
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Customer could not be saved.');
      }
      showAlert('Customer created', `${form.full_name} was added successfully.`, {
        variant: 'success',
        buttons: [{ text: 'Done', onPress: onCreated }],
      });
    } catch (error) {
      if (__DEV__) console.warn('[Loans] Could not create customer:', error);
      showAlert('Could not create customer', errorMessage(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FormHeader title="Create Customer" onBack={onBack} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-8">
        <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
          Add the borrower’s contact, address, guarantor, and photo details.
        </Text>
        <ChoiceChips
          label="Customer type"
          value={form.customer_type}
          options={[
            { value: 'Individual', label: 'Individual' },
            { value: 'Business', label: 'Business' },
          ]}
          onSelect={value => setField('customer_type', value)}
        />
        <Field label="Full name" value={form.full_name} onChangeText={value => setField('full_name', value)} required />
        <Field label="Mobile" value={form.mobile} onChangeText={value => setField('mobile', value)} keyboardType="phone-pad" required />
        <Field label="Email" value={form.email} onChangeText={value => setField('email', value)} keyboardType="email-address" autoCapitalize="none" required />
        <Field label="Password (defaults to mobile)" value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="Leave blank to use mobile number" />
        <ChoiceChips
          label="Gender"
          value={form.gender}
          options={['Male', 'Female', 'Other'].map(value => ({ value, label: value }))}
          onSelect={value => setField('gender', value)}
        />
        <Field label="Occupation" value={form.occupation} onChangeText={value => setField('occupation', value)} />
        <Field label="Address" value={form.address} onChangeText={value => setField('address', value)} multiline required />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="City" value={form.city} onChangeText={value => setField('city', value)} required />
          </View>
          <View className="flex-1">
            <Field label="District" value={form.district} onChangeText={value => setField('district', value)} required />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="State" value={form.state} onChangeText={value => setField('state', value)} required />
          </View>
          <View className="flex-1">
            <Field label="Pincode" value={form.pincode} onChangeText={value => setField('pincode', value)} keyboardType="numeric" required />
          </View>
        </View>
        <Text className="mb-3 mt-1 text-sm font-extrabold text-[#173F35]">
          Guarantor details
        </Text>
        <Field label="Guarantor name" value={form.guarantor_name} onChangeText={value => setField('guarantor_name', value)} required />
        <Field label="Guarantor mobile" value={form.guarantor_mobile} onChangeText={value => setField('guarantor_mobile', value)} keyboardType="phone-pad" required />
        <Field label="Relationship" value={form.guarantor_relationship} onChangeText={value => setField('guarantor_relationship', value)} required />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose customer photo"
          onPress={choosePhoto}
          className="mb-5 min-h-14 flex-row items-center justify-center rounded-xl border border-dashed border-[#A7BDB4] bg-white px-4 py-3">
          {photo ? <Image source={{ uri: photo.uri }} className="mr-3 h-12 w-12 rounded-lg" /> : null}
          <Text className="text-sm font-bold text-[#07564B]">
            {photo ? 'Change customer photo' : 'Choose customer photo *'}
          </Text>
        </Pressable>
        <SubmitButton label="Create Customer" loading={saving} onPress={saveCustomer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
