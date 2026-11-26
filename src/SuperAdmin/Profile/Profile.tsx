import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  UserRound,
  Users,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MyProfile from './MyProfile';
import PaymentManagement from './PaymentManagement';
import UsersManegement from './UsersManegement';

type ProfileDestination = 'cards' | 'my-profile' | 'users' | 'payments';

type ProfileProps = {
  onMyProfileVisibilityChange: (visible: boolean) => void;
  onUsersManagementVisibilityChange: (visible: boolean) => void;
  onPaymentManagementVisibilityChange: (visible: boolean) => void;
  onLogout: () => void;
};

const screenStyles = StyleSheet.create({
  visible: { flex: 1 },
  hidden: { display: 'none' },
});

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
  onUsersManagementVisibilityChange,
  onPaymentManagementVisibilityChange,
  onLogout,
}: ProfileProps) {
  const [destination, setDestination] = useState<ProfileDestination>('cards');
  const [visitedDestinations, setVisitedDestinations] = useState<
    Set<ProfileDestination>
  >(() => new Set(['cards']));

  const navigateTo = (next: ProfileDestination) => {
    setDestination(next);
    setVisitedDestinations(current => new Set(current).add(next));
    onMyProfileVisibilityChange(next === 'my-profile');
    onUsersManagementVisibilityChange(next === 'users');
    onPaymentManagementVisibilityChange(next === 'payments');
  };

  return (
    <View className="flex-1">
      {destination === 'my-profile' ? (
        <StatusBar barStyle="light-content" />
      ) : null}
      <View
        style={
          destination === 'cards' ? screenStyles.visible : screenStyles.hidden
        }
      >
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
                  onPress={() => navigateTo(card.id)}
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
      </View>

      {visitedDestinations.has('my-profile') ? (
        <View
          style={
            destination === 'my-profile'
              ? screenStyles.visible
              : screenStyles.hidden
          }
          className="flex-1 bg-[#F8F7F2]"
        >
          <SafeAreaView edges={['top']} className="bg-[#153B35]">
            <View className="w-full flex-row items-center bg-[#153B35] px-5 py-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to profile cards"
                onPress={() => navigateTo('cards')}
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
      ) : null}

      {visitedDestinations.has('users') ? (
        <View
          style={
            destination === 'users'
              ? screenStyles.visible
              : screenStyles.hidden
          }
        >
          <UsersManegement onBack={() => navigateTo('cards')} />
        </View>
      ) : null}

      {visitedDestinations.has('payments') ? (
        <View
          style={
            destination === 'payments'
              ? screenStyles.visible
              : screenStyles.hidden
          }
        >
          <PaymentManagement onBack={() => navigateTo('cards')} />
        </View>
      ) : null}
    </View>
  );
}
