import { useState } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';

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
  const { showAlert } = useCustomAlert();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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
          accessibilityLabel={
            isAccountMenuOpen ? 'Close account menu' : 'Open account menu'
          }
          accessibilityState={{ expanded: isAccountMenuOpen }}
          onPress={() => setIsAccountMenuOpen(open => !open)}
          className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#F5E6A8] bg-[#D4AF37]">
          <Text className="text-[16px] font-bold text-white">{initial}</Text>
        </Pressable>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={isAccountMenuOpen}
        statusBarTranslucent
        onRequestClose={() => setIsAccountMenuOpen(false)}>
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss account menu"
            onPress={() => setIsAccountMenuOpen(false)}
            className="absolute inset-0 bg-black/10"
          />
          <View
            style={{ top: insets.top + 62 }}
            className="absolute right-4 w-72 overflow-hidden rounded-2xl border border-[#ECE7D8] bg-white shadow-2xl">
            <View className="border-b border-[#F1F2EE] px-4 py-4">
              <Text
                numberOfLines={1}
                className="text-sm font-extrabold text-[#173F35]">
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
              className="px-4 py-3.5">
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
              className="flex-row items-center px-4 py-3.5">
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
