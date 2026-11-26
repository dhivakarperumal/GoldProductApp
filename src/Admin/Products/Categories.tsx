import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus, Search, Trash2 } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { CustomDropdown } from '../Loans/FormControls';
import CategoryForm from './CategoryForm';
import { inventoryError, mediaUrl, parseArray, type Category } from './inventory';

type Props = { onBack: () => void };

export default function Categories({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.get<Category[]>('/categories/manage');
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid category list.');
      }
      setCategories(response.data);
    } catch (requestError) {
      setError(inventoryError(requestError));
      if (__DEV__) console.warn('[Categories] Could not load categories:', requestError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = categories.filter(category => {
    const matchesText = `${category.name} ${category.catId}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = status === 'all' || category.status === status;
    return matchesText && matchesStatus;
  });

  const confirmDelete = (category: Category) => {
    showAlert('Delete category?', `Delete ${category.name}? Products assigned to this category may be affected.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${encodeURIComponent(category.catId)}`);
              await load();
              showAlert('Category deleted', `${category.name} was removed.`, { variant: 'success' });
            } catch (deleteError) {
              showAlert('Could not delete category', inventoryError(deleteError), { variant: 'error' });
            }
          },
        },
      ],
    });
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Categories" sectionLabel="Shop Inventory" onBack={onBack} />
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#07564B" /></View>
      ) : (
        <ScrollView
          contentContainerClassName="p-4 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#07564B" />}
          keyboardShouldPersistTaps="handled">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-[#173F35]">Manage Categories</Text>
              <Text className="mt-1 text-sm text-[#6B7E76]">{categories.length} categories</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setSelected(null); setFormVisible(true); }}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#07564B]">
              <Plus size={22} color="white" />
            </Pressable>
          </View>
          <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
            <Search size={17} color="#6B7E76" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search categories" placeholderTextColor="#9AA6A1" className="min-h-12 flex-1 px-2 text-sm text-[#173F35]" />
          </View>
          <CustomDropdown
            label="Status"
            value={status}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
            onSelect={setStatus}
          />
          {error ? <Text className="mb-3 rounded-xl bg-[#FFF1F0] p-3 text-sm text-[#B42332]">{error}</Text> : null}
          {visible.map(category => {
            const image = mediaUrl(parseArray(category.images)[0]);
            return (
              <Pressable
                key={category.catId}
                onPress={() => { setSelected(category); setFormVisible(true); }}
                className="mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-sm">
                {image ? (
                  <Image source={{ uri: image }} className="h-16 w-16 rounded-xl bg-[#F3F4F1]" />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#EAF3EF]">
                    <Text className="text-xs font-bold text-[#07564B]">Category</Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="font-extrabold text-[#173F35]">{category.name}</Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">
                    ID: {category.catId}
                    {typeof category.totalProducts === 'number'
                      ? ` · ${category.totalProducts} products`
                      : ''}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-[#07564B]">{parseArray(category.subcategory).length} subcategories · {category.status || 'Active'}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${category.name}`}
                  onPress={event => {
                    event.stopPropagation();
                    confirmDelete(category);
                  }}
                  className="p-2">
                  <Trash2 size={18} color="#B42332" />
                </Pressable>
              </Pressable>
            );
          })}
          {!error && visible.length === 0 ? (
            <View className="items-center rounded-2xl bg-white p-8">
              <Text className="font-bold text-[#173F35]">No categories found</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
      <CategoryForm
        visible={formVisible}
        category={selected}
        onClose={() => setFormVisible(false)}
        onSaved={() => {
          setFormVisible(false);
          load();
        }}
      />
    </View>
  );
}
