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
  Gem,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  XCircle,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { CustomDropdown } from '../Loans/FormControls';
import MetalForm from './MetalForm';
import InventoryMetricGrid from './InventoryMetricGrid';
import { inventoryError, mediaUrl, type Metal } from './inventory';

type Props = { onBack: () => void };

export default function Metals({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const [metals, setMetals] = useState<Metal[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Metal | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.get<Metal[]>('/metals/manage');
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid metal list.');
      }
      setMetals(response.data);
    } catch (requestError) {
      setError(inventoryError(requestError));
      if (__DEV__) console.warn('[Metals] Could not load metals:', requestError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = metals.filter(metal => {
    const matchesText = `${metal.name} ${metal.purity || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = status === 'all' || metal.status === status;
    return matchesText && matchesStatus;
  });
  const activeMetals = metals.filter(
    metal => (metal.status || 'Active').toLowerCase() === 'active',
  ).length;
  const inactiveMetals = metals.filter(
    metal => (metal.status || 'Active').toLowerCase() === 'inactive',
  ).length;
  const purityGrades = new Set(
    metals
      .map(metal => metal.purity?.trim())
      .filter((purity): purity is string => Boolean(purity)),
  ).size;

  const confirmDelete = (metal: Metal) => {
    showAlert('Delete metal?', `Delete ${metal.name}? Products using it may be affected.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/metals/${metal.id}`);
              await load();
              showAlert('Metal deleted', `${metal.name} was removed.`, { variant: 'success' });
            } catch (deleteError) {
              showAlert('Could not delete metal', inventoryError(deleteError), { variant: 'error' });
            }
          },
        },
      ],
    });
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader title="Metals" sectionLabel="Shop Inventory" onBack={onBack} />
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#07564B" /></View>
      ) : (
        <ScrollView
          contentContainerClassName="p-4 pb-24"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#07564B" />}
          keyboardShouldPersistTaps="handled">
          <InventoryMetricGrid
            metrics={[
              {
                id: 'metals-total',
                label: 'Total Metals',
                value: metals.length,
                icon: Gem,
                palette: 'total_products',
                trend: 'Metal types',
              },
              {
                id: 'metals-active',
                label: 'Active',
                value: activeMetals,
                icon: CheckCircle2,
                palette: 'total_customers',
                trend: 'Available metals',
              },
              {
                id: 'metals-inactive',
                label: 'Inactive',
                value: inactiveMetals,
                icon: XCircle,
                palette: 'low_stock_products',
                trend: 'Unavailable metals',
                trendUp: false,
              },
              {
                id: 'metals-purities',
                label: 'Purity Grades',
                value: purityGrades,
                icon: Shapes,
                palette: 'gold_stock_value',
                trend: 'Unique purity values',
              },
            ]}
          />
          <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
            <Search size={17} color="#6B7E76" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search metals or purity" placeholderTextColor="#9AA6A1" className="min-h-12 flex-1 px-2 text-sm text-[#173F35]" />
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
          {visible.map(metal => (
            <Pressable
              key={String(metal.id)}
              onPress={() => { setSelected(metal); setFormVisible(true); }}
              className="mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-sm">
              {metal.image ? (
                <Image source={{ uri: mediaUrl(metal.image) }} className="h-16 w-16 rounded-xl bg-[#F3F4F1]" />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#EAF3EF]">
                  <Text className="text-xs font-bold text-[#07564B]">Metal</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="font-extrabold text-[#173F35]">{metal.name}</Text>
                <Text className="mt-1 text-xs text-[#6B7E76]">{metal.purity || 'Purity not set'}</Text>
                <Text className="mt-1 text-xs font-semibold text-[#07564B]">{metal.status || 'Active'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${metal.name}`}
                onPress={event => {
                  event.stopPropagation();
                  setSelected(metal);
                  setFormVisible(true);
                }}
                className="p-2">
                <Pencil size={18} color="#07564B" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${metal.name}`}
                onPress={event => {
                  event.stopPropagation();
                  confirmDelete(metal);
                }}
                className="p-2">
                <Trash2 size={18} color="#B42332" />
              </Pressable>
            </Pressable>
          ))}
          {!error && visible.length === 0 ? (
            <View className="items-center rounded-2xl bg-white p-8">
              <Text className="font-bold text-[#173F35]">No metals found</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add metal"
        onPress={() => { setSelected(null); setFormVisible(true); }}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
        <Plus size={24} color="white" />
      </Pressable>
      <MetalForm
        visible={formVisible}
        metal={selected}
        onClose={() => setFormVisible(false)}
        onSaved={() => {
          setFormVisible(false);
          load();
        }}
      />
    </View>
  );
}
