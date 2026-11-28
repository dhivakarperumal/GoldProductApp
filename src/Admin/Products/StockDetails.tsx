import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Activity,
  CheckCircle2,
  Package,
  Pencil,
  Search,
  X,
  XCircle,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomDropdown, SubmitButton } from '../Loans/FormControls';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import {
  inventoryError,
  mediaUrl,
  parseArray,
  type Product,
} from './inventory';

type Props = { onBack: () => void };
type Variant = { images?: unknown; sizesStock?: Record<string, string | number>; [key: string]: unknown };
type ProductWithVariants = Product & { variants: Variant[] };
type ProductListResponse = {
  products?: Product[];
  stats?: { total?: number; lowStock?: number; outOfStock?: number };
  pagination?: { total?: number };
};

const STOCK_FILTERS = [
  { value: 'all', label: 'All stock' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'low-stock', label: 'Low Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
];

function stockStatusClasses(status?: string) {
  switch (status?.trim().toLowerCase()) {
    case 'in stock':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'low stock':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'out of stock':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-[#E6E9E3] bg-[#F3F4F1] text-[#52645F]';
  }
}

function toVariants(value: unknown): Variant[] {
  if (Array.isArray(value)) return value as Variant[];
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as Variant[] : [];
  } catch {
    return [];
  }
}

function firstProductImage(product: Product): string | undefined {
  const images = parseArray(product.images);
  if (images.length) return images[0];
  const variants = toVariants(product.variants);
  return parseArray(variants[0]?.images)[0];
}

export default function StockDetails({ onBack }: Props) {
  const { showAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [selected, setSelected] = useState<ProductWithVariants | null>(null);
  const [additions, setAdditions] = useState<Record<string, string>>({});
  const [manualAddition, setManualAddition] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setError('');
    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 30,
      };
      if (query.trim()) params.search = query.trim();
      if (stockFilter !== 'all') params.stockStatus = stockFilter;
      const response = await api.get<ProductListResponse>('/products/mine', {
        params,
      });
      if (!Array.isArray(response.data.products)) {
        throw new Error('The server returned an invalid product list.');
      }
      setProducts(response.data.products);
      const totalProducts =
        Number(
          response.data.stats?.total ??
            response.data.pagination?.total ??
            response.data.products.length,
        ) || 0;
      const lowStock = Number(response.data.stats?.lowStock) || 0;
      const outOfStock = Number(response.data.stats?.outOfStock) || 0;
      setStats({
        totalProducts,
        inStock: Math.max(0, totalProducts - lowStock - outOfStock),
        lowStock,
        outOfStock,
      });
    } catch (requestError) {
      setError(inventoryError(requestError));
      if (__DEV__) console.warn('[StockDetails] Could not load products:', requestError);
    } finally {
      setLoading(false);
    }
  }, [query, stockFilter]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const hasSizes = useMemo(
    () => Boolean(selected?.variants.some(variant => variant.sizesStock && Object.keys(variant.sizesStock).length)),
    [selected],
  );

  const closeStockEditor = () => {
    if (saving || loadingProduct) return;
    setSelected(null);
    setAdditions({});
    setManualAddition('');
  };

  const selectProduct = async (product: Product) => {
    setSelected(null);
    setAdditions({});
    setManualAddition('');
    setLoadingProduct(true);
    try {
      const response = await api.get<Product>(`/products/mine/${product.id}`);
      setSelected({
        ...response.data,
        variants: toVariants(response.data.variants),
      });
    } catch (requestError) {
      showAlert('Could not load product', inventoryError(requestError), { variant: 'error' });
    } finally {
      setLoadingProduct(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    const updatedVariants = selected.variants.map(variant => ({
      ...variant,
      sizesStock: variant.sizesStock ? { ...variant.sizesStock } : variant.sizesStock,
    }));
    let addedTotal = 0;
    if (hasSizes) {
      updatedVariants.forEach((variant, variantIndex) => {
        Object.entries(variant.sizesStock || {}).forEach(([size, currentValue]) => {
          const key = `${variantIndex}-${size}`;
          const addition = Math.max(0, Math.floor(Number(additions[key]) || 0));
          variant.sizesStock![size] = (Number(currentValue) || 0) + addition;
          addedTotal += addition;
        });
      });
    } else {
      addedTotal = Math.max(0, Math.floor(Number(manualAddition) || 0));
    }
    if (addedTotal < 1) {
      showAlert('Quantity required', 'Enter a stock addition greater than zero.', { variant: 'warning' });
      return;
    }
    const newTotal = Math.max(0, Number(selected.total_stock) || 0) + addedTotal;
    const stockStatus = newTotal <= 0 ? 'Out of Stock' : newTotal < 10 ? 'Low Stock' : 'In Stock';
    setSaving(true);
    try {
      await api.put(`/products/${selected.id}`, {
        ...selected,
        total_stock: String(newTotal),
        stock: String(newTotal),
        stock_status: stockStatus,
        variants: updatedVariants,
      });
      showAlert('Stock updated', `Added ${addedTotal} item${addedTotal === 1 ? '' : 's'} to ${selected.name || 'the product'}.`, {
        variant: 'success',
      });
      setSelected({ ...selected, total_stock: newTotal, stock_status: stockStatus, variants: updatedVariants });
      setAdditions({});
      setManualAddition('');
      loadProducts();
    } catch (requestError) {
      showAlert('Could not update stock', inventoryError(requestError), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerHeader title="Stock Details" sectionLabel="Shop Inventory" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-9"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <DashboardMetricGrid
          metrics={[
            {
              id: 'stock-total-products',
              label: 'Total Products',
              value: stats.totalProducts,
              icon: Package,
              palette: 'total_products',
              trend: 'In your inventory',
            },
            {
              id: 'stock-in-stock',
              label: 'In Stock',
              value: stats.inStock,
              icon: CheckCircle2,
              palette: 'total_customers',
              trend: 'Available items',
            },
            {
              id: 'stock-low-stock',
              label: 'Low Stock',
              value: stats.lowStock,
              icon: Activity,
              palette: 'low_stock_products',
              trend: 'Below 10 units',
              trendUp: false,
            },
            {
              id: 'stock-out-of-stock',
              label: 'Out of Stock',
              value: stats.outOfStock,
              icon: XCircle,
              palette: 'today_collection',
              trend: 'No units available',
              trendUp: false,
            },
          ]}
        />
        <View className="mb-3 flex-row items-center rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm">
          <Search size={18} color="#A77B15" />
          <TextInput
            accessibilityLabel="Search products to add stock"
            value={query}
            onChangeText={value => {
              setQuery(value);
              setSelected(null);
            }}
            placeholder="Search by name or SKU..."
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setQuery('');
                setSelected(null);
              }}
              hitSlop={8}>
              <X size={18} color="#6B7E76" />
            </Pressable>
          ) : null}
        </View>
        <CustomDropdown
          label="Stock"
          value={stockFilter}
          options={STOCK_FILTERS}
          onSelect={value => {
            setStockFilter(value);
            setSelected(null);
          }}
        />
        {loading ? (
          <View className="py-5"><ActivityIndicator color="#07564B" /></View>
        ) : null}
        {error ? (
          <View className="mb-3 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm text-[#B42332]">{error}</Text>
            <Pressable onPress={loadProducts} className="mt-2 self-start">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading
          ? products.map(product => {
              const image = mediaUrl(firstProductImage(product));
              return (
                <Pressable
                  key={String(product.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit stock for ${product.name || 'product'}`}
                  onPress={() => selectProduct(product)}
                  className="mb-3 flex-row items-center rounded-2xl border border-[#E6E9E3] bg-white p-3 shadow-sm">
                  {image ? (
                    <Image source={{ uri: image }} className="h-16 w-16 rounded-xl bg-[#F3F4F1]" />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#EAF3EF]">
                      <Text className="text-xs font-bold text-[#07564B]">Product</Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={1} className="font-extrabold text-[#173F35]">
                      {product.name || 'Unnamed product'}
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7E76]">
                      {product.product_code || 'No SKU'}
                    </Text>
                    <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
                      <View
                        className={`rounded-full border px-2.5 py-1 ${stockStatusClasses(product.stock_status)}`}>
                        <Text className="text-[10px] font-extrabold">
                          {product.stock_status?.trim() || 'Status unavailable'}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold text-[#6B7E76]">
                        Qty {Number(product.total_stock) || 0}
                      </Text>
                    </View>
                  </View>
                  <View className="ml-2 h-10 w-10 items-center justify-center rounded-xl border border-[#E8D596] bg-[#FFF8E7]">
                    <Pencil size={17} color="#8A5A00" strokeWidth={2.5} />
                  </View>
                </Pressable>
              );
            })
          : null}
        {!loading && products.length === 0 && !error ? (
          <View className="items-center rounded-2xl border border-[#ECE7D8] bg-white p-8">
            <Text className="text-sm font-bold text-[#173F35]">No matching products.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={loadingProduct || Boolean(selected)}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeStockEditor}>
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close stock adjustment"
            disabled={saving || loadingProduct}
            onPress={closeStockEditor}
            className="flex-1"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            className="max-h-[88%] shrink rounded-t-3xl bg-[#F8F7F2]">
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-[#EAD78A]">
                  Stock Adjustment
                </Text>
                <Text numberOfLines={1} className="mt-1 text-base font-extrabold text-white">
                  {selected?.name || 'Loading product...'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close stock adjustment"
                disabled={saving || loadingProduct}
                onPress={closeStockEditor}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <X size={20} color="#EAD78A" />
              </Pressable>
            </View>
            {loadingProduct ? (
              <View className="items-center p-8">
                <ActivityIndicator color="#07564B" />
                <Text className="mt-2 text-sm text-[#6B7E76]">Loading product details...</Text>
              </View>
            ) : selected ? (
              <ScrollView
                className="shrink"
                contentContainerClassName="p-4 pb-6"
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets>
                <View className="mb-4 flex-row items-center rounded-2xl border border-[#E6E9E3] bg-white p-4">
                  {mediaUrl(firstProductImage(selected)) ? (
                    <Image source={{ uri: mediaUrl(firstProductImage(selected)) }} className="h-16 w-16 rounded-xl bg-[#F3F4F1]" />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#EAF3EF]">
                      <Text className="text-xs font-bold text-[#07564B]">Product</Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text className="font-extrabold text-[#173F35]">{selected.name}</Text>
                    <Text className="mt-1 text-xs text-[#6B7E76]">{selected.product_code || 'No SKU'}</Text>
                    <Text className="mt-1 text-xs font-bold text-[#07564B]">
                      Current stock: {Number(selected.total_stock) || 0}
                    </Text>
                  </View>
                </View>
                {hasSizes ? selected.variants.map((variant, variantIndex) => (
                  <View key={`variant-${variantIndex}`} className="mb-3 rounded-xl bg-white p-3">
                    <Text className="mb-2 text-sm font-bold text-[#173F35]">
                      {String(variant.color || variant.name || `Variant ${variantIndex + 1}`)}
                    </Text>
                    {Object.entries(variant.sizesStock || {}).map(([size, current]) => {
                      const key = `${variantIndex}-${size}`;
                      return (
                        <View key={key} className="mb-2 flex-row items-center justify-between gap-2">
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-[#173F35]">{size}</Text>
                            <Text className="text-xs text-[#6B7E76]">Current: {Number(current) || 0}</Text>
                          </View>
                          <TextInput
                            accessibilityLabel={`Add stock for ${size}`}
                            value={additions[key] || ''}
                            onChangeText={value => setAdditions(currentAdditions => ({
                              ...currentAdditions,
                              [key]: value.replace(/\D/g, ''),
                            }))}
                            keyboardType="number-pad"
                            placeholder="Add qty"
                            placeholderTextColor="#9AA6A1"
                            className="min-h-11 w-28 rounded-xl border border-[#E6E9E3] bg-white px-3 text-sm text-[#173F35]"
                          />
                        </View>
                      );
                    })}
                  </View>
                )) : (
                  <View className="mb-4 rounded-2xl bg-white p-4">
                    <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
                      Stock quantity to add
                    </Text>
                    <TextInput
                      accessibilityLabel="Stock quantity to add"
                      value={manualAddition}
                      onChangeText={value => setManualAddition(value.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      placeholder="Enter quantity"
                      placeholderTextColor="#9AA6A1"
                      className="min-h-12 rounded-xl border border-[#E6E9E3] bg-white px-3.5 text-sm text-[#173F35]"
                    />
                  </View>
                )}
              </ScrollView>
            ) : null}
            {selected ? (
              <View className="border-t border-[#E6E9E3] bg-[#F8F7F2] px-4 pt-3">
                <SubmitButton label="Save Stock" loading={saving} onPress={save} compact />
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
