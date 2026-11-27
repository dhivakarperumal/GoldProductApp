import React, { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdminTabBar, {
  AdminTab,
  OrdersQuickOption,
} from '../src/Admin/Navigation/AdminTabBar';

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

const tabLabels: Array<{ tab: AdminTab; label: string }> = [
  { tab: 'Dashboard', label: 'Home' },
  { tab: 'Loans', label: 'Loans' },
  { tab: 'Orders', label: 'Orders' },
  { tab: 'Products', label: 'Products' },
  { tab: 'More', label: 'More' },
];

function AdminTabBarHarness({
  onOrdersOptionSelect,
}: {
  onOrdersOptionSelect?: (option: OrdersQuickOption) => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('Dashboard');

  return (
    <SafeAreaProvider>
      <AdminTabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOrdersOptionSelect={option => {
          onOrdersOptionSelect?.(option);
          setActiveTab('Orders');
        }}
      />
    </SafeAreaProvider>
  );
}

test('switches side tabs directly and opens bottom sheet on plus tap for Billing or Take Order', async () => {
  const onOrdersOptionSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AdminTabBarHarness onOrdersOptionSelect={onOrdersOptionSelect} />,
    );
  });

  const expectOnlyActive = (activeLabel: string) => {
    for (const { label } of tabLabels) {
      const button = renderer.root.findByProps({ accessibilityLabel: label });
      expect(button.props.accessibilityState?.selected).toBe(
        label === activeLabel,
      );
    }
  };
  const expectActiveIndicatorRounded = (label: string) => {
    const indicator = renderer.root.findByProps({
      testID: `admin-tab-indicator-${tabLabels.find(tab => tab.label === label)?.tab}`,
    });
    expect(indicator.props.style).toMatchObject({ borderRadius: 16 });
  };

  expectOnlyActive('Home');
  expectActiveIndicatorRounded('Home');

  for (const label of ['Loans', 'Products', 'More']) {
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    expectOnlyActive(label);
    expectActiveIndicatorRounded(label);
  }

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Orders' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'orders-action-sheet' })).toBeTruthy();

  await act(async () => {
    renderer.root.findByProps({ testID: 'orders-sheet-billing' }).props.onPress();
  });
  expect(onOrdersOptionSelect).toHaveBeenCalledWith('billing');
  expectOnlyActive('Orders');

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Orders' }).props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'orders-sheet-tack-order' })
      .props.onPress();
  });
  expect(onOrdersOptionSelect).toHaveBeenCalledWith('orders');
});
