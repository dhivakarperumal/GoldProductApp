import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ImagePlus, X } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { isErrorWithCode, pick, types } from '@react-native-documents/picker';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';
import InnerHeader from '../../Components/InnerHeader';
import {
  ChoiceChips,
  CustomDropdown,
  Field,
  SubmitButton,
} from '../Loans/FormControls';
import {
  currency,
  inventoryError,
  mediaUrl,
  parseArray,
  type Category,
  type Metal,
  type Product,
} from './inventory';

type Props = {
  productId?: number | string | null;
  onBack: () => void;
  onSaved: () => void;
};

type ProductFormState = {
  name: string;
  product_code: string;
  brand: string;
  category: string;
  subcategory: string;
  metal_type: string;
  product_type: string;
  purity: string;
  gross_weight: string;
  net_gold_weight: string;
  gold_rate_per_gram: string;
  making_charge_type: string;
  making_charge: string;
  wastage_type: string;
  wastage: string;
  stone_weight: string;
  stone_charges: string;
  other_charges: string;
  stone_type: string;
  huid: string;
  available_sizes: string[];
  product_size: string;
  length: string;
  width: string;
  height: string;
  ring_size: string;
  bangle_size: string;
  chain_length: string;
  size_guide_chart: string;
  mrp: string;
  offer: string;
  offer_type: string;
  offer_price: string;
  fixed_discount_amount: string;
  discount: string;
  gst_rate: string;
  final_selling_price: string;
  price_includes_gst: boolean;
  description: string;
  full_description: string;
  highlights: string[];
  specifications: string;
  care_instructions: string;
  warranty: string;
  images: string[];
  variants: Array<Record<string, unknown>>;
  video: string;
  certificate: string;
  rating: string;
  total_reviews: string;
  total_stock: string;
  stock_status: string;
  sku_barcode: string;
  warehouse: string;
  status: string;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
};

type RateSet = {
  rates?: Array<{
    metal_type?: string;
    purity?: string;
    rate_per_gram?: string | number;
    rate_unit?: string;
  }>;
  making_charge_type?: string;
  making_charge_value?: string | number;
  wastage_percentage?: string | number;
  rate_date?: string;
};

type LocalFile = { uri: string; name: string; type: string; size?: number };

const EMPTY_PRODUCT: ProductFormState = {
  name: '',
  product_code: '',
  brand: 'Sri Gold',
  category: '',
  subcategory: '',
  metal_type: '',
  product_type: 'Traditional',
  purity: '',
  gross_weight: '',
  net_gold_weight: '',
  gold_rate_per_gram: '',
  making_charge_type: 'Percentage',
  making_charge: '',
  wastage_type: 'Percentage',
  wastage: '',
  stone_weight: '0',
  stone_charges: '0',
  other_charges: '0',
  stone_type: 'None',
  huid: '',
  available_sizes: [],
  product_size: '',
  length: '',
  width: '',
  height: '',
  ring_size: '',
  bangle_size: '',
  chain_length: '',
  size_guide_chart: '',
  mrp: '',
  offer: '0',
  offer_type: 'Percentage',
  offer_price: '',
  fixed_discount_amount: '0',
  discount: '0',
  gst_rate: '',
  final_selling_price: '',
  price_includes_gst: true,
  description: '',
  full_description: '',
  highlights: [],
  specifications: '',
  care_instructions: '',
  warranty: '',
  images: [],
  variants: [],
  video: '',
  certificate: '',
  rating: '0',
  total_reviews: '0',
  total_stock: '0',
  stock_status: 'Out of Stock',
  sku_barcode: '',
  warehouse: 'Main Shop',
  status: 'Active',
  featured: false,
  new_arrival: false,
  best_seller: false,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 overflow-visible rounded-2xl border border-[#E6E9E3] bg-white p-4">
      <Text className="mb-4 border-b border-[#F1F2EE] pb-3 text-sm font-extrabold text-[#07564B]">{title}</Text>
      {children}
    </View>
  );
}

