import React, { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomBar, {
  SuperAdminTab,
} from '../src/SuperAdmin/Navigation/Bottombar';

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

const tabLabels: SuperAdminTab[] = [
  'Home',
  'G Shops',
  'Plans',
  'Revenue',
  'Profile',
];

function BottomBarHarness() {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('Home');

  return (
    <SafeAreaProvider>
      <BottomBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaProvider>
  );
}

test('starts on Home and moves the gold active tab background across tabs', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<BottomBarHarness />);
  });

  const bar = renderer.root.findByProps({ testID: 'bottom-tab-bar' });
  await act(async () => {
    bar.props.onLayout({ nativeEvent: { layout: { width: 400 } } });
  });

  const pill = renderer.root.findByProps({
    testID: 'active-tab-background',
  });
  expect(pill.props.style.borderRadius).toBe(14);
  expect(pill.props.style.backgroundColor).toBe('#F4C95D');
  expect(pill.props.style.width).toBe(72);

  const expectOnlyActive = (label: SuperAdminTab) => {
    for (const tab of tabLabels) {
      const button = renderer.root.findByProps({ accessibilityLabel: tab });
      expect(button.props.accessibilityState?.selected).toBe(tab === label);
    }
  };

  expectOnlyActive('Home');
  for (const label of tabLabels.slice(1)) {
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    expectOnlyActive(label);
  }
});
