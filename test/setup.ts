import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(() => ({
    user: {
      userId: 'test-user-id',
      email: 'test@example.com',
      verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
    },
    handleLogOut: vi.fn()
  })),
  useIsLoggedIn: vi.fn(() => true),
  useConnectWithOtp: vi.fn(() => ({
    connectWithEmail: vi.fn(),
    verifyOneTimePassword: vi.fn()
  })),
  useMfa: vi.fn(() => ({
    getUserDevices: vi.fn(() => Promise.resolve([])),
    deleteUserDevice: vi.fn(() => Promise.resolve())
  })),
  DynamicContextProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@dynamic-labs/ethereum', () => ({
  EthereumWalletConnectors: []
}))

global.fetch = vi.fn()

Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn()
  },
  writable: true
})