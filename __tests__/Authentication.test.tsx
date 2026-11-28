import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import App from '../App';
import AdminHome from '../src/Admin/Home/Home';
import SubscriptionCheckoutModal from '../src/Admin/Components/SubscriptionCheckoutModal';
import Login from '../src/Auth/Login';
import AdminTabBar from '../src/Admin/Navigation/AdminTabBar';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockSetTokenCache = jest.fn();
const mockClearTokenCache = jest.fn();
const mockRazorpayOpen = jest.fn();

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {},
  isErrorWithCode: jest.fn(() => false),
  pick: jest.fn(),
  types: {},
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    requestAuthorization: jest.fn().mockResolvedValue('granted'),
    getCurrentPosition: jest.fn(),
  },
  PositionError: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  },
}));

jest.mock('react-native-pdf', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ReactModule.createElement(View),
  };
});

jest.mock('react-native-blob-util', () => ({
  fs: {},
  open: jest.fn(),
}));

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(),
}));

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: (...args: unknown[]) => mockRazorpayOpen(...args),
  },
}));

jest.mock('../src/SuperAdmin/Home/Home', () => ({
  __esModule: true,
  default: () => null,
}));

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
  mockGetItem.mockReset().mockImplementation((key: unknown) =>
    Promise.resolve(key === 'hasSeenWelcomeScreen' ? 'true' : null),
  );
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
  mockRazorpayOpen.mockReset();
});

