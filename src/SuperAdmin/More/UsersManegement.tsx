import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCustomAlert } from '../../Components/CustomAlert';
import api from '../../api';

const PAGE_SIZE = 8;
const DATE_RANGE_OPTIONS = [
  ['all', 'All Time'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['this_week', 'This Week'],
  ['last_week', 'Last Week'],
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['this_year', 'This Year'],
  ['last_year', 'Last Year'],
  ['custom', 'Custom'],
] as const;

const ROLES = [
  ['user', 'Customer'],
  ['manager', 'Manager'],
  ['dealer', 'Dealer'],
  ['admin', 'Admin'],
] as const;

type UserStatus = 'Active' | 'Inactive';
type StatusFilter = 'all' | 'active' | 'inactive';
type DatePreset = (typeof DATE_RANGE_OPTIONS)[number][0];
type DateRange = {
  preset: DatePreset;
  startDate: string;
  endDate: string;
};

type ApiUser = {
  id?: string | number;
  user_id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  created_at?: string;
};

type UserRecord = {
  id: string | number;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: UserStatus;
  created_at?: string;
};

type UserFormData = {
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
};

type UsersManagementProps = {
  onBack: () => void;
};

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

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(date: Date, days: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function resolveDatePreset(preset: DatePreset, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (today.getDay() + 6) % 7;
  const ranges: Partial<Record<DatePreset, [Date, Date]>> = {
    today: [today, today],
    yesterday: [shiftDays(today, -1), shiftDays(today, -1)],
    this_week: [shiftDays(today, -weekday), shiftDays(today, 6 - weekday)],
    last_week: [shiftDays(today, -weekday - 7), shiftDays(today, -weekday - 1)],
    this_month: [
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
    ],
    last_month: [
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
      new Date(today.getFullYear(), today.getMonth(), 0),
    ],
    this_year: [
      new Date(today.getFullYear(), 0, 1),
      new Date(today.getFullYear(), 11, 31),
    ],
    last_year: [
      new Date(today.getFullYear() - 1, 0, 1),
      new Date(today.getFullYear() - 1, 11, 31),
    ],
  };
  const range = ranges[preset];
  return range
    ? {
        preset,
        startDate: toDateString(range[0]),
        endDate: toDateString(range[1]),
      }
    : { preset: 'all', startDate: '', endDate: '' };
}

function normalizeUser(user: ApiUser): UserRecord {
  const id = user.id ?? user.user_id;
  if (id == null) {
    throw new Error('A user record is missing its ID.');
  }
  return {
    id,
    username: user.username || user.name || '',
    name: user.name || user.username || 'User',
    email: user.email || '',
    phone: user.phone || '',
    role: String(user.role || 'user').toLowerCase(),
    status:
      String(user.status || 'active').toLowerCase() === 'inactive'
        ? 'Inactive'
        : 'Active',
    created_at: user.created_at,
  };
}

function formatDate(
  value: string | undefined,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(
    'en-IN',
    options || { day: '2-digit', month: 'short', year: 'numeric' },
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <View className="flex-1 basis-[145px] rounded-2xl border border-[#ECE7D8] bg-white p-4">
      <View
        className={`mb-3 h-10 w-10 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={20} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text className="text-xs font-semibold text-[#6B7280]">{label}</Text>
      <Text className="mt-1 text-xl font-extrabold text-[#173F35]">
        {value.toLocaleString('en-IN')}
      </Text>
      <Text className="mt-2 text-[10px] text-[#6B7280]">{caption}</Text>
    </View>
  );
}

export default function UsersManegement({ onBack }: UsersManagementProps) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const floatingButtonPosition = useMemo(
    () => ({ bottom: insets.bottom + 16 }),
    [insets.bottom],
  );
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isStatusOptionsOpen, setIsStatusOptionsOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [isDateOptionsOpen, setIsDateOptionsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: '',
  });
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [dateError, setDateError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<string | number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<
    string | number | null
  >(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'admin',
    password: '',
  });
  const requestId = useRef(0);

  const fetchUsers = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/auth/users', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      const data = response.data;
      const records: ApiUser[] | null = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.data)
        ? data.data
        : null;
      if (!records) {
        throw new Error('The server returned an invalid user list.');
      }
      const nextUsers = records.map(normalizeUser);
      if (requestId.current === activeRequest) {
        setUsers(nextUsers);
        setSelectedUserId(currentId =>
          nextUsers.some(user => String(user.id) === String(currentId))
            ? currentId
            : nextUsers[0]?.id ?? null,
        );
      }
    } catch (error) {
      if (requestId.current === activeRequest) {
        setLoadError(getErrorMessage(error, 'Could not load user accounts.'));
      }
    } finally {
      if (requestId.current === activeRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    fetchUsers();
    return () => {
      requestId.current += 1;
    };
  }, [fetchUsers]);

  const todayCount = users.filter(user => {
    if (!user.created_at) return false;
    const created = new Date(user.created_at);
    return (
      !Number.isNaN(created.getTime()) &&
      created.toDateString() === new Date().toDateString()
    );
  }).length;
  const activeCount = users.filter(user => user.status === 'Active').length;
  const inactiveCount = users.length - activeCount;

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch =
        !query ||
        [user.name, user.email, user.phone, user.id].some(value =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        );
      const matchesStatus =
        statusFilter === 'all' || user.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const pageUsers = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedUser =
    users.find(user => String(user.id) === String(selectedUserId)) || null;

  const selectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setDateError('');
    if (preset !== 'custom') {
      setDateRange(resolveDatePreset(preset));
    }
  };

  const applyCustomRange = () => {
    if (!customRange.startDate || !customRange.endDate) {
      setDateError('Choose both a start and end date.');
      return;
    }
    if (customRange.startDate > customRange.endDate) {
      setDateError('Start date cannot be later than end date.');
      return;
    }
    setDateError('');
    setDateRange({ preset: 'custom', ...customRange });
  };

  const clearDateFilter = () => {
    setCustomRange({ startDate: '', endDate: '' });
    setDateError('');
    setDatePreset('all');
    setDateRange(resolveDatePreset('all'));
  };

  const openAddModal = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      phone: '',
      role: 'admin',
      password: '',
    });
    setIsEditing(false);
    setEditUserId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setFormData({
      username: user.username || user.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: '',
    });
    setEditUserId(user.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const saveUser = async () => {
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      (!isEditing && !formData.password)
    ) {
      showAlert(
        'Required information',
        'Enter a username, email, and password for a new account.',
        { variant: 'warning' },
      );
      return;
    }

    setSubmitLoading(true);
    const accountDetails = {
      username: formData.username.trim(),
      name: formData.name.trim() || formData.username.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: isEditing ? formData.role.toLowerCase() : 'admin',
    };
    try {
      if (isEditing && editUserId != null) {
        await api.put(`/auth/users/${editUserId}`, accountDetails);
        setIsModalOpen(false);
        await fetchUsers();
        showAlert('Saved', 'User account updated.', { variant: 'success' });
      } else {
        await api.post('/auth/users', {
          ...accountDetails,
          password: formData.password,
        });
        setIsModalOpen(false);
        await fetchUsers();
        showAlert('Added', 'User account created.', { variant: 'success' });
      }
    } catch (error) {
      showAlert(
        'Unable to save user',
        getErrorMessage(error, 'Could not save this user account.'),
        { variant: 'error' },
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const deleteUser = (user: UserRecord) => {
    showAlert('Delete user?', `Delete ${user.name}? This cannot be undone.`, {
      variant: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/auth/users/${user.id}`);
              await fetchUsers();
              showAlert('Deleted', 'User account deleted.', {
                variant: 'success',
              });
            } catch (error) {
              showAlert(
                'Unable to delete user',
                getErrorMessage(error, 'Could not delete this user.'),
                { variant: 'error' },
              );
            }
          },
        },
      ],
    });
  };

  const changeUserStatus = async (user: UserRecord, status: UserStatus) => {
    if (statusUpdatingUserId !== null || user.status === status) return;
    setStatusUpdatingUserId(user.id);
    try {
      await api.put(`/auth/users/${user.id}`, {
        username: user.username || user.name,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: status.toLowerCase(),
      });
      setUsers(currentUsers =>
        currentUsers.map(currentUser =>
          String(currentUser.id) === String(user.id)
            ? { ...currentUser, status }
            : currentUser,
        ),
      );
    } catch (error) {
      showAlert(
        'Unable to update status',
        getErrorMessage(error, 'Could not update user status.'),
        { variant: 'error' },
      );
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const updateFormField = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K],
  ) => setFormData(current => ({ ...current, [key]: value }));

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      caption: 'Registered accounts',
      icon: Users,
      color: 'bg-[#123B32]',
    },
    {
      label: 'New Today',
      value: todayCount,
      caption: 'Joined today',
      icon: UserPlus,
      color: 'bg-[#443719]',
    },
    {
      label: 'Active',
      value: activeCount,
      caption: 'Active accounts',
      icon: UserRound,
      color: 'bg-[#17364D]',
    },
    {
      label: 'Inactive',
      value: inactiveCount,
      caption: 'Inactive accounts',
      icon: UserX,
      color: 'bg-[#4A2B25]',
    },
  ];

  return (
    <View className="flex-1 bg-[#F8F7F2]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} className="bg-[#153B35]">
        <View className="flex-row items-center bg-[#153B35] px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile cards"
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-lg font-extrabold text-white">
              User Management
            </Text>
            <Text className="mt-0.5 text-xs text-white/75">
              Manage user accounts and access.
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#F8F7F2]">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUsers();
              }}
              tintColor="#08745D"
            />
          }
        >
          <View className="mb-4 flex-row flex-wrap gap-3">
            {stats.map(stat => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </View>

          <View className="mb-4 rounded-2xl border border-[#ECE7D8] bg-white p-3">
            <View className="flex-row items-center rounded-xl border border-[#E5E7EB] px-3">
              <Search size={17} color="#9CA3AF" />
              <TextInput
                accessibilityLabel="Search users"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search name, phone, email..."
                placeholderTextColor="#9CA3AF"
                className="min-h-11 flex-1 px-2 text-sm text-[#1F2937]"
                returnKeyType="search"
              />
              {searchTerm ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear user search"
                  onPress={() => setSearchTerm('')}
                  className="p-1"
                >
                  <X size={16} color="#6B7280" />
                </Pressable>
              ) : null}
            </View>

            <View className="mt-3 flex-row items-start gap-2">
              <View className="flex-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select date range"
                  accessibilityState={{ expanded: isDateOptionsOpen }}
                  onPress={() => setIsDateOptionsOpen(open => !open)}
                  className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3"
                >
                  <View className="flex-1 flex-row items-center">
                    <CalendarDays size={16} color="#08745D" />
                    <Text
                      numberOfLines={1}
                      className="ml-2 flex-1 text-xs font-semibold text-[#374151]"
                    >
                      {DATE_RANGE_OPTIONS.find(
                        ([value]) => value === datePreset,
                      )?.[1] ?? 'All Time'}
                    </Text>
                  </View>
                  <ChevronDown size={17} color="#6B7280" />
                </Pressable>
                {isDateOptionsOpen ? (
                  <View className="mt-2 rounded-xl border border-[#E5E7EB] bg-white p-2">
                    {DATE_RANGE_OPTIONS.map(([value, label]) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: datePreset === value }}
                        onPress={() => {
                          selectDatePreset(value);
                          setIsDateOptionsOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
                          datePreset === value ? 'bg-[#E7F3EF]' : ''
                        }`}
                      >
                        <Text className="text-xs font-semibold text-[#374151]">
                          {label}
                        </Text>
                        {datePreset === value ? (
                          <Check size={15} color="#08745D" />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View className="flex-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select user status"
                  accessibilityState={{ expanded: isStatusOptionsOpen }}
                  onPress={() => setIsStatusOptionsOpen(open => !open)}
                  className="min-h-11 flex-row items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3"
                >
                  <Text className="text-xs font-semibold text-[#374151]">
                    {statusFilter === 'all'
                      ? 'All'
                      : statusFilter === 'active'
                      ? 'Active'
                      : 'Inactive'}
                  </Text>
                  <ChevronDown size={17} color="#6B7280" />
                </Pressable>
                {isStatusOptionsOpen ? (
                  <View className="mt-2 rounded-xl border border-[#E5E7EB] bg-white p-2">
                    {(
                      [
                        ['all', 'All'],
                        ['active', 'Active'],
                        ['inactive', 'Inactive'],
                      ] as const
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: statusFilter === value,
                        }}
                        onPress={() => {
                          setStatusFilter(value);
                          setIsStatusOptionsOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
                          statusFilter === value ? 'bg-[#E7F3EF]' : ''
                        }`}
                      >
                        <Text className="text-xs font-semibold text-[#374151]">
                          {label}
                        </Text>
                        {statusFilter === value ? (
                          <Check size={15} color="#08745D" />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            {datePreset === 'custom' ? (
              <View className="mt-3">
                <View className="flex-row gap-2">
                  <TextInput
                    accessibilityLabel="Start date"
                    value={customRange.startDate}
                    onChangeText={value =>
                      setCustomRange(current => ({
                        ...current,
                        startDate: value,
                      }))
                    }
                    placeholder="Start YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    className="min-h-10 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-xs text-[#374151]"
                    autoCapitalize="none"
                  />
                  <TextInput
                    accessibilityLabel="End date"
                    value={customRange.endDate}
                    onChangeText={value =>
                      setCustomRange(current => ({
                        ...current,
                        endDate: value,
                      }))
                    }
                    placeholder="End YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    className="min-h-10 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-xs text-[#374151]"
                    autoCapitalize="none"
                  />
                </View>
                <View className="mt-2 flex-row justify-end gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={clearDateFilter}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-2"
                  >
                    <Text className="text-xs font-bold text-[#4B5563]">
                      Clear
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={applyCustomRange}
                    className="rounded-lg bg-[#08745D] px-3 py-2"
                  >
                    <Text className="text-xs font-bold text-white">Apply</Text>
                  </Pressable>
                </View>
                {dateError ? (
                  <Text className="mt-2 text-xs font-semibold text-rose-600">
                    {dateError}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {loadError ? (
            <View className="items-center rounded-2xl bg-white px-5 py-8">
              <Text className="text-center text-sm font-semibold text-rose-700">
                {loadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={fetchUsers}
                className="mt-4 rounded-xl bg-[#08745D] px-5 py-2.5"
              >
                <Text className="text-xs font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : loading && users.length === 0 ? (
            <View className="items-center rounded-2xl bg-white py-10">
              <ActivityIndicator color="#08745D" />
              <Text className="mt-3 text-sm text-[#6B7280]">
                Loading users...
              </Text>
            </View>
          ) : pageUsers.length === 0 ? (
            <View className="items-center rounded-2xl bg-white px-5 py-10">
              <Text className="text-center text-sm text-[#6B7280]">
                No users match your search and filters.
              </Text>
            </View>
          ) : (
            pageUsers.map(user => {
              const isSelected = String(selectedUserId) === String(user.id);
              return (
                <View
                  key={user.id}
                  className={`mb-3 rounded-2xl border bg-white p-4 ${
                    isSelected
                      ? 'border-[#8EC8B8] bg-[#F7FCFA]'
                      : 'border-[#ECE7D8]'
                  }`}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${user.name}`}
                    onPress={() => setSelectedUserId(user.id)}
                    className="flex-row items-center"
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7EBCB]">
                      <Text className="text-xs font-extrabold text-[#795713]">
                        {getInitials(user.name)}
                      </Text>
                    </View>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-extrabold text-[#173F35]"
                      >
                        {user.name}
                      </Text>
                      <Text className="mt-0.5 text-[10px] capitalize text-[#6B7280]">
                        {user.role} · #{user.id}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        user.status === 'Active'
                          ? 'bg-emerald-50'
                          : 'bg-rose-50'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          user.status === 'Active'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {user.status}
                      </Text>
                    </View>
                  </Pressable>

                  <View className="mt-3 gap-2 border-t border-[#F3F4F6] pt-3">
                    <View className="flex-row items-center">
                      <Mail size={14} color="#08745D" />
                      <Text
                        numberOfLines={1}
                        className="ml-2 flex-1 text-xs text-[#4B5563]"
                      >
                        {user.email || 'Email not provided'}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Phone size={14} color="#08745D" />
                      <Text className="ml-2 text-xs text-[#4B5563]">
                        {user.phone || 'Phone not provided'}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-[#6B7280]">
                      Joined {formatDate(user.created_at)}
                    </Text>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between border-t border-[#F3F4F6] pt-2">
                    <View className="flex-row items-center">
                      <Text className="mr-2 text-[10px] font-semibold text-[#6B7280]">
                        {user.status}
                      </Text>
                      <Switch
                        accessibilityLabel={`Change status for ${user.name}`}
                        value={user.status === 'Active'}
                        disabled={statusUpdatingUserId !== null}
                        onValueChange={value =>
                          changeUserStatus(user, value ? 'Active' : 'Inactive')
                        }
                        trackColor={{ false: '#FECACA', true: '#86CDB9' }}
                        thumbColor={
                          user.status === 'Active' ? '#08745D' : '#F9FAFB'
                        }
                      />
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${user.name}`}
                        onPress={() => openEditModal(user)}
                        className="rounded-lg bg-[#EFF6FF] p-2"
                      >
                        <Pencil size={15} color="#1D4ED8" />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${user.name}`}
                        onPress={() => deleteUser(user)}
                        className="rounded-lg bg-[#FEF2F2] p-2"
                      >
                        <Trash2 size={15} color="#B91C1C" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View className="mt-1 flex-row items-center justify-between rounded-xl bg-white px-3 py-3">
            <Text className="flex-1 text-[10px] text-[#6B7280]">
              {filteredUsers.length
                ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                    safePage * PAGE_SIZE,
                    filteredUsers.length,
                  )} of ${filteredUsers.length}`
                : '0 users'}
            </Text>
            <View className="flex-row items-center gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                disabled={safePage <= 1 || loading}
                onPress={() =>
                  setCurrentPage(current => Math.max(1, current - 1))
                }
                className={`rounded-lg border border-[#E5E7EB] p-2 ${
                  safePage <= 1 || loading ? 'opacity-40' : ''
                }`}
              >
                <ChevronLeft size={16} color="#4B5563" />
              </Pressable>
              <Text className="px-2 text-xs font-semibold text-[#4B5563]">
                {safePage} / {Math.max(totalPages, 1)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next page"
                disabled={safePage >= totalPages || loading}
                onPress={() =>
                  setCurrentPage(current =>
                    Math.min(Math.max(totalPages, 1), current + 1),
                  )
                }
                className={`rounded-lg border border-[#E5E7EB] p-2 ${
                  safePage >= totalPages || loading ? 'opacity-40' : ''
                }`}
              >
                <ChevronRight size={16} color="#4B5563" />
              </Pressable>
            </View>
          </View>

          <View className="mt-4 rounded-2xl border border-[#ECE7D8] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-[#173F35]">
                User Details
              </Text>
              {selectedUser ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected user"
                  onPress={() => setSelectedUserId(null)}
                  className="rounded-full bg-[#F3F4F6] p-1.5"
                >
                  <X size={15} color="#6B7280" />
                </Pressable>
              ) : null}
            </View>
            {selectedUser ? (
              <>
                <View className="flex-row items-center border-b border-[#F3F4F6] pb-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7EBCB]">
                    <Text className="font-extrabold text-[#795713]">
                      {getInitials(selectedUser.name)}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-[#1F2937]">
                      {selectedUser.name}
                    </Text>
                    <Text className="mt-0.5 text-xs capitalize text-[#6B7280]">
                      {selectedUser.role} · #{selectedUser.id}
                    </Text>
                  </View>
                </View>
                <View className="mt-3 gap-3">
                  <DetailRow
                    label="Email"
                    value={selectedUser.email || 'Not provided'}
                  />
                  <DetailRow
                    label="Phone"
                    value={selectedUser.phone || 'Not provided'}
                  />
                  <DetailRow label="Status" value={selectedUser.status} />
                  <DetailRow
                    label="Joined"
                    value={formatDate(selectedUser.created_at, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openEditModal(selectedUser)}
                  className="mt-4 items-center rounded-xl bg-[#08745D] py-3"
                >
                  <Text className="text-xs font-bold text-white">
                    Edit User
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text className="py-4 text-center text-xs text-[#6B7280]">
                Select a user to view their details.
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add user"
        onPress={openAddModal}
        className="absolute right-5 z-20 h-14 w-14 items-center justify-center rounded-full bg-[#F5C451] shadow-lg"
        style={[floatingButtonPosition, { elevation: 8 }]}
      >
        <Plus size={32} color="#173F35" strokeWidth={4} />
      </Pressable>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
          <View className="flex-1 justify-end bg-black/50">
            <View className="max-h-[92%] overflow-hidden rounded-t-3xl bg-[#F8F7F2]">
              <View className="rounded-t-3xl bg-[#153B35] px-5 pb-4 pt-3">
                <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/40" />
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center pr-3">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <UserPlus size={21} color="#F4C95D" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#F4C95D]">
                        User Management
                      </Text>
                      <Text className="mt-1 text-lg font-extrabold text-white">
                        {isEditing ? 'Edit User' : 'Add User'}
                      </Text>
                      <Text className="mt-0.5 text-[10px] text-white/70">
                        {isEditing
                          ? 'Update account details and access'
                          : 'Create a new admin account'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close user form"
                    onPress={() => setIsModalOpen(false)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  >
                    <X size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                className="shrink"
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="gap-4 px-4 py-4"
              >
                <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
                  <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                    Account details
                  </Text>
                  <View className="mt-3 gap-3">
                    {(
                      [
                        ['username', 'Username', 'Enter username'],
                        ['name', 'Full Name', 'Enter full name'],
                        ['email', 'Email Address', 'name@example.com'],
                        ['phone', 'Phone Number', 'Enter phone number'],
                      ] as const
                    ).map(([key, label, placeholder]) => (
                      <View key={key}>
                        <Text className="text-xs font-semibold text-[#374151]">
                          {label}
                          {key === 'username' || key === 'email' ? ' *' : ''}
                        </Text>
                        <TextInput
                          accessibilityLabel={label}
                          value={formData[key]}
                          onChangeText={value => updateFormField(key, value)}
                          placeholder={placeholder}
                          placeholderTextColor="#9CA3AF"
                          keyboardType={
                            key === 'email'
                              ? 'email-address'
                              : key === 'phone'
                              ? 'phone-pad'
                              : 'default'
                          }
                          autoCapitalize={key === 'email' ? 'none' : 'words'}
                          className="mt-1.5 min-h-11 rounded-xl border border-[#E5E7EB] bg-[#FAFBFA] px-3 text-sm text-[#1F2937]"
                        />
                      </View>
                    ))}
                  </View>
                </View>

                <View className="rounded-2xl border border-[#ECE7D8] bg-white p-4">
                  <Text className="text-xs font-extrabold uppercase tracking-wider text-[#173F35]">
                    Role & security
                  </Text>
                  <Text className="mb-2 mt-3 text-xs font-semibold text-[#374151]">
                    Role
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {ROLES.filter(
                      ([value]) => isEditing || value === 'admin',
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: formData.role === value,
                        }}
                        onPress={() => updateFormField('role', value)}
                        className={`rounded-xl border px-4 py-2.5 ${
                          formData.role === value
                            ? 'border-[#08745D] bg-[#E7F3EF]'
                            : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            formData.role === value
                              ? 'text-[#075C51]'
                              : 'text-[#4B5563]'
                          }`}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {!isEditing ? (
                    <View className="mt-3 rounded-xl bg-[#F3F8F5] p-3">
                      <Text className="text-[11px] leading-4 text-[#4B5563]">
                        New accounts created here are assigned the Admin role.
                      </Text>
                    </View>
                  ) : null}
                  {!isEditing ? (
                    <View className="mt-3">
                      <Text className="text-xs font-semibold text-[#374151]">
                        Password *
                      </Text>
                      <TextInput
                        accessibilityLabel="Password"
                        value={formData.password}
                        onChangeText={value =>
                          updateFormField('password', value)
                        }
                        placeholder="Create a password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        autoCapitalize="none"
                        className="mt-1.5 min-h-11 rounded-xl border border-[#E5E7EB] bg-[#FAFBFA] px-3 text-sm text-[#1F2937]"
                      />
                    </View>
                  ) : null}
                </View>
              </ScrollView>
              <View
                className="flex-row gap-2 border-t border-[#E8E6DC] bg-white px-4 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsModalOpen(false)}
                  className="min-h-12 flex-1 items-center justify-center rounded-xl border border-[#D1D5DB] bg-white"
                >
                  <Text className="text-sm font-bold text-[#4B5563]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitLoading}
                  onPress={saveUser}
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl bg-[#08745D] ${
                    submitLoading ? 'opacity-60' : ''
                  }`}
                >
                  {submitLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-sm font-extrabold text-white">
                      {isEditing ? 'Save Changes' : 'Create Admin'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row">
      <Text className="w-16 text-xs text-[#6B7280]">{label}</Text>
      <Text className="flex-1 text-xs font-medium text-[#374151]">{value}</Text>
    </View>
  );
}
