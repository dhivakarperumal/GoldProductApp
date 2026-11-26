/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import api, { clearTokenCache, setTokenCache } from './src/api';
import Login, { LoginUser } from './src/Auth/Login';
import Welcome from './src/WelcomeScreen/Welcome';
import AdminHome from './src/Admin/Home/Home';
import AdminSection from './src/Admin/Pages/AdminSection';
import AdminLoans from './src/Admin/Loans/Loans';
import CreateLoan from './src/Admin/Loans/CreateLoan';
import CreateCustomer from './src/Admin/Loans/CreateCustomer';
import Products from './src/Admin/Products/Products';
import AddProduct from './src/Admin/Products/AddProduct';
import StockDetails from './src/Admin/Products/StockDetails';
import Categories from './src/Admin/Products/Categories';
import Metals from './src/Admin/Products/Metals';
import type { InventoryScreen } from './src/Admin/Products/inventory';
import AdminProfile from './src/Admin/Profile/Profile';
import More, { MoreScreen } from './src/Admin/More/More';
import FundManagement from './src/Admin/More/FundManagement';
import DailyGoldRate from './src/Admin/More/DailyGoldRate';
import InnerHeader from './src/Components/InnerHeader';
import AdminHeader from './src/Admin/Navigation/AdminHeader';
import AdminTabBar, { AdminTab } from './src/Admin/Navigation/AdminTabBar';
import BottomBar, {
  SuperAdminTab,
} from './src/SuperAdmin/Navigation/Bottombar';
import TopHeader from './src/SuperAdmin/Navigation/TopHeader';
import SuperAdminHome from './src/SuperAdmin/Home/Home';
import Profile from './src/SuperAdmin/Profile/Profile';
import Revenue from './src/SuperAdmin/Reports/Revenue';
import Subscriptions from './src/SuperAdmin/Subscription/Subscriptions';
import AllGoldShop from './src/SuperAdmin/Shops/AllGoldShop';

const WELCOME_STORAGE_KEY = 'hasSeenWelcomeScreen';
import { CustomAlertProvider, useCustomAlert } from './src/Components/CustomAlert';

