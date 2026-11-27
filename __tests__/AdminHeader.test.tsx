import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdminHeader from '../src/Admin/Navigation/AdminHeader';
import api from '../src/api';
import { CustomAlertProvider } from '../src/Components/CustomAlert';

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedGet = api.get as jest.Mock;

describe('AdminHeader', () => {
  beforeEach(() => {
    const todayIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();

    mockedGet.mockImplementation((url: string) => {
      if (url === '/tack-orders') {
        return Promise.resolve({
          data: [
            {
              id: 101,
              order_no: 'TO-TODAY-01',
              order_status: 'PENDING',
              total_amount: 45000,
              customer: { name: 'Karthik', phone: '9876543210' },
              items: [{ id: 1 }],
              created_at: todayIso,
            },
            {
              id: 102,
              order_no: 'TO-OLD-02',
              order_status: 'COMPLETED',
              total_amount: 20000,
              customer: { name: 'Old Customer' },
              items: [{ id: 2 }],
              created_at: yesterdayIso,
            },
          ],
        });
      }

      return Promise.resolve({
        data: {
          products: [
            {
              id: 1,
              name: '22K Gold Ring',
              category: 'Rings',
              total_stock: 2,
            },
          ],
          stats: { lowStock: 1 },
        },
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders brand header, left menu drawer navigation, low stock dropdown, notification dropdown, and profile dropdown', async () => {
    const onNavigate = jest.fn();
    const onProfilePress = jest.fn();
    const onLogout = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider>
          <CustomAlertProvider>
            <AdminHeader
              adminName="Raja Gold"
              adminEmail="raja@srigolds.com"
              activeScreen="Dashboard"
              onNavigate={onNavigate}
              onProfilePress={onProfilePress}
              onLogout={onLogout}
            />
          </CustomAlertProvider>
        </SafeAreaProvider>,
      );
    });

    expect(mockedGet).toHaveBeenCalledWith('/products/mine', {
      params: { page: 1, limit: 15, stockStatus: 'low-stock' },
    });

    const profileBtn = renderer.root.findByProps({
      testID: 'admin-profile-toggle',
    });
    expect(profileBtn.findByType(require('react-native').Text).props.children).toBe('R');

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'admin-low-stock-toggle' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'admin-low-stock-dropdown' }),
    ).toBeTruthy();

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'admin-notification-toggle' })
        .props.onPress();
    });
    const notificationsDropdown = renderer.root.findByProps({
      testID: 'admin-notifications-dropdown',
    });
    expect(notificationsDropdown).toBeTruthy();
    const notificationTexts = notificationsDropdown
      .findAllByType(require('react-native').Text)
      .map(node => node.props.children);
    expect(notificationTexts).toContain('TO-TODAY-01');
    expect(notificationTexts).not.toContain('TO-OLD-02');

    await act(async () => {
      profileBtn.props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'admin-profile-dropdown' }),
    ).toBeTruthy();

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'admin-profile-menu-action' })
        .props.onPress();
    });
    expect(onProfilePress).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'admin-drawer-toggle' })
        .props.onPress();
    });
    const drawer = renderer.root.findByProps({
      testID: 'admin-navigation-drawer',
    });
    expect(drawer).toBeTruthy();
    const drawerTexts = drawer
      .findAllByType(require('react-native').Text)
      .map(node => node.props.children);
    expect(drawerTexts).not.toContain('Raja Gold');
    expect(drawerTexts).not.toContain('raja@srigolds.com');

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'drawer-item-dailyRates' })
        .props.onPress();
    });
    expect(onNavigate).toHaveBeenCalledWith({
      kind: 'more',
      screen: 'dailyRates',
    });
  });
});
