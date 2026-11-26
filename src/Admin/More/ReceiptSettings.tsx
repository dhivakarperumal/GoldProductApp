import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ImagePlus, RotateCcw, Save, Trash2 } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { Field } from '../Loans/FormControls';
import { inventoryError, mediaUrl } from '../Products/inventory';

type Props = { onBack: () => void };
type ReceiptSettingsData = {
  shopName: string;
  logoUrl: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  footerMessage: string;
};

const DEFAULT_SETTINGS: ReceiptSettingsData = {
  shopName: 'Sri Golds',
  logoUrl: '/images/logo.png',
  address: 'Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India',
  gstNumber: '',
  phone: '',
  email: '',
  footerMessage: 'Thank you for choosing us. We value your trust and look forward to serving you again.',
};

const SETTINGS_FIELDS: Array<{
  key: keyof Omit<ReceiptSettingsData, 'logoUrl'>;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  maxLength: number;
}> = [
  { key: 'shopName', label: 'Shop Name', placeholder: 'Sri Golds', maxLength: 120 },
  { key: 'address', label: 'Shop Address', placeholder: 'Address printed on receipts', multiline: true, maxLength: 2000 },
  { key: 'gstNumber', label: 'GST Number', placeholder: 'Enter GSTIN', maxLength: 100 },
  { key: 'phone', label: 'Contact Phone', placeholder: 'Enter shop phone number', keyboardType: 'phone-pad', maxLength: 50 },
  { key: 'email', label: 'Contact Email', placeholder: 'Enter shop email', keyboardType: 'email-address', maxLength: 254 },
  { key: 'footerMessage', label: 'Receipt Footer Message', placeholder: 'Thank you for shopping with us', multiline: true, maxLength: 1000 },
];

function isReceiptSettings(value: unknown): value is ReceiptSettingsData {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    ['shopName', 'logoUrl', 'address', 'gstNumber', 'phone', 'email', 'footerMessage']
      .every(key => typeof (value as Record<string, unknown>)[key] === 'string');
}