type AccountRole = 'admin' | 'superadmin';
type AdminLoanScreen = 'list' | 'createLoan' | 'createCustomer';

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
      <CustomAlertProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </CustomAlertProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { showAlert } = useCustomAlert();
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('Home');
  const [isPlanFormVisible, setIsPlanFormVisible] = useState(false);
  const [isShopPageFullscreenVisible, setIsShopPageFullscreenVisible] =
    useState(false);
  const [isMyProfileVisible, setIsMyProfileVisible] = useState(false);
  const [isUsersManagementVisible, setIsUsersManagementVisible] =
    useState(false);
  const [isPaymentManagementVisible, setIsPaymentManagementVisible] =
    useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('Dashboard');
  const [adminLoanScreen, setAdminLoanScreen] =
    useState<AdminLoanScreen>('list');
  const [adminProductScreen, setAdminProductScreen] =
    useState<InventoryScreen>('all');
  const [adminProductId, setAdminProductId] = useState<number | string | null>(null);
  const [adminMoreScreen, setAdminMoreScreen] = useState<MoreScreen>('home');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [showWelcomeFromLogin, setShowWelcomeFromLogin] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [welcomeCheckError, setWelcomeCheckError] = useState<string | null>(
    null,
  );
  const [welcomeCheckAttempt, setWelcomeCheckAttempt] = useState(0);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [adminName, setAdminName] = useState('Super Admin');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(WELCOME_STORAGE_KEY)
      .then(value => {
        if (isMounted) {
          setHasSeenWelcome(value === 'true');
        }
      })
      .catch(error => {
        if (isMounted) {
          setWelcomeCheckError(
            error instanceof Error
              ? error.message
              : 'Unable to check the welcome screen status.',
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [welcomeCheckAttempt]);

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
    if (!isAuthenticated || accountRole || typeof api.get !== 'function') {
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
          console.warn(
            '[Profile] Could not load the saved account details:',
            error,
          );
        }
        if (isMounted) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Unable to verify the saved account. Please try again.',
          );
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
      showAlert(
        'Sign in failed',
        'Only Admin and Super Admin accounts can access this app.',
        { variant: 'error' },
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

  const handleWelcomeContinue = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      setHasSeenWelcome(true);
      setShowWelcomeFromLogin(false);
    } catch (error) {
      Alert.alert(
        'Unable to continue',
        error instanceof Error
          ? error.message
          : 'Could not save your welcome screen preference.',
      );
    }
  };

  const handleTabChange = (tab: SuperAdminTab) => {
    setActiveTab(tab);
    if (tab !== 'G Shops') {
      setIsShopPageFullscreenVisible(false);
    }
    if (tab !== 'Plans') {
      setIsPlanFormVisible(false);
    }
    if (tab !== 'Profile') {
      setIsMyProfileVisible(false);
      setIsUsersManagementVisible(false);
      setIsPaymentManagementVisible(false);
    }
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
      showAlert(
        'Logout failed',
        error instanceof Error ? error.message : 'Unable to end this session.',
        { variant: 'error' },
      );
    }
  };

  const navigateAdminTab = (tab: AdminTab) => {
    setAdminTab(tab);
    setAdminLoanScreen('list');
    setAdminProductScreen('all');
    setAdminProductId(null);
    setAdminMoreScreen('home');
  };

  const navigateAdminProduct = (
    screen: InventoryScreen,
    productId?: number | string,
  ) => {
    setAdminProductScreen(screen);
    setAdminProductId(productId ?? null);
  };

  const navigateAdminMore = (screen: MoreScreen) => {
    setAdminMoreScreen(screen);
  };

  useEffect(() => {
    if (!isAuthenticated || !accountRole) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (accountRole === 'admin') {
          if (adminTab === 'Loans' && adminLoanScreen !== 'list') {
            setAdminLoanScreen('list');
            return true;
          }
          if (adminTab === 'Products' && adminProductScreen !== 'all') {
            setAdminProductScreen('all');
            setAdminProductId(null);
            return true;
          }
          if (adminTab === 'More' && adminMoreScreen !== 'home') {
            setAdminMoreScreen('home');
            return true;
          }
          if (adminTab !== 'Dashboard') {
            setAdminTab('Dashboard');
            setAdminLoanScreen('list');
            setAdminProductScreen('all');
            setAdminProductId(null);
            setAdminMoreScreen('home');
            return true;
          }
        } else if (superAdminTab !== 'Home') {
          setSuperAdminTab('Home');
          return true;
        }

        showAlert(
          'Exit app?',
          'Are you sure you want to exit the app?',
          {
            variant: 'warning',
            buttons: [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Exit',
                style: 'destructive',
                onPress: () => BackHandler.exitApp(),
              },
            ],
          },
        );
        return true;
      },
    );

    return () => subscription.remove();
  }, [
    accountRole,
    adminLoanScreen,
    adminMoreScreen,
    adminProductScreen,
    adminTab,
    isAuthenticated,
    showAlert,
    superAdminTab,
  ]);

  if (hasSeenWelcome === null) {
    if (welcomeCheckError) {
      return (
        <View className="flex-1 items-center justify-center bg-[#F8F7F2] px-8">
          <Text className="mb-2 text-center text-lg font-bold text-[#173F35]">
            Unable to load the welcome screen
          </Text>
          <Text className="mb-5 text-center text-sm text-[#6B7280]">
            {welcomeCheckError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setWelcomeCheckError(null);
              setWelcomeCheckAttempt(attempt => attempt + 1);
            }}
            className="rounded-xl bg-[#B8860B] px-6 py-3"
          >
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center bg-[#FFFDF8]">
        <ActivityIndicator color="#B8860B" />
      </View>
    );
  }

  if (!hasSeenWelcome || showWelcomeFromLogin) {
    return <Welcome onContinue={handleWelcomeContinue} />;
  }

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
            className="rounded-xl bg-[#B8860B] px-6 py-3"
          >
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
    return (
      <Login
        onLogin={handleLogin}
        onWelcomePress={() => setShowWelcomeFromLogin(true)}
      />
    );
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
    const isInnerLoanScreen =
      adminTab === 'Loans' && adminLoanScreen !== 'list';
    const isInnerProductScreen =
      adminTab === 'Products' && adminProductScreen !== 'all';
    const isInnerMoreScreen =
      adminTab === 'More' && adminMoreScreen !== 'home';
    const isInnerAdminScreen =
      isInnerLoanScreen || isInnerProductScreen || isInnerMoreScreen;
    return (
      <View className="flex-1 bg-white">
        {!isInnerAdminScreen ? (
          <AdminHeader
            adminName={adminName}
            adminEmail={adminEmail}
            onLogout={handleLogout}
            onProfilePress={() => {
              navigateAdminTab('More');
              setAdminMoreScreen('profile');
            }}
          />
        ) : null}
        {adminTab === 'Dashboard' ? (
          <AdminHome onNavigate={navigateAdminTab} />
        ) : adminTab === 'Loans' && adminLoanScreen === 'createLoan' ? (
          <CreateLoan
            onBack={() => setAdminLoanScreen('list')}
            onCreated={() => setAdminLoanScreen('list')}
          />
        ) : adminTab === 'Loans' && adminLoanScreen === 'createCustomer' ? (
          <CreateCustomer
            onBack={() => setAdminLoanScreen('list')}
            onCreated={() => setAdminLoanScreen('list')}
          />
        ) : adminTab === 'Loans' ? (
          <AdminLoans
            onCreateLoan={() => setAdminLoanScreen('createLoan')}
            onCreateCustomer={() => setAdminLoanScreen('createCustomer')}
          />
        ) : adminTab === 'Products' && adminProductScreen === 'addProduct' ? (
          <AddProduct
            productId={adminProductId}
            onBack={() => navigateAdminProduct('all')}
            onSaved={() => navigateAdminProduct('all')}
          />
        ) : adminTab === 'Products' && adminProductScreen === 'stock' ? (
          <StockDetails onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' && adminProductScreen === 'categories' ? (
          <Categories onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' && adminProductScreen === 'metals' ? (
          <Metals onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' ? (
          <Products onNavigate={navigateAdminProduct} />
        ) : adminTab === 'More' && adminMoreScreen === 'funds' ? (
          <FundManagement onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'dailyRates' ? (
          <DailyGoldRate onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'profile' ? (
          <>
            <InnerHeader
              title="Admin Profile"
              sectionLabel="More"
              onBack={() => setAdminMoreScreen('home')}
            />
            <AdminProfile />
          </>
        ) : adminTab === 'More' ? (
          <More onNavigate={navigateAdminMore} />
        ) : (
          <AdminSection section={adminTab} />
        )}
        {!isInnerAdminScreen ? (
          <AdminTabBar activeTab={adminTab} onTabPress={navigateAdminTab} />
        ) : null}
      </View>
    );
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
    const isInnerLoanScreen =
      adminTab === 'Loans' && adminLoanScreen !== 'list';
    const isInnerProductScreen =
      adminTab === 'Products' && adminProductScreen !== 'all';
    const isInnerMoreScreen =
      adminTab === 'More' && adminMoreScreen !== 'home';
    const isInnerAdminScreen =
      isInnerLoanScreen || isInnerProductScreen || isInnerMoreScreen;
    return (
      <View className="flex-1 bg-white">
        {!isInnerAdminScreen ? (
          <AdminHeader
            adminName={adminName}
            adminEmail={adminEmail}
            onLogout={handleLogout}
            onProfilePress={() => {
              navigateAdminTab('More');
              setAdminMoreScreen('profile');
            }}
          />
        ) : null}
        {adminTab === 'Dashboard' ? (
          <AdminHome onNavigate={navigateAdminTab} />
        ) : adminTab === 'Loans' && adminLoanScreen === 'createLoan' ? (
          <CreateLoan
            onBack={() => setAdminLoanScreen('list')}
            onCreated={() => setAdminLoanScreen('list')}
          />
        ) : adminTab === 'Loans' && adminLoanScreen === 'createCustomer' ? (
          <CreateCustomer
            onBack={() => setAdminLoanScreen('list')}
            onCreated={() => setAdminLoanScreen('list')}
          />
        ) : adminTab === 'Loans' ? (
          <AdminLoans
            onCreateLoan={() => setAdminLoanScreen('createLoan')}
            onCreateCustomer={() => setAdminLoanScreen('createCustomer')}
          />
        ) : adminTab === 'Products' && adminProductScreen === 'addProduct' ? (
          <AddProduct
            productId={adminProductId}
            onBack={() => navigateAdminProduct('all')}
            onSaved={() => navigateAdminProduct('all')}
          />
        ) : adminTab === 'Products' && adminProductScreen === 'stock' ? (
          <StockDetails onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' && adminProductScreen === 'categories' ? (
          <Categories onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' && adminProductScreen === 'metals' ? (
          <Metals onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' ? (
          <Products onNavigate={navigateAdminProduct} />
        ) : adminTab === 'More' && adminMoreScreen === 'funds' ? (
          <FundManagement onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'dailyRates' ? (
          <DailyGoldRate onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'profile' ? (
          <>
            <InnerHeader
              title="Admin Profile"
              sectionLabel="More"
              onBack={() => setAdminMoreScreen('home')}
            />
            <AdminProfile />
          </>
        ) : adminTab === 'More' ? (
          <More onNavigate={navigateAdminMore} />
        ) : (
          <AdminSection section={adminTab} />
        )}
        {!isInnerAdminScreen ? (
          <AdminTabBar activeTab={adminTab} onTabPress={navigateAdminTab} />
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {!(
        (activeTab === 'Plans' && isPlanFormVisible) ||
        (activeTab === 'G Shops' && isShopPageFullscreenVisible) ||
        (activeTab === 'Profile' &&
          (isMyProfileVisible ||
            isUsersManagementVisible ||
            isPaymentManagementVisible))
      ) ? (
        <TopHeader
          adminName={adminName}
          adminEmail={adminEmail}
          onLogout={handleLogout}
          onProfilePress={() => handleTabChange('Profile')}
        />
      ) : null}
      {activeTab === 'Home' ? (
        <Home onNavigate={handleTabChange} />
      ) : activeTab === 'Profile' ? (
        <Profile
          onMyProfileVisibilityChange={setIsMyProfileVisible}
          onUsersManagementVisibilityChange={setIsUsersManagementVisible}
          onPaymentManagementVisibilityChange={setIsPaymentManagementVisible}
          onLogout={handleLogout}
        />
      ) : activeTab === 'Plans' ? (
        <Subscriptions onPlanFormVisibilityChange={setIsPlanFormVisible} />
      ) : activeTab === 'G Shops' ? (
        <AllGoldShop
          onFullScreenShopPageChange={setIsShopPageFullscreenVisible}
        />
      ) : activeTab === 'Revenue' ? (
        <Revenue />
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
      {!(
        (activeTab === 'Plans' && isPlanFormVisible) ||
        (activeTab === 'G Shops' && isShopPageFullscreenVisible) ||
        (activeTab === 'Profile' &&
          (isMyProfileVisible ||
            isUsersManagementVisible ||
            isPaymentManagementVisible))
      ) ? (
        <BottomBar activeTab={activeTab} onTabPress={handleTabChange} />
      ) : null}
    </View>
  );
}

export default App;
