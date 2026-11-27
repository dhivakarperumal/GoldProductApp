import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Bell,
  ChartNoAxesColumn,
  ChevronRight,
  Clock3,
  CreditCard,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';
import type { ProfileDestination } from '../More/Profile';
import type { SuperAdminTab } from './Bottombar';

export type SuperAdminDrawerTarget =
  | { kind: 'tab'; tab: SuperAdminTab }
  | { kind: 'profile'; screen: Exclude<ProfileDestination, 'cards'> };

type ShopRegistration = {
  id: number;
  shop_name?: string;
  owner_name?: string;
  mobile?: string;
  city?: string;
  created_at?: string;
};

type DrawerItem = {
  id: string;
  label: string;
  icon: typeof Home;
  target: SuperAdminDrawerTarget;
  matchScreens: string[];
};

type DrawerSection = {
  title: string;
  items: DrawerItem[];
};

const REGISTRATIONS_PAGE_SIZE = 50;

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: 'Main Menu',
    items: [
      {
        id: 'home',
        label: 'Dashboard',
        icon: Home,
        target: { kind: 'tab', tab: 'Home' },
        matchScreens: ['Home'],
      },
      {
        id: 'shops',
        label: 'Gold Shops',
        icon: Store,
        target: { kind: 'tab', tab: 'G Shops' },
        matchScreens: ['G Shops'],
      },
      {
        id: 'plans',
        label: 'Subscription Plans',
        icon: CreditCard,
        target: { kind: 'tab', tab: 'Plans' },
        matchScreens: ['Plans'],
      },
      {
        id: 'revenue',
        label: 'Revenue & Reports',
        icon: ChartNoAxesColumn,
        target: { kind: 'tab', tab: 'Revenue' },
        matchScreens: ['Revenue'],
      },
      {
        id: 'profileHub',
        label: 'Profile & Hub',
        icon: LayoutGrid,
        target: { kind: 'tab', tab: 'More' },
        matchScreens: ['More'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        id: 'myProfile',
        label: 'My Profile',
        icon: UserRound,
        target: { kind: 'profile', screen: 'my-profile' },
        matchScreens: ['Profile:my-profile'],
      },
      {
        id: 'users',
        label: 'User Management',
        icon: Users,
        target: { kind: 'profile', screen: 'users' },
        matchScreens: ['Profile:users'],
      },
      {
        id: 'payments',
        label: 'Payment Management',
        icon: Wallet,
        target: { kind: 'profile', screen: 'payments' },
        matchScreens: ['Profile:payments'],
      },
    ],
  },
];

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

function wasRegisteredToday(value?: string) {
  if (!value) return false;
  const createdAt = new Date(value);
  return (
    !Number.isNaN(createdAt.getTime()) &&
    dateKey(createdAt) === dateKey(new Date())
  );
}

