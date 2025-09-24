import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WalletConnectorWithOTP from '../../../client/src/components/wallet-connector-with-otp'

// Mock Dynamic SDK hooks
vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useConnectWithOtp: vi.fn(),
  useDynamicContext: vi.fn(),
  useIsLoggedIn: vi.fn(),
  useMfa: vi.fn()
}))

// Mock toast hook
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn()
}))

// Mock MfaManager component
vi.mock('../../../client/src/components/mfa-manager', () => ({
  default: () => <div data-testid="mfa-manager">MFA Manager Component</div>
}))

// Mock MfaAuthenticator component
vi.mock('../../../client/src/components/mfa-authenticator', () => ({
  default: () => <div data-testid="mfa-authenticator">MFA Authenticator Component</div>
}))

import { useConnectWithOtp, useDynamicContext, useIsLoggedIn, useMfa } from '@dynamic-labs/sdk-react-core'
import { useToast } from '../../../client/src/hooks/use-toast'

const mockUseConnectWithOtp = vi.mocked(useConnectWithOtp)
const mockUseDynamicContext = vi.mocked(useDynamicContext)
const mockUseIsLoggedIn = vi.mocked(useIsLoggedIn)
const mockUseMfa = vi.mocked(useMfa)
const mockUseToast = vi.mocked(useToast)

describe('WalletConnectorWithOTP - Core Features', () => {
  const mockConnectWithEmail = vi.fn()
  const mockVerifyOneTimePassword = vi.fn()
  const mockGetUserDevices = vi.fn()
  const mockToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConnectWithOtp.mockReturnValue({
      connectWithEmail: mockConnectWithEmail,
      verifyOneTimePassword: mockVerifyOneTimePassword,
      connectWithSms: vi.fn(),
      retryOneTimePassword: vi.fn()
    })
    mockUseDynamicContext.mockReturnValue({
      userWithMissingInfo: undefined,
      user: null,
      handleLogOut: vi.fn()
    } as any)
    mockUseMfa.mockReturnValue({
      getUserDevices: mockGetUserDevices,
      addDevice: vi.fn(),
      authenticateDevice: vi.fn(),
      getRecoveryCodes: vi.fn(),
      completeAcknowledgement: vi.fn(),
      deleteUserDevice: vi.fn(),
      authDevice: vi.fn(),
      authRecoveryCode: vi.fn(),
      authenticateRecoveryCode: vi.fn(),
      updateUserDevice: vi.fn(),
      authToken: null,
      registerSmsAuthenticator: vi.fn(),
      authenticateSmsOtp: vi.fn()
    } as any)
    mockUseIsLoggedIn.mockReturnValue(false)
    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn()
    })
    mockGetUserDevices.mockResolvedValue([])
  })

  it('completes full authentication flow: email → OTP → success', async () => {
    mockConnectWithEmail.mockResolvedValue(undefined)
    mockVerifyOneTimePassword.mockResolvedValue(undefined)

    render(<WalletConnectorWithOTP />)

    // Step 1: Email input
    expect(screen.getByText('Sign in with Dynamic')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()

    // Enter valid email
    const emailInput = screen.getByPlaceholderText('Enter your email')
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    // Submit email
    fireEvent.click(screen.getByTestId('button-connect-dynamic-email'))

    // Wait for OTP step
    await waitFor(() => {
      expect(mockConnectWithEmail).toHaveBeenCalledWith('user@example.com')
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument()
      expect(screen.getByText('Enter verification code')).toBeInTheDocument()
    })

    // Verify success toast was shown
    expect(mockToast).toHaveBeenCalledWith({
      title: "Verification code sent!",
      description: "We've sent a verification code to user@example.com. Please check your inbox.",
      variant: "default",
    })

    // Step 2: OTP input
    const otpInput = screen.getByPlaceholderText('Enter 6-digit code')
    fireEvent.change(otpInput, { target: { value: '123456' } })

    // Submit OTP
    fireEvent.click(screen.getByTestId('button-connect-dynamic-otp'))

    await waitFor(() => {
      expect(mockVerifyOneTimePassword).toHaveBeenCalledWith('123456')
    })
  })

  it('validates email input and shows errors', async () => {
    render(<WalletConnectorWithOTP />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByTestId('button-connect-dynamic-email')

    // Test invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Test valid email clears error
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
    expect(submitButton).not.toBeDisabled()
  })

  it('validates OTP input and enforces 6-digit numeric format', async () => {
    mockConnectWithEmail.mockResolvedValue(undefined)
    render(<WalletConnectorWithOTP />)

    // Navigate to OTP step
    const emailInput = screen.getByPlaceholderText('Enter your email')
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByTestId('button-connect-dynamic-email'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument()
    })

    const otpInput = screen.getByPlaceholderText('Enter 6-digit code')
    const otpButton = screen.getByTestId('button-connect-dynamic-otp')

    // Test non-numeric input is filtered
    fireEvent.change(otpInput, { target: { value: '12a3b4' } })
    expect(otpInput).toHaveValue('1234')

    // Test length validation
    fireEvent.change(otpInput, { target: { value: '12345' } })
    expect(screen.getByText('Code must be exactly 6 digits')).toBeInTheDocument()
    expect(otpButton).toBeDisabled()

    // Test valid OTP
    fireEvent.change(otpInput, { target: { value: '123456' } })
    expect(screen.queryByText('Code must be exactly 6 digits')).not.toBeInTheDocument()
    expect(otpButton).not.toBeDisabled()
  })

  it('handles authentication errors gracefully', async () => {
    // Test email error
    mockConnectWithEmail.mockRejectedValue(new Error('Invalid email'))
    render(<WalletConnectorWithOTP />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByTestId('button-connect-dynamic-email'))

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })

    // Test OTP error
    mockConnectWithEmail.mockResolvedValue(undefined)
    mockVerifyOneTimePassword.mockRejectedValue(new Error('Invalid code'))
    
    // Clear error and proceed to OTP
    fireEvent.change(emailInput, { target: { value: 'user2@example.com' } })
    fireEvent.click(screen.getByTestId('button-connect-dynamic-email'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument()
    })

    const otpInput = screen.getByPlaceholderText('Enter 6-digit code')
    fireEvent.change(otpInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('button-connect-dynamic-otp'))

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument()
    })
  })

  it('shows loading states during authentication', async () => {
    let resolveEmailPromise: (value: void) => void = () => {}
    const emailPromise = new Promise<void>((resolve) => {
      resolveEmailPromise = resolve
    })
    mockConnectWithEmail.mockReturnValue(emailPromise)

    render(<WalletConnectorWithOTP />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByTestId('button-connect-dynamic-email'))

    // Check loading state
    expect(screen.getByText('Sending code...')).toBeInTheDocument()
    expect(screen.getByTestId('button-connect-dynamic-email')).toBeDisabled()

    // Resolve promise
    resolveEmailPromise()
    await waitFor(() => {
      expect(screen.queryByText('Sending code...')).not.toBeInTheDocument()
    })
  })

  it('does not render when user is already logged in', () => {
    mockUseIsLoggedIn.mockReturnValue(true)

    const { container } = render(<WalletConnectorWithOTP />)
    expect(container.firstChild).toBeNull()
  })
})