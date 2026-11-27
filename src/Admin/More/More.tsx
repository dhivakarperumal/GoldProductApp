import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  CircleDollarSign,
  ClipboardList,
  ChartNoAxesColumnIncreasing,
  Gem,
  Package,
  ReceiptText,
  Shapes,
  Settings2,
  Store,
  UserRound,
} from 'lucide-react-native';

export type MoreScreen =
  | 'home'
  | 'funds'
  | 'dailyRates'
  | 'receiptSettings'
  | 'dealers'
  | 'dealerPurchases'
  | 'metals'
  | 'categories'
  | 'stockDetails'
  | 'reports'
  | 'profile';

type Props = { onNavigate: (screen: MoreScreen) => void };

const OPTIONS: Array<{
  screen: MoreScreen;
  title: string;
  description: string;
  icon: typeof CircleDollarSign;
}> = [
  {
    screen: 'funds',
    title: 'Fund Management',
    description: 'View balances, ledger entries, and record a fund transaction.',
    icon: CircleDollarSign,
  },
  {
    screen: 'dailyRates',
    title: 'Daily Gold Rate',
    description: 'Manage precious metal rates, schedules, and rate history.',
    icon: Settings2,
  },
  {
    screen: 'receiptSettings',
    title: 'Receipt Settings',
    description: 'Set the shop branding and contact details printed on receipts.',
    icon: ReceiptText,
  },
  {
    screen: 'dealers',
    title: 'Dealer Management',
    description: 'Manage trade partners, balances, and dealer statements.',
    icon: Store,
  },
  {
    screen: 'dealerPurchases',
    title: 'Dealer Purchases & Payables',
    description: 'Record supplier invoices, adjustments, and payments.',
    icon: ClipboardList,
  },
  {
    screen: 'metals',
    title: 'Metals',
    description: 'Manage the metals used by products and inventory.',
    icon: Gem,
  },
  {
    screen: 'categories',
    title: 'Categories',
    description: 'Add, edit, and organize product categories.',
    icon: Shapes,
  },
  {
    screen: 'stockDetails',
    title: 'Stock Details',
    description: 'Review product stock and update available quantities.',
    icon: Package,
  },
  {
    screen: 'reports',
    title: 'Reports',
    description: 'Review sales trends, customers, inventory, and loan activity.',
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    screen: 'profile',
    title: 'Admin Profile',
    description: 'View your account details.',
    icon: UserRound,
  },
];

export default function More({ onNavigate }: Props) {
  return (
    <ScrollView className="flex-1 bg-[#F8F7F2]" contentContainerClassName="px-4 py-5">
      <View className="mb-5 rounded-3xl bg-[#173F35] p-5">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
          Shop Administration
        </Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">More</Text>
        <Text className="mt-2 text-sm text-[#DCE8E4]">
          Funds, rates, receipts, dealers, products, and account settings.
        </Text>
      </View>
      {OPTIONS.map(({ screen, title, description, icon: Icon }) => (
        <Pressable
          key={screen}
          accessibilityRole="button"
          onPress={() => onNavigate(screen)}
          className="mb-3 flex-row items-center rounded-2xl border border-[#ECE7D8] bg-white p-4">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3EF]">
            <Icon size={22} color="#07564B" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-extrabold text-[#173F35]">{title}</Text>
            <Text className="mt-1 text-xs leading-5 text-[#6B7E76]">{description}</Text>
          </View>
          <Text className="ml-2 text-lg font-bold text-[#A77B15]">›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