function formatRegistrationTime(value?: string) {
  if (!value) return 'Time unavailable';
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'Time unavailable';
  return createdAt.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type TopHeaderProps = {
  adminName?: string;
  adminEmail?: string;
  activeScreen?: string;
  notificationCount?: number;
  onNavigate?: (target: SuperAdminDrawerTarget) => void;
  onNotificationPress?: () => void;
  onTodayRegistrationsChange?: (count: number | null) => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
};

export default function TopHeader({
  adminName = 'Super Admin',
  adminEmail = '',
  activeScreen = 'Home',
  notificationCount,
  onNavigate,
  onNotificationPress,
  onTodayRegistrationsChange,
  onProfilePress,
  onLogout,
}: TopHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [todayRegistrations, setTodayRegistrations] = useState<
    ShopRegistration[]
  >([]);
  const [hasLoadedRegistrations, setHasLoadedRegistrations] = useState(false);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const windowDimensions = useWindowDimensions();
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';
  const visibleNotificationCount = Math.max(
    0,
    notificationCount ?? todayRegistrations.length,
  );
  const drawerWidth = Math.min(312, Math.round(windowDimensions.width * 0.84));
  const drawerTranslateX = useRef(new Animated.Value(-320)).current;
  const notificationPanelWidth = Math.min(360, windowDimensions.width - 28);
  const profilePanelWidth = Math.min(284, windowDimensions.width - 28);
  const dropdownTop = insets.top + 64;
  const maxListHeight = Math.max(180, windowDimensions.height - insets.top - 230);

  const loadTodayRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    setRegistrationError(null);
    try {
      let totalPages = 1;
      const registrations: ShopRegistration[] = [];

      for (let page = 1; page <= totalPages; page += 1) {
        const { data } = await api.get('/super-admin/gold-shops', {
          params: {
            page,
            pageSize: REGISTRATIONS_PAGE_SIZE,
            search: '',
            status: 'all',
          },
        });
        if (!Array.isArray(data?.shops)) {
          throw new TypeError('Gold shop registrations response is invalid.');
        }

        registrations.push(
          ...data.shops.filter(
            (shop: ShopRegistration) => shop && wasRegisteredToday(shop.created_at),
          ),
        );
        if (page === 1) {
          totalPages = Math.max(
            1,
            Number(data?.pagination?.totalPages) || 1,
          );
        }
      }

      setTodayRegistrations(registrations);
      onTodayRegistrationsChange?.(registrations.length);
    } catch (error) {
      onTodayRegistrationsChange?.(null);
      setRegistrationError(
        getErrorMessage(error, "Today's shop registrations could not be loaded."),
      );
    } finally {
      setIsLoadingRegistrations(false);
      setHasLoadedRegistrations(true);
    }
  }, [onTodayRegistrationsChange]);

  useEffect(() => {
    loadTodayRegistrations();
  }, [loadTodayRegistrations]);

  const openDrawer = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
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

  const closeDropdowns = () => {
    setIsDrawerOpen(false);
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
  };

  const handleNotificationPress = async () => {
    const shouldOpen = !isNotificationOpen;
    setIsDrawerOpen(false);
    setIsMenuOpen(false);
    setIsNotificationOpen(shouldOpen);
    onNotificationPress?.();
    if (shouldOpen && !hasLoadedRegistrations && !isLoadingRegistrations) {
      await loadTodayRegistrations();
    }
  };

  const handleProfilePress = () => {
    closeDropdowns();
    onProfilePress?.();
  };

  const handleDrawerSelect = (target: SuperAdminDrawerTarget) => {
    closeDrawer();
    if (onNavigate) {
      onNavigate(target);
      return;
    }
    if (
      (target.kind === 'tab' && target.tab === 'More') ||
      (target.kind === 'profile' && target.screen === 'my-profile')
    ) {
      onProfilePress?.();
    }
  };

  const handleLogout = () => {
    closeDropdowns();
    showAlert('Log out?', 'Are you sure you want to log out?', {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => onLogout?.(),
        },
      ],
    });
  };

  return (
    <>
      <View
        testID="superadmin-header"
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
              testID="superadmin-drawer-toggle"
              accessibilityState={{ expanded: isDrawerOpen }}
              onPress={openDrawer}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
              className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl border border-[#F4C95D]/40 bg-[#12332B]/85"
            >
              <Menu size={20} color="#FFE08A" strokeWidth={2.2} />
            </Pressable>

            <View className="mr-2.5 h-10 w-10 overflow-hidden rounded-xl border border-[#F5E6A8]/65 bg-[#0D2C24] p-0.5">
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
                    Super Admin
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                visibleNotificationCount > 0
                  ? `${visibleNotificationCount} registrations today`
                  : 'Notifications'
              }
              testID="notification-toggle"
              accessibilityState={{ expanded: isNotificationOpen }}
              onPress={handleNotificationPress}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
              className={`relative h-9 w-9 items-center justify-center rounded-full border ${
                isNotificationOpen
                  ? 'border-[#F4C95D] bg-[#F4C95D]/20'
                  : 'border-white/20 bg-[#12332B]/85'
              }`}
            >
              <Bell
                size={17}
                color={isNotificationOpen ? '#F4C95D' : '#FFF8E7'}
                strokeWidth={2.1}
              />
              {visibleNotificationCount > 0 ? (
                <View className="absolute -right-0.5 -top-0.5 min-h-[16px] min-w-[16px] items-center justify-center rounded-full border-[1.5px] border-[#153B35] bg-[#DC2626] px-1">
                  <Text className="text-[8.5px] font-extrabold leading-[11px] text-white">
                    {visibleNotificationCount > 99
                      ? '99+'
                      : visibleNotificationCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Super Admin menu"
              testID="profile-toggle"
              accessibilityState={{ expanded: isMenuOpen }}
              onPress={() => {
                setIsDrawerOpen(false);
                setIsNotificationOpen(false);
                setIsMenuOpen(open => !open);
              }}
              style={({ pressed }) => [
                styles.avatarShadow,
                { opacity: pressed ? 0.84 : 1 },
              ]}
              className={`h-10 w-10 items-center justify-center rounded-full border-2 bg-[#D4AF37] ${
                isMenuOpen ? 'border-white' : 'border-[#F5E6A8]'
              }`}
            >
              <Text className="text-[16px] font-extrabold text-white">
                {initial}
              </Text>
            </Pressable>
          </View>
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
            testID="superadmin-drawer-backdrop"
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={closeDrawer}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />

          <Animated.View
            testID="superadmin-navigation-drawer"
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
                      Super Admin Portal
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close drawer"
                  testID="superadmin-drawer-close"
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
                          testID={`superadmin-drawer-item-${item.id}`}
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
                    accessibilityLabel="Logout"
                    testID="superadmin-drawer-item-logout"
                    onPress={handleLogout}
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
        visible={isMenuOpen || isNotificationOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDropdowns}
      >
        <View className="flex-1">
          <Pressable
            testID="dropdown-backdrop"
            accessibilityRole="button"
            accessibilityLabel="Close dropdown"
            onPress={closeDropdowns}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />

          {isNotificationOpen ? (
            <View
              testID="today-registrations-dropdown"
              className="absolute right-3.5 z-10 overflow-hidden rounded-2xl border border-[#E8E2D2] bg-white"
              style={[
                styles.dropdownShadow,
                {
                  top: dropdownTop,
                  width: notificationPanelWidth,
                  maxHeight: windowDimensions.height - insets.top - 80,
                },
              ]}
            >
              <View className="border-b border-[#EFECE2] bg-[#FAF9F5] px-4 pb-3 pt-3.5">
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#F7EDCC]">
                    <Bell size={18} color="#A77B12" strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#9A7620]">
                      Shop activity
                    </Text>
                    <Text className="mt-0.5 text-[15px] font-extrabold text-[#173F35]">
                      Today&apos;s registrations
                    </Text>
                  </View>
                  <View
                    className={`mr-2 min-w-[28px] items-center rounded-full px-2 py-1 ${
                      todayRegistrations.length > 0
                        ? 'bg-[#F7EDCC]'
                        : 'bg-[#E7F3EF]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-extrabold ${
                        todayRegistrations.length > 0
                          ? 'text-[#97700D]'
                          : 'text-[#08745D]'
                      }`}
                    >
                      {todayRegistrations.length}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Refresh registrations"
                    disabled={isLoadingRegistrations}
                    onPress={loadTodayRegistrations}
                    className="h-8 w-8 items-center justify-center rounded-full border border-[#EAE6DA] bg-white"
                  >
                    {isLoadingRegistrations ? (
                      <ActivityIndicator size="small" color="#08745D" />
                    ) : (
                      <RefreshCw size={14} color="#08745D" />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close registrations"
                    onPress={() => setIsNotificationOpen(false)}
                    className="ml-1.5 h-8 w-8 items-center justify-center rounded-full border border-[#EAE6DA] bg-white"
                  >
                    <X size={15} color="#6B7280" />
                  </Pressable>
                </View>
                <Text className="ml-[52px] mt-1 text-[11px] text-[#7B817D]">
                  New shops added to your network today
                </Text>
              </View>

              {isLoadingRegistrations ? (
                <View className="items-center py-10">
                  <ActivityIndicator size="large" color="#B8860B" />
                  <Text className="mt-3 text-xs font-medium text-[#7B817D]">
                    Loading today&apos;s registrations...
                  </Text>
                </View>
              ) : registrationError ? (
                <View className="items-center px-5 py-8">
                  <Text className="text-center text-xs font-semibold text-[#B42332]">
                    {registrationError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={loadTodayRegistrations}
                    className="mt-4 flex-row items-center rounded-xl bg-[#E7F3EF] px-4 py-2.5"
                  >
                    <RefreshCw size={13} color="#08745D" />
                    <Text className="ml-2 text-xs font-bold text-[#08745D]">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : todayRegistrations.length === 0 ? (
                <View className="items-center px-5 py-10">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7EDCC]">
                    <Bell size={20} color="#A77B12" />
                  </View>
                  <Text className="mt-3 text-sm font-bold text-[#173F35]">
                    All caught up
                  </Text>
                  <Text className="mt-1 text-center text-xs text-[#7B817D]">
                    No shops registered today.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  className="flex-shrink"
                  style={{ maxHeight: maxListHeight }}
                  contentContainerClassName="py-1"
                >
                  {todayRegistrations.map((shop, index) => (
                    <Pressable
                      key={shop.id}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${shop.shop_name || 'shop'} in Gold Shops`}
                      onPress={() => {
                        closeDropdowns();
                        onNavigate?.({ kind: 'tab', tab: 'G Shops' });
                      }}
                      className={`px-4 py-3.5 active:bg-[#FAF7EE] ${
                        index < todayRegistrations.length - 1
                          ? 'border-b border-[#F2EFE7]'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-start">
                        <View className="mr-3 mt-0.5 h-9 w-9 items-center justify-center rounded-xl bg-[#F7EDCC]">
                          <Text className="text-sm font-extrabold text-[#97700D]">
                            {(shop.shop_name || 'S').trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-start justify-between">
                            <Text
                              numberOfLines={1}
                              className="mr-2 flex-1 text-[13px] font-bold text-[#173F35]"
                            >
                              {shop.shop_name || 'Unnamed shop'}
                            </Text>
                            <View className="flex-row items-center rounded-full bg-[#F5F4F0] px-2 py-1">
                              <Clock3 size={11} color="#8A8F8B" />
                              <Text className="ml-1 text-[10px] font-semibold text-[#6D746F]">
                                {formatRegistrationTime(shop.created_at)}
                              </Text>
                            </View>
                          </View>
                          <Text
                            numberOfLines={1}
                            className="mt-1 text-[11px] font-medium text-[#58635D]"
                          >
                            Owner: {shop.owner_name || 'Not provided'}
                          </Text>
                          <View className="mt-1.5 flex-row flex-wrap items-center">
                            {shop.mobile ? (
                              <Text className="mr-3 text-[10px] font-medium text-[#7B817D]">
                                {shop.mobile}
                              </Text>
                            ) : null}
                            {shop.city ? (
                              <View className="flex-row items-center">
                                <MapPin size={11} color="#8A8F8B" />
                                <Text className="ml-1 text-[10px] text-[#7B817D]">
                                  {shop.city}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {isMenuOpen ? (
            <View
              testID="profile-dropdown"
              className="absolute right-3.5 z-10 overflow-hidden rounded-2xl border border-[#E8E2D2] bg-white"
              style={[
                styles.dropdownShadow,
                { top: dropdownTop, width: profilePanelWidth },
              ]}
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
                      Super Admin
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  testID="profile-menu-action"
                  onPress={handleProfilePress}
                  className="flex-row items-center rounded-xl px-3 py-2.5 active:bg-[#F8F7F2]"
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#E7F3EF]">
                    <UserRound size={16} color="#07564B" />
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-[#173F35]">
                    Profile
                  </Text>
                  <ChevronRight size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                  testID="superadmin-logout-menu-action"
                  onPress={handleLogout}
                  className="mt-1 flex-row items-center rounded-xl px-3 py-2.5 active:bg-[#FEF2F2]"
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-[#FEE2E2]">
                    <LogOut size={16} color="#B42332" />
                  </View>
                  <Text className="flex-1 text-sm font-bold text-[#B42332]">
                    Logout
                  </Text>
                  <ChevronRight size={16} color="#FCA5A5" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
