import React from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';
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
  | 'Gold Shops'
  | 'Subscription Plans'
  | 'Reports'
  | 'Profile';

type BottomBarProps = {
  activeTab: SuperAdminTab;
  onTabPress: (tab: SuperAdminTab) => void;
};

const tabs: Array<{ label: SuperAdminTab; icon: typeof Home }> = [
  { label: 'Home', icon: Home },
  { label: 'Gold Shops', icon: Store },
  { label: 'Subscription Plans', icon: CreditCard },
  { label: 'Reports', icon: ChartNoAxesColumn },
  { label: 'Profile', icon: UserRound },
];

export default function BottomBar({
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      style={{ paddingBottom: insets.bottom }}>
      <View className="h-[74px] flex-row items-center border-t border-[#EAD9B1] bg-[#FFFDF8]/80">
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
                <Icon
                  size={20}
                  color={isActive ? '#B8860B' : '#666666'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
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
    </ImageBackground>
  );
}