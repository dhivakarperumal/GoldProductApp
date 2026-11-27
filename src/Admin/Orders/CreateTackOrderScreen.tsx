import type { ReactNode } from 'react';
import { View } from 'react-native';
import InnerHeader from '../../Components/InnerHeader';

type CreateTackOrderScreenProps = {
  children: ReactNode;
  onBack: () => void;
};

export default function CreateTackOrderScreen({
  children,
  onBack,
}: CreateTackOrderScreenProps) {
  return (
    <View testID="create-tack-order-screen" className="flex-1 bg-[#F8F7F2]">
      <InnerHeader
        title="New tack order"
        sectionLabel="Order management"
        onBack={onBack}
        backAccessibilityLabel="Back to tack orders"
      />
      <View className="flex-1">{children}</View>
    </View>
  );
}
