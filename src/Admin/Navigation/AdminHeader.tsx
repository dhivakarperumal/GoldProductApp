import { Image, ImageBackground, Pressable, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AdminHeaderProps = {
  adminName: string;
  adminEmail: string;
  onProfilePress: () => void;
  onLogout: () => void;
};

export default function AdminHeader({
  adminName,
  adminEmail,
  onProfilePress,
  onLogout,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();
  const initial = adminName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      className="border-b border-gray-100 px-4 pb-3"
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
              Shop Admin
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Admin profile"
          onPress={onProfilePress}
          className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37]">
          <Text className="text-[16px] font-bold text-white">{initial}</Text>
        </Pressable>
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text numberOfLines={1} className="text-sm font-bold text-white">
            {adminName}
          </Text>
          <Text numberOfLines={1} className="text-xs text-[#FFE8AE]">
            {adminEmail}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onLogout}
          className="flex-row items-center rounded-lg border border-white/30 px-3 py-2">
          <LogOut size={15} color="#FFFFFF" />
          <Text className="ml-1.5 text-xs font-semibold text-white">
            Logout
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
