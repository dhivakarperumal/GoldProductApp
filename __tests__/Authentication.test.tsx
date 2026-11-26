import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import App from '../App';
import Login from '../src/Auth/Login';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockPost = jest.fn();
const mockSetTokenCache = jest.fn();
const mockClearTokenCache = jest.fn();
const activeRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

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
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

beforeEach(() => {
  mockGetItem.mockReset().mockResolvedValue(null);
  mockSetItem.mockReset().mockResolvedValue(undefined);
  mockRemoveItem.mockReset().mockResolvedValue(undefined);
  mockPost.mockReset();
  mockSetTokenCache.mockReset();
  mockClearTokenCache.mockReset();
});

afterEach(async () => {
  await act(async () => {
    activeRenderers.splice(0).forEach(renderer => renderer.unmount());
  });
});

test('restores a saved session without showing the login screen', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'userToken' ? 'saved-token' : 'true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Super Admin menu',
    }),
  ).toBeDefined();
  expect(renderer.root.findAllByProps({ children: 'Super Admin Sign In' }))
    .toHaveLength(0);
  expect(mockSetTokenCache).toHaveBeenCalledWith('saved-token');
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('does not redirect to login when session storage cannot be read', async () => {
  mockGetItem.mockImplementation((key: string) =>
    key === 'userToken'
      ? Promise.reject(new Error('Storage unavailable'))
      : Promise.resolve('true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(
    renderer.root.findByProps({ children: 'Unable to restore your session' }),
  ).toBeDefined();
  expect(
    renderer.root.findAllByProps({ children: 'Super Admin Sign In' }),
  ).toHaveLength(0);
  expect(mockRemoveItem).not.toHaveBeenCalled();
});

test('shows the welcome screen on first launch and opens login after continuing', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(renderer.root.findByProps({ testID: 'welcome-screen' })).toBeDefined();
  expect(renderer.root.findAllByProps({ testID: 'welcome-next' })).toHaveLength(
    0,
  );

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 2' })
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 3' })
      .props.onPress();
  });
  expect(
    renderer.root.findAllByProps({ testID: 'welcome-next' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Skip welcome slides' }),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({ testID: 'welcome-continue' }),
  ).toBeDefined();

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'welcome-continue' })
      .props.onPress();
  });

  expect(mockSetItem).toHaveBeenCalledWith(
    'hasSeenWelcomeScreen',
    'true',
  );
  expect(
    renderer.root.findByProps({ children: 'Super Admin Sign In' }),
  ).toBeDefined();

  await act(async () => {
    renderer.root.findByProps({ testID: 'login-welcome' }).props.onPress();
  });
  expect(renderer.root.findByProps({ testID: 'welcome-screen' })).toBeDefined();

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 2' })
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show welcome slide 3' })
      .props.onPress();
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'welcome-continue' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ children: 'Super Admin Sign In' }),
  ).toBeDefined();
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
    activeRenderers.push(renderer);
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

test('removes the saved token only when Logout is pressed', async () => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(key === 'userToken' ? 'saved-token' : 'true'),
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    activeRenderers.push(renderer);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Open Super Admin menu' })
      .props.onPress();
  });

  const logoutLabel = renderer.root.findByProps({ children: 'Logout' });
  const logoutButton = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Logout' }).length > 0,
  )[0];
  expect(logoutLabel).toBeDefined();
  expect(logoutButton).toBeDefined();

  await act(async () => {
    await logoutButton?.props.onPress();
  });

  expect(mockRemoveItem).toHaveBeenCalledWith('userToken');
  expect(mockClearTokenCache).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findByProps({ children: 'Super Admin Sign In' }),
  ).toBeDefined();
});
