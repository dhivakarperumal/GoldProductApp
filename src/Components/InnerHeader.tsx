import { Pressable, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type InnerHeaderProps = {
  title: string;
  onBack: () => void;
  sectionLabel?: string;
};

export default function InnerHeader({
  title,
  onBack,
  sectionLabel = 'Loan Management',
}: InnerHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top + 10 }}
      className="mb-5 flex-row items-center bg-[#173F35] px-4 pb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to all loans"
        onPress={onBack}
        className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/10">
        <ChevronLeft size={22} color="#EAD78A" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">
          {sectionLabel}
        </Text>
        <Text className="mt-0.5 text-lg font-extrabold text-white">{title}</Text>
      </View>
    </View>
  );
}
