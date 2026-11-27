import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import App from '../App';
import Login from '../src/Auth/Login';
import Home from '../src/SuperAdmin/Home/Home';
import TopHeader from '../src/SuperAdmin/Navigation/TopHeader';
import AdminTabBar from '../src/Admin/Navigation/AdminTabBar';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockSetTokenCache = jest.fn();
const mockClearTokenCache = jest.fn();
const activeRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  clearTokenCache: (...args: unknown[]) => mockClearTokenCache(...args),
  setTokenCache: (...args: unknown[]) => mockSetTokenCache(...args),
}));

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {},
  isErrorWithCode: jest.fn(() => false),
  pick: jest.fn(),
  types: {},
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-pdf', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactModule.createElement(View),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

beforeEach(() => {
  mockGetItem.mockReset().mockResolvedValue(null);
  mockSetItem.mockReset().mockResolvedValue(undefined);
  mockRemoveItem.mockReset().mockResolvedValue(undefined);
  mockGet.mockReset().mockResolvedValue({ data: {} });
  mockPost.mockReset();
  mockGet.mockReset().mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/auth/me'
        ? { data: { user: { role: 'superadmin', name: 'Super Admin' } } }
        : path === '/dashboard'
          ? { data: { stats: [], revenueTrends: [] } }
          : path === '/gold-rates/current'
            ? { data: { rates: [] } }
            : path === '/loans'
              ? { data: [] }
              : { data: { products: [] } },
    ),
  );
  mockSetTokenCache.mockReset();
  mockClearTokenCache.mockReset();
});

afterEach(async () => {
  await act(async () => {
    activeRenderers.splice(0).forEach(renderer => renderer.unmount());
  });
});

test('notification dropdown shows only shops registered today', async () => {
  const registeredToday = new Date();
  const registeredYesterday = new Date();
  registeredYesterday.setDate(registeredYesterday.getDate() - 1);
  mockGet.mockResolvedValueOnce({
    data: {
      shops: [
        {
          id: 12,
          shop_name: 'Today Gold',
          owner_name: 'Asha Kumar',
          mobile: '9876543210',
          city: 'Chennai',
          created_at: registeredToday.toISOString(),
        },
        {
          id: 13,
          shop_name: 'Yesterday Gold',
          created_at: registeredYesterday.toISOString(),
        },
      ],
      pagination: { totalPages: 1 },
    },
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const onTodayRegistrationsChange = jest.fn();

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <TopHeader onTodayRegistrationsChange={onTodayRegistrationsChange} />,
    );
    activeRenderers.push(renderer);
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'notification-toggle' })
      .props.onPress();
  });

  expect(mockGet).toHaveBeenCalledWith('/super-admin/gold-shops', {
    params: { page: 1, pageSize: 50, search: '', status: 'all' },
  });
  expect(renderer.root.findByProps({ children: 'Today Gold' })).toBeDefined();
  expect(onTodayRegistrationsChange).toHaveBeenCalledWith(1);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(text => String(text.props.children).includes('Asha Kumar')),
  ).toBe(true);
  expect(
    renderer.root.findAllByProps({ children: 'Yesterday Gold' }),
  ).toHaveLength(0);

  await act(async () => {
    renderer.root.findByProps({ testID: 'dropdown-backdrop' }).props.onPress();
  });
  expect(
    renderer.root.findAllByProps({ testID: 'today-registrations-dropdown' }),
  ).toHaveLength(0);
});

test('profile dropdown opens and its profile action closes the menu', async () => {
  const onProfilePress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <TopHeader
        adminName="Shop Admin"
        adminEmail="admin@example.com"
        onProfilePress={onProfilePress}
      />,
    );
    activeRenderers.push(renderer);
  });

  await act(async () => {
    renderer.root.findByProps({ testID: 'profile-toggle' }).props.onPress();
  });
  expect(
    renderer.root.findByProps({ testID: 'profile-dropdown' }),
  ).toBeDefined();

  await act(async () => {
    renderer.root
      .findByProps({ testID: 'profile-menu-action' })
      .props.onPress();
  });
  expect(onProfilePress).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findAllByProps({ testID: 'profile-dropdown' }),
  ).toHaveLength(0);
});

