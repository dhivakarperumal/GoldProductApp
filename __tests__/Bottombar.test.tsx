import React, { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Pressable } from 'react-native';
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
  'Reports',
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

test('starts on Home and moves one rounded active pill across all tabs', async () => {
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
  expect(pill.props.style.borderRadius).toBe(999);
  expect(pill.props.style.width).toBe(72);

  const expectOnlyActive = (label: SuperAdminTab) => {
    const activeButtons = renderer.root
      .findAllByType(Pressable)
      .filter(button => button.props.accessibilityState?.selected);

    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0].props.accessibilityLabel).toBe(label);
  };

  expectOnlyActive('Home');
  for (const label of tabLabels.slice(1)) {
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    expectOnlyActive(label);
  }

});
