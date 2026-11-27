import type { ReactNode } from 'react';
import { View } from 'react-native';
import InnerHeader from '../../Components/InnerHeader';

type CreateBillScreenProps = {
  children: ReactNode;
  title: string;
  onBack: () => void;
};

export default function CreateBillScreen({
  children,
  title,
  onBack,
}: CreateBillScreenProps) {
  return (
    <View testID="create-bill-screen" className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title={title}
        sectionLabel="Billing"
        onBack={onBack}
        backAccessibilityLabel="Back to bills"
      />
      <View className="flex-1">{children}</View>
    </View>
  );
}
