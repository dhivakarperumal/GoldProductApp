import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gem,
  HandCoins,
  Home,
  LayoutGrid,
  Plus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AdminTab = 'Dashboard' | 'Loans' | 'Orders' | 'Products' | 'More';

type AdminTabBarProps = {
  activeTab: AdminTab;
  onTabPress: (tab: AdminTab) => void;
};

type TabConfig = {
  label: string;
  tab: AdminTab;
  icon: typeof Home;
};

const leftTabs: TabConfig[] = [
  { label: 'Home', tab: 'Dashboard', icon: Home },
  { label: 'Loans', tab: 'Loans', icon: HandCoins },
];

const rightTabs: TabConfig[] = [
  { label: 'Products', tab: 'Products', icon: Gem },
  { label: 'More', tab: 'More', icon: LayoutGrid },
];

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8F7F2',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EAE4D3',
    paddingTop: 4,
  },
  barShadow: {
    elevation: 10,
    shadowColor: '#0D2C24',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  centerPosition: {
    left: '50%',
  },
  centerButtonIdle: {
    elevation: 8,
    shadowColor: '#0D2C24',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  centerButtonActive: {
    elevation: 12,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
});

function SideTabButton({
  item,
  isActive,
  onPress,
}: {
  item: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
      onPress={onPress}
      className="h-full flex-1 items-center justify-center px-0.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
    >
      <View
        className={`h-8 w-12 items-center justify-center rounded-full ${
          isActive
            ? 'border border-[#F4C95D]/45 bg-[#F4C95D]/20'
            : 'bg-transparent'
        }`}
      >
        <Icon
          size={19}
          color={isActive ? '#F4C95D' : '#DCE8E4'}
          strokeWidth={isActive ? 2.4 : 1.9}
        />
      </View>
      <Text
        numberOfLines={1}
        className={`mt-0.5 text-[10.5px] tracking-[0.2px] ${
          isActive
            ? 'font-extrabold text-[#F4C95D]'
            : 'font-semibold text-[#DCE8E4]'
        }`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export default function AdminTabBar({
  activeTab,
  onTabPress,
}: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const isOrdersActive = activeTab === 'Orders';
  const centerScale = useRef(new Animated.Value(isOrdersActive ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(centerScale, {
      toValue: isOrdersActive ? 1.05 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [centerScale, isOrdersActive]);

  return (
    <View
      testID="admin-tab-bar"
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
      className="px-3.5"
    >
      <View className="relative h-[82px] justify-end">
        <View style={styles.barShadow} className="rounded-[28px]">
          <View className="h-[64px] flex-row items-center overflow-hidden rounded-[28px] border border-[#EAD78A]/45 bg-[#153B35] px-2">
            <Image
              source={require('../../Assert/Images/bottom.png')}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
              className="h-full w-full"
            />
            <View
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              className="bg-[#0F2C25]/45"
            />

            {leftTabs.map(item => (
              <SideTabButton
                key={item.tab}
                item={item}
                isActive={activeTab === item.tab}
                onPress={() => onTabPress(item.tab)}
              />
            ))}

            <Pressable
              accessible={false}
              onPress={() => onTabPress('Orders')}
              className="h-full w-[76px] items-center justify-end pb-[7px]"
            >
              <Text
                numberOfLines={1}
                className={`text-[10.5px] tracking-[0.2px] ${
                  isOrdersActive
                    ? 'font-extrabold text-[#F4C95D]'
                    : 'font-semibold text-[#DCE8E4]'
                }`}
              >
                Orders
              </Text>
            </Pressable>

            {rightTabs.map(item => (
              <SideTabButton
                key={item.tab}
                item={item}
                isActive={activeTab === item.tab}
                onPress={() => onTabPress(item.tab)}
              />
            ))}
          </View>
        </View>

        <Animated.View
          style={[
            styles.centerPosition,
            { transform: [{ translateX: -28.5 }, { scale: centerScale }] },
          ]}
          className="absolute top-0 rounded-full bg-[#F8F7F2] p-[3.5px]"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Orders"
            accessibilityState={{ selected: isOrdersActive }}
            onPress={() => onTabPress('Orders')}
            style={({ pressed }) => [
              isOrdersActive
                ? styles.centerButtonActive
                : styles.centerButtonIdle,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            className={`h-[50px] w-[50px] items-center justify-center rounded-full border-[1.5px] ${
              isOrdersActive
                ? 'border-[#FFF3C4] bg-[#F4C95D]'
                : 'border-[#F4C95D]/85 bg-[#173F35]'
            }`}
          >
            <Plus
              size={25}
              color={isOrdersActive ? '#153B35' : '#F4C95D'}
              strokeWidth={isOrdersActive ? 2.6 : 2.3}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