test('shows Home sparklines only for metrics with historical data', async () => {
  mockGet.mockImplementation((url: string) =>
    Promise.resolve({
      data: {
        data: url.endsWith('/stats')
          ? {
              totalGoldShops: 12,
              activeSubscriptions: 8,
              totalRevenue: 12000,
            }
          : url.endsWith('/analytics')
            ? {
              shopRegistrations: [
                { label: 'May', registrations: 3 },
                { label: 'Jun', registrations: 7 },
              ],
              subscriptionGrowth: [
                { label: 'May', subscriptions: 2 },
                { label: 'Jun', subscriptions: 5 },
              ],
              monthlyRevenue: [
                { label: 'May', revenue: 6000 },
                { label: 'Jun', revenue: 12000 },
              ],
            }
            : { todayRevenue: 12000 },
      },
    }),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Home onNavigate={jest.fn()} todayRegistrationCount={4} />,
    );
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Recent trend for Gold Shops',
    }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Recent trend for Active Subscriptions',
    }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Recent trend for Total Revenue',
    }),
  ).toBeDefined();
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Recent trend for Active Shops',
    }),
  ).toHaveLength(0);
  expect(
    renderer.root.findByProps({ children: "Today's registrations" }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({
      children: "Today's subscription payments",
    }),
  ).toBeDefined();
  expect(
    renderer.root
      .findAllByType(Text)
      .some(text => String(text.props.children).includes('12,000')),
  ).toBe(true);
  expect(
    renderer.root.findAll(
      node => node.props.style?.backgroundColor === '#F4C95D',
    ),
  ).not.toHaveLength(0);
});

test('shows Admin navigation tabs in the requested order', async () => {
  const onTabPress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AdminTabBar activeTab="Dashboard" onTabPress={onTabPress} />,
    );
  });
  const tabLabels = renderer.root
    .findAllByProps({ accessibilityRole: 'button' })
    .map(button => button.props.accessibilityLabel);
  const uniqueTabLabels = [...new Set(tabLabels)];

  expect(uniqueTabLabels).toEqual([
    'Dashboard',
    'Loans',
    'Orders',
    'Products',
    'More',
  ]);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Dashboard' }).props
      .accessibilityState.selected,
  ).toBe(true);
});

test('restores a saved session without showing the login screen', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'userToken' ? 'saved-token' : 'true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Super Admin menu',
    }),
  ).toBeDefined();
  expect(renderer.root.findAllByProps({ children: 'Admin Sign In' }))
    .toHaveLength(0);
  expect(mockSetTokenCache).toHaveBeenCalledWith('saved-token');
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('does not redirect to login when session storage cannot be read', async () => {
  mockGetItem.mockImplementation((key: string) =>
    key === 'userToken'
      ? Promise.reject(new Error('Storage unavailable'))
      : Promise.resolve('true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(
    renderer.root.findByProps({ children: 'Unable to restore your session' }),
  ).toBeDefined();
  expect(
    renderer.root.findAllByProps({ children: 'Admin Sign In' }),
  ).toHaveLength(0);
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('shows the welcome screen on first launch and opens login after continuing', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(renderer.root.findByProps({ testID: 'welcome-screen' })).toBeDefined();
  expect(renderer.root.findAllByProps({ testID: 'welcome-next' })).toHaveLength(
    0,
  );

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 2' })
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 3' })
      .props.onPress();
  });
  expect(
    renderer.root.findAllByProps({ testID: 'welcome-next' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Skip welcome slides' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'welcome-continue' }),
  ).toBeDefined();

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'welcome-continue' })
      .props.onPress();
  });

  expect(mockSetItem).toHaveBeenCalledWith(
    'hasSeenWelcomeScreen',
    'true',
  );
  expect(
    renderer.root.findByProps({ children: 'Admin Sign In' }),
  ).toBeDefined();

  await act(async () => {
    renderer.root.findByProps({ testID: 'login-welcome' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'welcome-screen' })).toBeDefined();

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 2' })
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 3' })
      .props.onPress();
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'welcome-continue' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ children: 'Admin Sign In' }),
  ).toBeDefined();
});

