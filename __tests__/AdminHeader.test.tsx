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
    mockedGet.mockResolvedValue({
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders brand header, low stock dropdown, notification dropdown, and profile dropdown', async () => {
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
    expect(
      renderer.root.findByProps({ testID: 'admin-notifications-dropdown' }),
    ).toBeTruthy();

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
  });
});
