/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import api, { clearTokenCache, setTokenCache } from './src/api';
import Login, { LoginUser } from './src/Auth/Login';
import AdminHome from './src/Admin/Home/Home';
import AdminSection from './src/Admin/Pages/AdminSection';
import AdminProfile from './src/Admin/Profile/Profile';
import AdminHeader from './src/Admin/Navigation/AdminHeader';
import AdminTabBar, { AdminTab } from './src/Admin/Navigation/AdminTabBar';
import BottomBar, {
  SuperAdminTab,
} from './src/SuperAdmin/Navigation/Bottombar';
import TopHeader from './src/SuperAdmin/Navigation/TopHeader';
import SuperAdminHome from './src/SuperAdmin/Home/Home';
import Profile from './src/SuperAdmin/Profile/Profile';

type AccountRole = 'admin' | 'superadmin';

function normalizeRole(role: unknown): AccountRole | null {
  if (typeof role !== 'string') return null;
  const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');
  return normalizedRole === 'admin' || normalizedRole === 'superadmin'
    ? normalizedRole
    : null;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('Home');
  const [adminTab, setAdminTab] = useState<AdminTab>('Home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [adminName, setAdminName] = useState('Super Admin');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem('userToken')
      .then(token => {
        if (isMounted) {
          if (token) {
            setTokenCache(token);
          }
          setIsAuthenticated(Boolean(token));
        }
      })
      .catch(error => {
        if (isMounted) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Unable to restore the saved session.',
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionCheckAttempt]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      accountRole ||
      typeof api.get !== 'function'
    ) {
      return;
    }

    let isMounted = true;
    api
      .get('/auth/me')
      .then(response => {
        if (!isMounted) return;
        const user = response.data?.user;
        const role = normalizeRole(user?.role);
        if (!role) {
          AsyncStorage.removeItem('userToken')
            .then(() => {
              if (!isMounted) return;
              clearTokenCache();
              setIsAuthenticated(false);
            })
            .catch(error => {
              if (__DEV__) {
                console.warn('[Auth] Could not clear an unsupported session:', error);
              }
              if (isMounted) {
                setSessionError('This account cannot access the mobile admin app.');
              }
            });
          return;
        }
        setAccountRole(role);
        setSessionError(null);
        setAdminName(
          role === 'superadmin' ? 'Super Admin' : 'Admin',
        );
        if (typeof user?.email === 'string') {
          setAdminEmail(user.email);
        }
        const name = user?.name || user?.username || user?.email;
        if (typeof name === 'string' && name.trim()) {
          setAdminName(name.trim());
        }
      })
      .catch(error => {
        if (__DEV__) {
          console.warn('[Profile] Could not load the saved account details:', error);
        }
        if (isMounted) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Unable to verify the saved account. Please try again.',
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accountRole, isAuthenticated, sessionCheckAttempt]);

  const handleLogin = (user: LoginUser) => {
    const role = normalizeRole(user.role);
    if (!role) {
      Alert.alert(
        'Sign in failed',
        'Only Admin and Super Admin accounts can access this app.',
      );
      return;
    }
    setAccountRole(role);
    setAdminName(
      user.name?.trim() ||
        user.email?.trim() ||
        (role === 'superadmin' ? 'Super Admin' : 'Admin'),
    );
    setAdminEmail(user.email?.trim() || '');
    setSessionError(null);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      clearTokenCache();
      setIsAuthenticated(false);
      setAccountRole(null);
      setAdminName('Super Admin');
      setAdminEmail('');
    } catch (error) {
      Alert.alert(
        'Logout failed',
        error instanceof Error ? error.message : 'Unable to end this session.',
      );
    }
  };

  if (isAuthenticated === null) {
    if (sessionError) {
      return (
        <View className="flex-1 items-center justify-center bg-[#F8F7F2] px-8">
          <Text className="mb-2 text-center text-lg font-bold text-[#173F35]">
            Unable to restore your session
          </Text>
          <Text className="mb-5 text-center text-sm text-[#6B7280]">
            {sessionError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSessionError(null);
              setSessionCheckAttempt(attempt => attempt + 1);
            }}
            className="rounded-xl bg-[#B8860B] px-6 py-3">
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center bg-[#F8F7F2]">
        <ActivityIndicator color="#B8860B" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (!accountRole) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F7F2] px-8">
        {sessionError ? (
          <>
            <Text className="mb-2 text-center text-lg font-bold text-[#173F35]">
              Unable to verify your account
            </Text>
            <Text className="mb-5 text-center text-sm text-[#6B7280]">
              {sessionError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSessionError(null);
                setSessionCheckAttempt(attempt => attempt + 1);
              }}
              className="rounded-xl bg-[#B8860B] px-6 py-3">
              <Text className="font-bold text-white">Retry</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#B8860B" />
        )}
      </View>
    );
  }

  if (accountRole === 'admin') {
    return (
      <View className="flex-1 bg-white">
        <AdminHeader
          adminName={adminName}
          adminEmail={adminEmail}
          onLogout={handleLogout}
          onProfilePress={() => setAdminTab('Profile')}
        />
        {adminTab === 'Home' ? (
          <AdminHome onNavigate={setAdminTab} />
        ) : adminTab === 'Profile' ? (
          <AdminProfile />
        ) : (
          <AdminSection section={adminTab} />
        )}
        <AdminTabBar activeTab={adminTab} onTabPress={setAdminTab} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <TopHeader
        adminName={adminName}
        adminEmail={adminEmail}
        onLogout={handleLogout}
        onProfilePress={() => setSuperAdminTab('Profile')}
      />
      {superAdminTab === 'Home' ? (
        <SuperAdminHome onNavigate={setSuperAdminTab} />
      ) : superAdminTab === 'Profile' ? (
        <Profile />
      ) : (
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-[22px] font-bold text-[#1A1A1A]">
            {superAdminTab}
          </Text>
        </View>
      )}
      <BottomBar activeTab={superAdminTab} onTabPress={setSuperAdminTab} />
    </View>
  );
}

export default App;
