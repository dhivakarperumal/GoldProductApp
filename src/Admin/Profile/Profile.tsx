import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Mail, Phone, UserRound } from 'lucide-react-native';
import api from '../../api';

type AdminProfileData = {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unable to load your profile.';
}

export default function Profile() {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await api.get('/auth/me');
      setProfile(response.data?.user || null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F8F7F2]"
      contentContainerClassName="px-4 py-5"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }>
      <View className="mb-5 rounded-3xl bg-[#173F35] p-5">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-[#EAD78A]">
          Account
        </Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">
          Admin Profile
        </Text>
        <Text className="mt-2 text-sm text-[#DCE8E4]">
          Your shop account details.
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator className="py-5" color="#B8860B" />
      ) : null}
      {errorMessage ? (
        <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <Text accessibilityRole="alert" className="text-sm text-red-700">
            {errorMessage}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            className="mt-3 self-start">
            <Text className="font-bold text-red-700">Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {profile ? (
        <>
          <View className="mb-4 items-center rounded-2xl border border-[#ECE7D8] bg-white p-6">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-[#07564B]">
              <UserRound size={28} color="#FFFFFF" />
            </View>
            <Text className="text-lg font-bold text-[#173F35]">
              {profile.name || profile.username || 'Admin'}
            </Text>
            <Text className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#A77B15]">
              {profile.role || 'Admin'}
            </Text>
          </View>
          <View className="rounded-2xl border border-[#ECE7D8] bg-white px-4">
            {[
              { label: 'Email', value: profile.email || 'Not provided', icon: Mail },
              { label: 'Mobile', value: profile.phone || 'Not provided', icon: Phone },
              { label: 'Status', value: profile.status || 'Active', icon: UserRound },
            ].map(({ label, value, icon: Icon }) => (
              <View
                key={label}
                className="flex-row items-center border-b border-[#F3F0E8] py-4 last:border-b-0">
                <Icon size={18} color="#A77B15" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-[#8A8F8B]">{label}</Text>
                  <Text className="mt-1 text-sm font-semibold text-[#374151]">
                    {value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
