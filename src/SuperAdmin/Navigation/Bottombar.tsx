import React from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ChartNoAxesColumn,
  CreditCard,
  Home,
  Store,
  UserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SuperAdminTab =
  | 'Home'
  | 'G Shops'
  | 'Plans'
  | 'Reports'
  | 'Profile';

type BottomBarProps = {
  activeTab: SuperAdminTab;
  onTabPress: (tab: SuperAdminTab) => void;
};

const tabs: Array<{ label: SuperAdminTab; icon: typeof Home }> = [
  { label: 'Home', icon: Home },
  { label: 'G Shops', icon: Store },
  { label: 'Plans', icon: CreditCard },
  { label: 'Reports', icon: ChartNoAxesColumn },
  { label: 'Profile', icon: UserRound },
];

export default function BottomBar({
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(
    0,
    tabs.findIndex(tab => tab.label === activeTab),
  );
  const tabWidth = barWidth / tabs.length;

  useEffect(() => {
    if (barWidth === 0) {
      return;
    }

    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeIndex, barWidth, tabWidth, translateX]);

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      style={{ paddingBottom: insets.bottom }}>
      <View
        testID="bottom-tab-bar"
        onLayout={({ nativeEvent }) => setBarWidth(nativeEvent.layout.width)}
        className="relative h-[70px] flex-row items-center border-t border-[#EAD9B1]/40">
        {tabWidth > 0 && (
          <Animated.View
            testID="active-tab-background"
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 5,
              bottom: 5,
              left: 4,
              width: Math.max(tabWidth - 8, 0),
              borderRadius: 14,
              backgroundColor: '#F4C95D',
              transform: [{ translateX }],
            }}
          />
        )}
        {tabs.map(tab => {
          const isActive = tab.label === activeTab;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => onTabPress(tab.label)}
              className="z-10 h-full flex-1 items-center justify-center px-0.5"
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
              })}>
              <View
                className={
                  isActive
                    ? 'mb-1 h-8 w-9 items-center justify-center'
                    : 'mb-1 h-8 w-9 items-center justify-center'
                }>
                <Icon
                  size={19}
                  color={isActive ? '#153B35' : '#FFF8E7'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </View>
              <Text
                numberOfLines={1}
                className={
                  isActive
                    ? 'max-w-full text-[10px] font-extrabold text-[#153B35]'
                    : 'max-w-full text-[10px] font-bold text-white'
                }>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ImageBackground>
  );
}