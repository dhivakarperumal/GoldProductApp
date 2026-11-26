import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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
  onProfilePress?: () => void;
  onLogout?: () => void;
};

export default function TopHeader({
  adminName = 'Super Admin',
  adminEmail = '',
  notificationCount,
  onNotificationPress,
  onProfilePress,
  onLogout,
}: TopHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [todayRegistrations, setTodayRegistrations] = useState<
    ShopRegistration[]
  >([]);
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

  const loadTodayRegistrations = async () => {
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
    } catch (error) {
      setRegistrationError(
        getErrorMessage(error, "Today's shop registrations could not be loaded."),
      );
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const handleNotificationPress = async () => {
    const shouldOpen = !isNotificationOpen;
    setIsMenuOpen(false);
    setIsNotificationOpen(shouldOpen);
    onNotificationPress?.();
    if (shouldOpen) {
      await loadTodayRegistrations();
    }
  };

  const handleProfilePress = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    onProfilePress?.();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    onLogout?.();
  };

  return (
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

      {isNotificationOpen ? (
        <View
          testID="today-registrations-dropdown"
          className="absolute left-4 right-4 z-40 overflow-hidden rounded-2xl border border-[#E8E3D8] bg-white shadow-2xl"
          style={{ top: insets.top + 64 }}
        >
          <View className="flex-row items-center justify-between border-b border-[#EEEAE1] bg-[#FAF9F5] px-4 py-3">
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-[#173F35]">
                Today&apos;s registrations
              </Text>
              <Text className="mt-0.5 text-[11px] text-[#7B817D]">
                {todayRegistrations.length}{' '}
                {todayRegistrations.length === 1 ? 'shop' : 'shops'} registered today
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close registrations"
              onPress={() => setIsNotificationOpen(false)}
              className="h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <X size={16} color="#6B7280" />
            </Pressable>
          </View>

          {isLoadingRegistrations ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#08745D" />
              <Text className="mt-2 text-xs text-[#7B817D]">
                Loading today&apos;s registrations...
              </Text>
            </View>
          ) : registrationError ? (
            <View className="items-center px-5 py-6">
              <Text className="text-center text-xs text-[#9F1239]">
                {registrationError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={loadTodayRegistrations}
                className="mt-3 flex-row items-center rounded-lg bg-[#E7F3EF] px-3 py-2"
              >
                <RefreshCw size={13} color="#08745D" />
                <Text className="ml-2 text-xs font-bold text-[#08745D]">
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : todayRegistrations.length === 0 ? (
            <Text className="px-5 py-8 text-center text-xs text-[#7B817D]">
              No shops registered today.
            </Text>
          ) : (
            <ScrollView
              className="max-h-[340px]"
              contentContainerClassName="pb-1"
            >
              {todayRegistrations.map((shop, index) => (
                <View
                  key={shop.id}
                  className={`px-4 py-3 ${
                    index < todayRegistrations.length - 1
                      ? 'border-b border-[#F0EEE8]'
                      : ''
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <Text
                      numberOfLines={1}
                      className="mr-3 flex-1 text-[13px] font-bold text-[#173F35]"
                    >
                      {shop.shop_name || 'Unnamed shop'}
                    </Text>
                    <View className="flex-row items-center">
                      <Clock3 size={12} color="#8A8F8B" />
                      <Text className="ml-1 text-[10px] font-medium text-[#7B817D]">
                        {formatRegistrationTime(shop.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-[11px] text-[#58635D]">
                    Owner: {shop.owner_name || 'Not provided'}
                  </Text>
                  {shop.mobile ? (
                    <Text className="mt-0.5 text-[11px] text-[#58635D]">
                      Phone: {shop.mobile}
                    </Text>
                  ) : null}
                  {shop.city ? (
                    <View className="mt-1 flex-row items-center">
                      <MapPin size={11} color="#8A8F8B" />
                      <Text className="ml-1 text-[10px] text-[#7B817D]">
                        {shop.city}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {isMenuOpen && (
        <View className="absolute right-4 top-[66px] z-30 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
          <Text
            numberOfLines={1}
            className="px-3 pt-1 text-xs font-semibold text-gray-800">
            {adminName}
          </Text>
          <Text
            numberOfLines={1}
            className="px-3 pb-2 pt-0.5 text-[11px] text-gray-500">
            {adminEmail || 'Email not available'}
          </Text>
          <View className="h-px bg-gray-100" />
          <Pressable
            accessibilityRole="button"
            onPress={handleProfilePress}
            className="mt-1 flex-row items-center rounded-lg px-3 py-3 active:bg-gray-50">
            <UserRound size={17} color="#4B5563" />
            <Text className="text-sm font-medium text-gray-800">Profile</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            className="flex-row items-center rounded-lg px-3 py-3 active:bg-red-50">
            <LogOut size={17} color="#DC2626" />
            <Text className="text-sm font-medium text-red-600">Logout</Text>
          </Pressable>
        </View>
      )}
    </ImageBackground>
  );
}