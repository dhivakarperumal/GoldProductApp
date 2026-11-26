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
  TextInput,
  View,
} from 'react-native';
import { ImagePlus, Plus, X } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../Loans/FormControls';
import { inventoryError, mediaUrl, parseArray, type Category } from './inventory';

type Props = {
  visible: boolean;
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
};

type LocalImage = { uri: string; name: string; type: string; size?: number };

export default function CategoryForm({ visible, category, onClose, onSaved }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategoryDraft, setSubcategoryDraft] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<LocalImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(category?.name || '');
    setDescription(category?.description || '');
    setSubcategories(parseArray(category?.subcategory));
    setImages(parseArray(category?.images));
    setNewImages([]);
    setSubcategoryDraft('');
  }, [category, visible]);

  const addSubcategory = () => {
    const value = subcategoryDraft.trim();
    if (!value) return;
    if (subcategories.some(item => item.toLowerCase() === value.toLowerCase())) {
      showAlert('Already added', 'That subcategory is already in this category.');
      return;
    }
    setSubcategories(current => [...current, value]);
    setSubcategoryDraft('');
  };

  const chooseImages = async () => {
    const remaining = 20 - images.length - newImages.length;
    if (remaining <= 0) {
      showAlert('Image limit reached', 'A category can have up to 20 images.');
      return;
    }
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (response.didCancel) return;
    if (response.errorCode) {
      showAlert('Could not select images', response.errorMessage || 'Please try again.', {
        variant: 'error',
      });
      return;
    }
    const selected = (response.assets || []).filter((asset): asset is typeof asset & { uri: string } => !!asset.uri);
    const invalid = selected.find(asset =>
      (asset.fileSize || 0) > 5 * 1024 * 1024 ||
      (asset.type && !['image/png', 'image/jpeg', 'image/jpg'].includes(asset.type.toLowerCase())),
    );
    if (invalid) {
      showAlert('Invalid image', 'Choose PNG or JPG images that are 5 MB or smaller.', {
        variant: 'error',
      });
      return;
    }
    setNewImages(current => [
      ...current,
      ...selected.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `category-${Date.now()}-${index}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      })),
    ]);
  };

  const save = async () => {
    if (!name.trim()) {
      showAlert('Category name required', 'Enter a name before saving.', { variant: 'warning' });
      return;
    }
    if (subcategories.some(item => !item.trim())) {
      showAlert('Invalid subcategory', 'Remove empty subcategories before saving.', {
        variant: 'warning',
      });
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append('name', name.trim());
      body.append('description', description.trim());
      body.append('subcategory', JSON.stringify(subcategories));
      body.append('images', JSON.stringify(images));
      newImages.forEach(image => {
        body.append('images', {
          uri: image.uri,
          name: image.name,
          type: image.type,
        });
      });
      if (category?.catId) {
        await api.put(`/categories/${encodeURIComponent(category.catId)}`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/categories', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      showAlert('Category saved', `${name.trim()} was saved successfully.`, { variant: 'success' });
      onSaved();
    } catch (error) {
      showAlert('Could not save category', inventoryError(error), { variant: 'error' });
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
            <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">
              Shop Inventory
            </Text>
            <Text className="mt-1 text-lg font-extrabold text-white">
              {category ? 'Edit Category' : 'Add Category'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close category form" onPress={onClose}>
            <X size={22} color="#EAD78A" />
          </Pressable>
        </View>
        <ScrollView
          contentContainerClassName="p-[18px] pb-10"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="mb-3 text-base font-extrabold text-[#173F35]">Category information</Text>
            {category?.catId ? (
              <Field label="Category ID" value={category.catId} onChangeText={() => {}} readOnly />
            ) : null}
            <Field label="Category name" value={name} onChangeText={setName} required />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Describe this category"
            />
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
              Subcategories
            </Text>
            <View className="mb-3 flex-row gap-2">
              <TextInput
                accessibilityLabel="Subcategory name"
                value={subcategoryDraft}
                onChangeText={setSubcategoryDraft}
                placeholder="Add subcategory"
                placeholderTextColor="#9AA6A1"
                onSubmitEditing={addSubcategory}
                returnKeyType="done"
                className="min-h-12 flex-1 rounded-xl border border-[#E6E9E3] bg-white px-3 text-sm text-[#173F35]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add subcategory"
                onPress={addSubcategory}
                className="h-12 w-12 items-center justify-center rounded-xl bg-[#07564B]">
                <Plus size={20} color="white" />
              </Pressable>
            </View>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {subcategories.map((item, index) => (
                <Pressable
                  key={`${item}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item}`}
                  onPress={() => setSubcategories(current => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="flex-row items-center gap-1 rounded-full bg-[#EAF3EF] px-3 py-2">
                  <Text className="text-xs font-bold text-[#07564B]">{item}</Text>
                  <X size={13} color="#07564B" />
                </Pressable>
              ))}
            </View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
              Category images (up to 20)
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {images.map((image, index) => (
                <View key={`${image}-${index}`} className="relative">
                  <Image source={{ uri: mediaUrl(image) }} className="h-20 w-20 rounded-xl bg-[#F3F4F1]" />
                  <Pressable
                    accessibilityLabel="Remove category image"
                    onPress={() => setImages(current => current.filter((_, imageIndex) => imageIndex !== index))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1">
                    <X size={13} color="white" />
                  </Pressable>
                </View>
              ))}
              {newImages.map((image, index) => (
                <View key={`${image.uri}-${index}`} className="relative">
                  <Image source={{ uri: image.uri }} className="h-20 w-20 rounded-xl bg-[#F3F4F1]" />
                  <Pressable
                    accessibilityLabel="Remove selected image"
                    onPress={() => setNewImages(current => current.filter((_, imageIndex) => imageIndex !== index))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1">
                    <X size={13} color="white" />
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable onPress={chooseImages} className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BB6AA]">
              <ImagePlus size={18} color="#07564B" />
              <Text className="font-bold text-[#07564B]">Choose images</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            className="min-h-12 items-center justify-center rounded-xl bg-[#07564B]">
            {saving ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Save Category</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
