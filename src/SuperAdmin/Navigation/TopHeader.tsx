import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TopHeaderProps = {
  adminName?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
};

export default function TopHeader({
  adminName = 'Admin',
  notificationCount = 3,
  onNotificationPress,
  onProfilePress,
  onLogout,
}: TopHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';
  const visibleNotificationCount = Math.max(0, notificationCount);

  const handleProfilePress = () => {
    setIsMenuOpen(false);
    onProfilePress?.();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    onLogout?.();
  };

  return (
    <View
      className="z-20 border-b border-gray-100 bg-white px-4 pb-3"
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
            <Text className="text-[16px] font-extrabold leading-5 text-[#1A1A1A]">
              Gold Products
            </Text>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#B8860B]">
              Admin portal
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visibleNotificationCount > 0
                ? `${visibleNotificationCount} notifications`
                : 'Notifications'
            }
            onPress={onNotificationPress}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-50 active:bg-gray-100">
            <Text className="text-[20px]">🔔</Text>
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
            accessibilityLabel="Open admin menu"
            accessibilityState={{ expanded: isMenuOpen }}
            onPress={() => setIsMenuOpen(open => !open)}
            className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37] active:opacity-80">
            <Text className="text-[16px] font-bold text-white">{initial}</Text>
          </Pressable>
        </View>
      </View>

      {isMenuOpen && (
        <View className="absolute right-4 top-[66px] z-30 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
          <Text
            numberOfLines={1}
            className="px-3 pb-2 pt-1 text-xs font-medium text-gray-500">
            {adminName}
          </Text>
          <View className="h-px bg-gray-100" />
          <Pressable
            accessibilityRole="button"
            onPress={handleProfilePress}
            className="mt-1 flex-row items-center rounded-lg px-3 py-3 active:bg-gray-50">
            <Text className="mr-3 text-base text-gray-600">◉</Text>
            <Text className="text-sm font-medium text-gray-800">Profile</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            className="flex-row items-center rounded-lg px-3 py-3 active:bg-red-50">
            <Text className="mr-3 text-base text-red-500">↪</Text>
            <Text className="text-sm font-medium text-red-600">Logout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}