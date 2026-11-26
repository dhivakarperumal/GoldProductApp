import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import api from '../../api';
import { useCustomAlert } from '../../Components/CustomAlert';

type ProfileData = {
  user_id?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
  notification_preferences?: { email: boolean; orders: boolean };
};

type ProfileSection = 'personal' | 'password' | 'notifications' | 'activity';

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function dateLabel(value: string | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Profile() {
  const { showAlert } = useCustomAlert();
  const [profile, setProfile] = useState<ProfileData>({
    notification_preferences: { email: true, orders: true },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeSection, setActiveSection] =
    useState<ProfileSection>('personal');
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoadError('');
      const response = await api.get('/auth/me');
      const user = response.data?.user || {};
      setProfile({
        ...user,
        notification_preferences: {
          email: user.notification_preferences?.email !== false,
          orders: user.notification_preferences?.orders !== false,
        },
      });
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load your profile.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => {
    const source = (profile.name || profile.username || 'A').trim();
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }, [profile.name, profile.username]);

  const roleLabel =
    (profile.role || 'Admin').charAt(0).toUpperCase() +
    (profile.role || 'Admin').slice(1);

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile(current => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    if (
      !(profile.name || '').trim() ||
      !(profile.username || '').trim() ||
      !(profile.email || '').trim()
    ) {
      showAlert('Missing details', 'Name, username, and email are required.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('/auth/me', {
        username: profile.username,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
      });
      if (response.data?.user) {
        setProfile(current => ({ ...current, ...response.data.user }));
      }
      showAlert('Saved', 'Profile saved successfully.', { variant: 'success' });
    } catch (error) {
      showAlert(
        'Unable to save',
        getErrorMessage(error, 'Unable to save your profile.'),
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.current) {
      showAlert('Password required', 'Enter your current password.', { variant: 'warning' });
      return;
    }
    if (passwords.next.length < 8) {
      showAlert(
        'Password too short',
        'New password must be at least 8 characters.',
        { variant: 'warning' },
      );
      return;
    }
    if (passwords.next !== passwords.confirm) {
      showAlert('Passwords do not match', 'Re-enter the new password.', { variant: 'warning' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      showAlert('Updated', 'Password updated successfully.', { variant: 'success' });
    } catch (error) {
      showAlert(
        'Unable to update',
        getErrorMessage(error, 'Unable to update your password.'),
        { variant: 'error' },
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const removeProfilePhoto = () => {
    showAlert('Remove profile photo?', 'Your profile photo will be removed.', {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingPhoto(true);
            try {
              const response = await api.delete('/auth/me/photo');
              if (response.data?.user) {
                setProfile(current => ({ ...current, ...response.data.user }));
              } else {
                setProfile(current => ({ ...current, profile_image: undefined }));
              }
              showAlert('Removed', 'Profile photo removed.', { variant: 'success' });
            } catch (error) {
              showAlert(
                'Unable to remove',
                getErrorMessage(error, 'Unable to remove profile photo.'),
                { variant: 'error' },
              );
            } finally {
              setRemovingPhoto(false);
            }
          },
        },
      ],
    });
  };

  const changePreference = async (
    key: 'email' | 'orders',
    value: boolean,
  ) => {
    const previous =
      profile.notification_preferences || { email: true, orders: true };
    const next = { ...previous, [key]: value };
    setProfile(current => ({
      ...current,
      notification_preferences: next,
    }));
    setSavingPreference(true);
    try {
      const response = await api.put('/auth/me/notifications', next);
      setProfile(current => ({
        ...current,
        notification_preferences:
          response.data?.user?.notification_preferences || next,
      }));
    } catch (error) {
      setProfile(current => ({
        ...current,
        notification_preferences: previous,
      }));
      showAlert(
        'Unable to save',
        getErrorMessage(error, 'Unable to save notification preference.'),
        { variant: 'error' },
      );
    } finally {
      setSavingPreference(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F7F2]">
        <ActivityIndicator color="#B8860B" />
        <Text className="mt-3 text-sm text-[#6B7280]">
          Loading your profile…
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View
        testID="profile-load-error"
        className="flex-1 items-center justify-center bg-[#F8F7F2] px-6">
        <Text className="text-center font-bold text-[#991B1B]">
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            void loadProfile();
          }}
          className="mt-4 rounded-xl bg-[#00695C] px-5 py-3">
          <Text className="font-bold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const sections: Array<{
    id: ProfileSection;
    label: string;
    icon: typeof UserRound;
  }> = [
    { id: 'personal', label: 'Personal', icon: UserRound },
    { id: 'password', label: 'Password', icon: LockKeyhole },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];
  const preferences =
    profile.notification_preferences || { email: true, orders: true };

  return (
    <ScrollView
      testID="super-admin-profile"
      className="flex-1 bg-[#F8F7F2]"
      contentContainerClassName="px-4 py-5"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadProfile();
          }}
        />
      }>
   

      <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#173F35]">
            <Text className="text-2xl font-bold text-white">{initials}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-extrabold text-[#1F2937]">
              {profile.name || profile.username || 'Super Admin'}
            </Text>
            <Text className="mt-0.5 text-xs text-[#6B7280]">{roleLabel}</Text>
            <View className="mt-2 self-start flex-row items-center rounded-full bg-[#FEF3C7] px-2 py-1">
              <ShieldCheck size={12} color="#92400E" />
              <Text className="ml-1 text-[10px] font-bold text-[#92400E]">
                {roleLabel}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-4 gap-2">
          <View className="flex-row items-center">
            <UserRound size={15} color="#6B7280" />
            <Text className="ml-2 flex-1 text-xs text-[#374151]">
              Username: {profile.username || 'Not set'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Mail size={15} color="#28708A" />
            <Text className="ml-2 flex-1 text-xs text-[#374151]">
              Email: {profile.email || 'Not set'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <ShieldCheck size={15} color="#B8860B" />
            <Text className="ml-2 flex-1 text-xs text-[#374151]">
              Role: {roleLabel}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Phone size={15} color="#059669" />
            <Text className="ml-2 flex-1 text-xs text-[#374151]">
              {profile.phone || 'Phone not set'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <CalendarDays size={15} color="#B8860B" />
            <Text className="ml-2 flex-1 text-xs text-[#374151]">
              Member since {dateLabel(profile.created_at)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
        {sections.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Pressable
              key={section.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveSection(section.id)}
              className={
                isActive
                  ? 'mr-2 flex-row items-center rounded-xl bg-[#00695C] px-4 py-3'
                  : 'mr-2 flex-row items-center rounded-xl border border-[#ECE7D8] bg-white px-4 py-3'
              }>
              <Icon size={15} color={isActive ? '#FFFFFF' : '#6B7280'} />
              <Text
                className={
                  isActive
                    ? 'ml-2 text-xs font-bold text-white'
                    : 'ml-2 text-xs font-bold text-[#6B7280]'
                }>
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeSection === 'personal' ? (
        <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
          <Text className="text-sm font-extrabold text-[#1F2937]">
            Personal Information
          </Text>
          <Text className="mt-1 text-xs text-[#6B7280]">
            Update your personal details and contact information.
          </Text>
          <View className="mt-4 gap-3">
            {([
              ['name', 'Full Name *'],
              ['email', 'Email Address *'],
              ['phone', 'Mobile Number'],
              ['address', 'Address'],
            ] as const).map(([field, label]) => (
              <View key={field}>
                <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                  {label}
                </Text>
                <TextInput
                  value={typeof profile[field] === 'string' ? profile[field] : ''}
                  onChangeText={value => updateField(field, value)}
                  keyboardType={
                    field === 'email'
                      ? 'email-address'
                      : field === 'phone'
                        ? 'phone-pad'
                        : 'default'
                  }
                  autoCapitalize={field === 'email' ? 'none' : 'sentences'}
                  multiline={field === 'address'}
                  textAlignVertical={field === 'address' ? 'top' : 'auto'}
                  className={
                    field === 'address'
                      ? 'min-h-[86px] rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm text-[#374151]'
                      : 'rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm text-[#374151]'
                  }
                />
              </View>
            ))}
            <View>
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                Username
              </Text>
              <TextInput
                value={profile.username || ''}
                editable={false}
                className="rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-3 text-sm text-[#6B7280]"
              />
            </View>
          </View>
          {profile.profile_image ? (
            <Pressable
              accessibilityRole="button"
              onPress={removeProfilePhoto}
              disabled={removingPhoto}
              className="mt-4 flex-row items-center self-start rounded-xl bg-[#FEF2F2] px-3 py-2.5">
              <Trash2 size={15} color="#DC2626" />
              <Text className="ml-2 text-xs font-bold text-[#DC2626]">
                {removingPhoto ? 'Removing…' : 'Remove profile photo'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={saveProfile}
            disabled={saving}
            className="mt-5 items-center rounded-xl bg-[#00695C] py-3.5">
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">Save Changes</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {activeSection === 'password' ? (
        <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
          <Text className="text-sm font-extrabold text-[#1F2937]">
            Change Password
          </Text>
          <Text className="mt-1 text-xs text-[#6B7280]">
            Keep your account secure with a strong password.
          </Text>
          {([
            ['current', 'Current Password'],
            ['next', 'New Password'],
            ['confirm', 'Confirm New Password'],
          ] as const).map(([key, label]) => (
            <View key={key} className="mt-3">
              <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                {label}
              </Text>
              <View className="flex-row items-center rounded-xl border border-[#E5E7EB] pr-2">
                <TextInput
                  value={passwords[key]}
                  onChangeText={value =>
                    setPasswords(current => ({ ...current, [key]: value }))
                  }
                  secureTextEntry={!visiblePasswords[key]}
                  autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                  className="flex-1 px-3 py-3 text-sm text-[#374151]"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    visiblePasswords[key] ? `Hide ${label}` : `Show ${label}`
                  }
                  onPress={() =>
                    setVisiblePasswords(current => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }>
                  {visiblePasswords[key] ? (
                    <EyeOff size={18} color="#6B7280" />
                  ) : (
                    <Eye size={18} color="#6B7280" />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={changePassword}
            disabled={changingPassword}
            className="mt-5 items-center rounded-xl bg-[#00695C] py-3.5">
            {changingPassword ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">
                Update Password
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {activeSection === 'notifications' ? (
        <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
          <Text className="text-sm font-extrabold text-[#1F2937]">
            Notification Preferences
          </Text>
          {([
            ['email', 'Email Notifications', 'Receive important updates via email'],
            ['orders', 'Order Notifications', 'Get notified about orders and enquiries'],
          ] as const).map(([key, label, description]) => (
            <View
              key={key}
              className="mt-4 flex-row items-center justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-xs font-bold text-[#374151]">{label}</Text>
                <Text className="mt-1 text-[11px] text-[#6B7280]">
                  {description}
                </Text>
              </View>
              <Switch
                accessibilityLabel={label}
                value={preferences[key]}
                disabled={savingPreference}
                onValueChange={value => changePreference(key, value)}
                trackColor={{ false: '#CBD5E1', true: '#008577' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>
      ) : null}

      {activeSection === 'activity' ? (
        <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
          <Text className="text-sm font-extrabold text-[#1F2937]">
            Activity Log
          </Text>
          <View className="mt-4 gap-3">
            <View className="flex-row items-center rounded-xl bg-[#F8FAF9] p-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D1FAE5]">
                <Check size={14} color="#047857" />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-bold text-[#374151]">
                  Account created
                </Text>
                <Text className="mt-1 text-[11px] text-[#6B7280]">
                  {dateLabel(profile.created_at)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center rounded-xl bg-[#F8FAF9] p-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#DBEAFE]">
                <Activity size={14} color="#1D4ED8" />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-bold text-[#374151]">
                  Profile last updated
                </Text>
                <Text className="mt-1 text-[11px] text-[#6B7280]">
                  {dateLabel(profile.updated_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
