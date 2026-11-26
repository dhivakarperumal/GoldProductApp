import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ImagePlus, X } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomDropdown, Field } from '../Loans/FormControls';
import { inventoryError, mediaUrl, type Metal } from './inventory';

type Props = {
  visible: boolean;
  metal?: Metal | null;
  onClose: () => void;
  onSaved: () => void;
};

type LocalImage = { uri: string; name: string; type: string; size?: number };

export default function MetalForm({ visible, metal, onClose, onSaved }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [purity, setPurity] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [image, setImage] = useState('');
  const [newImage, setNewImage] = useState<LocalImage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(metal?.name || '');
    setPurity(metal?.purity || '');
    setDescription(metal?.description || '');
    setStatus(metal?.status || 'Active');
    setImage(metal?.image || '');
    setNewImage(null);
  }, [metal, visible]);

  const chooseImage = async () => {
    const response = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
    if (response.didCancel) return;
    if (response.errorCode) {
      showAlert('Could not select image', response.errorMessage || 'Please try again.', { variant: 'error' });
      return;
    }
    const asset = response.assets?.[0];
    if (!asset?.uri) return;
    if ((asset.fileSize || 0) > 5 * 1024 * 1024) {
      showAlert('Image is too large', 'Choose a PNG or JPG image no larger than 5 MB.', { variant: 'error' });
      return;
    }
    if (asset.type && !['image/png', 'image/jpeg', 'image/jpg'].includes(asset.type.toLowerCase())) {
      showAlert('Unsupported image', 'Choose a PNG or JPG image.', { variant: 'error' });
      return;
    }
    setNewImage({
      uri: asset.uri,
      name: asset.fileName || `metal-${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
      size: asset.fileSize,
    });
  };

  const save = async () => {
    if (!name.trim()) {
      showAlert('Metal name required', 'Enter a name before saving.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      let imagePath = image;
      if (newImage) {
        const body = new FormData();
        body.append('image', {
          uri: newImage.uri,
          name: newImage.name,
          type: newImage.type,
        });
        const upload = await api.post<{ image: string }>('/metals/images', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (!upload.data?.image) throw new Error('The server did not return the uploaded image path.');
        imagePath = upload.data.image;
      }
      const payload = {
        name: name.trim(),
        purity: purity.trim(),
        description: description.trim(),
        image: imagePath,
        status,
      };
      if (metal?.id) {
        await api.put(`/metals/${metal.id}`, payload);
      } else {
        await api.post('/metals', payload);
      }
      showAlert('Metal saved', `${name.trim()} was saved successfully.`, { variant: 'success' });
      onSaved();
    } catch (error) {
      showAlert('Could not save metal', inventoryError(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-[#F8F7F2]"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + 10 }} className="flex-row items-center justify-between bg-[#173F35] px-5 pb-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">Shop Inventory</Text>
            <Text className="mt-1 text-lg font-extrabold text-white">{metal ? 'Edit Metal' : 'Add Metal'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close metal form" onPress={onClose}>
            <X size={22} color="#EAD78A" />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-3 text-base font-extrabold text-[#173F35]">Metal information</Text>
            <Field label="Metal name" value={name} onChangeText={setName} required />
            <Field label="Purity" value={purity} onChangeText={setPurity} placeholder="e.g. 22K or 925" />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <CustomDropdown
              label="Status"
              value={status}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              onSelect={setStatus}
              required
            />
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">Metal image</Text>
            {newImage || image ? (
              <View className="mb-3 relative self-start">
                <Image source={{ uri: newImage?.uri || mediaUrl(image) }} className="h-28 w-28 rounded-xl bg-[#F3F4F1]" />
                <Pressable
                  accessibilityLabel="Remove metal image"
                  onPress={() => { setImage(''); setNewImage(null); }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1">
                  <X size={14} color="white" />
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={chooseImage} className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BB6AA]">
              <ImagePlus size={18} color="#07564B" />
              <Text className="font-bold text-[#07564B]">{newImage || image ? 'Change image' : 'Choose image'}</Text>
            </Pressable>
          </View>
          <Pressable disabled={saving} onPress={save} className="min-h-12 items-center justify-center rounded-xl bg-[#07564B]">
            {saving ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Save Metal</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
