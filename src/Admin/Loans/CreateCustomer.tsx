import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import {
  ChoiceChips,
  CustomDropdown,
  DatePicker,
  Field,
  SubmitButton,
  errorMessage,
} from './FormControls';
import { INDIAN_STATES_AND_UTS } from './loanOptions';

type CustomerForm = {
  full_name: string;
  mobile: string;
  email: string;
  gender: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  alternate_mobile: string;
  date_of_birth: string;
  guarantor_name: string;
  guarantor_mobile: string;
  guarantor_relationship: string;
  guarantor_address: string;
  notes: string;
  kyc_status: string;
};

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'voter_id', label: 'Voter ID Card' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'passport', label: 'Passport' },
  { value: 'ration_card', label: 'Ration Card' },
  { value: 'other', label: 'Other Government ID' },
];

type CreateCustomerProps = {
  onBack: () => void;
  onCreated: () => void;
};

function emptyCustomer(): CustomerForm {
  return {
    full_name: '',
    mobile: '',
    email: '',
    gender: '',
    address: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    alternate_mobile: '',
    date_of_birth: '',
    guarantor_name: '',
    guarantor_mobile: '',
    guarantor_relationship: '',
    guarantor_address: '',
    notes: '',
    kyc_status: 'Pending',
  };
}

