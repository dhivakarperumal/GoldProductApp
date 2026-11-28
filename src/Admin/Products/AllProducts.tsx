import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import { CustomDropdown } from '../Loans/FormControls';
import DashboardMetricGrid from '../Components/DashboardMetricGrid';
import {
  currency,
  inventoryError,
  mediaUrl,
  parseArray,
  type Category,
  type InventoryScreen,
  type Product,
} from './inventory';

type Props = {
  onNavigate: (screen: InventoryScreen, productId?: number | string) => void;
};

type ProductResponse = {
  products?: Product[];
  pagination?: { page?: number; totalPages?: number; total?: number };
  stats?: Record<string, number>;
  filters?: { purities?: string[] };
};

const STOCK_FILTERS = [
  { value: 'all', label: 'All stock' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'low-stock', label: 'Low Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
];

function firstImage(product: Product): string | undefined {
  const images = parseArray(product.images);
  if (images.length) return images[0];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] as { images?: unknown } | undefined;
  return parseArray(firstVariant?.images)[0];
}

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

export default function AllProducts({ onNavigate }: Props) {
  const { showAlert } = useCustomAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purities, setPurities] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [purity, setPurity] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [lastPriceUpdate, setLastPriceUpdate] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const loadProducts = useCallback(async () => {
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (query.trim()) params.search = query.trim();
      if (category !== 'all') params.category = category;
      if (purity !== 'all') params.purity = purity;
      if (stockStatus !== 'all') params.stockStatus = stockStatus;
      if (lastPriceUpdate !== 'all') params.lastPriceUpdate = lastPriceUpdate;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      const productResponse = await api.get<ProductResponse>('/products/mine', { params });
      const data = productResponse.data;
      if (!Array.isArray(data.products)) {
        throw new Error('The server returned an invalid product list.');
      }
      setProducts(data.products);
      setStats({
        totalProducts: Number(data.stats?.total) || 0,
        inStock: Math.max(
          0,
          (Number(data.stats?.total) || 0) -
            (Number(data.stats?.lowStock) || 0) -
            (Number(data.stats?.outOfStock) || 0),
        ),
        lowStock: Number(data.stats?.lowStock) || 0,
        outOfStock: Number(data.stats?.outOfStock) || 0,
      });
      setTotalPages(Math.max(1, Number(data.pagination?.totalPages) || 1));
      setTotal(Number(data.pagination?.total) || 0);
      setPurities(data.filters?.purities || []);
    } catch (requestError) {
      setError(inventoryError(requestError));
      if (__DEV__) console.warn('[Products] Could not load products:', requestError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, lastPriceUpdate, page, purity, query, sortBy, sortOrder, stockStatus]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get<Category[]>('/categories/manage');
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid category list.');
      }
      setCategories(response.data);
      setCategoryError('');
    } catch (requestError) {
      setCategoryError(inventoryError(requestError));
      if (__DEV__) console.warn('[Products] Could not load categories:', requestError);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'All categories' },
      ...categories.map(item => ({ value: item.name, label: item.name })),
    ],
    [categories],
  );

  const showDeleteConfirmation = (product: Product) => {
    showAlert('Delete product?', `Delete ${product.name || 'this product'}? This cannot be undone.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${product.id}`);
              await loadProducts();
              showAlert('Product deleted', 'The product was removed successfully.', {
                variant: 'success',
              });
            } catch (deleteError) {
              showAlert('Could not delete product', inventoryError(deleteError), {
                variant: 'error',
              });
            }
          },
        },
      ],
    });
  };

  if (loading && products.length === 0) {
    return (
      <View className="flex-1 p-4">
        <AdminLoadingSkeleton variant="grid" count={6} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-28"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProducts();
            }}
            tintColor="#07564B"
          />
        }
        keyboardShouldPersistTaps="handled">
        <DashboardMetricGrid
          metrics={[
            {
              id: 'products-total',
              label: 'Total Products',
              value: stats.totalProducts ?? total,
              icon: Package,
              palette: 'total_products',
              trend: 'Inventory items',
            },
            {
              id: 'products-in-stock',
              label: 'In Stock',
              value: stats.inStock ?? 0,
              icon: CheckCircle2,
              palette: 'total_customers',
              trend: 'Available items',
            },
            {
              id: 'products-low-stock',
              label: 'Low Stock',
              value: stats.lowStock ?? 0,
              icon: Activity,
              palette: 'low_stock_products',
              trend: 'Below 10 units',
              trendUp: false,
            },
            {
              id: 'products-out-of-stock',
              label: 'Out of Stock',
              value: stats.outOfStock ?? 0,
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
            accessibilityLabel="Search products"
            value={query}
            onChangeText={value => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search name or product code"
            placeholderTextColor="#9AA6A1"
            className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setQuery('');
                setPage(1);
              }}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-xl border border-[#E8D596] bg-white">
              <X size={18} color="#6B7E76" />
            </Pressable>
          ) : null}
        </View>
        <View className="mb-3 flex-row items-start gap-3">
          <View className="min-w-0 flex-1">
            <CustomDropdown
              label="Category"
              value={category}
              options={categoryOptions}
              onSelect={value => {
                setCategory(value);
                setPage(1);
              }}
              searchable
            />
          </View>
          <View className="min-w-0 flex-1">
            <CustomDropdown
              label="Sort order"
              value={sortOrder}
              options={[
                { value: 'desc', label: 'Newest / highest first' },
                { value: 'asc', label: 'Oldest / lowest first' },
              ]}
              onSelect={value => {
                setSortOrder(value);
                setPage(1);
              }}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <CustomDropdown
              label="Purity"
              value={purity}
              options={[
                { value: 'all', label: 'All purities' },
                ...purities.map(value => ({ value, label: value })),
              ]}
              onSelect={value => {
                setPurity(value);
                setPage(1);
              }}
            />
          </View>
          <View className="flex-1">
            <CustomDropdown
              label="Stock"
              value={stockStatus}
              options={STOCK_FILTERS}
              onSelect={value => {
                setStockStatus(value);
                setPage(1);
              }}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <CustomDropdown
              label="Price update"
              value={lastPriceUpdate}
              options={[
                { value: 'all', label: 'All updates' },
                { value: 'updated', label: 'Updated' },
                { value: 'not-updated', label: 'Not updated' },
              ]}
              onSelect={value => {
                setLastPriceUpdate(value);
                setPage(1);
              }}
            />
          </View>
          <View className="flex-1">
            <CustomDropdown
              label="Sort by"
              value={sortBy}
              options={[
                { value: 'created_at', label: 'Recently added' },
                { value: 'name', label: 'Name' },
                { value: 'product_code', label: 'Product code' },
                { value: 'final_selling_price', label: 'Price' },
                { value: 'total_stock', label: 'Stock' },
                { value: 'updated_at', label: 'Recently updated' },
              ]}
              onSelect={value => {
                setSortBy(value);
                setPage(1);
              }}
            />
          </View>
        </View>
        {error || categoryError ? (
          <View className="mb-3 rounded-xl bg-[#FFF1F0] p-3">
            <Text className="text-sm text-[#B42332]">{error || categoryError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading products"
              onPress={() => {
                loadProducts();
                loadCategories();
              }}
              className="mt-2 self-start rounded-xl border border-[#E8D596] bg-white px-3 py-2">
              <Text className="font-bold text-[#07564B]">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {products.map(product => {
          const image = mediaUrl(firstImage(product));
          return (
            <View key={String(product.id)} className="mb-3 flex-row rounded-2xl border border-[#E6E9E3] bg-white p-3 shadow-sm">
              {image ? (
                <Image source={{ uri: image }} className="h-24 w-24 rounded-xl bg-[#F3F4F1]" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-xl bg-[#EAF3EF]">
                  <Text className="text-xs font-bold text-[#07564B]">No image</Text>
                </View>
              )}
              <View className="ml-3 flex-1 justify-between">
                <View>
                  <Text numberOfLines={2} className="font-extrabold text-[#173F35]">
                    {product.name || 'Unnamed product'}
                  </Text>
                  <Text className="mt-1 text-xs text-[#6B7E76]">
                    {product.product_code || 'No code'} · {product.category || 'No category'}
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#173F35]">
                    {currency(product.offer_price || product.final_price || product.mrp)}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <View className="mr-2 flex-1 flex-row flex-wrap items-center gap-2">
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
                  <View className="flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${product.name || 'product'}`}
                      onPress={() => onNavigate('viewProduct', product.id)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-[#E8D596] bg-white">
                      <Eye size={16} color="#07564B" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit product"
                      onPress={() => onNavigate('addProduct', product.id)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-[#E8D596] bg-white">
                      <Pencil size={16} color="#07564B" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${product.name || 'product'}`}
                      onPress={() => showDeleteConfirmation(product)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-[#E8D596] bg-white">
                      <Trash2 size={16} color="#B42332" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        {!error && products.length === 0 ? (
          <View className="items-center rounded-2xl bg-white px-5 py-10">
            <Text className="font-bold text-[#173F35]">No products found</Text>
            <Text className="mt-1 text-sm text-[#6B7E76]">Try another search or add your first product.</Text>
          </View>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-[#6B7E76]">Page {page} of {totalPages}</Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel="Previous products page"
              disabled={page <= 1}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              className="h-10 w-10 items-center justify-center rounded-full border border-[#E8D596] bg-white disabled:opacity-40">
              <ChevronLeft size={18} color="#07564B" />
            </Pressable>
            <Pressable
              accessibilityLabel="Next products page"
              disabled={page >= totalPages}
              onPress={() => setPage(current => Math.min(totalPages, current + 1))}
              className="h-10 w-10 items-center justify-center rounded-full border border-[#E8D596] bg-white disabled:opacity-40">
              <ChevronRight size={18} color="#07564B" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

    </View>
  );
}
