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
import BottomBar, {
  SuperAdminTab,
} from './src/SuperAdmin/Navigation/Bottombar';
import TopHeader from './src/SuperAdmin/Navigation/TopHeader';
import Home from './src/SuperAdmin/Home/Home';
import Profile from './src/SuperAdmin/Profile/Profile';
import Subscriptions from './src/SuperAdmin/Subscription/Subscriptions';

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
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('Home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
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
      adminEmail ||
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
      });

    return () => {
      isMounted = false;
    };
  }, [adminEmail, isAuthenticated]);

  const handleLogin = (user: LoginUser) => {
    setAdminName(user.name?.trim() || user.email?.trim() || 'Admin');
    setAdminEmail(user.email?.trim() || '');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      clearTokenCache();
      setIsAuthenticated(false);
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

  return (
    <View className="flex-1 bg-white">
      <TopHeader
        adminName={adminName}
        adminEmail={adminEmail}
        onLogout={handleLogout}
        onProfilePress={() => setActiveTab('Profile')}
      />
      {activeTab === 'Home' ? (
        <Home onNavigate={setActiveTab} />
      ) : activeTab === 'Profile' ? (
        <Profile />
      ) : activeTab === 'Plans' ? (
        <Subscriptions />
      ) : (
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-[22px] font-bold text-[#1A1A1A]">
            {activeTab}
          </Text>
        </View>
      )}
      <BottomBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

export default App;
