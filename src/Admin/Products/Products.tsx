import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Boxes, Plus, Tags, Wrench, X } from 'lucide-react-native';
import AllProducts from './AllProducts';
import type { InventoryScreen } from './inventory';

type Props = {
  onNavigate: (screen: InventoryScreen, productId?: number | string) => void;
};

const ACTIONS: Array<{
  label: string;
  screen: InventoryScreen;
  icon: typeof Boxes;
}> = [
  { label: 'Add Product', screen: 'addProduct', icon: Plus },
  { label: 'Add Metal', screen: 'metals', icon: Wrench },
  { label: 'Add Category', screen: 'categories', icon: Tags },
  { label: 'Stock Details', screen: 'stock', icon: Boxes },
];

export default function Products({ onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <AllProducts onNavigate={onNavigate} />
      {menuOpen ? (
        <Pressable
          accessibilityLabel="Close product actions"
          onPress={() => setMenuOpen(false)}
          className="absolute inset-0 bg-black/20"
        />
      ) : null}
      {menuOpen ? (
        <View className="absolute bottom-24 right-5 items-end gap-3">
          {ACTIONS.map(({ label, screen, icon: Icon }) => (
            <Pressable
              key={screen}
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                onNavigate(screen);
              }}
              className="min-h-12 min-w-[200px] flex-row items-center justify-between gap-3 rounded-full bg-white px-4 shadow-lg">
              <Text numberOfLines={1} className="shrink-0 text-sm font-bold text-[#173F35]">
                {label}
              </Text>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#EAF3EF]">
                <Icon size={18} color="#07564B" />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={menuOpen ? 'Close product actions' : 'Open product actions'}
        onPress={() => setMenuOpen(open => !open)}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#07564B] shadow-lg">
        {menuOpen ? <X size={25} color="white" /> : <Plus size={26} color="white" />}
      </Pressable>
    </View>
  );
}
