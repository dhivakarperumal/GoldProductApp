import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { PermissionsAndroid, Text } from 'react-native';
import Register from '../src/Auth/Register';
import { CustomAlertProvider } from '../src/Components/CustomAlert';

const mockApiGet = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockRequestAuthorization = jest.fn();

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
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

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    requestAuthorization: (...args: unknown[]) =>
      mockRequestAuthorization(...args),
    getCurrentPosition: (...args: unknown[]) =>
      mockGetCurrentPosition(...args),
  },
  PositionError: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  },
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

beforeEach(() => {
  mockRequestAuthorization.mockResolvedValue('granted');
  mockApiGet.mockResolvedValue({
    data: {
      plans: [{ id: 1, plan_name: 'Basic', monthly_price: 10 }],
    },
  });
  mockGetCurrentPosition.mockReset().mockImplementation(success => {
    success({
      coords: { latitude: 12.9716, longitude: 80.243 },
    });
  });
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
    [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
      PermissionsAndroid.RESULTS.GRANTED,
    [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
      PermissionsAndroid.RESULTS.GRANTED,
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      address: {
        house_number: '12',
        road: 'Anna Salai',
        suburb: 'Teynampet',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postcode: '600018',
      },
    }),
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('fetches current location and fills the registration shop address', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <CustomAlertProvider>
        <Register onBack={jest.fn()} onSubmitted={jest.fn()} />
      </CustomAlertProvider>,
    );
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'tab' &&
          typeof node.props.onPress === 'function',
      )[1]
      .props.onPress();
  });

  await act(async () => {
    await renderer.root
      .findByProps({ testID: 'register-fetch-location' })
      .props.onPress();
  });

  expect(mockGetCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ enableHighAccuracy: true }),
  );
  expect(globalThis.fetch).toHaveBeenCalledWith(
    expect.stringContaining('https://nominatim.openstreetmap.org/reverse?'),
    expect.objectContaining({
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'SriGoldSuite/0.0.1 (registration location lookup)',
      },
    }),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'City' }).props.value,
  ).toBe('Chennai');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Pincode' }).props.value,
  ).toBe('600018');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Shop address' }).props.value,
  ).toBe('12 Anna Salai, Teynampet');
  expect(
    renderer.root
      .findByProps({ accessibilityLabel: 'State' })
      .findByType(Text).props.children,
  ).toBe('Tamil Nadu');
  expect(
    renderer.root.findAllByType(Text).some(text =>
      String(text.props.children).includes('Please verify them before saving.'),
    ),
  ).toBe(true);
});