export default function ReceiptSettings({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const [settings, setSettings] = useState<ReceiptSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<unknown>('/receipt-settings');
      if (!isReceiptSettings(response.data)) {
        throw new Error('The server returned invalid receipt settings.');
      }
      setSettings({ ...DEFAULT_SETTINGS, ...response.data });
    } catch (error) {
      setLoadError(inventoryError(error));
      if (__DEV__) console.warn('[ReceiptSettings] Could not load receipt settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setField = (key: keyof ReceiptSettingsData, value: string) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  const uploadLogo = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.85,
    });
    if (response.didCancel) return;
    if (response.errorCode) {
      showAlert('Could not select logo', response.errorMessage || 'Please try again.', { variant: 'error' });
      return;
    }
    const asset = response.assets?.[0];
    if (!asset?.base64) {
      showAlert('Could not read logo', 'Choose another image and try again.', { variant: 'error' });
      return;
    }
    if ((asset.fileSize || 0) > 1024 * 1024) {
      showAlert('Logo is too large', 'Choose a PNG, JPG, or WebP logo no larger than 1 MB.', { variant: 'warning' });
      return;
    }
    const mimeType = asset.type?.toLowerCase();
    if (!mimeType || !['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
      showAlert('Unsupported logo', 'Choose a PNG, JPG, or WebP image.', { variant: 'warning' });
      return;
    }
    setField('logoUrl', `data:${mimeType};base64,${asset.base64}`);
  };

  const saveSettings = async () => {
    if (saving) return;
    if (!settings.shopName.trim()) {
      showAlert('Shop name required', 'Enter a shop name before saving receipt settings.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [key, value.trim()]),
      );
      const response = await api.put<unknown>('/receipt-settings', payload);
      if (!isReceiptSettings(response.data)) {
        throw new Error('The server returned invalid receipt settings.');
      }
      setSettings({ ...DEFAULT_SETTINGS, ...response.data });
      showAlert('Receipt settings saved', 'The updated details will be used on printed receipts.', { variant: 'success' });
    } catch (error) {
      showAlert('Could not save receipt settings', inventoryError(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    if (saving || loading) return;
    showAlert('Restore default receipt settings?', 'This replaces the current logo, shop details, and footer.', {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const response = await api.put<unknown>('/receipt-settings', DEFAULT_SETTINGS);
              if (!isReceiptSettings(response.data)) {
                throw new Error('The server returned invalid receipt settings.');
              }
              setSettings({ ...DEFAULT_SETTINGS, ...response.data });
              showAlert('Defaults restored', 'Default receipt settings have been saved.', { variant: 'success' });
            } catch (error) {
              showAlert('Could not restore defaults', inventoryError(error), { variant: 'error' });
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    });
  };

  const logoUri = settings.logoUrl.startsWith('data:') || /^https?:\/\//i.test(settings.logoUrl)
    ? settings.logoUrl
    : mediaUrl(settings.logoUrl);

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Receipt Settings" sectionLabel="More · Settings" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSettings();
            }}
            tintColor="#07564B"
          />
        }>
        <View className="mb-4 rounded-2xl bg-[#07564B] p-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">Print preferences</Text>
          <Text className="mt-1 text-xl font-extrabold text-white">Receipt Settings</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCE8E4]">
            Set the shop logo, name, contact details, address, and footer shown on printed bills.
          </Text>
        </View>

        {loadError ? (
          <View className="mb-4 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm leading-5 text-[#B42332]">{loadError}</Text>
            <Pressable onPress={loadSettings} className="mt-2 self-start">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="mb-3 text-base font-extrabold text-[#173F35]">Shop Logo</Text>
          <View className="mb-4 min-h-28 flex-row items-center gap-4 rounded-xl border border-dashed border-[#9BB6AA] bg-[#F8FAF8] p-3">
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                resizeMode="contain"
                className="h-20 w-24 rounded-lg bg-white"
              />
            ) : (
              <View className="h-20 w-24 items-center justify-center rounded-lg bg-white">
                <ImagePlus size={28} color="#AAB8B2" />
              </View>
            )}
            <View className="flex-1">
              <Pressable
                accessibilityRole="button"
                disabled={loading || saving}
                onPress={uploadLogo}
                className="mb-2 self-start flex-row items-center gap-2 rounded-lg bg-[#07564B] px-3 py-2.5 disabled:opacity-50">
                <ImagePlus size={16} color="white" />
                <Text className="text-xs font-bold text-white">Upload Logo</Text>
              </Pressable>
              {settings.logoUrl ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loading || saving}
                  onPress={() => setField('logoUrl', '')}
                  className="self-start flex-row items-center gap-1">
                  <Trash2 size={14} color="#B42332" />
                  <Text className="text-xs font-semibold text-[#B42332]">Remove</Text>
                </Pressable>
              ) : null}
              <Text className="mt-2 text-[10px] leading-4 text-[#6B7E76]">PNG, JPG, or WebP · maximum 1 MB.</Text>
            </View>
          </View>

          {SETTINGS_FIELDS.map(field => (
            <Field
              key={field.key}
              label={field.label}
              value={settings[field.key]}
              onChangeText={value => setField(field.key, value.slice(0, field.maxLength))}
              placeholder={field.placeholder}
              keyboardType={field.keyboardType || 'default'}
              multiline={field.multiline}
              autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
              required={field.key === 'shopName'}
            />
          ))}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={loading || saving}
              onPress={restoreDefaults}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#E6E9E3] bg-white disabled:opacity-50">
              <RotateCcw size={16} color="#52645F" />
              <Text className="text-xs font-bold text-[#52645F]">Restore Defaults</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading || saving}
              onPress={saveSettings}
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#07564B] px-4 py-3 disabled:opacity-50">
              {saving ? <ActivityIndicator color="white" /> : <Save size={16} color="white" />}
              <Text className="text-sm font-extrabold text-white">
                {loading ? 'Loading...' : saving ? 'Saving...' : 'Save Settings'}
              </Text>
            </Pressable>
          </View>
          {loading ? <ActivityIndicator className="mt-3" color="#07564B" /> : null}
        </View>

        <View className="rounded-2xl border border-[#E6E9E3] bg-white p-4">
          <Text className="text-lg font-extrabold text-[#173F35]">Receipt Preview</Text>
          <Text className="mb-4 mt-1 text-xs leading-5 text-[#6B7E76]">
            Preview updates as you edit. Example customer, items, and amounts are illustrative.
          </Text>
          <View className="items-center border-b border-[#E6E9E3] pb-4">
            {logoUri ? (
              <Image source={{ uri: logoUri }} resizeMode="contain" className="mb-2 h-16 w-24" />
            ) : null}
            <Text className="text-center text-xl font-extrabold text-[#07564B]">
              {settings.shopName || 'Shop Name'}
            </Text>
            {settings.address ? <Text className="mt-1 text-center text-xs leading-4 text-[#52645F]">{settings.address}</Text> : null}
            {settings.gstNumber ? <Text className="mt-1 text-xs text-[#52645F]">GSTIN: {settings.gstNumber}</Text> : null}
            <Text className="mt-1 text-center text-xs text-[#52645F]">
              {settings.phone ? `Phone: ${settings.phone}` : ''}
              {settings.phone && settings.email ? ' · ' : ''}
              {settings.email ? `Email: ${settings.email}` : ''}
            </Text>
          </View>
          <View className="my-3 flex-row justify-between border-b border-[#E6E9E3] pb-3">
            <View>
              <Text className="text-[10px] text-[#6B7E76]">Invoice No</Text>
              <Text className="mt-1 text-xs font-bold text-[#173F35]">BILL-20261126-DEMO</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-[#6B7E76]">Date: {new Date().toLocaleDateString('en-IN')}</Text>
              <Text className="mt-1 text-[10px] text-[#6B7E76]">Payment: Full Payment</Text>
            </View>
          </View>
          <Text className="mb-2 text-sm font-bold text-[#173F35]">Customer</Text>
          <Text className="text-xs text-[#52645F]">Sample Customer · Customer contact details</Text>
          <View className="my-3 rounded-xl border border-[#E6E9E3]">
            <View className="flex-row bg-[#F3F4F1] p-2">
              <Text className="flex-[2] text-[10px] font-bold text-[#52645F]">ITEM</Text>
              <Text className="flex-1 text-right text-[10px] font-bold text-[#52645F]">WEIGHT</Text>
              <Text className="flex-1 text-right text-[10px] font-bold text-[#52645F]">AMOUNT</Text>
            </View>
            <View className="flex-row border-t border-[#E6E9E3] p-2">
              <Text className="flex-[2] text-xs text-[#173F35]">Gold Necklace · 22K</Text>
              <Text className="flex-1 text-right text-xs text-[#173F35]">10 g</Text>
              <Text className="flex-1 text-right text-xs text-[#173F35]">₹85,000</Text>
            </View>
            <View className="flex-row border-t border-[#E6E9E3] p-2">
              <Text className="flex-[2] text-xs text-[#B42332]">Exchange Gold · 22K</Text>
              <Text className="flex-1 text-right text-xs text-[#B42332]">10 g</Text>
              <Text className="flex-1 text-right text-xs text-[#B42332]">−₹20,000</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-[#52645F]">Sub-total ₹85,000 · Exchange −₹20,000</Text>
            <Text className="mt-1 text-xs text-[#52645F]">GST ₹1,950</Text>
            <Text className="mt-2 text-base font-extrabold text-[#173F35]">Total ₹66,950</Text>
          </View>
          <Text className="mt-5 border-t border-[#E6E9E3] pt-3 text-center text-xs font-semibold text-[#52645F]">
            {settings.footerMessage}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
