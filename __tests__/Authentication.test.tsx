import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import App from '../App';
import Login from '../src/Auth/Login';
import AdminTabBar from '../src/Admin/Navigation/AdminTabBar';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockSetTokenCache = jest.fn();
const mockClearTokenCache = jest.fn();

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
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
  clearTokenCache: (...args: unknown[]) => mockClearTokenCache(...args),
  setTokenCache: (...args: unknown[]) => mockSetTokenCache(...args),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

beforeEach(() => {
  mockGetItem.mockReset().mockResolvedValue(null);
  mockSetItem.mockReset().mockResolvedValue(undefined);
  mockRemoveItem.mockReset().mockResolvedValue(undefined);
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
  mockGetItem.mockResolvedValue('saved-token');
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
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
  mockGetItem.mockRejectedValue(new Error('Storage unavailable'));
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
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
    renderer = ReactTestRenderer.create(<Login onLogin={onLogin} />);
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

test('removes the saved token only when Logout is pressed', async () => {
  mockGetItem.mockResolvedValue('saved-token');
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Open Super Admin menu' })
      .props.onPress();
  });

  const logoutButton = renderer.root
    .findByProps({ children: 'Logout' })
    .parent?.parent?.parent;
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
