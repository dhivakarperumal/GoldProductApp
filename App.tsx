/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  ActivityIndicator,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import api, { clearTokenCache, setTokenCache } from './src/api';
import Login, { LoginUser } from './src/Auth/Login';
import Welcome from './src/WelcomeScreen/Welcome';
import Register from './src/Auth/Register';
import AdminHome from './src/Admin/Home/Home';
import AdminSection from './src/Admin/Pages/AdminSection';
import AdminLoans from './src/Admin/Loans/Loans';
import CreateLoan from './src/Admin/Loans/CreateLoan';
import CreateCustomer from './src/Admin/Loans/CreateCustomer';
import LoanDetails from './src/Admin/Loans/LoanDetails';
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
import ReceiptSettings from './src/Admin/More/ReceiptSettings';
import Dealers from './src/Admin/More/Dealers';
import DealerPurchases from './src/Admin/More/DealerPurchases';
import Reports from './src/Admin/More/Reports';
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
type AuthScreen = 'login' | 'register';
type AdminLoanScreen =
  | 'list'
  | 'createLoan'
  | 'createCustomer'
  | 'viewLoan'
  | 'editLoan';

const screenStyles = StyleSheet.create({
  visible: { flex: 1 },
  hidden: { display: 'none' },
});

function CachedScreen({
  cacheKey,
  visited,
  active,
  children,
}: {
  cacheKey: string;
  visited: boolean;
  active: boolean;
  children: ReactNode;
}) {
  if (!visited) return null;

  return (
    <View
      testID={`cached-screen-${cacheKey}`}
      style={active ? screenStyles.visible : screenStyles.hidden}
    >
      {children}
    </View>
  );
}

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
  const [visitedSuperAdminScreens, setVisitedSuperAdminScreens] = useState<
    Set<SuperAdminTab>
  >(() => new Set(['Home']));
  const [isPlanFormVisible, setIsPlanFormVisible] = useState(false);
  const [isShopPageFullscreenVisible, setIsShopPageFullscreenVisible] =
    useState(false);
  const [isMyProfileVisible, setIsMyProfileVisible] = useState(false);
  const [isUsersManagementVisible, setIsUsersManagementVisible] =
    useState(false);
  const [isPaymentManagementVisible, setIsPaymentManagementVisible] =
    useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('Dashboard');
  const [visitedAdminScreens, setVisitedAdminScreens] = useState<Set<string>>(
    () => new Set(['Dashboard']),
  );
  const [adminLoanScreen, setAdminLoanScreen] =
    useState<AdminLoanScreen>('list');
  const [adminLoanId, setAdminLoanId] = useState<number | string | null>(null);
  const [adminProductScreen, setAdminProductScreen] =
    useState<InventoryScreen>('all');
  const [adminProductId, setAdminProductId] = useState<number | string | null>(null);
  const [adminMoreScreen, setAdminMoreScreen] = useState<MoreScreen>('home');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState('');
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
  const [todayRegistrationCount, setTodayRegistrationCount] = useState<
    number | null
  >(null);

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
    setSuperAdminTab(tab);
    setVisitedSuperAdminScreens(current => new Set(current).add(tab));
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
      setTodayRegistrationCount(null);
      setSuperAdminTab('Home');
      setVisitedSuperAdminScreens(new Set(['Home']));
      setAdminTab('Dashboard');
      setAdminLoanScreen('list');
      setAdminProductScreen('all');
      setAdminProductId(null);
      setAdminMoreScreen('home');
      setVisitedAdminScreens(new Set(['Dashboard']));
      setIsPlanFormVisible(false);
      setIsShopPageFullscreenVisible(false);
      setIsMyProfileVisible(false);
      setIsUsersManagementVisible(false);
      setIsPaymentManagementVisible(false);
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
    setAdminLoanId(null);
    setAdminProductScreen('all');
    setAdminProductId(null);
    setAdminMoreScreen('home');
    const defaultRoute =
      tab === 'Loans'
        ? 'Loans:list'
        : tab === 'Products'
          ? 'Products:all'
          : tab === 'More'
            ? 'More:home'
            : tab;
    setVisitedAdminScreens(current => new Set(current).add(defaultRoute));
  };

  const navigateAdminLoan = (screen: AdminLoanScreen) => {
    setAdminLoanScreen(screen);
    setVisitedAdminScreens(current =>
      new Set(current).add(`Loans:${screen}`),
    );
  };

  const navigateAdminProduct = (
    screen: InventoryScreen,
    productId?: number | string,
  ) => {
    setAdminProductScreen(screen);
    setAdminProductId(productId ?? null);
    setVisitedAdminScreens(current =>
      new Set(current).add(`Products:${screen}`),
    );
  };

  const navigateAdminMore = (screen: MoreScreen) => {
    setAdminMoreScreen(screen);
    setVisitedAdminScreens(current => new Set(current).add(`More:${screen}`));
  };

  useEffect(() => {
    if (!isAuthenticated || !accountRole) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (accountRole === 'admin') {
          if (adminTab === 'Loans' && adminLoanScreen !== 'list') {
            setAdminLoanScreen('list');
            setAdminLoanId(null);
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
            setAdminLoanId(null);
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
    if (authScreen === 'register') {
      return (
        <Register
          onBack={() => setAuthScreen('login')}
          onSubmitted={email => {
            setRegistrationEmail(email);
            setRegistrationMessage(
              'Registration submitted. You can sign in after approval.',
            );
            setAuthScreen('login');
          }}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => {
          setRegistrationMessage('');
          setAuthScreen('register');
        }}
        initialIdentifier={registrationEmail}
        registrationMessage={registrationMessage}
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
              className="rounded-xl bg-[#B8860B] px-6 py-3"
            >
              <Text className="font-bold text-white">Retry</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#B8860B" />
        )}
      </View>
    );
  }

  const activeAdminScreen =
    adminTab === 'Loans'
      ? `Loans:${adminLoanScreen}`
      : adminTab === 'Products'
        ? `Products:${adminProductScreen}`
        : adminTab === 'More'
          ? `More:${adminMoreScreen}`
          : adminTab;

  if (accountRole === 'admin') {
    const isInnerAdminScreen =
      (adminTab === 'Loans' && adminLoanScreen !== 'list') ||
      (adminTab === 'Products' && adminProductScreen !== 'all') ||
      (adminTab === 'More' && adminMoreScreen !== 'home');

    return (
      <View className="flex-1 bg-white">
        <View style={isInnerAdminScreen ? screenStyles.hidden : undefined}>
          <AdminHeader
            adminName={adminName}
            adminEmail={adminEmail}
            onLogout={handleLogout}
            onProfilePress={() => {
              navigateAdminTab('More');
              navigateAdminMore('profile');
            }}
          />
        </View>

        <CachedScreen
          cacheKey="admin-Dashboard"
          visited={visitedAdminScreens.has('Dashboard')}
          active={activeAdminScreen === 'Dashboard'}
        >
          <AdminHome onNavigate={navigateAdminTab} />
        ) : adminTab === 'Loans' && adminLoanScreen === 'viewLoan' && adminLoanId !== null ? (
          <LoanDetails
            loanId={adminLoanId}
            onBack={() => {
              setAdminLoanScreen('list');
              setAdminLoanId(null);
            }}
            onEdit={() => setAdminLoanScreen('editLoan')}
          />
        ) : adminTab === 'Loans' && adminLoanScreen === 'editLoan' && adminLoanId !== null ? (
          <CreateLoan
            loanId={adminLoanId}
            onBack={() => setAdminLoanScreen('viewLoan')}
            onCreated={() => {
              setAdminLoanScreen('list');
              setAdminLoanId(null);
            }}
          />
        ) : adminTab === 'Loans' && adminLoanScreen === 'createLoan' ? (
          <CreateLoan
            onBack={() => setAdminLoanScreen('list')}
            onCreated={() => {
              setAdminLoanScreen('list');
              setAdminLoanId(null);
            }}
          />
        </CachedScreen>
        <CachedScreen
          cacheKey="admin-Loans-createCustomer"
          visited={visitedAdminScreens.has('Loans:createCustomer')}
          active={activeAdminScreen === 'Loans:createCustomer'}
        >
          <CreateCustomer
            onBack={() => navigateAdminLoan('list')}
            onCreated={() => navigateAdminLoan('list')}
          />
        ) : adminTab === 'Loans' ? (
          <AdminLoans
            onCreateLoan={() => setAdminLoanScreen('createLoan')}
            onCreateCustomer={() => setAdminLoanScreen('createCustomer')}
            onViewLoan={loanId => {
              setAdminLoanId(loanId);
              setAdminLoanScreen('viewLoan');
            }}
            onEditLoan={loanId => {
              setAdminLoanId(loanId);
              setAdminLoanScreen('editLoan');
            }}
          />
        ) : adminTab === 'Products' && adminProductScreen === 'addProduct' ? (
          <AddProduct
            productId={adminProductId}
            onBack={() => navigateAdminProduct('all')}
            onSaved={() => navigateAdminProduct('all')}
          />
        </CachedScreen>
        <CachedScreen
          cacheKey="admin-Products-stock"
          visited={visitedAdminScreens.has('Products:stock')}
          active={activeAdminScreen === 'Products:stock'}
        >
          <StockDetails onBack={() => navigateAdminProduct('all')} />
        </CachedScreen>
        <CachedScreen
          cacheKey="admin-Products-categories"
          visited={visitedAdminScreens.has('Products:categories')}
          active={activeAdminScreen === 'Products:categories'}
        >
          <Categories onBack={() => navigateAdminProduct('all')} />
        </CachedScreen>
        <CachedScreen
          cacheKey="admin-Products-metals"
          visited={visitedAdminScreens.has('Products:metals')}
          active={activeAdminScreen === 'Products:metals'}
        >
          <Metals onBack={() => navigateAdminProduct('all')} />
        ) : adminTab === 'Products' ? (
          <Products onNavigate={navigateAdminProduct} />
        ) : adminTab === 'More' && adminMoreScreen === 'funds' ? (
          <FundManagement onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'dailyRates' ? (
          <DailyGoldRate onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'receiptSettings' ? (
          <ReceiptSettings onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'dealers' ? (
          <Dealers onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'dealerPurchases' ? (
          <DealerPurchases onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'metals' ? (
          <Metals onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'categories' ? (
          <Categories onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'stockDetails' ? (
          <StockDetails onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'reports' ? (
          <Reports onBack={() => setAdminMoreScreen('home')} />
        ) : adminTab === 'More' && adminMoreScreen === 'profile' ? (
          <>
            <InnerHeader
              title="Admin Profile"
              sectionLabel="More"
              onBack={() => navigateAdminMore('home')}
            />
            <AdminProfile />
          </>
        </CachedScreen>

        <View style={isInnerAdminScreen ? screenStyles.hidden : undefined}>
          <AdminTabBar activeTab={adminTab} onTabPress={navigateAdminTab} />
        </View>
      </View>
    );
  }

  const isSuperAdminFullscreen =
    (superAdminTab === 'Plans' && isPlanFormVisible) ||
    (superAdminTab === 'G Shops' && isShopPageFullscreenVisible) ||
    (superAdminTab === 'Profile' &&
      (isMyProfileVisible ||
        isUsersManagementVisible ||
        isPaymentManagementVisible));

  return (
    <View className="flex-1 bg-white">
      <View style={isSuperAdminFullscreen ? screenStyles.hidden : undefined}>
        <TopHeader
          adminName={adminName}
          adminEmail={adminEmail}
          onTodayRegistrationsChange={setTodayRegistrationCount}
          onLogout={handleLogout}
          onProfilePress={() => handleTabChange('Profile')}
        />
      </View>

      <CachedScreen
        cacheKey="superadmin-Home"
        visited={visitedSuperAdminScreens.has('Home')}
        active={superAdminTab === 'Home'}
      >
        <SuperAdminHome
          onNavigate={handleTabChange}
          todayRegistrationCount={todayRegistrationCount}
        />
      </CachedScreen>
      <CachedScreen
        cacheKey="superadmin-G-Shops"
        visited={visitedSuperAdminScreens.has('G Shops')}
        active={superAdminTab === 'G Shops'}
      >
        <AllGoldShop
          onFullScreenShopPageChange={setIsShopPageFullscreenVisible}
        />
      </CachedScreen>
      <CachedScreen
        cacheKey="superadmin-Plans"
        visited={visitedSuperAdminScreens.has('Plans')}
        active={superAdminTab === 'Plans'}
      >
        <Subscriptions onPlanFormVisibilityChange={setIsPlanFormVisible} />
      </CachedScreen>
      <CachedScreen
        cacheKey="superadmin-Revenue"
        visited={visitedSuperAdminScreens.has('Revenue')}
        active={superAdminTab === 'Revenue'}
      >
        <Revenue />
      </CachedScreen>
      <CachedScreen
        cacheKey="superadmin-Profile"
        visited={visitedSuperAdminScreens.has('Profile')}
        active={superAdminTab === 'Profile'}
      >
        <Profile
          onMyProfileVisibilityChange={setIsMyProfileVisible}
          onUsersManagementVisibilityChange={setIsUsersManagementVisible}
          onPaymentManagementVisibilityChange={setIsPaymentManagementVisible}
          onLogout={handleLogout}
        />
      </CachedScreen>

      <View style={isSuperAdminFullscreen ? screenStyles.hidden : undefined}>
        <BottomBar activeTab={superAdminTab} onTabPress={handleTabChange} />
      </View>
    </View>
  );
}

export default App;
