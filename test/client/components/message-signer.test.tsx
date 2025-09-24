import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageSigner } from '../../../client/src/components/message-signer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks and Dynamic SDK
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn()
}))

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn()
}))

import { useToast } from '../../../client/src/hooks/use-toast'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'

const mockUseToast = vi.mocked(useToast)
const mockUseDynamicContext = vi.mocked(useDynamicContext)

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('MessageSigner Component', () => {
  const mockToast = vi.fn()
  const mockOnMessageSigned = vi.fn()
  const mockSignMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseToast.mockReturnValue({ toast: mockToast })
  })

  it('renders correctly when user is connected', () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    expect(screen.getByText('Sign New Message')).toBeInTheDocument()
    expect(screen.getByTestId('input-message')).toBeInTheDocument()
    expect(screen.getByTestId('button-sign-message')).toBeInTheDocument()
    expect(screen.getByTestId('button-clear-message')).toBeInTheDocument()
  })

  it('renders disabled state when user is not connected', () => {
    mockUseDynamicContext.mockReturnValue({
      user: null,
      primaryWallet: null
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const signButton = screen.getByTestId('button-sign-message')
    expect(signButton).toBeDisabled()
  })

  it('updates message input correctly', () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    fireEvent.change(messageInput, { target: { value: 'Hello World' } })

    expect(messageInput).toHaveValue('Hello World')
  })

  it('shows character count correctly', () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const characterCount = screen.getByTestId('text-character-count')

    expect(characterCount).toHaveTextContent('0/1000 characters')

    fireEvent.change(messageInput, { target: { value: 'Test' } })
    expect(characterCount).toHaveTextContent('4/1000 characters')
  })

  it('clears message when clear button is clicked', () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const clearButton = screen.getByTestId('button-clear-message')

    fireEvent.change(messageInput, { target: { value: 'Test message' } })
    expect(messageInput).toHaveValue('Test message')

    fireEvent.click(clearButton)
    expect(messageInput).toHaveValue('')
  })

  it('disables sign button when message is empty', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const signButton = screen.getByTestId('button-sign-message')

    // Button should be disabled initially (no message)
    expect(signButton).toBeDisabled()

    // Add some text to enable the button
    fireEvent.change(messageInput, { target: { value: 'test' } })
    expect(signButton).not.toBeDisabled()

    // Clear message and button should be disabled again
    fireEvent.change(messageInput, { target: { value: '' } })
    expect(signButton).toBeDisabled()

    // Since button is disabled, toast should not be called
    expect(mockToast).not.toHaveBeenCalled()
  })

  it('successfully signs message when all conditions are met', async () => {
    const mockSignature = '0xabcdef1234567890abcdef1234567890abcdef12'
    mockSignMessage.mockResolvedValue(mockSignature)

    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const signButton = screen.getByTestId('button-sign-message')

    fireEvent.change(messageInput, { target: { value: 'Hello World' } })
    fireEvent.click(signButton)

    await waitFor(() => {
      expect(mockSignMessage).toHaveBeenCalledWith('Hello World')
    })

    await waitFor(() => {
      expect(mockOnMessageSigned).toHaveBeenCalledWith(
        'Hello World',
        mockSignature,
        '0x1234567890123456789012345678901234567890'
      )
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Message signed',
        description: 'Message signed successfully'
      })
    })

    // Message should be cleared after signing
    expect(messageInput).toHaveValue('')
  })

  it('handles signing errors correctly', async () => {
    const errorMessage = 'User rejected the request'
    mockSignMessage.mockRejectedValue(new Error(errorMessage))

    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const signButton = screen.getByTestId('button-sign-message')

    fireEvent.change(messageInput, { target: { value: 'Hello World' } })
    fireEvent.click(signButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Signing failed',
        description: errorMessage,
        variant: 'destructive'
      })
    })

    expect(mockOnMessageSigned).not.toHaveBeenCalled()
  })

  it('shows loading state during signing', async () => {
    let resolveSignMessage: (value: string) => void
    const signPromise = new Promise<string>((resolve) => {
      resolveSignMessage = resolve
    })
    mockSignMessage.mockReturnValue(signPromise)

    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: '0x1234567890123456789012345678901234567890' }]
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const signButton = screen.getByTestId('button-sign-message')

    fireEvent.change(messageInput, { target: { value: 'Hello World' } })
    fireEvent.click(signButton)

    expect(screen.getByText('Signing...')).toBeInTheDocument()
    expect(signButton).toBeDisabled()

    resolveSignMessage!('0xsignature')

    await waitFor(() => {
      expect(screen.getByText('Sign Message')).toBeInTheDocument()
    })
  })

  it('shows error when user not connected but has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: []
      },
      primaryWallet: {
        signMessage: mockSignMessage
      }
    })

    render(<MessageSigner onMessageSigned={mockOnMessageSigned} />, {
      wrapper: createTestWrapper()
    })

    const messageInput = screen.getByTestId('input-message')
    const signButton = screen.getByTestId('button-sign-message')

    fireEvent.change(messageInput, { target: { value: 'Hello World' } })
    fireEvent.click(signButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'User not connected',
        description: 'Please login as a user first',
        variant: 'destructive'
      })
    })
  })
})