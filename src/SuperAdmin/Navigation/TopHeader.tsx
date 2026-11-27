import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  Clock3,
  LogOut,
  MapPin,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';

type ShopRegistration = {
  id: number;
  shop_name?: string;
  owner_name?: string;
  mobile?: string;
  city?: string;
  created_at?: string;
};

const REGISTRATIONS_PAGE_SIZE = 50;

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
  notificationCount?: number;
  onNotificationPress?: () => void;
  onTodayRegistrationsChange?: (count: number | null) => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
};

export default function TopHeader({
  adminName = 'Super Admin',
  adminEmail = '',
  notificationCount,
  onNotificationPress,
  onTodayRegistrationsChange,
  onProfilePress,
  onLogout,
}: TopHeaderProps) {
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
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';
  const visibleNotificationCount = Math.max(
    0,
    notificationCount ?? todayRegistrations.length,
  );
  const notificationPanelWidth = Math.min(
    380,
    Dimensions.get('window').width - 32,
  );
  const profilePanelWidth = Math.min(
    280,
    Dimensions.get('window').width - 32,
  );

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

  const handleNotificationPress = async () => {
    const shouldOpen = !isNotificationOpen;
    setIsMenuOpen(false);
    setIsNotificationOpen(shouldOpen);
    onNotificationPress?.();
    if (shouldOpen && !hasLoadedRegistrations && !isLoadingRegistrations) {
      await loadTodayRegistrations();
    }
  };

  const handleProfilePress = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    onProfilePress?.();
  };

  const closeDropdowns = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    onLogout?.();
  };

  return (
    <>
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      className="z-20 border-b border-gray-100 px-4 pb-3"
      style={{ paddingTop: insets.top + 10 }}>
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
              Super Admin portal
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
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
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-50 active:bg-gray-100">
            <Bell size={20} color="#4B5563" strokeWidth={2} />
            {visibleNotificationCount > 0 && (
              <View className="absolute right-0 top-0 min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1">
                <Text className="text-[9px] font-bold leading-[13px] text-white">
                  {visibleNotificationCount > 99
                    ? '99+'
                    : visibleNotificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Super Admin menu"
            testID="profile-toggle"
            accessibilityState={{ expanded: isMenuOpen }}
            onPress={() => {
              setIsNotificationOpen(false);
              setIsMenuOpen(open => !open);
            }}
            className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37] active:opacity-80">
            <Text className="text-[16px] font-bold text-white">{initial}</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
    <Modal
      transparent
      visible={isMenuOpen || isNotificationOpen}
      animationType="fade"
      onRequestClose={closeDropdowns}
    >
      <View className="flex-1">
        <Pressable
          testID="dropdown-backdrop"
          accessibilityRole="button"
          accessibilityLabel="Close dropdown"
          onPress={closeDropdowns}
          className="absolute inset-0 bg-black/20"
        />
        {isNotificationOpen ? (
          <View
            testID="today-registrations-dropdown"
            className="absolute right-4 z-10 overflow-hidden rounded-2xl border border-[#E8E3D8] bg-white shadow-2xl"
            style={{
              top: insets.top + 64,
              width: notificationPanelWidth,
              maxHeight: Dimensions.get('window').height - insets.top - 80,
            }}
          >
            <View className="border-b border-[#EEEAE1] bg-[#FAF9F5] px-4 pb-3 pt-4">
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
                <View className="mr-2 min-w-[28px] items-center rounded-full bg-[#E7F3EF] px-2 py-1">
                  <Text className="text-xs font-extrabold text-[#08745D]">
                    {todayRegistrations.length}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh registrations"
                  disabled={isLoadingRegistrations}
                  onPress={loadTodayRegistrations}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white"
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
                  className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-white"
                >
                  <X size={16} color="#6B7280" />
                </Pressable>
              </View>
              <Text className="ml-[52px] mt-1 text-[11px] text-[#7B817D]">
                New shops added to your network today
              </Text>
            </View>

            {isLoadingRegistrations ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#08745D" />
                <Text className="mt-3 text-xs font-medium text-[#7B817D]">
                  Loading today&apos;s registrations...
                </Text>
              </View>
            ) : registrationError ? (
              <View className="items-center px-5 py-8">
                <Text className="text-center text-sm font-semibold text-[#9F1239]">
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
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F5F4F0]">
                  <Bell size={20} color="#A5A69F" />
                </View>
                <Text className="mt-3 text-sm font-bold text-[#34443D]">
                  All caught up
                </Text>
                <Text className="mt-1 text-center text-xs text-[#7B817D]">
                  No shops registered today.
                </Text>
              </View>
            ) : (
              <ScrollView
                className="flex-shrink"
                style={{ maxHeight: Dimensions.get('window').height - insets.top - 190 }}
                contentContainerClassName="py-1"
              >
                {todayRegistrations.map((shop, index) => (
                  <View
                    key={shop.id}
                    className={`px-4 py-3.5 ${
                      index < todayRegistrations.length - 1
                        ? 'border-b border-[#F0EEE8]'
                        : ''
                    }`}
                  >
                    <View className="flex-row items-start">
                      <View className="mr-3 mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-[#F7EDCC]">
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
                          className="mt-1 text-[11px] text-[#58635D]"
                        >
                          Owner: {shop.owner_name || 'Not provided'}
                        </Text>
                        <View className="mt-2 flex-row flex-wrap items-center">
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
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {isMenuOpen ? (
          <View
            testID="profile-dropdown"
            className="absolute right-4 z-10 rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
            style={{ top: insets.top + 66, width: profilePanelWidth }}
          >
            <Text
              numberOfLines={1}
              className="px-3 pt-1 text-xs font-semibold text-gray-800"
            >
              {adminName}
            </Text>
            <Text
              numberOfLines={1}
              className="px-3 pb-2 pt-0.5 text-[11px] text-gray-500"
            >
              {adminEmail || 'Email not available'}
            </Text>
            <View className="h-px bg-gray-100" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              testID="profile-menu-action"
              onPress={handleProfilePress}
              className="mt-1 flex-row items-center rounded-lg px-3 py-3 active:bg-gray-50"
            >
              <UserRound size={17} color="#4B5563" />
              <Text className="ml-2 text-sm font-medium text-gray-800">
                Profile
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              className="flex-row items-center rounded-lg px-3 py-3 active:bg-red-50"
            >
              <LogOut size={17} color="#DC2626" />
              <Text className="ml-2 text-sm font-medium text-red-600">
                Logout
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
    </>
  );
}