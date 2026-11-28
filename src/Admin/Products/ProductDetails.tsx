import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Package, Pencil, Star, Trash2 } from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import AdminLoadingSkeleton from '../Components/AdminLoadingSkeleton';
import {
  currency,
  inventoryError,
  mediaUrl,
  parseArray,
  type Product,
} from './inventory';

type Props = {
  productId: number | string;
  onBack: () => void;
  onEdit: () => void;
};

type ProductVariant = Record<string, unknown>;
type ProductTab = 'Overview' | 'Details' | 'Pricing' | 'Inventory';

const PRODUCT_TABS: ProductTab[] = [
  'Overview',
  'Details',
  'Pricing',
  'Inventory',
];

function parseVariants(value: unknown): ProductVariant[] {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (variant): variant is ProductVariant =>
      typeof variant === 'object' && variant !== null && !Array.isArray(variant),
  );
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatTextValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => `${index + 1}. ${formatTextValue(item)}`)
      .join('\n');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([label, detail]) => `${label}: ${displayValue(detail)}`)
      .join('\n');
  }
  return displayValue(value);
}

function stockStatusClasses(status?: string): string {
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

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl bg-[#F8F9F6] p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#83918B]">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-bold text-[#173F35]">
        {displayValue(value)}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4 shadow-sm">
      <Text className="mb-3 text-base font-extrabold text-[#173F35]">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function TextSection({
  title,
  value,
  emptyMessage,
}: {
  title: string;
  value: unknown;
  emptyMessage?: string;
}) {
  const formattedValue =
    value == null || value === ''
      ? emptyMessage
      : formatTextValue(value);
  const content = formattedValue || emptyMessage;
  if (!content) return null;
  return (
    <View className="mb-3 rounded-2xl border border-[#E6E9E3] bg-white p-4 shadow-sm">
      <Text className="mb-2 text-sm font-extrabold text-[#173F35]">{title}</Text>
      <Text className="text-sm leading-6 text-[#52645F]">
        {content}
      </Text>
    </View>
  );
}

export default function ProductDetails({ productId, onBack, onEdit }: Props) {
  const { showAlert } = useCustomAlert();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<ProductTab>('Overview');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadProduct = async () => {
      setLoading(true);
      setLoadError('');
      setProduct(null);
      try {
        const response = await api.get<Product>(`/products/mine/${productId}`, {
          signal: controller.signal,
        });
        if (!response.data || response.data.id == null) {
          throw new Error('The server returned invalid product details.');
        }
        if (!controller.signal.aborted) {
          setProduct(response.data);
          setSelectedImage(0);
          setActiveTab('Overview');
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(inventoryError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadProduct();
    return () => controller.abort();
  }, [productId, retryKey]);

  const variants = parseVariants(product?.variants);
  const images = product
    ? [
        ...new Set([
          ...parseArray(product.images),
          ...variants.flatMap(variant => parseArray(variant.images)),
        ]),
      ]
    : [];
  const imageUrl = mediaUrl(images[selectedImage]);
  const stockStatus = product?.stock_status?.trim() || 'Status unavailable';
  const currentPrice = product
    ? currency(
        product.final_selling_price ||
          product.offer_price ||
          product.final_price ||
          product.mrp,
      )
    : '—';
  const highlights = product ? parseArray(product.highlights) : [];
  const specifications = product
    ? [
        product.specifications,
        product.specification,
        product.product_specifications,
      ].find(value => value != null && value !== '')
    : undefined;

  const confirmDelete = () => {
    if (!product) return;
    showAlert(
      'Delete product?',
      `Delete ${product.name || 'this product'}? This cannot be undone.`,
      {
        variant: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                await api.delete(`/products/${productId}`);
                showAlert('Product deleted', 'The product was removed successfully.', {
                  variant: 'success',
                });
                onBack();
              } catch (error) {
                showAlert('Could not delete product', inventoryError(error), {
                  variant: 'error',
                });
              } finally {
                setDeleting(false);
              }
            },
          },
        ],
      },
    );
  };

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title={product?.name || 'Product Details'}
        sectionLabel="All Products"
        backAccessibilityLabel="Back to all products"
        onBack={onBack}
      />
      {loading && !product ? (
        <ScrollView className="flex-1 p-4">
          <AdminLoadingSkeleton variant="detail" />
        </ScrollView>
      ) : loadError && !product ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-sm text-[#991B1B]">{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryKey(key => key + 1)}
            className="rounded-xl border border-[#E8D596] bg-white px-5 py-3">
            <Text className="font-bold text-[#07564B]">Retry</Text>
          </Pressable>
        </View>
      ) : product ? (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pt-4 pb-6"
            showsVerticalScrollIndicator={false}>
            {loadError ? (
              <Text className="mb-3 rounded-xl bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
                {loadError}
              </Text>
            ) : null}
            <View className="mb-4 overflow-hidden rounded-3xl border border-[#E6E9E3] bg-white shadow-sm">
              <View className="h-72 items-center justify-center bg-[#F3F4F1]">
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    resizeMode="contain"
                    className="h-full w-full"
                  />
                ) : (
                  <View className="items-center">
                    <Package size={44} color="#07564B" />
                    <Text className="mt-2 text-sm font-semibold text-[#6B7E76]">
                      No product image
                    </Text>
                  </View>
                )}
              </View>
              {images.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 p-3">
                  {images.map((image, index) => {
                    const thumbnailUrl = mediaUrl(image);
                    return thumbnailUrl ? (
                      <Pressable
                        key={`${image}-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Show product image ${index + 1}`}
                        accessibilityState={{ selected: selectedImage === index }}
                        onPress={() => setSelectedImage(index)}
                        className={`h-16 w-16 overflow-hidden rounded-xl border ${
                          selectedImage === index
                            ? 'border-[#07564B]'
                            : 'border-[#E6E9E3]'
                        }`}>
                        <Image
                          source={{ uri: thumbnailUrl }}
                          resizeMode="cover"
                          className="h-full w-full"
                        />
                      </Pressable>
                    ) : null;
                  })}
                </ScrollView>
              ) : null}
            </View>

            <View className="mb-4 rounded-2xl border border-[#DDBB57] bg-white p-4 shadow-sm">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold uppercase tracking-widest text-[#A77B15]">
                    {product.category || 'Product'}
                    {product.subcategory ? ` · ${product.subcategory}` : ''}
                  </Text>
                  <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
                    {product.name || 'Unnamed product'}
                  </Text>
                  <Text className="mt-1 text-sm text-[#6B7E76]">
                    {product.product_code || 'No product code'}
                  </Text>
                </View>
                <View
                  className={`rounded-full border px-3 py-1.5 ${stockStatusClasses(product.stock_status)}`}>
                  <Text className="text-[10px] font-extrabold">{stockStatus}</Text>
                </View>
              </View>
              <View className="mt-4 flex-row items-end justify-between border-t border-[#F1F2EE] pt-3">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wide text-[#83918B]">
                    Selling price
                  </Text>
                  <Text className="mt-1 text-2xl font-extrabold text-[#07564B]">
                    {currentPrice}
                  </Text>
                  {product.mrp ? (
                    <Text className="text-sm text-[#83918B] line-through">
                      MRP {currency(product.mrp)}
                    </Text>
                  ) : null}
                </View>
                {Number(product.rating) > 0 ? (
                  <View className="flex-row items-center rounded-full bg-[#FFF8E7] px-3 py-2">
                    <Star size={15} color="#A77B15" fill="#A77B15" />
                    <Text className="ml-1 text-sm font-bold text-[#8A5A00]">
                      {displayValue(product.rating)}
                      {Number(product.total_reviews) > 0
                        ? ` (${displayValue(product.total_reviews)})`
                        : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4 max-h-12"
              contentContainerClassName="gap-2">
              {PRODUCT_TABS.map(tab => (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                  onPress={() => setActiveTab(tab)}
                  className={`items-center justify-center rounded-full border px-4 py-2 ${
                    activeTab === tab
                      ? 'border-[#07564B] bg-[#07564B]'
                      : 'border-[#E8D596] bg-white'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === tab ? 'text-white' : 'text-[#52645F]'
                    }`}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {activeTab === 'Overview' ? (
              <>
                <Section title="Product Information">
                  <Detail label="Brand" value={product.brand} />
                  <Detail label="Category" value={product.category} />
                  <Detail label="Subcategory" value={product.subcategory} />
                  <Detail label="Product type" value={product.product_type} />
                  <Detail label="Metal type" value={product.metal_type} />
                  <Detail label="Purity" value={product.purity} />
                </Section>
                {highlights.length ? (
                  <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4 shadow-sm">
                    <Text className="mb-3 text-base font-extrabold text-[#173F35]">
                      Highlights
                    </Text>
                    {highlights.map((highlight, index) => (
                      <Text
                        key={`${highlight}-${index}`}
                        className="mb-2 text-sm text-[#52645F]">
                        • {highlight}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {product.full_description || product.description ? (
                  <View className="mb-4 rounded-2xl border border-[#E6E9E3] bg-white p-4 shadow-sm">
                    <Text className="mb-2 text-base font-extrabold text-[#173F35]">
                      Description
                    </Text>
                    <Text className="text-sm leading-6 text-[#52645F]">
                      {displayValue(product.full_description || product.description)}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {activeTab === 'Details' ? (
              <>
                <Section title="Weight & Dimensions">
                  <Detail
                    label="Gross weight"
                    value={product.gross_weight ? `${product.gross_weight} g` : undefined}
                  />
                  <Detail
                    label="Net weight"
                    value={
                      product.net_gold_weight || product.net_weight
                        ? `${product.net_gold_weight || product.net_weight} g`
                        : undefined
                    }
                  />
                  <Detail
                    label="Stone weight"
                    value={product.stone_weight ? `${product.stone_weight} g` : undefined}
                  />
                  <Detail label="Stone type" value={product.stone_type} />
                  <Detail label="HUID" value={product.huid} />
                  <Detail
                    label="Available sizes"
                    value={parseArray(product.available_sizes).join(', ')}
                  />
                  <Detail label="Length" value={product.length} />
                  <Detail label="Width" value={product.width} />
                  <Detail label="Height" value={product.height} />
                  <Detail label="SKU / Barcode" value={product.sku_barcode} />
                  <Detail label="Product status" value={product.status} />
                </Section>
                <TextSection
                  title="Specifications"
                  value={specifications}
                  emptyMessage="No specifications available."
                />
                <TextSection
                  title="Care Instructions"
                  value={product.care_instructions}
                />
                <TextSection title="Warranty" value={product.warranty} />
                <TextSection title="Certificate" value={product.certificate} />
                <TextSection title="Video" value={product.video} />
              </>
            ) : null}

            {activeTab === 'Pricing' ? (
              <Section title="Pricing Details">
                <Detail label="MRP" value={currency(product.mrp)} />
                <Detail label="Offer price" value={currency(product.offer_price)} />
                <Detail
                  label="Final selling price"
                  value={currency(product.final_selling_price || product.final_price)}
                />
                <Detail label="Gold rate / gram" value={currency(product.gold_rate_per_gram)} />
                <Detail label="Making charges" value={product.making_charge} />
                <Detail label="Wastage" value={product.wastage} />
                <Detail
                  label="GST rate"
                  value={product.gst_rate ? `${product.gst_rate}%` : undefined}
                />
              </Section>
            ) : null}

            {activeTab === 'Inventory' ? (
              <>
                <Section title="Stock Information">
                  <Detail label="Available quantity" value={product.total_stock} />
                  <Detail label="Stock status" value={stockStatus} />
                  <Detail label="Warehouse" value={product.warehouse} />
                  <Detail label="Featured" value={product.featured} />
                  <Detail label="New arrival" value={product.new_arrival} />
                  <Detail label="Best seller" value={product.best_seller} />
                </Section>
                {variants.length ? (
                  <Section title="Variants">
                    {variants.map((variant, index) => (
                      <View
                        key={`variant-${index}`}
                        className="mb-2 w-full rounded-xl border border-[#E6E9E3] bg-[#F8F9F6] p-3">
                        <Text className="font-bold text-[#173F35]">
                          {displayValue(
                            variant.color || variant.name || `Variant ${index + 1}`,
                          )}
                        </Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                          <Detail label="SKU" value={variant.sku} />
                          <Detail
                            label="Stock"
                            value={variant.stock ?? variant.total_stock}
                          />
                          <Detail
                            label="Price"
                            value={
                              variant.price == null
                                ? undefined
                                : currency(variant.price)
                            }
                          />
                          {variant.size ? (
                            <Detail label="Size" value={variant.size} />
                          ) : null}
                        </View>
                        {variant.sizesStock &&
                        typeof variant.sizesStock === 'object' &&
                        !Array.isArray(variant.sizesStock) ? (
                          <Text className="mt-2 text-xs text-[#52645F]">
                            Sizes: {displayValue(variant.sizesStock)}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </Section>
                ) : null}
              </>
            ) : null}
          </ScrollView>
          <View className="border-t border-[#E6E9E3] bg-white px-4 py-3">
            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${product.name || 'product'}`}
                disabled={deleting}
                onPress={onEdit}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-[#07564B] bg-[#07564B] px-3 disabled:opacity-60">
                <Pencil size={17} color="white" />
                <Text className="ml-2 text-sm font-extrabold text-white">
                  Edit Product
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${product.name || 'product'}`}
                disabled={deleting}
                onPress={confirmDelete}
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 disabled:opacity-60">
                {deleting ? (
                  <ActivityIndicator size="small" color="#B42332" />
                ) : (
                  <Trash2 size={17} color="#B42332" />
                )}
                <Text className="ml-2 text-sm font-extrabold text-[#B42332]">
                  Delete Product
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