async function renderDashboardWithAccountPlan(
  accountPlan: Record<string, unknown>,
) {
  mockGet.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/dashboard'
        ? { data: { stats: [], accountPlan } }
        : path === '/loans'
          ? { data: [] }
          : { data: { rates: [] } },
    ),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<AdminHome onNavigate={jest.fn()} />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  return renderer;
}

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
  mockGetItem.mockImplementation((key: unknown) =>
    Promise.resolve(key === 'hasSeenWelcomeScreen' ? 'true' : 'saved-token'),
  );
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
  mockGetItem.mockImplementation((key: unknown) =>
    key === 'hasSeenWelcomeScreen'
      ? Promise.resolve('true')
      : Promise.reject(new Error('Storage unavailable')),
  );
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
    renderer = ReactTestRenderer.create(
      <Login onLogin={onLogin} onWelcomePress={jest.fn()} />,
    );
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
  mockPost.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/auth/login'
        ? {
            data: {
              token: 'admin-token',
              user: { role: 'admin', name: 'Shop Admin', email: 'admin@example.com' },
            },
          }
        : {
            data: {
              id: 21,
              order_no: 'TO-21',
              order_status: 'Order Placed',
              payment_status: 'Pending',
              customer: {
                name: 'Test Customer',
                phone: '9876543210',
                email: '',
                address: '',
              },
              items: [{
                product_id: 14,
                product_name: 'Necklace',
                quantity: 1,
                price: 10000,
                net_gold_weight: 25.5,
              }],
              sub_total: 10000,
              gst_included: true,
              gst_rate: 10,
              gst_amount: 900,
              discount_type: 'Percent',
              discount_value: 10,
              discount_amount: 1000,
              total_amount: 9900,
              advance_amount: 2000,
              balance_due: 7900,
            },
          },
    ),
  );
  mockGet.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/dashboard'
        ? {
            data: {
              stats: [
                {
                  id: 'total_customers',
                  label: 'Total Customers',
                  value: '1,248',
                  trend: '8% vs last month',
                  trendUp: true,
                },
                {
                  id: 'active_gold_loans',
                  label: 'Active Gold Loans',
                  value: '1',
                  trend: '12% vs last month',
                  trendUp: true,
                },
                {
                  id: 'completed_loans',
                  label: 'Completed Loans',
                  value: '5',
                },
                {
                  id: 'low_stock_products',
                  label: 'Low Stock Products',
                  value: '2',
                },
              ],
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
                    {
                      metal_type: 'Gold',
                      purity: '916',
                      rate_per_gram: 9000,
                    },
                  ],
                },
              }
            : path === '/categories/manage'
                ? {
                    data: [{
                      catId: 'gold-jewellery',
                      name: 'Gold Jewellery',
                      status: 'Active',
                    }],
                  }
                : path === '/metals/manage'
                  ? {
                      data: [{
                        id: 1,
                        name: 'Gold',
                        purity: '916',
                        status: 'Active',
                      }],
                    }
            : path === '/billings' || path === '/tack-orders'
              ? { data: [] }
              : path === '/products/mine'
                  ? {
                      data: {
                        products: [{
                          id: 14,
                          name: 'Necklace',
                          product_code: 'GO-14',
                          category: 'Necklace',
                          metal_type: 'Gold',
                          purity: '22K',
                          images: ['https://images.example.test/necklace.jpg'],
                          final_selling_price: '10000',
                          net_weight: '20',
                          status: 'Active',
                        }],
                        pagination: { totalPages: 1 },
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
  expect(renderer.root.findByProps({ children: 'Overview' })).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-total_customers' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-completed_loans' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-low_stock_products' }),
  ).toBeDefined();
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

  const dashboardScreen = renderer.root.findByProps({
    testID: 'cached-screen-admin-Dashboard',
  });
  await act(async () => {
    renderer.root.findByType(AdminTabBar).props.onTabPress('Orders');
  });
  expect(
    renderer.root.findByProps({ testID: 'cached-screen-admin-Orders' }).props
      .style,
  ).toEqual({ flex: 1 });
  expect(dashboardScreen.props.style).toEqual({ display: 'none' });
  expect(renderer.root.findByProps({ testID: 'orders-management' })).toBeDefined();
  expect(renderer.root.findAllByProps({ testID: 'orders-mode-bar' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'orders-mode-tab-billing' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'orders-mode-tab-orders' })).toHaveLength(0);
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-billing-total-billed' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-billing-invoice-count' }),
  ).toBeDefined();
  expect(renderer.root.findAllByProps({ children: 'Billing overview' })).toHaveLength(0);
  expect(renderer.root.findByProps({ accessibilityLabel: 'From' })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: 'To' })).toBeDefined();
  await act(async () => {
    renderer.root.findByProps({ testID: 'billing-new-button' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'create-bill-screen' })).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'billing-form-scroll' }).props,
  ).toMatchObject({
    automaticallyAdjustKeyboardInsets: true,
    contentContainerStyle: { paddingBottom: expect.any(Number) },
  });
  expect(
    renderer.root.findByProps({ testID: 'billing-form-scroll' }).props
      .contentContainerStyle.paddingBottom,
  ).toBeGreaterThanOrEqual(24);
  expect(renderer.root.findByProps({ testID: 'billing-product-14' })).toBeDefined();
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Add Necklace to bill' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ testID: 'billing-product-added-14' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Added to bill, quantity 1',
    }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Add another Necklace to bill',
    }).props.accessibilityState,
  ).toEqual({ selected: true });
  expect(
    renderer.root.findByProps({ testID: 'billing-next-button' }).props.disabled,
  ).toBe(false);
  await act(async () => {
    renderer.root.findByProps({ testID: 'billing-next-button' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'billing-customer-details' })).toBeDefined();
  await act(async () => {
    renderer.root.findByProps({ testID: 'billing-payment-exchange' }).props.onPress();
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Category *' })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Metal *' })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Purity *' })).toBeDefined();
  expect(mockGet).toHaveBeenCalledWith('/categories/manage');
  expect(mockGet).toHaveBeenCalledWith('/metals/manage');
  const chooseExchangeOption = async (label: string, optionLabel: string) => {
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    const option = renderer.root.findByProps({
      accessibilityLabel: `${label} option ${optionLabel}`,
    });
    await act(async () => {
      option.props.onPress();
    });
  };
  await chooseExchangeOption('Category *', 'Gold Jewellery');
  await chooseExchangeOption('Metal *', 'Gold');
  await chooseExchangeOption('Purity *', '22K / 916');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Rate per gram (₹)' }).props.value,
  ).toBe('9000');
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Weight (g) *' })
      .props.onChangeText('2');
  });
  expect(
    renderer.root.findByProps({ testID: 'billing-exchange-credit' }).props.children,
  ).toEqual(['−', '₹18,000.00']);
  expect(
    renderer.root.findByProps({ testID: 'admin-header-container' }).props.style,
  ).toEqual({ display: 'none' });
  expect(
    renderer.root.findByProps({ testID: 'admin-tab-bar-container' }).props.style,
  ).toEqual({ display: 'none' });
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Back to bills' }),
  ).toBeDefined();
  expect(renderer.root.findAllByProps({ testID: 'orders-mode-bar' })).toHaveLength(0);

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Back to bills' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ testID: 'admin-header-container' }).props.style,
  ).toBeUndefined();
  expect(
    renderer.root.findByProps({ testID: 'admin-tab-bar-container' }).props.style,
  ).toBeUndefined();
  await act(async () => {
    renderer.root.findByType(AdminTabBar).props.onOrdersOptionSelect('orders');
  });
  expect(
    renderer.root.findByProps({ testID: 'dashboard-metric-orders-total' }),
  ).toBeDefined();
  expect(
    renderer.root.findAllByProps({ children: 'Take order overview' }),
  ).toHaveLength(0);
  await act(async () => {
    renderer.root.findByProps({ testID: 'tack-new-button' }).props.onPress();
  });
  expect(
    renderer.root.findByProps({ testID: 'create-tack-order-screen' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'take-order-form-scroll' }).props,
  ).toMatchObject({
    automaticallyAdjustKeyboardInsets: true,
    contentContainerStyle: { paddingBottom: expect.any(Number) },
  });
  expect(
    renderer.root.findByProps({ testID: 'take-order-form-scroll' }).props
      .contentContainerStyle.paddingBottom,
  ).toBeGreaterThanOrEqual(24);
  expect(
    renderer.root.findByProps({ testID: 'admin-header-container' }).props.style,
  ).toEqual({ display: 'none' });
  expect(
    renderer.root.findByProps({ testID: 'admin-tab-bar-container' }).props.style,
  ).toEqual({ display: 'none' });
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Back to Take Orders' }),
  ).toBeDefined();
  expect(renderer.root.findByProps({ testID: 'take-order-product-14' })).toBeDefined();
  const nextDetailsButton = renderer.root.findByProps({
    testID: 'take-order-next-button',
  });
  expect(nextDetailsButton.props.disabled).toBe(true);
  expect(nextDetailsButton.props.style).toMatchObject({
    backgroundColor: '#B7C7C0',
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Add Necklace to take order' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ testID: 'take-order-product-added-14' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ title: 'New Take Order' }).props.bottomSpacing,
  ).toBe(false);
  expect(
    renderer.root.findByProps({ testID: 'take-order-next-button' }).props.disabled,
  ).toBe(false);
  const weightInput = renderer.root.findByProps({
    accessibilityLabel: 'Net weight for Necklace',
  });
  expect(weightInput.props.value).toBe('20');
  expect(weightInput.props.textAlignVertical).toBe('center');
  await act(async () => {
    weightInput.props.onChangeText('25.5');
  });
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Net weight for Necklace' })
      .props.value,
  ).toBe('25.5');
  await act(async () => {
    renderer.root.findByProps({ testID: 'take-order-next-button' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'take-order-customer-details' })).toBeDefined();
  expect(renderer.root.findByProps({ testID: 'take-order-payment-summary' })).toBeDefined();
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'GST rate (%)' }).props.onChangeText('10');
    renderer.root.findByProps({ testID: 'take-order-gst-toggle' }).props.onPress();
    renderer.root.findByProps({ accessibilityLabel: 'Discount' }).props.onChangeText('10');
    renderer.root.findByProps({ accessibilityLabel: 'Advance amount (₹)' }).props.onChangeText('2000');
  });
  expect(renderer.root.findByProps({ testID: 'take-order-gst-amount' }).props.children).toBe('₹1,000.00');
  expect(renderer.root.findByProps({ testID: 'take-order-discount-amount' }).props.children).toEqual(['−', '₹1,000.00']);
  expect(renderer.root.findByProps({ testID: 'take-order-total' }).props.children).toBe('₹10,000.00');
  expect(renderer.root.findByProps({ testID: 'take-order-balance-due' }).props.children).toBe('₹8,000.00');
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Customer name *' }).props.onChangeText('Test Customer');
    renderer.root.findByProps({ accessibilityLabel: 'Phone number *' }).props.onChangeText('9876543210');
  });
  await act(async () => {
    renderer.root.findByProps({ testID: 'tack-order-save-button' }).props.onPress();
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  expect(mockPost).toHaveBeenCalledWith(
    '/tack-orders',
    expect.objectContaining({
      items: [expect.objectContaining({ product_id: 14, net_gold_weight: 25.5 })],
      gst_included: true,
      gst_rate: 10,
      discount_type: 'Percent',
      discount_value: 10,
      advance_amount: 2000,
    }),
  );
});

