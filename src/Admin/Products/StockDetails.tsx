import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import { SubmitButton } from '../Loans/FormControls';
import {
  inventoryError,
  mediaUrl,
  parseArray,
  type Product,
} from './inventory';

type Props = { onBack: () => void };
type Variant = { images?: unknown; sizesStock?: Record<string, string | number>; [key: string]: unknown };
type ProductWithVariants = Product & { variants: Variant[] };
type ProductListResponse = { products?: Product[] };

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
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
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
      const response = await api.get<ProductListResponse>('/products/mine', {
        params: { page: 1, limit: 30, search: query.trim() || undefined },
      });
      if (!Array.isArray(response.data.products)) {
        throw new Error('The server returned an invalid product list.');
      }
      setProducts(response.data.products);
    } catch (requestError) {
      setError(inventoryError(requestError));
      if (__DEV__) console.warn('[StockDetails] Could not load products:', requestError);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const hasSizes = useMemo(
    () => Boolean(selected?.variants.some(variant => variant.sizesStock && Object.keys(variant.sizesStock).length)),
    [selected],
  );

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
        contentContainerClassName="p-4 pb-9"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text className="mb-1 text-xl font-extrabold text-[#173F35]">Add New Stock</Text>
        <Text className="mb-4 text-sm text-[#6B7E76]">Select a product and top up your inventory.</Text>
        <View className="mb-3 flex-row items-center rounded-xl border border-[#E6E9E3] bg-white px-3">
          <Search size={18} color="#6B7E76" />
          <TextInput
            accessibilityLabel="Search products to add stock"
            value={query}
            onChangeText={value => {
              setQuery(value);
              setSelected(null);
            }}
            placeholder="Search by name or SKU..."
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-2 text-sm text-[#173F35]"
          />
        </View>
        {loading || loadingProduct ? (
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
        {!selected && !loading && !loadingProduct ? (
          <View className="mb-4 max-h-72 rounded-2xl bg-white p-2">
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {products.map(product => {
                const image = mediaUrl(firstProductImage(product));
                return (
                  <Pressable
                    key={String(product.id)}
                    onPress={() => selectProduct(product)}
                    className="flex-row items-center border-b border-[#F1F2EE] p-2">
                    {image ? (
                      <Image source={{ uri: image }} className="h-12 w-12 rounded-lg bg-[#F3F4F1]" />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-lg bg-[#EAF3EF]">
                        <Text className="text-[10px] font-bold text-[#07564B]">Image</Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="font-bold text-[#173F35]">{product.name || 'Unnamed product'}</Text>
                      <Text className="mt-1 text-xs text-[#6B7E76]">{product.product_code || 'No SKU'} · Stock {Number(product.total_stock) || 0}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {products.length === 0 && !error ? (
                <Text className="p-5 text-center text-sm text-[#6B7E76]">No matching products.</Text>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        {selected ? (
          <View className="rounded-2xl bg-white p-4 shadow-sm">
            <View className="mb-4 flex-row items-center">
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
                <Text className="mt-1 text-xs font-bold text-[#07564B]">Current stock: {Number(selected.total_stock) || 0}</Text>
              </View>
              <Pressable onPress={() => setSelected(null)} className="px-2 py-1">
                <Text className="font-bold text-[#07564B]">Change</Text>
              </Pressable>
            </View>

            {hasSizes ? selected.variants.map((variant, variantIndex) => (
              <View key={`variant-${variantIndex}`} className="mb-3 rounded-xl bg-[#F8F7F2] p-3">
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
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">Stock quantity to add</Text>
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
            <SubmitButton label="Save Stock" loading={saving} onPress={save} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
