import { Text, View } from 'react-native';
import type { AdminTab } from '../Navigation/AdminTabBar';

const descriptions: Partial<Record<AdminTab, string>> = {
  Loans: 'Review and manage your shop loan activity.',
  Orders: 'Review and manage your shop orders.',
  Products: 'Manage your shop inventory and product catalogue.',
};

export default function AdminSection({ section }: { section: AdminTab }) {
  return (
    <View className="flex-1 bg-[#F8F7F2] px-4 py-5">
      <View className="rounded-3xl bg-[#173F35] p-5">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
          Shop Administration
        </Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">
          {section}
        </Text>
        <Text className="mt-2 text-sm text-[#DCE8E4]">
          {descriptions[section] || 'Manage your shop account.'}
        </Text>
      </View>
      <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-5">
        <Text className="text-sm leading-6 text-[#6B7280]">
          This section is ready for the next stage of the mobile admin app.
        </Text>
      </View>
    </View>
  );
}