test('removes the saved token only when Logout is pressed', async () => {
  mockGetItem.mockImplementation((key: unknown) =>
    Promise.resolve(key === 'hasSeenWelcomeScreen' ? 'true' : 'saved-token'),
  );
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

test('opens subscription checkout with scoped access after an expired-trial login', async () => {
  mockPost.mockImplementation((path: unknown) =>
    path === '/auth/login'
      ? Promise.reject({
          status: 403,
          message: 'Your free trial has ended.',
          data: {
            code: 'TRIAL_EXPIRED',
            accountPlan: {
              account_plan_type: 'expired',
              plan_name: 'Gold Shop',
              account_end_date: '2026-04-30',
            },
          },
        })
      : Promise.resolve({ data: { checkoutToken: 'checkout-token' } }),
  );
  const onLogin = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Login onLogin={onLogin} onWelcomePress={jest.fn()} />,
    );
  });

  await act(async () => {
    const inputs = renderer.root.findAllByType(TextInput);
    inputs[0].props.onChangeText('admin@example.com');
    inputs[1].props.onChangeText('password');
  });

  await act(async () => {
    await renderer.root.findByProps({ testID: 'login-submit' }).props.onPress();
  });

  expect(
    renderer.root.findByProps({ children: 'Your free trial has ended' }),
  ).toBeDefined();
  await act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Subscribe to a plan' })
      .props.onPress();
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/subscription-access', {
    identifier: 'admin@example.com',
    password: 'password',
  });
  expect(mockGet).toHaveBeenCalledWith('/subscriptions/plans', {
    headers: { Authorization: 'Bearer checkout-token' },
  });
  expect(
    renderer.root.findByProps({ children: 'Choose a subscription' }),
  ).toBeDefined();
  expect(onLogin).not.toHaveBeenCalled();
});

