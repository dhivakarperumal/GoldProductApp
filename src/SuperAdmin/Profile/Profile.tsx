import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  UserRound,
  Users,
} from 'lucide-react-native';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MyProfile from './MyProfile';

type ProfileDestination = 'cards' | 'my-profile' | 'users' | 'payments';

type ProfileProps = {
  onMyProfileVisibilityChange: (visible: boolean) => void;
  onLogout: () => void;
};

const cards = [
  {
    id: 'my-profile',
    label: 'My Profile',
    description: 'View and update your account details.',
    icon: UserRound,
  },
  {
    id: 'users',
    label: 'User Management',
    description: 'Manage user accounts and access.',
    icon: Users,
  },
  {
    id: 'payments',
    label: 'Payment Management',
    description: 'View payment and billing information.',
    icon: CreditCard,
  },
] as const;

export default function Profile({
  onMyProfileVisibilityChange,
  onLogout,
}: ProfileProps) {
  const [destination, setDestination] = useState<ProfileDestination>('cards');

  if (destination === 'my-profile') {
    return (
      <View className="flex-1 bg-[#F8F7F2]">
        <StatusBar barStyle="light-content" />
        <SafeAreaView edges={['top']} className="bg-[#153B35]">
          <View className="w-full flex-row items-center bg-[#153B35] px-5 py-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to profile cards"
              onPress={() => {
                setDestination('cards');
                onMyProfileVisibilityChange(false);
              }}
              className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <ArrowLeft size={21} color="#FFFFFF" />
            </Pressable>
            <Text className="text-xl font-extrabold text-white">
              My Profile
            </Text>
          </View>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
          <MyProfile onLogout={onLogout} />
        </SafeAreaView>
      </View>
    );
  }

  if (destination === 'users' || destination === 'payments') {
    const isUserManagement = destination === 'users';
    const title = isUserManagement ? 'User Management' : 'Payment Management';
    const Icon = isUserManagement ? Users : CreditCard;

    return (
      <View className="flex-1 bg-[#F8F7F2] px-4 py-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to profile cards"
          onPress={() => setDestination('cards')}
          className="mb-5 flex-row items-center self-start rounded-xl bg-white px-3 py-2.5"
        >
          <ArrowLeft size={18} color="#173F35" />
          <Text className="ml-2 text-sm font-bold text-[#173F35]">
            Back to Profile
          </Text>
        </Pressable>
        <View className="flex-1 items-center justify-center rounded-2xl border border-[#ECE7D8] bg-white px-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF3C7]">
            <Icon size={28} color="#92400E" />
          </View>
          <Text className="mt-4 text-xl font-extrabold text-[#173F35]">
            {title}
          </Text>
          <Text className="mt-2 text-center text-sm text-[#6B7280]">
            This section is ready for its management features.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F7F2]"
      contentContainerClassName="px-4 py-5"
    >
      
      <View className="gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              onPress={() => {
                setDestination(card.id);
                onMyProfileVisibilityChange(card.id === 'my-profile');
              }}
              className="w-full flex-row items-center rounded-2xl border border-[#E8E6DC] bg-white p-4 shadow-sm"
            >
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#E7F3EF]">
                <Icon size={21} color="#08745D" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-extrabold text-[#173F35]">
                  {card.label}
                </Text>
                <Text className="mt-1 text-xs leading-4 text-[#6B7280]">
                  {card.description}
                </Text>
              </View>
              <View className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7]">
                <ChevronRight size={18} color="#92400E" />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