export default function CreateCustomer({ onBack, onCreated }: CreateCustomerProps) {
  const { showAlert } = useCustomAlert();
  const [form, setForm] = useState<CustomerForm>(emptyCustomer);
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentImages, setDocumentImages] = useState<Record<string, PickedImage | null>>({
    front: null,
    back: null,
  });
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const setField = (field: keyof CustomerForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const pickImage = async (side: 'photo' | 'front' | 'back', camera = false) => {
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
      const image = {
        uri: asset.uri,
        name: asset.fileName || `customer-photo.${type === 'image/png' ? 'png' : 'jpg'}`,
        type,
      };
      if (side === 'photo') {
        setPhoto(image);
        setPhotoUrl('');
      } else {
        setDocumentImages(current => ({ ...current, [side]: image }));
      }
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
    if (documentType && (!documentImages.front || !documentImages.back)) {
      showAlert('KYC documents incomplete', 'Choose both the front and back of the selected document.', { variant: 'warning' });
      return;
    }

    setSaving(true);
    let customerSaved = false;
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
        kyc_status: form.kyc_status,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Customer could not be saved.');
      }
      customerSaved = true;
      const customerId = response.data?.id;
      if (documentType && customerId) {
        for (const side of ['front', 'back'] as const) {
          const image = documentImages[side];
          if (!image) continue;
          const documentData = new FormData();
          documentData.append('document_type', documentType);
          documentData.append('document_side', side);
          documentData.append('documents', image);
          await api.post(`/loan-customers/${customerId}/documents`, documentData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      showAlert(
        customerSaved ? 'Customer created' : 'Customer saved',
        `${form.full_name} was added successfully.`,
        { variant: 'success', buttons: [{ text: 'Done', onPress: onCreated }] },
      );
    } catch (error) {
      if (__DEV__) console.warn('[Loans] Could not create customer:', error);
      showAlert(
        customerSaved ? 'Customer saved, KYC upload failed' : 'Could not create customer',
        customerSaved
          ? `Customer was created, but a KYC document could not be uploaded: ${errorMessage(error)}`
          : errorMessage(error),
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <InnerHeader title="Create Customer" onBack={onBack} />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 20 }}
        automaticallyAdjustKeyboardInsets>
        <Text className="mb-4 text-sm leading-5 text-[#6B7280]">
          Add the borrower’s contact, address, guarantor, and photo details.
        </Text>
        <Field label="Full name" value={form.full_name} onChangeText={value => setField('full_name', value)} required />
        <Field label="Mobile" value={form.mobile} onChangeText={value => setField('mobile', value)} keyboardType="phone-pad" required />
        <Field label="Alternate mobile" value={form.alternate_mobile} onChangeText={value => setField('alternate_mobile', value)} keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChangeText={value => setField('email', value)} keyboardType="email-address" autoCapitalize="none" required />
        <Field label="Password (defaults to mobile)" value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="Leave blank to use mobile number" />
        <DatePicker
          label="Date of birth"
          value={form.date_of_birth}
          onChange={value => setField('date_of_birth', value)}
        />
        <ChoiceChips
          label="Gender"
          value={form.gender}
          options={['Male', 'Female', 'Other'].map(value => ({ value, label: value }))}
          onSelect={value => setField('gender', value)}
        />
        <Field label="Residential address" value={form.address} onChangeText={value => setField('address', value)} multiline required />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="City / Town" value={form.city} onChangeText={value => setField('city', value)} required />
          </View>
          <View className="flex-1">
            <Field label="District" value={form.district} onChangeText={value => setField('district', value)} required />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <CustomDropdown
              label="State"
              value={form.state}
              options={INDIAN_STATES_AND_UTS.map(state => ({ value: state, label: state }))}
              onSelect={value => setField('state', value)}
              placeholder="Select state"
              required
            />
          </View>
          <View className="flex-1">
            <Field label="PIN Code" value={form.pincode} onChangeText={value => setField('pincode', value)} keyboardType="numeric" required />
          </View>
        </View>
        <Text className="mb-3 mt-1 text-sm font-extrabold text-[#173F35]">
          Guarantor details
        </Text>
        <Field label="Guarantor name" value={form.guarantor_name} onChangeText={value => setField('guarantor_name', value)} required />
        <Field label="Guarantor mobile" value={form.guarantor_mobile} onChangeText={value => setField('guarantor_mobile', value)} keyboardType="phone-pad" required />
        <Field label="Relationship" value={form.guarantor_relationship} onChangeText={value => setField('guarantor_relationship', value)} required />
        <Field label="Guarantor address" value={form.guarantor_address} onChangeText={value => setField('guarantor_address', value)} multiline />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose customer photo"
          onPress={() => pickImage('photo')}
          className="mb-5 min-h-14 flex-row items-center justify-center rounded-xl border border-dashed border-[#A7BDB4] bg-white px-4 py-3">
          {photo ? <Image source={{ uri: photo.uri }} className="mr-3 h-12 w-12 rounded-lg" /> : null}
          <Text className="text-sm font-bold text-[#07564B]">
            {photo ? 'Change customer photo' : 'Choose customer photo *'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickImage('photo', true)}
          className="mb-5 min-h-12 items-center justify-center rounded-xl border border-[#A7BDB4] bg-white px-4 py-3">
          <Text className="text-sm font-bold text-[#07564B]">Take Photo</Text>
        </Pressable>
        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="text-sm font-extrabold text-[#173F35]">KYC Documents</Text>
          <Text className="mb-3 mt-1 text-xs leading-5 text-[#6B7280]">
            Select a document type and upload both sides as images.
          </Text>
          <CustomDropdown
            label="Document type"
            value={documentType}
            options={DOCUMENT_TYPES}
            onSelect={setDocumentType}
            placeholder="Select document type"
            required
          />
          {documentType ? (
            <View className="flex-row gap-3">
              {(['front', 'back'] as const).map(side => (
                <Pressable
                  key={side}
                  accessibilityRole="button"
                  onPress={() => pickImage(side)}
                  className="min-h-20 flex-1 items-center justify-center rounded-xl border border-dashed border-[#A7BDB4] px-2 py-3">
                  <Text className="text-xs font-bold uppercase text-[#52645F]">{side} side</Text>
                  <Text numberOfLines={1} className="mt-2 text-xs text-[#07564B]">
                    {documentImages[side]?.name || 'Choose image'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <Field label="Internal notes" value={form.notes} onChangeText={value => setField('notes', value)} multiline />
        <CustomDropdown
          label="KYC status"
          value={form.kyc_status}
          options={['Pending', 'Verified', 'Rejected'].map(value => ({ value, label: value }))}
          onSelect={value => setField('kyc_status', value)}
          required
        />
      </ScrollView>
      <View className="border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 py-3">
        <SubmitButton
          label="Create Customer"
          loading={saving}
          onPress={saveCustomer}
          compact
        />
      </View>
    </KeyboardAvoidingView>
  );
}