test('shows a reminder for an active trial with two days remaining', async () => {
  const renderer = await renderDashboardWithAccountPlan({
    account_plan_type: 'trial',
    trial_active: true,
    trial_days_remaining: 2,
    payment_status: 'paid',
    plan_name: 'Gold Shop',
    account_end_date: '2026-11-30',
  });

  expect(
    renderer.root.findByProps({ children: 'Your free trial is ending soon' }),
  ).toBeDefined();
});

test('does not show the trial reminder when three days remain', async () => {
  const renderer = await renderDashboardWithAccountPlan({
    account_plan_type: 'trial',
    trial_active: true,
    trial_days_remaining: 3,
    payment_status: 'unpaid',
  });

  expect(
    renderer.root.findAllByProps({
      children: 'Your free trial is ending soon',
    }),
  ).toHaveLength(0);
});

test('creates a server-priced Razorpay order and verifies payment before completing', async () => {
  mockGet.mockResolvedValue({
    data: {
      plans: [
        {
          id: 5,
          plan_name: 'Gold Plan',
          monthly_price: '99',
          quarterly_price: '249',
          half_yearly_price: '449',
          yearly_price: '799',
        },
      ],
    },
  });
  mockPost.mockImplementation((path: unknown) =>
    Promise.resolve(
      path === '/subscriptions/orders'
        ? {
            data: {
              order: {
                orderId: 'order-5',
                keyId: 'rzp_test_key',
                amount: 9900,
                currency: 'INR',
                planName: 'Gold Plan',
                prefill: { email: 'admin@example.com' },
              },
            },
          }
        : { data: { message: 'Subscription payment verified.' } },
    ),
  );
  mockRazorpayOpen.mockResolvedValue({
    razorpay_payment_id: 'payment-5',
    razorpay_order_id: 'order-5',
    razorpay_signature: 'signature-5',
  });
  const onPaymentComplete = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SubscriptionCheckoutModal
        visible
        token="checkout-token"
        onClose={jest.fn()}
        onPaymentComplete={onPaymentComplete}
      />,
    );
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'subscription-checkout-submit' })
      .props.onPress();
  });

  expect(mockPost).toHaveBeenNthCalledWith(
    1,
    '/subscriptions/orders',
    { planId: 5, duration: 'monthly' },
    { headers: { Authorization: 'Bearer checkout-token' } },
  );
  expect(mockRazorpayOpen).toHaveBeenCalledWith(
    expect.objectContaining({
      key: 'rzp_test_key',
      amount: 9900,
      currency: 'INR',
      order_id: 'order-5',
      description: 'Gold Plan subscription',
    }),
  );
  expect(mockPost).toHaveBeenNthCalledWith(
    2,
    '/subscriptions/verify',
    {
      razorpay_payment_id: 'payment-5',
      razorpay_order_id: 'order-5',
      razorpay_signature: 'signature-5',
    },
    { headers: { Authorization: 'Bearer checkout-token' } },
  );
  expect(onPaymentComplete).toHaveBeenCalledTimes(1);
});

