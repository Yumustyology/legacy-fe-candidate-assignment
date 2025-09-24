import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignatureResult } from '../../../client/src/components/signature-result'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn()
}))

vi.mock('../../../client/src/hooks/use-message-history', () => ({
  useMessageHistory: vi.fn()
}))

vi.mock('../../../client/src/lib/ethers', () => ({
  EthersService: {
    formatAddress: vi.fn((address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`)
  }
}))

vi.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn()
}))

import { useToast } from '../../../client/src/hooks/use-toast'
import { useMessageHistory } from '../../../client/src/hooks/use-message-history'
import { apiRequest } from '../../../client/src/lib/queryClient'

const mockUseToast = vi.mocked(useToast)
const mockUseMessageHistory = vi.mocked(useMessageHistory)
const mockApiRequest = vi.mocked(apiRequest)

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

describe('SignatureResult Component', () => {
  const mockToast = vi.fn()
  const mockRefreshMessages = vi.fn()

  const defaultProps = {
    message: 'Hello World',
    signature: '0x123456789abcdef',
    signerAddress: '0x1234567890123456789012345678901234567890'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    })

    mockUseMessageHistory.mockReturnValue({
      refreshMessages: mockRefreshMessages,
      isLoading: false,
      messages: [],
      error: null,
      addMessage: vi.fn(),
      clearHistory: vi.fn(),
      removeMessage: vi.fn()
    })
  })

  it('renders correctly with pending verification', async () => {
    mockApiRequest.mockImplementation(() => new Promise(() => {}))

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    expect(screen.getByText('Signature Generated')).toBeInTheDocument()
    expect(screen.getByTestId('text-original-message')).toHaveTextContent('Hello World')
    expect(screen.getByTestId('text-signature')).toHaveTextContent(defaultProps.signature)
    expect(screen.getByTestId('badge-verification-status')).toHaveTextContent('Pending')
  })

  it('shows verified status when verification succeeds', async () => {
    const mockResponse = {
      isValid: true,
      signer: defaultProps.signerAddress,
      timestamp: new Date().toISOString()
    }

    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Verified ✓')).toBeInTheDocument()
    })

    expect(mockRefreshMessages).toHaveBeenCalled()
  })

  it('shows verification failed status when verification fails', async () => {
    const mockResponse = {
      isValid: false,
      signer: null,
      timestamp: new Date().toISOString()
    }

    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Invalid signature')).toBeInTheDocument()
    })

    expect(mockRefreshMessages).not.toHaveBeenCalled()
  })

  it('handles copy failure gracefully', async () => {
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ isValid: true, signer: defaultProps.signerAddress, timestamp: new Date().toISOString() })
    } as Response)

    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard not available'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true
    })

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    const copyButton = screen.getByTestId('button-copy-signature')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Copy failed',
        description: 'Failed to copy signature to clipboard',
        variant: 'destructive'
      })
    })
  })

  it('renders basic UI elements correctly', async () => {
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ isValid: true, signer: defaultProps.signerAddress, timestamp: new Date().toISOString() })
    } as Response)

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    expect(screen.getByTestId('button-copy-signature')).toBeInTheDocument()
    expect(screen.getByTestId('button-download-signature')).toBeInTheDocument()
    expect(screen.getByTestId('button-share-signature')).toBeInTheDocument()
  })

  it('renders close button when onClose is provided', async () => {
    const mockOnClose = vi.fn()
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ isValid: true, signer: defaultProps.signerAddress, timestamp: new Date().toISOString() })
    } as Response)

    render(<SignatureResult {...defaultProps} onClose={mockOnClose} />, { wrapper: createTestWrapper() })

    const closeButton = screen.getByTestId('button-close-signature-result')
    expect(closeButton).toBeInTheDocument()
    
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('does not render close button when onClose is not provided', async () => {
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve({ isValid: true, signer: defaultProps.signerAddress, timestamp: new Date().toISOString() })
    } as Response)

    render(<SignatureResult {...defaultProps} />, { wrapper: createTestWrapper() })

    expect(screen.queryByTestId('button-close-signature-result')).not.toBeInTheDocument()
  })
})