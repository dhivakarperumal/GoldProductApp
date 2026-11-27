import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Gem,
  HandCoins,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  Shapes,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';
import type { MoreScreen } from '../More/More';
import type { AdminTab } from './AdminTabBar';

export type AdminDrawerTarget =
  | { kind: 'tab'; tab: AdminTab }
  | { kind: 'loan'; screen: 'createLoan' | 'createCustomer' }
  | { kind: 'product'; screen: 'addProduct' }
  | { kind: 'more'; screen: MoreScreen };

type HeaderDropdown = 'notifications' | 'low-stock';

type LowStockProduct = {
  id: string | number;
  name?: string;
  category?: string;
  total_stock?: number | string;
  sku_barcode?: string;
};

type TackOrderNotification = {
  id: number | string;
  order_no?: string;
  order_status?: string;
  total_amount?: number | string;
  customer?: { name?: string; phone?: string };
  items?: unknown[];
  created_at?: string;
};

type DrawerItem = {
  id: string;
  label: string;
  icon: typeof Home;
  target: AdminDrawerTarget;
  matchScreens: string[];
};

type DrawerSection = {
  title: string;
  items: DrawerItem[];
};

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: 'Main Menu',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        target: { kind: 'tab', tab: 'Dashboard' },
        matchScreens: ['Dashboard'],
      },
      {
        id: 'orders',
        label: 'Orders & Billing',
        icon: ShoppingBag,
        target: { kind: 'tab', tab: 'Orders' },
        matchScreens: ['Orders'],
      },
      {
        id: 'loans',
        label: 'Gold Loans',
        icon: HandCoins,
        target: { kind: 'tab', tab: 'Loans' },
        matchScreens: ['Loans:list'],
      },
      {
        id: 'products',
        label: 'Products',
        icon: Gem,
        target: { kind: 'tab', tab: 'Products' },
        matchScreens: ['Products:all'],
      },
      {
        id: 'more',
        label: 'More Hub',
        icon: LayoutGrid,
        target: { kind: 'tab', tab: 'More' },
        matchScreens: ['More:home'],
      },
    ],
  },
  {
    title: 'Quick Actions',
    items: [
      {
        id: 'createLoan',
        label: 'New Gold Loan',
        icon: Plus,
        target: { kind: 'loan', screen: 'createLoan' },
        matchScreens: ['Loans:createLoan'],
      },
      {
        id: 'createCustomer',
        label: 'New Customer',
        icon: Users,
        target: { kind: 'loan', screen: 'createCustomer' },
        matchScreens: ['Loans:createCustomer'],
      },
      {
        id: 'addProduct',
        label: 'Add Product',
        icon: Package,
        target: { kind: 'product', screen: 'addProduct' },
        matchScreens: ['Products:addProduct'],
      },
    ],
  },
  {
    title: 'Shop & Inventory',
    items: [
      {
        id: 'dailyRates',
        label: 'Daily Gold Rate',
        icon: Settings2,
        target: { kind: 'more', screen: 'dailyRates' },
        matchScreens: ['More:dailyRates'],
      },
      {
        id: 'stockDetails',
        label: 'Stock Details',
        icon: Package,
        target: { kind: 'more', screen: 'stockDetails' },
        matchScreens: ['More:stockDetails', 'Products:stock'],
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: Shapes,
        target: { kind: 'more', screen: 'categories' },
        matchScreens: ['More:categories', 'Products:categories'],
      },
      {
        id: 'metals',
        label: 'Metals',
        icon: Gem,
        target: { kind: 'more', screen: 'metals' },
        matchScreens: ['More:metals', 'Products:metals'],
      },
    ],
  },
  {
    title: 'Accounts & Reports',
    items: [
      {
        id: 'funds',
        label: 'Fund Management',
        icon: CircleDollarSign,
        target: { kind: 'more', screen: 'funds' },
        matchScreens: ['More:funds'],
      },
      {
        id: 'dealers',
        label: 'Dealer Management',
        icon: Store,
        target: { kind: 'more', screen: 'dealers' },
        matchScreens: ['More:dealers'],
      },
      {
        id: 'dealerPurchases',
        label: 'Dealer Purchases',
        icon: ClipboardList,
        target: { kind: 'more', screen: 'dealerPurchases' },
        matchScreens: ['More:dealerPurchases'],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: ChartNoAxesColumnIncreasing,
        target: { kind: 'more', screen: 'reports' },
        matchScreens: ['More:reports'],
      },
      {
        id: 'receiptSettings',
        label: 'Receipt Settings',
        icon: ReceiptText,
        target: { kind: 'more', screen: 'receiptSettings' },
        matchScreens: ['More:receiptSettings'],
      },
    ],
  },
];

