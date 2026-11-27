import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChevronRight,
  CreditCard,
  Gem,
  HandCoins,
  Home,
  LayoutGrid,
  Plus,
  ShoppingBag,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AdminTab = 'Dashboard' | 'Loans' | 'Orders' | 'Products' | 'More';
export type OrdersQuickOption = 'billing' | 'orders';

type AdminTabBarProps = {
  activeTab: AdminTab;
  onTabPress: (tab: AdminTab) => void;
  onOrdersOptionSelect?: (option: OrdersQuickOption) => void;
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

const ORDERS_OPTIONS: Array<{
  option: OrdersQuickOption;
  title: string;
  description: string;
  icon: typeof CreditCard;
  testID: string;
  isPrimaryBadge: boolean;
}> = [
  {
    option: 'billing',
    title: 'Billing',
    description: 'Invoices, GST bills & payment collections',
    icon: CreditCard,
    testID: 'orders-sheet-billing',
    isPrimaryBadge: true,
  },
  {
    option: 'orders',
    title: 'Tack Order',
    description: 'Custom jewellery orders, advances & status',
    icon: ShoppingBag,
    testID: 'orders-sheet-tack-order',
    isPrimaryBadge: false,
  },
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
  tabIndicator: {
    borderRadius: 16,
  },
  activeTabIndicator: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244, 201, 93, 0.45)',
    backgroundColor: 'rgba(244, 201, 93, 0.2)',
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(13, 44, 36, 0.36)',
  },
  sheetShadow: {
    elevation: 20,
    shadowColor: '#091E19',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
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
        testID={`admin-tab-indicator-${item.tab}`}
        style={isActive ? styles.activeTabIndicator : styles.tabIndicator}
        className="h-8 w-12 items-center justify-center rounded-full"
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
  onOrdersOptionSelect,
}: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const [isOrdersSheetOpen, setIsOrdersSheetOpen] = useState(false);
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

  const openOrdersSheet = () => {
    setIsOrdersSheetOpen(true);
  };

  const handleSelectOrdersOption = (option: OrdersQuickOption) => {
    setIsOrdersSheetOpen(false);
    if (onOrdersOptionSelect) {
      onOrdersOptionSelect(option);
      return;
    }
    onTabPress('Orders');
  };

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
              onPress={openOrdersSheet}
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
            accessibilityState={{
              selected: isOrdersActive,
              expanded: isOrdersSheetOpen,
            }}
            onPress={openOrdersSheet}
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

      <Modal
        transparent
        animationType="slide"
        visible={isOrdersSheetOpen}
        statusBarTranslucent
        onRequestClose={() => setIsOrdersSheetOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            testID="orders-sheet-backdrop"
            accessibilityRole="button"
            accessibilityLabel="Close orders options"
            onPress={() => setIsOrdersSheetOpen(false)}
            style={[StyleSheet.absoluteFill, styles.sheetBackdrop]}
          />

          <View
            testID="orders-action-sheet"
            style={[
              styles.sheetShadow,
              { paddingBottom: Math.max(insets.bottom, 20) + 6 },
            ]}
            className="rounded-t-3xl border-t border-[#EAD78A]/45 bg-[#F8F7F2] px-5 pt-3"
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#D8D1BE]" />

            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#9A7620]">
                  Quick Navigate
                </Text>
                <Text className="mt-0.5 text-lg font-extrabold text-[#173F35]">
                  Choose Order Section
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                testID="orders-sheet-close"
                onPress={() => setIsOrdersSheetOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full border border-[#E6E0CE] bg-white"
              >
                <X size={16} color="#6B7280" />
              </Pressable>
            </View>

            <View className="gap-3">
              {ORDERS_OPTIONS.map(item => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.option}
                    testID={item.testID}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    onPress={() => handleSelectOrdersOption(item.option)}
                    className="flex-row items-center rounded-2xl border border-[#EAE4D3] bg-white p-3.5 active:bg-[#FAF7EE]"
                  >
                    <View
                      className={`mr-3.5 h-12 w-12 items-center justify-center rounded-2xl ${
                        item.isPrimaryBadge ? 'bg-[#173F35]' : 'bg-[#F7EDCC]'
                      }`}
                    >
                      <Icon
                        size={22}
                        color={item.isPrimaryBadge ? '#F4C95D' : '#97700D'}
                      />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-[15px] font-extrabold text-[#173F35]">
                        {item.title}
                      </Text>
                      <Text className="mt-0.5 text-xs text-[#6B7E76]">
                        {item.description}
                      </Text>
                    </View>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F8F7F2]">
                      <ChevronRight size={17} color="#9A7620" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
