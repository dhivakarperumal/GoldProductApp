import React, { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdminTabBar, { AdminTab } from '../src/Admin/Navigation/AdminTabBar';

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

function AdminTabBarHarness() {
  const [activeTab, setActiveTab] = useState<AdminTab>('Dashboard');

  return (
    <SafeAreaProvider>
      <AdminTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaProvider>
  );
}

test('starts on Dashboard and updates selected state across all admin tabs', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<AdminTabBarHarness />);
  });

  const expectOnlyActive = (activeLabel: string) => {
    for (const { label } of tabLabels) {
      const button = renderer.root.findByProps({ accessibilityLabel: label });
      expect(button.props.accessibilityState?.selected).toBe(
        label === activeLabel,
      );
    }
  };

  expectOnlyActive('Home');

  for (const { label } of tabLabels.slice(1)) {
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    expectOnlyActive(label);
  }
});
