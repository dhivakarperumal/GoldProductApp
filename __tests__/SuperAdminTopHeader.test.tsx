import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TopHeader from '../src/SuperAdmin/Navigation/TopHeader';
import { CustomAlertProvider } from '../src/Components/CustomAlert';
import api from '../src/api';

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

describe('SuperAdmin TopHeader', () => {
  beforeEach(() => {
    const todayIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();

    mockedGet.mockResolvedValue({
      data: {
        shops: [
          {
            id: 1,
            shop_name: 'Sri Lakshmi Gold',
            owner_name: 'Arun Kumar',
            mobile: '9876543210',
            city: 'Chennai',
            created_at: todayIso,
          },
          {
            id: 2,
            shop_name: 'Old Gold Shop',
            owner_name: 'Older Owner',
            created_at: yesterdayIso,
          },
        ],
        pagination: { totalPages: 1 },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders polished header, left drawer navigation, notifications dropdown, and profile menu', async () => {
    const onNavigate = jest.fn();
    const onProfilePress = jest.fn();
    const onLogout = jest.fn();
    const onTodayRegistrationsChange = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider>
          <CustomAlertProvider>
            <TopHeader
              adminName="Vikram Super"
              adminEmail="vikram@srigolds.com"
              activeScreen="Home"
              onNavigate={onNavigate}
              onTodayRegistrationsChange={onTodayRegistrationsChange}
              onProfilePress={onProfilePress}
              onLogout={onLogout}
            />
          </CustomAlertProvider>
        </SafeAreaProvider>,
      );
    });

    expect(mockedGet).toHaveBeenCalledWith('/super-admin/gold-shops', {
      params: {
        page: 1,
        pageSize: 50,
        search: '',
        status: 'all',
      },
    });
    expect(onTodayRegistrationsChange).toHaveBeenCalledWith(1);

    const profileBtn = renderer.root.findByProps({
      testID: 'profile-toggle',
    });
    expect(profileBtn.findByType(require('react-native').Text).props.children).toBe('V');

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'notification-toggle' })
        .props.onPress();
    });
    const notificationsDropdown = renderer.root.findByProps({
      testID: 'today-registrations-dropdown',
    });
    expect(notificationsDropdown).toBeTruthy();
    const notificationTexts = notificationsDropdown
      .findAllByType(require('react-native').Text)
      .map(node => node.props.children);
    expect(notificationTexts).toContain('Sri Lakshmi Gold');
    expect(notificationTexts).not.toContain('Old Gold Shop');

    await act(async () => {
      profileBtn.props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'profile-dropdown' }),
    ).toBeTruthy();

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'profile-menu-action' })
        .props.onPress();
    });
    expect(onProfilePress).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-toggle' })
        .props.onPress();
    });
    const drawer = renderer.root.findByProps({
      testID: 'superadmin-navigation-drawer',
    });
    expect(drawer).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'superadmin-drawer-item-home' }).props
        .accessibilityState.selected,
    ).toBe(true);

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-item-shops' })
        .props.onPress();
    });
    expect(onNavigate).toHaveBeenCalledWith({
      kind: 'tab',
      tab: 'G Shops',
    });

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-toggle' })
        .props.onPress();
    });
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-item-users' })
        .props.onPress();
    });
    expect(onNavigate).toHaveBeenCalledWith({
      kind: 'profile',
      screen: 'users',
    });

    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-toggle' })
        .props.onPress();
    });
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'superadmin-drawer-item-logout' })
        .props.onPress();
    });
    expect(onLogout).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ children: 'Log out?' }),
    ).toBeTruthy();
    let confirmLogoutBtn = renderer.root.findByProps({ children: 'Log out' }).parent;
    while (confirmLogoutBtn && typeof confirmLogoutBtn.props?.onPress !== 'function') {
      confirmLogoutBtn = confirmLogoutBtn.parent;
    }
    expect(confirmLogoutBtn).toBeTruthy();
    await act(async () => {
      confirmLogoutBtn?.props.onPress();
    });
    expect(onLogout).toHaveBeenCalledTimes(1);
  }, 15000);
});