type AdminHeaderProps = {
  adminName: string;
  adminEmail: string;
  activeScreen?: string;
  onNavigate?: (target: AdminDrawerTarget) => void;
  onProfilePress: () => void;
  onLogout: () => void;
};

const styles = StyleSheet.create({
  headerShadow: {
    elevation: 6,
    shadowColor: '#0D2C24',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarShadow: {
    elevation: 4,
    shadowColor: '#0D2C24',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownShadow: {
    elevation: 16,
    shadowColor: '#0D2C24',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  drawerShadow: {
    elevation: 20,
    shadowColor: '#091E19',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 6, height: 0 },
  },
  drawerContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerScrim: {
    backgroundColor: 'rgba(15, 44, 37, 0.38)',
  },
  backdrop: {
    backgroundColor: 'rgba(13, 44, 36, 0.24)',
  },
});

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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isCreatedToday(value?: string) {
  if (!value) return false;
  const createdAt = new Date(value);
  return (
    !Number.isNaN(createdAt.getTime()) &&
    dateKey(createdAt) === dateKey(new Date())
  );
}

function formatOrderTime(value?: string) {
  if (!value) return 'Time unavailable';
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'Time unavailable';
  return createdAt.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
}

export default function AdminHeader({
  adminName,
  adminEmail,
  activeScreen = 'Dashboard',
  onNavigate,
  onProfilePress,
  onLogout,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<HeaderDropdown | null>(
    null,
  );
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>(
    [],
  );
  const [lowStockTotal, setLowStockTotal] = useState<number | null>(null);
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [lowStockError, setLowStockError] = useState('');
  const [todayTackOrders, setTodayTackOrders] = useState<
    TackOrderNotification[]
  >([]);
  const [loadingTackOrders, setLoadingTackOrders] = useState(false);
  const [tackOrdersError, setTackOrdersError] = useState('');
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';

  const windowDimensions = Dimensions.get('window');
  const drawerWidth = Math.min(312, Math.round(windowDimensions.width * 0.84));
  const drawerTranslateX = useRef(new Animated.Value(-320)).current;
  const notificationPanelWidth = Math.min(350, windowDimensions.width - 28);
  const profilePanelWidth = Math.min(284, windowDimensions.width - 28);
  const dropdownTop = insets.top + 64;
  const maxListHeight = Math.max(180, windowDimensions.height - insets.top - 220);

  const loadLowStockProducts = useCallback(async () => {
    setLoadingLowStock(true);
    setLowStockError('');
    try {
      const response = await api.get('/products/mine', {
        params: { page: 1, limit: 15, stockStatus: 'low-stock' },
      });
      if (!Array.isArray(response.data?.products)) {
        throw new Error('The server returned an invalid low-stock list.');
      }
      setLowStockProducts(response.data.products);
      const statsCount = Number(response.data?.stats?.lowStock);
      setLowStockTotal(
        Number.isFinite(statsCount)
          ? statsCount
          : response.data.products.length,
      );
    } catch (error) {
      setLowStockError(
        getErrorMessage(error, 'Unable to load low-stock products.'),
      );
    } finally {
      setLoadingLowStock(false);
    }
  }, []);

  const loadTodayTackOrders = useCallback(async () => {
    setLoadingTackOrders(true);
    setTackOrdersError('');
    try {
      const response = await api.get('/tack-orders');
      if (!Array.isArray(response.data)) {
        throw new TypeError('The server returned an invalid take-orders list.');
      }
      setTodayTackOrders(
        response.data.filter(
          (order: TackOrderNotification) =>
            order && isCreatedToday(order.created_at),
        ),
      );
    } catch (error) {
      setTackOrdersError(
        getErrorMessage(error, "Unable to load today's take orders."),
      );
    } finally {
      setLoadingTackOrders(false);
    }
  }, []);

  useEffect(() => {
    loadLowStockProducts();
    loadTodayTackOrders();
  }, [loadLowStockProducts, loadTodayTackOrders]);

  const lowStockCount = lowStockTotal ?? lowStockProducts.length;
  const todayTackOrdersCount = todayTackOrders.length;

  const openDrawer = () => {
    setIsAccountMenuOpen(false);
    setActiveDropdown(null);
    drawerTranslateX.setValue(-drawerWidth);
    setIsDrawerOpen(true);
    Animated.timing(drawerTranslateX, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const closeAllMenus = () => {
    setIsAccountMenuOpen(false);
    setActiveDropdown(null);
    setIsDrawerOpen(false);
  };

  const toggleDropdown = (dropdown: HeaderDropdown) => {
    setIsAccountMenuOpen(false);
    setIsDrawerOpen(false);
    if (activeDropdown === dropdown) {
      setActiveDropdown(null);
      return;
    }
    setActiveDropdown(dropdown);
    if (dropdown === 'low-stock') {
      loadLowStockProducts();
    } else if (dropdown === 'notifications') {
      loadTodayTackOrders();
    }
  };

  const toggleAccountMenu = () => {
    setActiveDropdown(null);
    setIsDrawerOpen(false);
    setIsAccountMenuOpen(open => !open);
  };

  const handleDrawerSelect = (target: AdminDrawerTarget) => {
    closeDrawer();
    if (onNavigate) {
      onNavigate(target);
      return;
    }
    if (target.kind === 'more' && target.screen === 'profile') {
      onProfilePress();
    }
  };

  const handleLogoutPress = () => {
    closeAllMenus();
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
  };

  return (
    <View
      testID="admin-header"
      style={[styles.headerShadow, { paddingTop: insets.top + 10 }]}
      className="z-20 overflow-hidden border-b border-[#EAD78A]/35 bg-[#153B35] px-4 pb-3"
    >
      <Image
        source={require('../../Assert/Images/bottom.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        className="h-full w-full"
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.headerScrim]}
      />

      <View className="h-12 flex-row items-center justify-between">
        <View className="mr-2 flex-1 flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            testID="admin-drawer-toggle"
            accessibilityState={{ expanded: isDrawerOpen }}
            onPress={openDrawer}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            className="mr-2 h-10 w-10 items-center justify-center rounded-xl border border-[#F4C95D]/40 bg-[#12332B]/85"
          >
            <Menu size={20} color="#FFE08A" strokeWidth={2.2} />
          </Pressable>

          <View className="mr-2 h-10 w-10 overflow-hidden rounded-xl border border-[#F5E6A8]/65 bg-[#0D2C24] p-0.5">
            <Image
              accessibilityLabel="Sri Golds logo"
              source={require('../../Assert/Images/App icon.png')}
              resizeMode="cover"
              className="h-full w-full rounded-[9px]"
            />
          </View>

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-[15px] font-extrabold leading-5 tracking-[0.2px] text-white"
            >
              Sri GoldSuite
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="rounded-full border border-[#F4C95D]/40 bg-[#F4C95D]/15 px-2 py-0.5">
                <Text
                  numberOfLines={1}
                  className="text-[8.5px] font-extrabold uppercase tracking-[1.2px] text-[#FFE08A]"
                >
                  Shop Admin
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            testID="admin-notification-toggle"
            accessibilityState={{
              expanded: activeDropdown === 'notifications',
            }}
            onPress={() => toggleDropdown('notifications')}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            className={`relative h-9 w-9 items-center justify-center rounded-full border ${
              activeDropdown === 'notifications'
                ? 'border-[#F4C95D] bg-[#F4C95D]/20'
                : 'border-white/20 bg-[#12332B]/85'
            }`}
          >
            <Bell
              size={17}
              color={activeDropdown === 'notifications' ? '#F4C95D' : '#FFF8E7'}
              strokeWidth={2.1}
            />
            {todayTackOrdersCount > 0 ? (
              <View className="absolute -right-0.5 -top-0.5 min-h-[16px] min-w-[16px] items-center justify-center rounded-full border-[1.5px] border-[#153B35] bg-[#DC2626] px-1">
                <Text className="text-[8.5px] font-extrabold leading-[11px] text-white">
                  {todayTackOrdersCount > 99 ? '99+' : todayTackOrdersCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Low stock products"
            testID="admin-low-stock-toggle"
            accessibilityState={{ expanded: activeDropdown === 'low-stock' }}
            onPress={() => toggleDropdown('low-stock')}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            className={`relative h-9 w-9 items-center justify-center rounded-full border ${
              activeDropdown === 'low-stock'
                ? 'border-[#F4C95D] bg-[#F4C95D]/20'
                : 'border-[#F4C95D]/45 bg-[#12332B]/85'
            }`}
          >
            <Package
              size={17}
              color={activeDropdown === 'low-stock' ? '#F4C95D' : '#FFE08A'}
              strokeWidth={2.1}
            />
            {lowStockCount > 0 ? (
              <View className="absolute -right-0.5 -top-0.5 min-h-[16px] min-w-[16px] items-center justify-center rounded-full border-[1.5px] border-[#153B35] bg-[#DC2626] px-1">
                <Text className="text-[8.5px] font-extrabold leading-[11px] text-white">
                  {lowStockCount > 99 ? '99+' : lowStockCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isAccountMenuOpen ? 'Close account menu' : 'Open account menu'
            }
            testID="admin-profile-toggle"
            accessibilityState={{ expanded: isAccountMenuOpen }}
            onPress={toggleAccountMenu}
            style={({ pressed }) => [
              styles.avatarShadow,
              { opacity: pressed ? 0.84 : 1 },
            ]}
            className={`h-10 w-10 items-center justify-center rounded-full border-2 bg-[#D4AF37] ${
              isAccountMenuOpen ? 'border-white' : 'border-[#F5E6A8]'
            }`}
          >
            <Text className="text-[16px] font-extrabold text-white">
              {initial}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isDrawerOpen}
        statusBarTranslucent
        onRequestClose={closeDrawer}
      >
        <View className="flex-1 flex-row">
          <Pressable
            testID="admin-drawer-backdrop"
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={closeDrawer}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />

          <Animated.View
            testID="admin-navigation-drawer"
            style={[
              styles.drawerShadow,
              {
                width: drawerWidth,
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}
            className="h-full bg-[#F8F7F2]"
          >
            <View
              style={{ paddingTop: insets.top + 14 }}
              className="overflow-hidden border-b border-[#EAD78A]/35 bg-[#153B35] px-4 pb-4"
            >
              <Image
                source={require('../../Assert/Images/bottom.png')}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
                className="h-full w-full"
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.headerScrim]}
              />

              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center pr-2">
                  <View className="mr-2.5 h-10 w-10 overflow-hidden rounded-xl border border-[#F5E6A8]/65 bg-[#0D2C24] p-0.5">
                    <Image
                      source={require('../../Assert/Images/App icon.png')}
                      resizeMode="cover"
                      className="h-full w-full rounded-[9px]"
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[16px] font-extrabold text-white"
                    >
                      Sri GoldSuite
                    </Text>
                    <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#FFE08A]">
                      Admin Navigation
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close drawer"
                  testID="admin-drawer-close"
                  onPress={closeDrawer}
                  className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#12332B]/85"
                >
                  <X size={17} color="#FFF8E7" />
                </Pressable>
              </View>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={[
                styles.drawerContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 8 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {DRAWER_SECTIONS.map(section => (
                <View key={section.title} className="mb-4">
                  <Text className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#9A7620]">
                    {section.title}
                  </Text>
                  <View className="overflow-hidden rounded-2xl bg-white">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const isActive = item.matchScreens.includes(activeScreen);

                      return (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={item.label}
                          testID={`drawer-item-${item.id}`}
                          accessibilityState={{ selected: isActive }}
                          onPress={() => handleDrawerSelect(item.target)}
                          className={`flex-row items-center px-3 py-2.5 active:bg-[#FAF7EE] ${
                            isActive ? 'bg-[#EEF6F3]' : 'bg-white'
                          }`}
                        >
                          <View
                            className={`mr-3 h-8 w-8 items-center justify-center rounded-xl ${
                              isActive ? 'bg-[#173F35]' : 'bg-[#F3F1E9]'
                            }`}
                          >
                            <Icon
                              size={16}
                              color={isActive ? '#F4C95D' : '#173F35'}
                              strokeWidth={isActive ? 2.3 : 2}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            className={`flex-1 text-[13.5px] ${
                              isActive
                                ? 'font-extrabold text-[#173F35]'
                                : 'font-semibold text-[#293832]'
                            }`}
                          >
                            {item.label}
                          </Text>
                          {isActive ? (
                            <View className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                          ) : (
                            <ChevronRight size={15} color="#A3A8A3" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View className="mb-2">
                <Text className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#9A7620]">
                  Account
                </Text>
                <View className="overflow-hidden rounded-2xl bg-white">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Admin Profile"
                    testID="drawer-item-profile"
                    onPress={() =>
                      handleDrawerSelect({ kind: 'more', screen: 'profile' })
                    }
                    className={`flex-row items-center px-3 py-2.5 active:bg-[#FAF7EE] ${
                      activeScreen === 'More:profile'
                        ? 'bg-[#EEF6F3]'
                        : 'bg-white'
                    }`}
                  >
                    <View
                      className={`mr-3 h-8 w-8 items-center justify-center rounded-xl ${
                        activeScreen === 'More:profile'
                          ? 'bg-[#173F35]'
                          : 'bg-[#E7F3EF]'
                      }`}
                    >
                      <UserRound
                        size={16}
                        color={
                          activeScreen === 'More:profile'
                            ? '#F4C95D'
                            : '#07564B'
                        }
                      />
                    </View>
                    <Text className="flex-1 text-[13.5px] font-semibold text-[#173F35]">
                      Admin Profile
                    </Text>
                    <ChevronRight size={15} color="#A3A8A3" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Logout"
                    testID="drawer-item-logout"
                    onPress={handleLogoutPress}
                    className="flex-row items-center px-3 py-2.5 active:bg-[#FEF2F2]"
                  >
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-[#FEE2E2]">
                      <LogOut size={16} color="#B42332" />
                    </View>
                    <Text className="flex-1 text-[13.5px] font-bold text-[#B42332]">
                      Logout
                    </Text>
                    <ChevronRight size={15} color="#FCA5A5" />
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={activeDropdown !== null || isAccountMenuOpen}
        statusBarTranslucent
        onRequestClose={closeAllMenus}
      >
        <View className="flex-1">
          <Pressable
            testID="admin-header-backdrop"
            accessibilityRole="button"
            accessibilityLabel="Dismiss dropdown"
            onPress={closeAllMenus}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />

          {activeDropdown !== null ? (
            <View
              testID={
                activeDropdown === 'low-stock'
                  ? 'admin-low-stock-dropdown'
                  : 'admin-notifications-dropdown'
              }
              style={[
                styles.dropdownShadow,
                { top: dropdownTop, width: notificationPanelWidth },
              ]}
              className="absolute right-3.5 overflow-hidden rounded-2xl border border-[#E8E2D2] bg-white"
            >
              <View className="border-b border-[#EFECE2] bg-[#FAF9F5] px-4 pb-3 pt-3.5">
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                      activeDropdown === 'low-stock'
                        ? 'bg-[#FEF3C7]'
                        : 'bg-[#F7EDCC]'
                    }`}
                  >
                    {activeDropdown === 'low-stock' ? (
                      <Package size={18} color="#B45309" strokeWidth={2.2} />
                    ) : (
                      <Bell size={18} color="#A77B12" strokeWidth={2.2} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#9A7620]">
                      {activeDropdown === 'low-stock'
                        ? 'Inventory Alert'
                        : "Today's Activity"}
                    </Text>
                    <Text className="mt-0.5 text-[15px] font-extrabold text-[#173F35]">
                      {activeDropdown === 'low-stock'
                        ? 'Low Stock Products'
                        : "Today's Take Orders"}
                    </Text>
                  </View>
                  <View
                    className={`mr-2 min-w-[28px] items-center rounded-full px-2 py-1 ${
                      (activeDropdown === 'low-stock'
                        ? lowStockCount
                        : todayTackOrdersCount) > 0
                        ? activeDropdown === 'low-stock'
                          ? 'bg-[#FEE2E2]'
                          : 'bg-[#F7EDCC]'
                        : 'bg-[#E7F3EF]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-extrabold ${
                        (activeDropdown === 'low-stock'
                          ? lowStockCount
                          : todayTackOrdersCount) > 0
                          ? activeDropdown === 'low-stock'
                            ? 'text-[#B42332]'
                            : 'text-[#97700D]'
                          : 'text-[#08745D]'
                      }`}
                    >
                      {activeDropdown === 'low-stock'
                        ? lowStockCount
                        : todayTackOrdersCount}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Refresh alerts"
                    disabled={
                      activeDropdown === 'low-stock'
                        ? loadingLowStock
                        : loadingTackOrders
                    }
                    onPress={
                      activeDropdown === 'low-stock'
                        ? loadLowStockProducts
                        : loadTodayTackOrders
                    }
                    className="h-8 w-8 items-center justify-center rounded-full border border-[#EAE6DA] bg-white"
                  >
                    {(
                      activeDropdown === 'low-stock'
                        ? loadingLowStock
                        : loadingTackOrders
                    ) ? (
                      <ActivityIndicator size="small" color="#08745D" />
                    ) : (
                      <RefreshCw size={14} color="#08745D" />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close dropdown"
                    onPress={closeAllMenus}
                    className="ml-1.5 h-8 w-8 items-center justify-center rounded-full border border-[#EAE6DA] bg-white"
                  >
                    <X size={15} color="#6B7280" />
                  </Pressable>
                </View>
              </View>

              {activeDropdown === 'low-stock' ? (
                loadingLowStock && lowStockProducts.length === 0 ? (
                  <View className="items-center py-9">
                    <ActivityIndicator size="large" color="#B8860B" />
                    <Text className="mt-3 text-xs font-medium text-[#6B7280]">
                      Loading low-stock products…
                    </Text>
                  </View>
                ) : lowStockError ? (
                  <View className="items-center px-5 py-8">
                    <Text className="text-center text-xs font-semibold text-[#B42332]">
                      {lowStockError}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={loadLowStockProducts}
                      className="mt-3 flex-row items-center rounded-xl bg-[#E7F3EF] px-4 py-2"
                    >
                      <RefreshCw size={13} color="#07564B" />
                      <Text className="ml-2 text-xs font-bold text-[#07564B]">
                        Try again
                      </Text>
                    </Pressable>
                  </View>
                ) : lowStockProducts.length === 0 ? (
                  <View className="items-center px-5 py-9">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-[#E7F3EF]">
                      <Package size={22} color="#08745D" />
                    </View>
                    <Text className="mt-3 text-sm font-bold text-[#173F35]">
                      All products are stocked
                    </Text>
                    <Text className="mt-1 text-center text-xs text-[#6B7280]">
                      There are no low-stock products right now.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: maxListHeight }}>
                    {lowStockProducts.map((product, index) => {
                      const stockQty = Number(product.total_stock) || 0;
                      const isOutOfStock = stockQty <= 0;

                      return (
                        <View
                          key={product.id}
                          className={`flex-row items-center px-4 py-3 ${
                            index < lowStockProducts.length - 1
                              ? 'border-b border-[#F2EFE7]'
                              : ''
                          }`}
                        >
                          <View
                            className={`h-9 w-9 items-center justify-center rounded-xl ${
                              isOutOfStock ? 'bg-[#FEE2E2]' : 'bg-[#FEF3C7]'
                            }`}
                          >
                            <Package
                              size={16}
                              color={isOutOfStock ? '#B42332' : '#B45309'}
                            />
                          </View>
                          <View className="ml-3 flex-1 pr-2">
                            <Text
                              numberOfLines={1}
                              className="text-[13px] font-bold text-[#173F35]"
                            >
                              {product.name || 'Unnamed product'}
                            </Text>
                            <Text
                              numberOfLines={1}
                              className="mt-0.5 text-[11px] text-[#6B7280]"
                            >
                              {product.category ||
                                product.sku_barcode ||
                                'Inventory'}
                            </Text>
                          </View>
                          <View
                            className={`rounded-full px-2.5 py-1 ${
                              isOutOfStock ? 'bg-[#FEE2E2]' : 'bg-[#FEF3C7]'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-extrabold ${
                                isOutOfStock
                                  ? 'text-[#B42332]'
                                  : 'text-[#B45309]'
                              }`}
                            >
                              {isOutOfStock
                                ? 'Out of stock'
                                : `${stockQty} left`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )
              ) : loadingTackOrders && todayTackOrders.length === 0 ? (
                <View className="items-center py-9">
                  <ActivityIndicator size="large" color="#B8860B" />
                  <Text className="mt-3 text-xs font-medium text-[#6B7280]">
                    Loading today&apos;s take orders…
                  </Text>
                </View>
              ) : tackOrdersError ? (
                <View className="items-center px-5 py-8">
                  <Text className="text-center text-xs font-semibold text-[#B42332]">
                    {tackOrdersError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={loadTodayTackOrders}
                    className="mt-3 flex-row items-center rounded-xl bg-[#E7F3EF] px-4 py-2"
                  >
                    <RefreshCw size={13} color="#07564B" />
                    <Text className="ml-2 text-xs font-bold text-[#07564B]">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : todayTackOrders.length === 0 ? (
                <View className="items-center px-5 py-9">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7EDCC]">
                    <ShoppingBag size={20} color="#A77B12" />
                  </View>
                  <Text className="mt-3 text-sm font-bold text-[#173F35]">
                    No take orders today
                  </Text>
                  <Text className="mt-1 text-center text-xs text-[#6B7280]">
                    New take orders created today will appear here.
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: maxListHeight }}>
                  {todayTackOrders.map((order, index) => {
                    const itemCount = Array.isArray(order.items)
                      ? order.items.length
                      : 0;

                    return (
                      <Pressable
                        key={order.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open take order ${order.order_no || order.id}`}
                        onPress={() => {
                          closeAllMenus();
                          onNavigate?.({ kind: 'tab', tab: 'Orders' });
                        }}
                        className={`px-4 py-3 active:bg-[#FAF7EE] ${
                          index < todayTackOrders.length - 1
                            ? 'border-b border-[#F2EFE7]'
                            : ''
                        }`}
                      >
                        <View className="flex-row items-start">
                          <View className="mr-3 mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-[#F7EDCC]">
                            <ShoppingBag size={16} color="#97700D" />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between">
                              <Text
                                numberOfLines={1}
                                className="mr-2 flex-1 text-[13px] font-bold text-[#173F35]"
                              >
                                {order.order_no || `Order #${order.id}`}
                              </Text>
                              <View className="flex-row items-center rounded-full bg-[#F5F4F0] px-2 py-0.5">
                                <Clock3 size={11} color="#8A8F8B" />
                                <Text className="ml-1 text-[10px] font-semibold text-[#6D746F]">
                                  {formatOrderTime(order.created_at)}
                                </Text>
                              </View>
                            </View>
                            <Text
                              numberOfLines={1}
                              className="mt-1 text-[11px] font-medium text-[#58635D]"
                            >
                              {order.customer?.name || 'Customer'}
                              {order.customer?.phone
                                ? ` · ${order.customer.phone}`
                                : ''}
                            </Text>
                            <View className="mt-1.5 flex-row items-center justify-between">
                              <Text className="text-[10px] font-semibold text-[#7B817D]">
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                {order.order_status
                                  ? ` · ${order.order_status}`
                                  : ''}
                              </Text>
                              <Text className="text-xs font-extrabold text-[#173F35]">
                                {formatCurrency(order.total_amount)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          {isAccountMenuOpen ? (
            <View
              testID="admin-profile-dropdown"
              style={[
                styles.dropdownShadow,
                { top: dropdownTop, width: profilePanelWidth },
              ]}
              className="absolute right-3.5 overflow-hidden rounded-2xl border border-[#E8E2D2] bg-white"
            >
              <View className="flex-row items-center border-b border-[#EFECE2] bg-[#FAF9F5] px-4 py-3.5">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37]">
                  <Text className="text-[17px] font-extrabold text-white">
                    {initial}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-extrabold text-[#173F35]"
                  >
                    {adminName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-[11px] text-[#6B7280]"
                  >
                    {adminEmail || 'Email not available'}
                  </Text>
                  <View className="mt-1.5 self-start rounded-full bg-[#E7F3EF] px-2 py-0.5">
                    <Text className="text-[9px] font-bold uppercase tracking-[0.8px] text-[#07564B]">
                      Shop Admin
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Admin profile"
                  testID="admin-profile-menu-action"
                  onPress={() => {
                    setIsAccountMenuOpen(false);
                    onProfilePress();
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-2.5 active:bg-[#F8F7F2]"
                >
                  <View className="flex-row items-center">
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#E7F3EF]">
                      <UserRound size={16} color="#07564B" />
                    </View>
                    <Text className="text-sm font-semibold text-[#173F35]">
                      Profile
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                  testID="admin-logout-menu-action"
                  onPress={handleLogoutPress}
                  className="mt-1 flex-row items-center justify-between rounded-xl px-3 py-2.5 active:bg-[#FEF2F2]"
                >
                  <View className="flex-row items-center">
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#FEE2E2]">
                      <LogOut size={16} color="#B42332" />
                    </View>
                    <Text className="text-sm font-bold text-[#B42332]">
                      Logout
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#FCA5A5" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