test('retries a failed server verification without creating a second payment order', async () => {
  mockGet.mockResolvedValue({
    data: {
      plans: [
        {
          id: 5,
          plan_name: 'Gold Plan',
          monthly_price: '99',
        },
      ],
    },
  });
  let verificationAttempts = 0;
  mockPost.mockImplementation((path: unknown) => {
    if (path === '/subscriptions/orders') {
      return Promise.resolve({
        data: {
          order: {
            orderId: 'order-5',
            keyId: 'rzp_test_key',
            amount: 9900,
            currency: 'INR',
            planName: 'Gold Plan',
          },
        },
      });
    }
    verificationAttempts += 1;
    return verificationAttempts === 1
      ? Promise.reject({ message: 'Temporary verification outage.' })
      : Promise.resolve({ data: { message: 'Subscription payment verified.' } });
  });
  mockRazorpayOpen.mockResolvedValue({
    razorpay_payment_id: 'payment-5',
    razorpay_order_id: 'order-5',
    razorpay_signature: 'signature-5',
  });
  const onPaymentComplete = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SubscriptionCheckoutModal
        visible
        token="checkout-token"
        onClose={jest.fn()}
        onPaymentComplete={onPaymentComplete}
      />,
    );
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'subscription-checkout-submit' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({
      children: 'Retry payment verification',
    }),
  ).toBeDefined();

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'subscription-checkout-submit' })
      .props.onPress();
  });

  expect(
    mockPost.mock.calls.filter(([path]) => path === '/subscriptions/orders'),
  ).toHaveLength(1);
  expect(
    mockPost.mock.calls.filter(([path]) => path === '/subscriptions/verify'),
  ).toHaveLength(2);
  expect(mockRazorpayOpen).toHaveBeenCalledTimes(1);
  expect(onPaymentComplete).toHaveBeenCalledTimes(1);
});
