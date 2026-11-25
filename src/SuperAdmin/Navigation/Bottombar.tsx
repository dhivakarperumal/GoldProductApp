import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SuperAdminTab =
  | 'Home'
  | 'Gold Shops'
  | 'Subscription Plans'
  | 'Reports'
  | 'Profile';

type BottomBarProps = {
  activeTab: SuperAdminTab;
  onTabPress: (tab: SuperAdminTab) => void;
};

const tabs: Array<{ label: SuperAdminTab; icon: string }> = [
  { label: 'Home', icon: '⌂' },
  { label: 'Gold Shops', icon: '◆' },
  { label: 'Subscription Plans', icon: '▣' },
  { label: 'Reports', icon: '▥' },
  { label: 'Profile', icon: '◉' },
];

export default function BottomBar({
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white"
      style={{ paddingBottom: insets.bottom }}>
      <View className="h-[74px] flex-row items-center border-t border-gray-200 bg-white shadow-lg">
        {tabs.map(tab => {
          const isActive = tab.label === activeTab;

          return (
            <Pressable
              key={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => onTabPress(tab.label)}
              className="h-full flex-1 items-center justify-center px-0.5"
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
              })}>
              {isActive && (
                <View className="absolute top-0 h-[3px] w-7 rounded-b-md bg-[#D4AF37]" />
              )}
              <View
                className={
                  isActive
                    ? 'mb-1 h-8 w-[38px] items-center justify-center rounded-2xl bg-[#F5E6A8]'
                    : 'mb-1 h-8 w-[38px] items-center justify-center rounded-2xl'
                }>
                <Text
                  className={
                    isActive
                      ? 'text-[21px] font-bold leading-6 text-[#B8860B]'
                      : 'text-[21px] leading-6 text-[#666666]'
                  }>
                  {tab.icon}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                className={
                  isActive
                    ? 'max-w-full text-[10px] font-bold text-[#B8860B]'
                    : 'max-w-full text-[10px] font-semibold text-[#666666]'
                }>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}