test('persists the token after a successful login', async () => {
  mockPost.mockResolvedValue({
    data: {
      token: 'new-token',
      user: { role: 'superadmin', name: 'Super Admin' },
    },
  });
  const onLogin = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Login onLogin={onLogin} onWelcomePress={jest.fn()} />,
    );
    activeRenderers.push(renderer);
  });

  await act(async () => {
    const inputs = renderer.root.findAllByType(TextInput);
    inputs[0].props.onChangeText('admin@example.com');
    inputs[1].props.onChangeText('password');
  });

  const submitButton = renderer.root.findByProps({ testID: 'login-submit' });
  expect(submitButton).toBeDefined();

  await act(async () => {
    await submitButton?.props.onPress();
  });

  expect(mockPost).toHaveBeenCalledWith('/auth/login', {
    identifier: 'admin@example.com',
    password: 'password',
  });
  expect(mockSetItem).toHaveBeenCalledWith('userToken', 'new-token');
  expect(mockSetTokenCache).toHaveBeenCalledWith('new-token');
  expect(mockRemoveItem).not.toHaveBeenCalled();
  expect(onLogin).toHaveBeenCalledWith({
    role: 'superadmin',
    name: 'Super Admin',
  });
});

test('routes shop admins to the admin dashboard and its API', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'hasSeenWelcomeScreen' ? 'true' : null),
  );
  mockPost.mockResolvedValue({
    data: {
      token: 'admin-token',
      user: { role: 'admin', name: 'Shop Admin', email: 'admin@example.com' },
    },
  });
  mockGet.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/dashboard'
        ? {
            data: {
              stats: [],
              revenueTrends: [],
              recentLoans: [],
              topProducts: [
                {
                  id: 2,
                  name: 'Dashboard Ring',
                  cat: 'Bangles',
                  price: '99840.00',
                },
              ],
              goldRates: [
                {
                  metal_type: 'Gold',
                  purity: '999',
                  rate_per_gram: '10000.00',
                },
              ],
            },
          }
        : path === '/loans'
          ? {
              data: [
                {
                  id: 1,
                  loan_number: 'GL-001',
                  customer_name: 'Dashboard Customer',
                  jewellery_type: 'Ring',
                  principal_amount: '1000.00',
                  loan_status: 'Active',
                  loan_date: '2026-11-25',
                },
              ],
            }
          : path === '/gold-rates/current'
            ? {
                data: {
                  rates: [
                    {
                      metal_type: 'Gold',
                      purity: '999',
                      rate_per_gram: 10000,
                    },
                  ],
                },
              }
            : { data: { user: { role: 'admin' } } },
    ),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    const inputs = renderer.root.findAllByType(TextInput);
    inputs[0].props.onChangeText('admin@example.com');
    inputs[1].props.onChangeText('password');
  });

  const submitButton = renderer.root.findByProps({ testID: 'login-submit' });
  await act(async () => {
    await submitButton?.props.onPress();
  });

  expect(renderer.root.findByProps({ children: 'Admin Dashboard' })).toBeDefined();
  expect(renderer.root.findByProps({ testID: 'admin-home' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Dashboard Customer' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Dashboard Ring' })).toBeDefined();
  expect(
    renderer.root.findAllByProps({
      children: 'Gold rates API returned an invalid response.',
    }),
  ).toHaveLength(0);
  expect(mockGet).toHaveBeenCalledWith('/dashboard', {
    params: { datePreset: 'all', startDate: '', endDate: '' },
  });
  expect(mockGet).toHaveBeenCalledWith('/gold-rates/current');
  expect(mockGet).toHaveBeenCalledWith('/loans');
  expect(mockGet).not.toHaveBeenCalledWith('/products/mine');
});

