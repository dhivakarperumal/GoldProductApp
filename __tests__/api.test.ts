import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import api, { clearTokenCache, setTokenCache } from '../src/api';

const mockGetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
  },
}));

beforeEach(() => {
  mockGetItem.mockReset().mockResolvedValue(null);
  clearTokenCache();
});

afterAll(() => {
  clearTokenCache();
});

test('preserves explicit checkout authorization without replacing the cached session token', async () => {
  setTokenCache('cached-session-token');
  const interceptor = api.interceptors.request.handlers?.[0]?.fulfilled;
  if (!interceptor) {
    throw new Error('API authorization interceptor is not registered.');
  }

  const checkoutConfig = {
    method: 'get',
    url: '/subscriptions/plans',
    headers: new AxiosHeaders({
      Authorization: 'Bearer checkout-token',
    }),
  } satisfies InternalAxiosRequestConfig;
  await interceptor(checkoutConfig);

  expect(checkoutConfig.headers.get('Authorization')).toBe(
    'Bearer checkout-token',
  );

  const sessionConfig = {
    method: 'get',
    url: '/dashboard',
    headers: new AxiosHeaders(),
  } satisfies InternalAxiosRequestConfig;
  await interceptor(sessionConfig);

  expect(sessionConfig.headers.get('Authorization')).toBe(
    'Bearer cached-session-token',
  );
  expect(mockGetItem).toHaveBeenCalledWith('userToken');
});
