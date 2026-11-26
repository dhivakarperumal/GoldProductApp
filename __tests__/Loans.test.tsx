import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Loans from '../src/Admin/Loans/Loans';

const mockGet = jest.fn();

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: jest.fn(),
  },
}));

beforeEach(() => {
  mockGet.mockReset().mockImplementation((path: unknown) => {
    if (path === '/loans') {
      return Promise.resolve({
        data: [
          {
            id: 12,
            loan_number: 'GL-20261126-000012',
            customer_name: 'Test Borrower',
            principal_amount: '25000.00',
            outstanding_principal: '20000.00',
            loan_status: 'Active',
          },
        ],
      });
    }
    if (path === '/customers') {
      return Promise.resolve({
        data: [{ id: 3, customer_code: 'CUS-003', full_name: 'Test Borrower', mobile: '9876543210' }],
      });
    }
    if (path === '/loans/interest-types') {
      return Promise.resolve({
        data: [{ type_key: 'simple', label: 'Simple', enabled: true }],
      });
    }
    if (path === '/gold-rates/current') {
      return Promise.resolve({
        data: { rates: [{ metal_type: 'Gold', purity: '22K', rate_per_gram: 6000 }] },
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${String(path)}`));
  });
});

test('shows all loans and opens the create options from the floating button', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  expect(renderer.root.findByProps({ testID: 'admin-loans' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'GL-20261126-000012' })).toBeDefined();

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create loan or customer' }).props.onPress();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Create a loan' })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Create a customer' })).toBeDefined();
});

test('opens the create-customer form from the floating action menu', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create loan or customer' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create a customer' }).props.onPress();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Email' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Guarantor details' })).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Choose customer photo *' })).toBeDefined();
});