test('preserves admin dashboard data when returning from another tab', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'hasSeenWelcomeScreen' ? 'true' : null),
  );
  mockPost.mockResolvedValue({
    data: {
      token: 'admin-token',
      user: { role: 'admin', name: 'Shop Admin', email: 'admin@example.com' },
    },
  });
  mockGet.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/dashboard'
        ? {
            data: {
              stats: [],
              revenueTrends: [],
              recentLoans: [],
              topProducts: [
                {
                  id: 2,
                  name: 'Dashboard Ring',
                  cat: 'Bangles',
                  price: '99840.00',
                },
              ],
              goldRates: [
                {
                  metal_type: 'Gold',
                  purity: '999',
                  rate_per_gram: '10000.00',
                },
              ],
            },
          }
        : path === '/loans'
          ? {
              data: [
                {
                  id: 1,
                  loan_number: 'GL-001',
                  customer_name: 'Dashboard Customer',
                  jewellery_type: 'Ring',
                  principal_amount: '1000.00',
                  loan_status: 'Active',
                  loan_date: '2026-11-25',
                },
              ],
            }
          : path === '/gold-rates/current'
            ? {
                data: {
                  rates: [
                    {
                      metal_type: 'Gold',
                      purity: '999',
                      rate_per_gram: 10000,
                    },
                  ],
                },
              }
            : { data: { user: { role: 'admin' } } },
    ),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    const inputs = renderer.root.findAllByType(TextInput);
    inputs[0].props.onChangeText('admin@example.com');
    inputs[1].props.onChangeText('password');
  });

  const submitButton = renderer.root.findByProps({ testID: 'login-submit' });
  await act(async () => {
    await submitButton?.props.onPress();
  });

  expect(renderer.root.findByProps({ children: 'Admin Dashboard' })).toBeDefined();
  expect(renderer.root.findByProps({ testID: 'admin-home' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Dashboard Customer' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Dashboard Ring' })).toBeDefined();
  expect(
    renderer.root.findAllByProps({
      children: 'Gold rates API returned an invalid response.',
    }),
  ).toHaveLength(0);
  expect(mockGet).toHaveBeenCalledWith('/dashboard', {
    params: { datePreset: 'all', startDate: '', endDate: '' },
  });
  expect(mockGet).toHaveBeenCalledWith('/gold-rates/current');
  expect(mockGet).toHaveBeenCalledWith('/loans');
  expect(mockGet).not.toHaveBeenCalledWith('/products/mine');

  const dashboardRequestCount = mockGet.mock.calls.filter(
    ([path]) => path === '/dashboard',
  ).length;
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Loans' }).props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Dashboard' })
      .props.onPress();
  });
  expect(
    mockGet.mock.calls.filter(([path]) => path === '/dashboard'),
  ).toHaveLength(dashboardRequestCount);
  expect(renderer.root.findByProps({ children: 'Dashboard Ring' })).toBeDefined();
});

test('preserves Super Admin dashboard data when returning from another tab', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(
      key === 'hasSeenWelcomeScreen'
        ? 'true'
        : key === 'userToken'
          ? 'saved-token'
          : null,
    ),
  );
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(
      path === '/auth/me'
        ? { data: { user: { role: 'superadmin', name: 'Super Admin' } } }
        : path === '/super-admin/dashboard/stats'
          ? { data: { data: { totalGoldShops: 2 } } }
          : path === '/super-admin/dashboard/analytics'
            ? {
                data: {
                  data: {
                    shopRegistrations: [],
                    subscriptionGrowth: [],
                    monthlyRevenue: [],
                  },
                },
              }
            : path === '/super-admin/gold-shops'
              ? {
                  data: {
                    shops: [],
                    pagination: { totalPages: 1 },
                  },
                }
              : { data: {} },
    ),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    for (let turn = 0; turn < 4; turn += 1) {
      await new Promise<void>(resolve => setImmediate(resolve));
    }
  });

  expect(
    renderer.root.findByProps({ testID: 'cached-screen-superadmin-Home' }),
  ).toBeDefined();
  const dashboardRequestCount = mockGet.mock.calls.filter(
    ([path]) => path === '/super-admin/dashboard/stats',
  ).length;
  expect(dashboardRequestCount).toBe(1);

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Profile' })
      .props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Home' }).props.onPress();
  });

  expect(
    mockGet.mock.calls.filter(
      ([path]) => path === '/super-admin/dashboard/stats',
    ),
  ).toHaveLength(dashboardRequestCount);
  expect(
    renderer.root.findByProps({ testID: 'cached-screen-superadmin-Home' }),
  ).toBeDefined();
});

test('removes the saved token only when Logout is pressed', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'userToken' ? 'saved-token' : 'true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Open Super Admin menu' })
      .props.onPress();
  });

  const logoutLabel = renderer.root.findByProps({ children: 'Logout' });
  const logoutButton = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Logout' }).length > 0,
  )[0];
  expect(logoutLabel).toBeDefined();
  expect(logoutButton).toBeDefined();

  await act(async () => {
    await logoutButton?.props.onPress();
  });

  expect(mockRemoveItem).toHaveBeenCalledWith('userToken');
  expect(mockClearTokenCache).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findByProps({ children: 'Admin Sign In' }),
  ).toBeDefined();
});
