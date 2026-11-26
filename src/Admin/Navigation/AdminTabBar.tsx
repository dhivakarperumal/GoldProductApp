import { useState } from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';
import {
  ChartNoAxesColumn,
  HandCoins,
  Home,
  Package,
  UserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AdminTab = 'Home' | 'Loans' | 'Products' | 'Reports' | 'Profile';

type AdminTabBarProps = {
  activeTab: AdminTab;
  onTabPress: (tab: AdminTab) => void;
};

const tabs: Array<{ label: AdminTab; icon: typeof Home }> = [
  { label: 'Home', icon: Home },
  { label: 'Loans', icon: HandCoins },
  { label: 'Products', icon: Package },
  { label: 'Reports', icon: ChartNoAxesColumn },
  { label: 'Profile', icon: UserRound },
];

export default function AdminTabBar({
  activeTab,
  onTabPress,
}: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / tabs.length;
  const activeIndex = tabs.findIndex(tab => tab.label === activeTab);

  return (
    <ImageBackground
      source={require('../../Assert/Images/bottom.png')}
      resizeMode="stretch"
      style={{ paddingBottom: insets.bottom }}>
      <View
        onLayout={({ nativeEvent }) => setBarWidth(nativeEvent.layout.width)}
        className="relative h-[78px] flex-row items-center border-t border-[#EAD9B1]/40">
        {tabWidth > 0 ? (
          <View
            pointerEvents="none"
            className="absolute bottom-2 top-2 rounded-full bg-[#07564B]"
            style={{
              left: activeIndex * tabWidth + 4,
              width: tabWidth - 8,
            }}
          />
        ) : null}
        {tabs.map(({ label, icon: Icon }) => {
          const isActive = label === activeTab;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              onPress={() => onTabPress(label)}
              className="z-10 h-full flex-1 items-center justify-center px-0.5">
              <View className="mb-1 h-8 w-9 items-center justify-center">
                <Icon
                  size={19}
                  color={isActive ? '#FFFFFF' : '#FFF8E7'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </View>
              <Text
                numberOfLines={1}
                className={`max-w-full text-[10px] ${
                  isActive ? 'font-extrabold' : 'font-bold'
                } text-white`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ImageBackground>
  );
}
