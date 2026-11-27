import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Bell, LogOut, Package, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';

type HeaderDropdown = 'notifications' | 'low-stock';

type LowStockProduct = {
  id: string | number;
  name?: string;
  category?: string;
  total_stock?: number | string;
  sku_barcode?: string;
};

type AdminHeaderProps = {
  adminName: string;
  adminEmail: string;
  onProfilePress: () => void;
  onLogout: () => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

export default function AdminHeader({
  adminName,
  adminEmail,
  onProfilePress,
  onLogout,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<HeaderDropdown | null>(
    null,
  );
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>(
    [],
  );
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [lowStockError, setLowStockError] = useState('');
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';

  const loadLowStockProducts = useCallback(async () => {
    setLoadingLowStock(true);
    setLowStockError('');
    try {
      const response = await api.get('/products/mine', {
        params: { page: 1, limit: 8, stockStatus: 'low-stock' },
      });
      if (!Array.isArray(response.data?.products)) {
        throw new Error('The server returned an invalid low-stock list.');
      }
      setLowStockProducts(response.data.products);
    } catch (error) {
      setLowStockError(
        getErrorMessage(error, 'Unable to load low-stock products.'),
      );
    } finally {
      setLoadingLowStock(false);
    }
  }, []);

  const toggleDropdown = (dropdown: HeaderDropdown) => {
    setIsAccountMenuOpen(false);
    if (activeDropdown === dropdown) {
      setActiveDropdown(null);
      return;
    }
    setActiveDropdown(dropdown);
    if (dropdown === 'low-stock') {
      loadLowStockProducts();
    }
  };

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      className="border-b border-gray-100 px-4 pb-3"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="h-12 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            accessibilityLabel="Sri Golds logo"
            source={require('../../Assert/Images/App icon.png')}
            resizeMode="cover"
            className="mr-3 h-11 w-11 rounded-lg"
          />
          <View>
            <Text className="text-[16px] font-extrabold leading-5 text-white">
              Sri GoldSuite
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#FFE08A]">
              Shop Admin
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            accessibilityState={{
              expanded: activeDropdown === 'notifications',
            }}
            onPress={() => toggleDropdown('notifications')}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Bell size={19} color="#FFF8E7" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Low stock products"
            accessibilityState={{ expanded: activeDropdown === 'low-stock' }}
            onPress={() => toggleDropdown('low-stock')}
            className="relative h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Package size={19} color="#FFF8E7" />
            {lowStockProducts.length > 0 ? (
              <View className="absolute right-0.5 top-0.5 min-h-4 min-w-4 items-center justify-center rounded-full bg-[#B42332] px-1">
                <Text className="text-[9px] font-extrabold text-white">
                  {lowStockProducts.length > 9 ? '9+' : lowStockProducts.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isAccountMenuOpen ? 'Close account menu' : 'Open account menu'
            }
            accessibilityState={{ expanded: isAccountMenuOpen }}
            onPress={() => {
              setActiveDropdown(null);
              setIsAccountMenuOpen(open => !open);
            }}
            className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37]"
          >
            <Text className="text-[16px] font-bold text-white">{initial}</Text>
          </Pressable>
        </View>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={activeDropdown !== null}
        statusBarTranslucent
        onRequestClose={() => setActiveDropdown(null)}
      >
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dropdown"
            onPress={() => setActiveDropdown(null)}
            className="absolute inset-0 bg-black/10"
          />
          <View
            style={{ top: insets.top + 62 }}
            className="absolute right-4 max-h-[70%] w-80 overflow-hidden rounded-2xl border border-[#ECE7D8] bg-white shadow-2xl"
          >
            <View className="flex-row items-center justify-between border-b border-[#F1F2EE] px-4 py-3">
              <Text className="text-sm font-extrabold text-[#173F35]">
                {activeDropdown === 'low-stock' ? 'Low Stock' : 'Notifications'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dropdown"
                onPress={() => setActiveDropdown(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6]"
              >
                <X size={16} color="#6B7280" />
              </Pressable>
            </View>
            {activeDropdown === 'low-stock' ? (
              loadingLowStock ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#B8860B" />
                  <Text className="mt-2 text-xs text-[#6B7280]">
                    Loading low-stock products…
                  </Text>
                </View>
              ) : lowStockError ? (
                <View className="items-center px-4 py-6">
                  <Text className="text-center text-xs text-[#B42332]">
                    {lowStockError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={loadLowStockProducts}
                    className="mt-3 rounded-lg bg-[#E8F3EF] px-4 py-2"
                  >
                    <Text className="text-xs font-bold text-[#07564B]">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : lowStockProducts.length === 0 ? (
                <View className="items-center px-4 py-8">
                  <Package size={24} color="#08745D" />
                  <Text className="mt-2 text-sm font-bold text-[#173F35]">
                    All products are stocked
                  </Text>
                  <Text className="mt-1 text-center text-xs text-[#6B7280]">
                    There are no low-stock products right now.
                  </Text>
                </View>
              ) : (
                <ScrollView className="max-h-[420px]">
                  {lowStockProducts.map(product => (
                    <View
                      key={product.id}
                      className="flex-row items-center border-b border-[#F1F2EE] px-4 py-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7]">
                        <Package size={16} color="#A16207" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-xs font-bold text-[#173F35]"
                        >
                          {product.name || 'Unnamed product'}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="mt-1 text-[10px] text-[#6B7280]"
                        >
                          {product.category ||
                            product.sku_barcode ||
                            'Inventory'}
                        </Text>
                      </View>
                      <Text className="ml-2 text-xs font-extrabold text-[#B42332]">
                        {Number(product.total_stock) || 0} left
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )
            ) : (
              <View className="items-center px-4 py-8">
                <Bell size={24} color="#B8860B" />
                <Text className="mt-2 text-sm font-bold text-[#173F35]">
                  No new notifications
                </Text>
                <Text className="mt-1 text-center text-xs text-[#6B7280]">
                  You’re all caught up.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={isAccountMenuOpen}
        statusBarTranslucent
        onRequestClose={() => setIsAccountMenuOpen(false)}
      >
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss account menu"
            onPress={() => setIsAccountMenuOpen(false)}
            className="absolute inset-0 bg-black/10"
          />
          <View
            style={{ top: insets.top + 62 }}
            className="absolute right-4 w-72 overflow-hidden rounded-2xl border border-[#ECE7D8] bg-white shadow-2xl"
          >
            <View className="border-b border-[#F1F2EE] px-4 py-4">
              <Text
                numberOfLines={1}
                className="text-sm font-extrabold text-[#173F35]"
              >
                {adminName}
              </Text>
              <Text numberOfLines={1} className="mt-1 text-xs text-[#6B7280]">
                {adminEmail || 'Email not available'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Admin profile"
              onPress={() => {
                setIsAccountMenuOpen(false);
                onProfilePress();
              }}
              className="px-4 py-3.5"
            >
              <Text className="text-sm font-semibold text-[#173F35]">
                Profile
              </Text>
            </Pressable>
            <View className="h-px bg-[#F1F2EE]" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => {
                setIsAccountMenuOpen(false);
                showAlert('Log out?', 'Are you sure you want to log out?', {
                  variant: 'warning',
                  buttons: [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log out',
                      style: 'destructive',
                      onPress: onLogout,
                    },
                  ],
                });
              }}
              className="flex-row items-center px-4 py-3.5"
            >
              <LogOut size={16} color="#B42332" />
              <Text className="ml-2 text-sm font-bold text-[#B42332]">
                Logout
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}
