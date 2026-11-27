import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Armchair,
  Ellipsis,
  HandCoins,
  House,
  Plus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AdminTab = 'Dashboard' | 'Loans' | 'Orders' | 'Products' | 'More';

type AdminTabBarProps = {
  activeTab: AdminTab;
  onTabPress: (tab: AdminTab) => void;
};

const tabs: Array<{
  label: string;
  tab: AdminTab;
  icon: typeof House;
}> = [
  { label: 'Home', tab: 'Dashboard', icon: House },
  { label: 'Loans', tab: 'Loans', icon: HandCoins },
  { label: 'Products', tab: 'Products', icon: Armchair },
  { label: 'More', tab: 'More', icon: Ellipsis },
];

const styles = StyleSheet.create({
  centerButton: {
    left: '50%',
    transform: [{ translateX: -38 }],
    elevation: 12,
    shadowColor: '#E97912',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
});

export default function AdminTabBar({
  activeTab,
  onTabPress,
}: AdminTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="relative h-[100px] px-5">
        <View className="absolute bottom-0 left-5 right-5 h-[74px] flex-row items-center rounded-full border border-[#F6AD68] bg-[#202124] px-1 shadow-lg">
          {tabs.slice(0, 2).map(({ label, tab, icon: Icon }) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
                onPress={() => onTabPress(tab)}
                className="h-full flex-1 items-center justify-center px-0.5"
              >
                <Icon
                  size={25}
                  color={isActive ? '#FFA900' : '#FFFFFF'}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <Text
                  numberOfLines={1}
                  className={`mt-1 text-[12px] ${
                    isActive
                      ? 'font-bold text-[#FFA900]'
                      : 'font-medium text-white'
                  }`}
                >
                  {label}
                </Text>
                <View
                  className={`mt-1 h-1 w-1 rounded-full ${
                    isActive ? 'bg-[#FFA900]' : 'bg-transparent'
                  }`}
                />
              </Pressable>
            );
          })}
          <View className="flex-1" />
          {tabs.slice(2).map(({ label, tab, icon: Icon }) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
                onPress={() => onTabPress(tab)}
                className="h-full flex-1 items-center justify-center px-0.5"
              >
                <Icon
                  size={25}
                  color={isActive ? '#FFA900' : '#FFFFFF'}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <Text
                  numberOfLines={1}
                  className={`mt-1 text-[12px] ${
                    isActive
                      ? 'font-bold text-[#FFA900]'
                      : 'font-medium text-white'
                  }`}
                >
                  {label}
                </Text>
                <View
                  className={`mt-1 h-1 w-1 rounded-full ${
                    isActive ? 'bg-[#FFA900]' : 'bg-transparent'
                  }`}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orders"
          accessibilityState={{ selected: activeTab === 'Orders' }}
          onPress={() => onTabPress('Orders')}
          className="absolute top-0 h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-[#202124] bg-[#FF9F0A]"
          style={styles.centerButton}
        >
          <Plus size={34} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </ImageBackground>
  );
}