function CheckOption({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 mr-3 flex-row items-center gap-2">
      <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-[#07564B] bg-[#07564B]' : 'border-[#9AA6A1] bg-white'}`}>
        {checked ? <Text className="text-xs font-extrabold text-white">✓</Text> : null}
      </View>
      <Text className="text-sm font-semibold text-[#52645F]">{label}</Text>
    </Pressable>
  );
}

function asString(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function parseVariants(value: unknown): Array<Record<string, unknown>> {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed)
    ? parsed.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
    : [];
}

function readProduct(product: Product): ProductFormState {
  const raw = product as Record<string, unknown>;
  return {
    ...EMPTY_PRODUCT,
    ...raw,
    name: asString(raw.name),
    product_code: asString(raw.product_code),
    brand: asString(raw.brand, 'Sri Gold'),
    category: asString(raw.category),
    subcategory: asString(raw.subcategory),
    metal_type: asString(raw.metal_type),
    product_type: asString(raw.product_type, 'Traditional'),
    purity: asString(raw.purity),
    gross_weight: asString(raw.gross_weight),
    net_gold_weight: asString(raw.net_gold_weight ?? raw.net_weight),
    gold_rate_per_gram: asString(raw.gold_rate_per_gram),
    making_charge_type: asString(raw.making_charge_type, 'Percentage'),
    making_charge: asString(raw.making_charge),
    wastage_type: asString(raw.wastage_type, 'Percentage'),
    wastage: asString(raw.wastage),
    stone_weight: asString(raw.stone_weight, '0'),
    stone_charges: asString(raw.stone_charges, '0'),
    other_charges: asString(raw.other_charges, '0'),
    stone_type: asString(raw.stone_type, 'None'),
    huid: asString(raw.huid),
    available_sizes: parseArray(raw.available_sizes),
    product_size: asString(raw.product_size),
    length: asString(raw.length),
    width: asString(raw.width),
    height: asString(raw.height),
    ring_size: asString(raw.ring_size),
    bangle_size: asString(raw.bangle_size),
    chain_length: asString(raw.chain_length),
    size_guide_chart: asString(raw.size_guide_chart),
    mrp: asString(raw.mrp),
    offer: asString(raw.offer, '0'),
    offer_type: asString(raw.offer_type, 'Percentage'),
    offer_price: asString(raw.offer_price),
    fixed_discount_amount: asString(raw.fixed_discount_amount, '0'),
    discount: asString(raw.discount, '0'),
    gst_rate: asString(raw.gst_rate),
    final_selling_price: asString(raw.final_selling_price),
    price_includes_gst: Boolean(raw.price_includes_gst),
    description: asString(raw.description),
    full_description: asString(raw.full_description ?? raw.description),
    highlights: parseArray(raw.highlights),
    specifications: asString(raw.specifications),
    care_instructions: asString(raw.care_instructions),
    warranty: asString(raw.warranty),
    images: parseArray(raw.images),
    variants: parseVariants(raw.variants),
    video: asString(raw.video),
    certificate: asString(raw.certificate),
    rating: asString(raw.rating, '0'),
    total_reviews: asString(raw.total_reviews, '0'),
    total_stock: asString(raw.total_stock, '0'),
    stock_status: asString(raw.stock_status, 'Out of Stock'),
    sku_barcode: asString(raw.sku_barcode),
    warehouse: asString(raw.warehouse, 'Main Shop'),
    status: asString(raw.status, 'Active'),
    featured: Boolean(raw.featured),
    new_arrival: Boolean(raw.new_arrival),
    best_seller: Boolean(raw.best_seller),
  };
}

export default function AddProduct({ productId, onBack, onSaved }: Props) {
  const { showAlert } = useCustomAlert();
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [rates, setRates] = useState<RateSet | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadFormData = useCallback(async () => {
    setFetching(true);
    try {
      const [categoryResponse, metalResponse] = await Promise.all([
        api.get<Category[]>('/categories/manage'),
        api.get<Metal[]>('/metals/manage'),
      ]);
      if (!Array.isArray(categoryResponse.data) || !Array.isArray(metalResponse.data)) {
        throw new Error('The server returned invalid category or metal options.');
      }
      const categoryList = categoryResponse.data;
      const metalList = metalResponse.data.filter(item => item.status === 'Active');
      setCategories(categoryList);
      setMetals(metalList);
      let loadedRates: RateSet | null = null;
      try {
        const rateResponse = await api.get<RateSet>('/gold-rates/current');
        loadedRates = rateResponse.data || null;
      } catch (rateError) {
        showAlert('Could not load active rates', inventoryError(rateError), { variant: 'warning' });
      }
      setRates(loadedRates);
      if (productId) {
        const productResponse = await api.get<Product>(`/products/${productId}`);
        setForm(readProduct(productResponse.data));
      } else {
        const productResponse = await api.get<{ latestCode?: string }>('/products/latest-code');
        if (!productResponse.data.latestCode) {
          throw new Error('The server did not return a product code.');
        }
        const preferredCategory = categoryList.find(item => item.name === 'Gold Jewellery') || categoryList[0];
        const preferredMetal = metalList.find(item => item.name.toLowerCase() === 'gold') || metalList[0];
        setForm({
          ...EMPTY_PRODUCT,
          category: preferredCategory?.name || '',
          subcategory: parseArray(preferredCategory?.subcategory)[0] || '',
          metal_type: preferredMetal?.name || '',
          product_code: productResponse.data.latestCode,
          making_charge: asString(loadedRates?.making_charge_value),
          wastage: asString(loadedRates?.wastage_percentage),
        });
      }
    } catch (error) {
      showAlert('Could not load product form', inventoryError(error), { variant: 'error' });
    } finally {
      setFetching(false);
    }
  }, [productId, showAlert]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const selectedCategory = categories.find(item => item.name === form.category);
  const subcategoryOptions = parseArray(selectedCategory?.subcategory).map(value => ({
    value,
    label: value,
  }));
  const isDiamond = form.metal_type.toLowerCase().includes('diamond');
  const grossWeight = Number(form.gross_weight) || 0;
  const stoneWeight = Number(form.stone_weight) || 0;
  const netWeight = isDiamond
    ? Number(form.net_gold_weight) || 0
    : Math.max(0, grossWeight - stoneWeight);
  const activeRate = rates?.rates?.find(rate =>
    String(rate.metal_type).toLowerCase() === form.metal_type.toLowerCase() &&
    (String(rate.purity).toLowerCase() === form.purity.toLowerCase() ||
      String(form.purity).match(/\d{3}/)?.[0] === String(rate.purity)),
  );
  const goldRate = Number(activeRate?.rate_per_gram || form.gold_rate_per_gram) || 0;
  const rateUnit = activeRate?.rate_unit === 'carat' || isDiamond ? 'Carat' : 'Gram';
  const metalValue = netWeight * goldRate;
  const makingAmount = form.making_charge_type === 'Percentage'
    ? metalValue * (Number(form.making_charge) || Number(rates?.making_charge_value) || 0) / 100
    : Number(form.making_charge) || 0;
  const effectiveWastageType = form.wastage_type || 'Percentage';
  const wastageValue = Number(form.wastage) || Number(rates?.wastage_percentage) || 0;
  const wastageAmount = (effectiveWastageType === 'Percentage'
    ? netWeight * wastageValue / 100
    : wastageValue) * goldRate;
  const subtotal = metalValue + makingAmount + wastageAmount +
    (Number(form.stone_charges) || 0) + (Number(form.other_charges) || 0);
  const tax = subtotal * (Number(form.gst_rate) || 0) / 100;
  const estimatedTotal = form.price_includes_gst ? subtotal : subtotal + tax;
  const mrp = form.mrp.trim() ? Number(form.mrp) || 0 : estimatedTotal;
  const discount = form.offer_type === 'Percentage'
    ? estimatedTotal * (Number(form.offer) || 0) / 100
    : form.offer_type === 'Fixed Amount'
      ? Number(form.fixed_discount_amount) || 0
      : 0;
  const offerPrice = Math.max(0, estimatedTotal - Math.min(estimatedTotal, discount));
  const purityOptions = useMemo(() => {
    const active = rates?.rates?.filter(rate =>
      String(rate.metal_type).toLowerCase() === form.metal_type.toLowerCase(),
    ) || [];
    const values = active.map(rate => String(rate.purity || '').trim()).filter(Boolean);
    const labels: Record<string, string> = {
      '999': '24K / 999',
      '916': '22K / 916',
      '833': '20K / 833',
      '750': '18K / 750',
      '585': '14K / 585',
    };
    const currentPurity = active.find(rate =>
      String(rate.purity) === form.purity || labels[String(rate.purity)] === form.purity,
    )?.purity;
    const options = [...new Set(values)].map(value => ({
      value: value === currentPurity ? form.purity : value,
      label: labels[value] || value,
    }));
    return options.length ? options : metals
      .filter(metal => metal.name === form.metal_type && metal.purity)
      .map(metal => ({ value: metal.purity || '', label: metal.purity || '' }));
  }, [form.metal_type, form.purity, metals, rates]);

  const uploadFiles = async (field: 'images' | 'video' | 'size_guide_chart' | 'certificate', files: LocalFile[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const body = new FormData();
      files.forEach(file => body.append(field, { uri: file.uri, name: file.name, type: file.type }));
      const response = await api.post<Record<string, string[] | string>>('/products/upload-media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (field === 'images') {
        const uploaded = response.data.images;
        if (!Array.isArray(uploaded)) throw new Error('The server did not return uploaded images.');
        setField('images', [...form.images, ...uploaded]);
      } else {
        const path = response.data[field];
        if (typeof path !== 'string' || !path) throw new Error('The server did not return the uploaded file path.');
        setField(field, path);
      }
      showAlert('Upload complete', 'The selected file was uploaded successfully.', { variant: 'success' });
    } catch (error) {
      showAlert('Upload failed', inventoryError(error), { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const chooseImages = async () => {
    const remaining = 10 - form.images.length;
    if (remaining <= 0) {
      showAlert('Image limit reached', 'Upload up to 10 product images.', { variant: 'warning' });
      return;
    }
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (response.didCancel) return;
    if (response.errorCode) {
      showAlert('Could not select images', response.errorMessage || 'Please try again.', { variant: 'error' });
      return;
    }
    const assets = (response.assets || []).filter(asset => asset.uri);
    const invalid = assets.find(asset =>
      (asset.fileSize || 0) > 5 * 1024 * 1024 ||
      (asset.type && !['image/jpeg', 'image/jpg', 'image/png'].includes(asset.type.toLowerCase())),
    );
    if (invalid) {
      showAlert('Invalid image', 'Choose JPG or PNG images that are 5 MB or smaller.', { variant: 'warning' });
      return;
    }
    await uploadFiles('images', assets.map((asset, index) => ({
      uri: asset.uri!,
      name: asset.fileName || `product-${Date.now()}-${index}.jpg`,
      type: asset.type || 'image/jpeg',
      size: asset.fileSize,
    })));
  };

  const chooseVideo = async () => {
    const response = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
    if (response.didCancel) return;
    if (response.errorCode) {
      showAlert('Could not select video', response.errorMessage || 'Please try again.', { variant: 'error' });
      return;
    }
    const asset = response.assets?.[0];
    if (!asset?.uri) return;
    if (asset.type !== 'video/mp4' || (asset.fileSize || 0) > 25 * 1024 * 1024) {
      showAlert('Invalid video', 'Choose an MP4 video no larger than 25 MB.', { variant: 'warning' });
      return;
    }
    await uploadFiles('video', [{
      uri: asset.uri,
      name: asset.fileName || `product-video-${Date.now()}.mp4`,
      type: asset.type,
      size: asset.fileSize,
    }]);
  };

  const chooseDocument = async (field: 'size_guide_chart' | 'certificate') => {
    try {
      const [document] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
        mode: 'import',
      });
      if (!document.hasRequestedType) {
        showAlert('Unsupported file', 'Choose a PDF, JPG, or PNG file.', { variant: 'warning' });
        return;
      }
      const fileName = (document.name || '').toLowerCase();
      const allowedType = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(
        (document.type || '').toLowerCase(),
      );
      const allowedExtension = ['.pdf', '.jpg', '.jpeg', '.png'].some(extension =>
        fileName.endsWith(extension),
      );
      if (!allowedType && !allowedExtension) {
        showAlert('Unsupported file', 'Choose a PDF, JPG, or PNG file.', { variant: 'warning' });
        return;
      }
      if ((document.size || 0) > 5 * 1024 * 1024) {
        showAlert('File is too large', 'Choose a file no larger than 5 MB.', { variant: 'warning' });
        return;
      }
      const type = document.type || (fileName.endsWith('.pdf')
        ? 'application/pdf'
        : fileName.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg');
      await uploadFiles(field, [{
        uri: document.uri,
        name: document.name || `${field}-${Date.now()}`,
        type,
        size: document.size || undefined,
      }]);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === 'OPERATION_CANCELED') return;
      showAlert('Could not select file', inventoryError(error), { variant: 'error' });
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.product_code.trim() || !form.category) {
      showAlert('Required fields missing', 'Product name, SKU/product code, and category are required.', {
        variant: 'warning',
      });
      return;
    }
    if (mrp <= 0) {
      showAlert('MRP required', 'Enter an MRP or provide enough pricing details to calculate one.', {
        variant: 'warning',
      });
      return;
    }
    if (form.offer_type === 'Percentage' && (Number(form.offer) || 0) > 100) {
      showAlert('Invalid discount', 'Percentage discount cannot exceed 100%.', { variant: 'warning' });
      return;
    }
    if (!isDiamond && stoneWeight > grossWeight) {
      showAlert('Invalid stone weight', 'Stone weight cannot exceed gross weight.', { variant: 'warning' });
      return;
    }
    const stock = Math.max(0, Math.floor(Number(form.total_stock) || 0));
    const payload = {
      ...form,
      name: form.name.trim(),
      product_code: form.product_code.trim(),
      brand: form.brand.trim() || 'Sri Gold',
      total_stock: stock,
      stock_status: stock <= 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock',
      mrp: Number(mrp.toFixed(2)),
      offer: Number(form.offer) || 0,
      offer_type: form.offer_type || 'None',
      fixed_discount_amount: Number(form.fixed_discount_amount) || 0,
      offer_price: Number(offerPrice.toFixed(2)),
      discount: Number(Math.min(estimatedTotal, discount).toFixed(2)),
      gst_rate: Number(form.gst_rate) || 0,
      final_selling_price: Number(offerPrice.toFixed(2)),
      gross_weight: grossWeight,
      net_gold_weight: netWeight,
      gold_rate_per_gram: goldRate,
      making_charge: Number(form.making_charge) || 0,
      wastage: Number(form.wastage) || 0,
      stone_weight: stoneWeight,
      stone_charges: Number(form.stone_charges) || 0,
      other_charges: Number(form.other_charges) || 0,
      rating: Number(form.rating) || 0,
      total_reviews: Number(form.total_reviews) || 0,
      price_includes_gst: Boolean(form.price_includes_gst),
      images: form.images,
      variants: form.variants.length
        ? form.variants.map((variant, index) => ({
            ...variant,
            ...(index === 0 ? { images: form.images } : {}),
          }))
        : [{ images: form.images }],
    };
    setSaving(true);
    try {
      if (productId) {
        await api.put(`/products/${productId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      showAlert('Product saved', `${form.name.trim()} was saved successfully.`, { variant: 'success' });
      onSaved();
    } catch (error) {
      showAlert('Could not save product', inventoryError(error), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <View className="flex-1 bg-[#F8F7F2]">
        <InnerHeader title={productId ? 'Edit Product' : 'Add Product'} sectionLabel="Shop Inventory" onBack={onBack} />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#07564B" /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8F7F2]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerHeader title={productId ? 'Edit Product' : 'Add Product'} sectionLabel="Shop Inventory" onBack={onBack} />
      <ScrollView
        contentContainerClassName="p-4 pb-[42px]"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Section title="1. Basic Information">
          <Field label="Product Name" value={form.name} onChangeText={value => setField('name', value)} placeholder="e.g. Classic Gold Chain" required />
          <Field label="SKU / Product Code (Auto-generated)" value={form.product_code} onChangeText={() => {}} placeholder="Generating..." required readOnly />
          <CustomDropdown
            label="Category"
            value={form.category}
            options={categories.map(item => ({ value: item.name, label: item.name }))}
            onSelect={value => {
              const nextCategory = categories.find(item => item.name === value);
              const subs = parseArray(nextCategory?.subcategory);
              setForm(current => ({
                ...current,
                category: value,
                subcategory: subs.includes(current.subcategory) ? current.subcategory : subs[0] || '',
              }));
            }}
            placeholder="Select category"
            searchable
            required
          />
          <CustomDropdown
            label="Subcategory"
            value={form.subcategory}
            options={subcategoryOptions}
            onSelect={value => setField('subcategory', value)}
            placeholder="Select subcategory"
            searchable
          />
          <CustomDropdown
            label="Metal Type"
            value={form.metal_type}
            options={metals.map(item => ({
              value: item.name,
              label: item.purity ? `${item.name} (${item.purity})` : item.name,
            }))}
            onSelect={value => {
              const rateOptions = rates?.rates?.filter(item =>
                String(item.metal_type).toLowerCase() === value.toLowerCase(),
              ) || [];
              setForm(current => ({
                ...current,
                metal_type: value,
                purity: rateOptions.some(item => item.purity === current.purity)
                  ? current.purity
                  : String(rateOptions[0]?.purity || ''),
              }));
            }}
            placeholder="Select metal type"
            searchable
          />
          <CustomDropdown
            label="Product Type"
            value={form.product_type}
            options={['Traditional', 'Daily Wear', 'Bridal', 'Designer'].map(value => ({ value, label: value }))}
            onSelect={value => setField('product_type', value)}
          />
        </Section>

        <Section title={`2. ${isDiamond ? 'Diamond' : 'Metal'} Details`}>
          <CustomDropdown
            label={isDiamond ? 'Diamond Grade' : 'Purity'}
            value={form.purity}
            options={purityOptions}
            onSelect={value => setField('purity', value)}
            placeholder={isDiamond ? 'Select grade' : 'Select purity'}
          />
          <Field label="Gross Weight (g)" value={form.gross_weight} onChangeText={value => setField('gross_weight', value)} keyboardType="decimal-pad" placeholder="10" />
          <Field
            label={isDiamond ? 'Net Diamond Weight (ct)' : 'Net Metal Weight (g)'}
            value={isDiamond ? form.net_gold_weight : form.gross_weight ? netWeight.toFixed(3) : ''}
            onChangeText={value => setField('net_gold_weight', value)}
            keyboardType="decimal-pad"
            placeholder={isDiamond ? 'e.g. 0.50' : 'Auto-calculated'}
            readOnly={!isDiamond}
          />
          <Field label={`Rate / ${rateUnit} (₹)`} value={goldRate ? String(goldRate) : ''} onChangeText={() => {}} readOnly placeholder="No active rate" keyboardType="decimal-pad" />
          <ChoiceChips
            label="Making Charge Type"
            value={form.making_charge_type}
            options={[
              { value: 'Percentage', label: 'Percentage' },
              { value: 'Fixed Amount', label: 'Fixed Amount' },
            ]}
            onSelect={value => setField('making_charge_type', value)}
          />
          <Field label={form.making_charge_type === 'Percentage' ? 'Making Charge (%)' : 'Making Charge (₹)'} value={form.making_charge} onChangeText={value => setField('making_charge', value)} keyboardType="decimal-pad" />
          <ChoiceChips
            label="Wastage Type"
            value={form.wastage_type}
            options={[
              { value: 'Percentage', label: 'Percentage' },
              { value: 'Grams', label: 'Grams' },
            ]}
            onSelect={value => setField('wastage_type', value)}
          />
          <Field label={form.wastage_type === 'Percentage' ? 'Wastage (%)' : 'Wastage (g)'} value={form.wastage} onChangeText={value => setField('wastage', value)} keyboardType="decimal-pad" />
          <Field label="Stone Weight (g)" value={form.stone_weight} onChangeText={value => setField('stone_weight', value)} keyboardType="decimal-pad" />
          <Field label="Stone Charges (₹)" value={form.stone_charges} onChangeText={value => setField('stone_charges', value)} keyboardType="decimal-pad" />
          <CustomDropdown
            label="Stone Type"
            value={form.stone_type}
            options={['None', 'Diamond', 'Ruby', 'Other'].map(value => ({ value, label: value }))}
            onSelect={value => setField('stone_type', value)}
          />
          <Field label="Hallmark / HUID" value={form.huid} onChangeText={value => setField('huid', value)} placeholder="Verified HUID" />
          <Text className="rounded-xl bg-[#FFF8E6] p-3 text-xs leading-5 text-[#6B5212]">
            Estimated metal {currency(metalValue)} + making {currency(makingAmount)} + wastage {currency(wastageAmount)} + stones {currency(form.stone_charges)} + tax {currency(tax)}.
            {rates?.rate_date ? ` Active rate date: ${rates.rate_date}.` : ''}
          </Text>
        </Section>

        <Section title="3. Size & Dimensions">
          <Field
            label="Available Sizes"
            value={form.available_sizes.join(', ')}
            onChangeText={value => setField('available_sizes', value.split(',').map(item => item.trim()).filter(Boolean))}
            placeholder="12, 14, 16, 18 inches"
          />
          <CustomDropdown
            label="Product Size"
            value={form.product_size}
            options={['Small', 'Medium', 'Large', 'Free Size'].map(value => ({ value, label: value }))}
            onSelect={value => setField('product_size', value)}
            placeholder="Select size"
          />
          <Field label="Length" value={form.length} onChangeText={value => setField('length', value)} placeholder="18 inches" />
          <Field label="Width" value={form.width} onChangeText={value => setField('width', value)} placeholder="5 mm" />
          <Field label="Height / Thickness" value={form.height} onChangeText={value => setField('height', value)} placeholder="2 mm" />
          <Field label="Ring Size" value={form.ring_size} onChangeText={value => setField('ring_size', value)} placeholder="As applicable" />
          <Field label="Bangle Size" value={form.bangle_size} onChangeText={value => setField('bangle_size', value)} placeholder="As applicable" />
          <Field label="Chain Length" value={form.chain_length} onChangeText={value => setField('chain_length', value)} placeholder="18 inches" />
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">Size Guide Chart</Text>
          {form.size_guide_chart ? (
            <View className="mb-3 flex-row items-center justify-between rounded-xl bg-[#EAF3EF] p-3">
              <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-[#07564B]">Size guide uploaded</Text>
              <Pressable accessibilityLabel="Remove size guide" onPress={() => setField('size_guide_chart', '')}>
                <X size={18} color="#B42332" />
              </Pressable>
            </View>
          ) : null}
          <Pressable onPress={() => chooseDocument('size_guide_chart')} className="mb-2 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BB6AA]">
            <ImagePlus size={18} color="#07564B" /><Text className="font-bold text-[#07564B]">Upload size chart image or PDF</Text>
          </Pressable>
          <Text className="text-xs text-[#6B7E76]">PNG, JPG, PDF up to 5 MB</Text>
        </Section>

        <Section title="4. Pricing & Offers">
          <Field label="MRP (₹)" value={form.mrp} onChangeText={value => setField('mrp', value)} placeholder={estimatedTotal ? estimatedTotal.toFixed(2) : 'Enter MRP'} keyboardType="decimal-pad" required />
          <Text className="mb-4 -mt-2 text-xs text-[#6B7E76]">Estimated jewellery price: {currency(estimatedTotal)}. Leave empty to use this estimate.</Text>
          <CustomDropdown
            label="Offer Type"
            value={form.offer_type}
            options={[
              { value: 'None', label: 'No offer' },
              { value: 'Percentage', label: 'Percentage discount' },
              { value: 'Fixed Amount', label: 'Fixed amount discount' },
            ]}
            onSelect={value => setField('offer_type', value)}
          />
          {form.offer_type === 'Percentage' ? (
            <Field label="Discount (%)" value={form.offer} onChangeText={value => setField('offer', value)} keyboardType="decimal-pad" />
          ) : null}
          {form.offer_type === 'Fixed Amount' ? (
            <Field label="Fixed Discount (₹)" value={form.fixed_discount_amount} onChangeText={value => setField('fixed_discount_amount', value)} keyboardType="decimal-pad" />
          ) : null}
          <Field label="Offer Price (₹)" value={offerPrice.toFixed(2)} onChangeText={() => {}} readOnly keyboardType="decimal-pad" />
          <Field label="Other Charges (₹)" value={form.other_charges} onChangeText={value => setField('other_charges', value)} keyboardType="decimal-pad" />
          <Field label="GST (%)" value={form.gst_rate} onChangeText={value => setField('gst_rate', value)} keyboardType="decimal-pad" />
          <CheckOption label="Price includes GST" checked={form.price_includes_gst} onPress={() => setField('price_includes_gst', !form.price_includes_gst)} />
        </Section>

        <Section title="5. Product Content">
          <Field label="Full Description" value={form.full_description} onChangeText={value => setField('full_description', value)} multiline placeholder="Detailed product description..." />
          <Field label="Care Instructions" value={form.care_instructions} onChangeText={value => setField('care_instructions', value)} multiline placeholder="Store safely and clean appropriately..." />
        </Section>

        <Section title="6. Media & Uploads">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">Main Product Images (up to 10)</Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {form.images.map((image, index) => (
              <View key={`${image}-${index}`} className="relative">
                <Image source={{ uri: mediaUrl(image) }} className="h-20 w-20 rounded-xl bg-[#F3F4F1]" />
                <Pressable
                  accessibilityLabel="Remove product image"
                  onPress={() => setField('images', form.images.filter((_, itemIndex) => itemIndex !== index))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1">
                  <X size={13} color="white" />
                </Pressable>
              </View>
            ))}
          </View>
          {form.images.length < 10 ? (
            <Pressable disabled={uploading} onPress={chooseImages} className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BB6AA]">
              <ImagePlus size={18} color="#07564B" /><Text className="font-bold text-[#07564B]">Upload product images</Text>
            </Pressable>
          ) : null}
          <Text className="mb-4 mt-2 text-xs text-[#6B7E76]">JPG / PNG up to 5 MB each</Text>
          {(['video', 'certificate'] as const).map(field => (
            <View key={field} className="mb-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">{field === 'video' ? 'Product Video' : 'Certificate Upload'}</Text>
              {form[field] ? (
                <View className="mb-2 flex-row items-center justify-between rounded-xl bg-[#EAF3EF] p-3">
                  <Text className="flex-1 text-sm font-semibold text-[#07564B]">{field === 'video' ? 'Video uploaded' : 'Certificate uploaded'}</Text>
                  <Pressable accessibilityLabel={`Remove ${field}`} onPress={() => setField(field, '')}>
                    <X size={18} color="#B42332" />
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                disabled={uploading}
                onPress={field === 'video' ? chooseVideo : () => chooseDocument('certificate')}
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BB6AA]">
                <ImagePlus size={18} color="#07564B" />
                <Text className="font-bold text-[#07564B]">{field === 'video' ? 'Upload optional MP4 video' : 'Upload certificate'}</Text>
              </Pressable>
              <Text className="mt-2 text-xs text-[#6B7E76]">{field === 'video' ? 'MP4 up to 25 MB' : 'PNG, JPG, PDF up to 5 MB'}</Text>
            </View>
          ))}
          {uploading ? <Text className="text-center text-sm font-semibold text-[#07564B]">Uploading selected media...</Text> : null}
        </Section>

        <Section title="7. Ratings & Reviews">
          <Field label="Average Rating (1–5)" value={form.rating} onChangeText={value => setField('rating', value)} keyboardType="decimal-pad" />
        </Section>

        <Section title="8. Inventory & Publishing">
          <Field label="Stock Quantity" value={form.total_stock} onChangeText={value => setField('total_stock', value)} keyboardType="numeric" />
          <CustomDropdown
            label="Stock Status"
            value={form.stock_status}
            options={['In Stock', 'Out of Stock', 'Low Stock'].map(value => ({ value, label: value }))}
            onSelect={value => setField('stock_status', value)}
          />
          <Field label="Warehouse / Location" value={form.warehouse} onChangeText={value => setField('warehouse', value)} placeholder="Main Shop" />
          <CustomDropdown
            label="Product Status"
            value={form.status}
            options={['Active', 'Draft', 'Inactive'].map(value => ({ value, label: value }))}
            onSelect={value => setField('status', value)}
          />
          <View className="mt-2 flex-row flex-wrap">
            <CheckOption label="Featured Product" checked={form.featured} onPress={() => setField('featured', !form.featured)} />
            <CheckOption label="New Arrival" checked={form.new_arrival} onPress={() => setField('new_arrival', !form.new_arrival)} />
            <CheckOption label="Best Seller" checked={form.best_seller} onPress={() => setField('best_seller', !form.best_seller)} />
          </View>
        </Section>

        <SubmitButton
          label={productId ? 'Update Product' : 'Save Product'}
          loading={saving || uploading}
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
