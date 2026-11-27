import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Activity,
  Bell,
  CalendarDays,
  Camera,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api, { API_BASE_URL } from '../../api';

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

type ProfileSection =
  | 'personal'
  | 'password'
  | 'notifications'
  | 'activity'
  | 'account';
type EditableField = 'name' | 'email' | 'phone' | 'address';

const PROFILE_SECTIONS = [
  { id: 'personal', label: 'Personal', icon: UserRound },
  { id: 'password', label: 'Password', icon: LockKeyhole },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'account', label: 'Account', icon: LogOut },
] as const satisfies Array<{
  id: ProfileSection;
  label: string;
  icon: typeof UserRound;
}>;

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

function dateTimeLabel(value: string | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProfileImageUri(path: string | undefined) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function Profile({ onLogout }: { onLogout: () => void }) {
  const { showAlert } = useCustomAlert();
  const [profile, setProfile] = useState<ProfileData>({
    notification_preferences: { email: true, orders: true },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
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
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  const [deactivationPassword, setDeactivationPassword] = useState('');
  const [showDeactivationPassword, setShowDeactivationPassword] =
    useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoadError('');
      const response = await api.get('/auth/me');
      if (!response.data?.user) {
        throw new Error('The server did not return your profile.');
      }
      const user = response.data.user;
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
    loadProfile();
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
  const preferences = profile.notification_preferences || {
    email: true,
    orders: true,
  };

  const updateField = (field: EditableField, value: string) => {
    setProfile(current => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    if (
      !(profile.name || '').trim() ||
      !(profile.username || '').trim() ||
      !(profile.email || '').trim()
    ) {
      Alert.alert('Missing details', 'Name, username, and email are required.');
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
      if (!response.data?.user) {
        throw new Error('The server did not return the saved profile.');
      }
      setProfile(current => ({ ...current, ...response.data.user }));
      Alert.alert('Saved', 'Profile saved successfully.');
    } catch (error) {
      Alert.alert(
        'Unable to save',
        getErrorMessage(error, 'Unable to save your profile.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.current) {
      Alert.alert('Password required', 'Enter your current password.');
      return;
    }
    if (passwords.next.length < 8) {
      Alert.alert(
        'Password too short',
        'New password must be at least 8 characters.',
      );
      return;
    }
    if (passwords.next !== passwords.confirm) {
      Alert.alert('Passwords do not match', 'Re-enter the new password.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      setVisiblePasswords({ current: false, next: false, confirm: false });
      Alert.alert('Updated', 'Password updated successfully.');
    } catch (error) {
      Alert.alert(
        'Unable to update',
        getErrorMessage(error, 'Unable to update your password.'),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const chooseProfileImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorMessage) {
        Alert.alert('Photo unavailable', result.errorMessage);
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert(
          'Photo unavailable',
          'Choose a JPG, PNG, or WEBP image and try again.',
        );
        return;
      }
      const type = asset.type || 'image/jpeg';
      if (
        !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type)
      ) {
        Alert.alert(
          'Unsupported photo',
          'Profile photos must be JPG, PNG, or WEBP images.',
        );
        return;
      }
      if ((asset.fileSize || 0) > 2 * 1024 * 1024) {
        Alert.alert(
          'Photo too large',
          'Choose a profile photo no larger than 2 MB.',
        );
        return;
      }
      const extension =
        type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const body = new FormData();
      body.append('image', {
        uri: asset.uri,
        name: asset.fileName || `profile-photo.${extension}`,
        type,
      });
      setUploadingImage(true);
      const response = await api.post('/auth/me/photo', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.data?.user) {
        throw new Error('The server did not return the updated profile.');
      }
      setProfile(current => ({ ...current, ...response.data.user }));
    } catch (error) {
      Alert.alert(
        'Upload failed',
        getErrorMessage(error, 'Unable to upload your profile photo.'),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    Alert.alert(
      'Remove profile photo?',
      'Your profile photo will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingImage(true);
            try {
              const response = await api.delete('/auth/me/photo');
              if (!response.data?.user) {
                throw new Error(
                  'The server did not return the updated profile.',
                );
              }
              setProfile(current => ({ ...current, ...response.data.user }));
            } catch (error) {
              Alert.alert(
                'Unable to remove photo',
                getErrorMessage(error, 'Unable to remove your profile photo.'),
              );
            } finally {
              setRemovingImage(false);
            }
          },
        },
      ],
    );
  };

  const changePreference = async (key: 'email' | 'orders', value: boolean) => {
    const previous = preferences;
    const next = { ...previous, [key]: value };
    setProfile(current => ({ ...current, notification_preferences: next }));
    setSavingPreference(true);
    try {
      const response = await api.put('/auth/me/notifications', next);
      const savedPreferences = response.data?.user?.notification_preferences;
      if (!savedPreferences) {
        throw new Error('The server did not return the saved preferences.');
      }
      setProfile(current => ({
        ...current,
        notification_preferences: savedPreferences,
      }));
    } catch (error) {
      setProfile(current => ({
        ...current,
        notification_preferences: previous,
      }));
      Alert.alert(
        'Unable to save',
        getErrorMessage(error, 'Unable to save notification preference.'),
      );
    } finally {
      setSavingPreference(false);
    }
  };

  const deactivateAccount = async () => {
    if (!deactivationPassword) {
      Alert.alert(
        'Password required',
        'Enter your current password to continue.',
      );
      return;
    }
    setDeactivating(true);
    try {
      await api.post('/auth/me/deactivate', {
        currentPassword: deactivationPassword,
      });
      setShowDeactivationModal(false);
      setDeactivationPassword('');
      setShowDeactivationPassword(false);
      Alert.alert(
        'Account deactivated',
        'Your account has been deactivated. Contact an administrator if you need it reactivated.',
        [{ text: 'OK', onPress: onLogout }],
        { cancelable: false },
      );
    } catch (error) {
      Alert.alert(
        'Unable to deactivate account',
        getErrorMessage(error, 'Unable to deactivate your account.'),
      );
    } finally {
      setDeactivating(false);
    }
  };

  const confirmLogout = () => {
    showAlert('Log out?', 'End your current session on this device?', {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: onLogout },
      ],
    });
  };

  const closeDeactivationModal = () => {
    if (deactivating) return;
    setShowDeactivationModal(false);
    setDeactivationPassword('');
    setShowDeactivationPassword(false);
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
        testID="admin-profile-load-error"
        className="flex-1 items-center justify-center bg-[#F8F7F2] px-6"
      >
        <Text
          accessibilityRole="alert"
          className="text-center font-bold text-[#991B1B]"
        >
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            loadProfile();
          }}
          className="mt-4 rounded-xl bg-[#00695C] px-5 py-3"
        >
          <Text className="font-bold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
        <ScrollView
          testID="admin-profile"
          className="flex-1 bg-[#F8F7F2]"
          contentContainerClassName="px-4 py-5"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadProfile();
              }}
            />
          }
        >
          <View className="mt-2 rounded-2xl border border-[#ECE7D8] bg-white p-4">
            <View className="flex-row items-center">
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#173F35]">
                {profile.profile_image ? (
                  <Image
                    source={{ uri: getProfileImageUri(profile.profile_image) }}
                    className="h-16 w-16"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-2xl font-bold text-white">
                    {initials}
                  </Text>
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-extrabold text-[#1F2937]">
                  {profile.name || profile.username || 'Admin'}
                </Text>
                <Text className="mt-0.5 text-xs text-[#6B7280]">
                  {roleLabel}
                </Text>
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
                <Mail size={15} color="#28708A" />
                <Text className="ml-2 flex-1 text-xs text-[#374151]">
                  Email: {profile.email || 'Not set'}
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            {PROFILE_SECTIONS.map(section => {
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
                  }
                >
                  <Icon size={15} color={isActive ? '#FFFFFF' : '#6B7280'} />
                  <Text
                    className={
                      isActive
                        ? 'ml-2 text-xs font-bold text-white'
                        : 'ml-2 text-xs font-bold text-[#6B7280]'
                    }
                  >
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
                {(
                  [
                    ['name', 'Full Name *'],
                    ['email', 'Email Address *'],
                    ['phone', 'Mobile Number'],
                    ['address', 'Address'],
                  ] as const
                ).map(([field, label]) => (
                  <View key={field}>
                    <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                      {label}
                    </Text>
                    <TextInput
                      value={profile[field] || ''}
                      onChangeText={value => updateField(field, value)}
                      placeholder={
                        field === 'name'
                          ? 'Enter your full name'
                          : field === 'email'
                          ? 'Enter your email address'
                          : field === 'phone'
                          ? 'Enter your mobile number'
                          : 'Enter your address'
                      }
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
              <View className="mt-4 flex-row flex-wrap gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  onPress={chooseProfileImage}
                  disabled={uploadingImage}
                  className="flex-row items-center self-start rounded-xl bg-[#E8F3EF] px-3 py-2.5"
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#00695C" />
                  ) : (
                    <Camera size={15} color="#00695C" />
                  )}
                  <Text className="ml-2 text-xs font-bold text-[#00695C]">
                    {uploadingImage ? 'Uploading…' : 'Change photo'}
                  </Text>
                </Pressable>
                {profile.profile_image ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={removeProfileImage}
                    disabled={removingImage}
                    className="flex-row items-center self-start rounded-xl bg-[#FEF2F2] px-3 py-2.5"
                  >
                    {removingImage ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Trash2 size={15} color="#DC2626" />
                    )}
                    <Text className="ml-2 text-xs font-bold text-[#DC2626]">
                      {removingImage ? 'Removing…' : 'Remove photo'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={saveProfile}
                disabled={saving}
                className="mt-5 items-center rounded-xl bg-[#00695C] py-3.5"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Save Changes
                  </Text>
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
                Update your password to keep your account secure.
              </Text>
              {(
                [
                  ['current', 'Current Password'],
                  ['next', 'New Password'],
                  ['confirm', 'Confirm New Password'],
                ] as const
              ).map(([key, label]) => (
                <View key={key} className="mt-3">
                  <Text className="mb-1.5 text-xs font-semibold text-[#374151]">
                    {label}
                  </Text>
                  <View className="flex-row items-center rounded-xl border border-[#E5E7EB] pr-3">
                    <TextInput
                      value={passwords[key]}
                      onChangeText={value =>
                        setPasswords(current => ({ ...current, [key]: value }))
                      }
                      secureTextEntry={!visiblePasswords[key]}
                      autoComplete={
                        key === 'current' ? 'current-password' : 'new-password'
                      }
                      placeholder={label}
                      className="flex-1 px-3 py-3 text-sm text-[#374151]"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        visiblePasswords[key]
                          ? `Hide ${label}`
                          : `Show ${label}`
                      }
                      onPress={() =>
                        setVisiblePasswords(current => ({
                          ...current,
                          [key]: !current[key],
                        }))
                      }
                      hitSlop={8}
                    >
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
                className="mt-5 items-center rounded-xl bg-[#00695C] py-3.5"
              >
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
              {(
                [
                  [
                    'email',
                    'Email Notifications',
                    'Receive important updates via email',
                  ],
                  [
                    'orders',
                    'Order Notifications',
                    'Get notified about orders and enquiries',
                  ],
                ] as const
              ).map(([key, label, description]) => (
                <View
                  key={key}
                  className="mt-4 flex-row items-center justify-between"
                >
                  <View className="mr-4 flex-1">
                    <Text className="text-xs font-bold text-[#374151]">
                      {label}
                    </Text>
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
                      {dateTimeLabel(profile.created_at)}
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
                      {dateTimeLabel(profile.updated_at)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {activeSection === 'account' ? (
            <View className="mt-4 gap-4">
              <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
                <View className="flex-row items-center">
                  <ShieldCheck size={18} color="#00695C" />
                  <Text className="ml-2 text-sm font-extrabold text-[#1F2937]">
                    Account Information
                  </Text>
                </View>
                <View className="mt-3 gap-3">
                  {[
                    ['User ID', profile.user_id || 'Not available'],
                    ['Role', roleLabel],
                    ['Status', profile.status || 'Active'],
                    ['Member Since', dateLabel(profile.created_at)],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      className="flex-row justify-between gap-3 border-b border-[#F3F4F6] pb-2"
                    >
                      <Text className="text-xs text-[#6B7280]">{label}</Text>
                      <Text className="flex-1 text-right text-xs font-semibold text-[#374151]">
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
                <View className="flex-row items-start">
                  <LogOut size={18} color="#6B7280" />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-extrabold text-[#1F2937]">
                      Log out
                    </Text>
                    <Text className="mt-1 text-xs text-[#6B7280]">
                      End your current session on this device.
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmLogout}
                  className="mt-4 items-center rounded-xl bg-[#FEF2F2] py-3"
                >
                  <Text className="text-sm font-bold text-[#B91C1C]">
                    Log Out
                  </Text>
                </Pressable>
              </View>
              {profile.role?.toLowerCase() === 'admin' ? (
                <View className="rounded-2xl border border-rose-200 bg-white p-4">
                  <View className="flex-row items-start">
                    <Trash2 size={18} color="#B91C1C" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-extrabold text-[#1F2937]">
                        Deactivate account
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-[#6B7280]">
                        Your account will be deactivated and you will be signed
                        out. An administrator can reactivate it later.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowDeactivationModal(true)}
                    className="mt-4 items-center rounded-xl bg-[#B91C1C] py-3"
                  >
                    <Text className="text-sm font-bold text-white">
                      Deactivate Account
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showDeactivationModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeactivationModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center bg-black/60 px-5"
        >
          <View className="rounded-2xl bg-white p-5">
            <Text className="text-lg font-extrabold text-[#1F2937]">
              Deactivate your account?
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#6B7280]">
              You will be signed out immediately. Enter your current password to
              confirm.
            </Text>
            <Text className="mt-4 text-xs font-semibold text-[#374151]">
              Current Password *
            </Text>
            <View className="mt-2 flex-row items-center rounded-xl border border-[#E5E7EB] pr-3">
              <TextInput
                value={deactivationPassword}
                onChangeText={setDeactivationPassword}
                secureTextEntry={!showDeactivationPassword}
                autoComplete="current-password"
                placeholder="Enter your current password"
                editable={!deactivating}
                className="flex-1 px-3 py-3 text-sm text-[#374151]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showDeactivationPassword
                    ? 'Hide current password'
                    : 'Show current password'
                }
                onPress={() => setShowDeactivationPassword(current => !current)}
                hitSlop={8}
              >
                {showDeactivationPassword ? (
                  <EyeOff size={18} color="#6B7280" />
                ) : (
                  <Eye size={18} color="#6B7280" />
                )}
              </Pressable>
            </View>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={deactivating}
                onPress={closeDeactivationModal}
                className="min-w-[88px] items-center rounded-xl border border-[#E5E7EB] px-4 py-3"
              >
                <Text className="text-sm font-bold text-[#4B5563]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deactivating}
                onPress={deactivateAccount}
                className="min-w-[110px] items-center rounded-xl bg-[#B91C1C] px-4 py-3"
              >
                {deactivating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    Deactivate
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
