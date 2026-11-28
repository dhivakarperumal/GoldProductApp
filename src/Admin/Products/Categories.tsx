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
import {
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  X,
  XCircle,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { CustomDropdown } from '../Loans/FormControls';
import CategoryForm from './CategoryForm';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
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
  const activeCategories = categories.filter(
    category => (category.status || 'Active').toLowerCase() === 'active',
  ).length;
  const inactiveCategories = categories.filter(
    category => (category.status || 'Active').toLowerCase() === 'inactive',
  ).length;
  const subcategoryCount = categories.reduce(
    (total, category) => total + parseArray(category.subcategory).length,
    0,
  );

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
          contentContainerClassName="p-4 pb-24"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#07564B" />}
          keyboardShouldPersistTaps="handled">
          <DashboardMetricGrid
            metrics={[
              {
                id: 'categories-total',
                label: 'Total Categories',
                value: categories.length,
                icon: Shapes,
                palette: 'total_categories',
                trend: 'Product groups',
              },
              {
                id: 'categories-active',
                label: 'Active',
                value: activeCategories,
                icon: CheckCircle2,
                palette: 'total_customers',
                trend: 'Available categories',
              },
              {
                id: 'categories-inactive',
                label: 'Inactive',
                value: inactiveCategories,
                icon: XCircle,
                palette: 'low_stock_products',
                trend: 'Unavailable categories',
                trendUp: false,
              },
              {
                id: 'categories-subcategories',
                label: 'Subcategories',
                value: subcategoryCount,
                icon: Package,
                palette: 'gold_stock_value',
                trend: 'Across all categories',
              },
            ]}
          />
          <View className="mb-3 flex-row items-center rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm">
            <Search size={18} color="#A77B15" />
            <TextInput
              accessibilityLabel="Search categories"
              value={search}
              onChangeText={setSearch}
              placeholder="Search categories"
              placeholderTextColor="#9AA6A1"
              className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch('')}
                hitSlop={8}>
                <X size={18} color="#6B7E76" />
              </Pressable>
            ) : null}
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
                  accessibilityLabel={`Edit ${category.name}`}
                  onPress={event => {
                    event.stopPropagation();
                    setSelected(category);
                    setFormVisible(true);
                  }}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-xl border border-[#E8D596] bg-white">
                  <Pencil size={18} color="#07564B" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${category.name}`}
                  onPress={event => {
                    event.stopPropagation();
                    confirmDelete(category);
                  }}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-xl border border-[#E8D596] bg-white">
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add category"
        onPress={() => { setSelected(null); setFormVisible(true); }}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
        <Plus size={24} color="white" />
      </Pressable>
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
