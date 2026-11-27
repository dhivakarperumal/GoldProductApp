import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

type LoanStatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
};

export default function LoanStatCard({
  label,
  value,
  icon: Icon,
  className = '',
}: LoanStatCardProps) {
  return (
    <View
      className={`relative min-h-[100px] flex-1 overflow-hidden rounded-[20px] border border-[#F6D25D] bg-[#064D42] p-3 ${className}`}
      style={{
        elevation: 5,
        shadowColor: '#FFC837',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      }}>
      <View
        pointerEvents="none"
        className="absolute -right-4 -top-5 h-16 w-16 rounded-full border border-white/15 bg-white/10"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-5 right-5 h-12 w-12 rounded-full bg-[#FFC629]/10"
      />
      <View className="h-7 w-7 items-center justify-center rounded-full border border-[#FFE078] bg-black/20">
        <Icon size={15} color="#FFE08A" strokeWidth={2.4} />
      </View>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className="mt-1 text-[10px] font-semibold leading-[13px] text-white">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        className="mt-0.5 text-base font-black text-[#FFE28A]">
        {value}
      </Text>
    </View>
  );
}
