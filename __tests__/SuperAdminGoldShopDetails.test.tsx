import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ScrollView } from 'react-native';
import GoldShopDetails from '../src/SuperAdmin/Shops/GoldshopDetails';
import { CustomAlertProvider } from '../src/Components/CustomAlert';

const mockApiGet = jest.fn();

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

beforeEach(() => {
  mockApiGet.mockResolvedValue({
    data: {
      shop: {
        id: 42,
        shop_name: 'Refresh Gold',
      },
    },
  });
});

test('pulling to refresh reloads shop details without leaving the detail view', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <CustomAlertProvider>
        <GoldShopDetails shopId={42} onBack={jest.fn()} />
      </CustomAlertProvider>,
    );
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  const detailsScrollView = renderer.root
    .findAllByType(ScrollView)
    .find(scrollView => scrollView.props.refreshControl);
  if (!detailsScrollView) {
    throw new Error('Shop details scroll view does not have a refresh control.');
  }

  await act(async () => {
    await detailsScrollView.props.refreshControl.props.onRefresh();
  });

  expect(mockApiGet).toHaveBeenCalledTimes(2);
  expect(mockApiGet).toHaveBeenLastCalledWith(
    '/super-admin/gold-shops/42',
    { signal: undefined },
  );
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Back to gold shops',
    }),
  ).toBeDefined();
  expect(
    renderer.root
      .findAllByType(ScrollView)
      .find(scrollView => scrollView.props.refreshControl)?.props.refreshControl
      .props.refreshing,
  ).toBe(false);
});
