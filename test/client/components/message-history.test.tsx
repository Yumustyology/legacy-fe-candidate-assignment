import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageHistory } from '../../../client/src/components/message-history'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks and utilities
vi.mock('../../../client/src/hooks/use-message-history', () => ({
  useMessageHistory: vi.fn()
}))

vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}))

vi.mock('../../../client/src/lib/ethers', () => ({
  EthersService: {
    formatAddress: vi.fn((address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`)
  }
}))

import { useMessageHistory } from '../../../client/src/hooks/use-message-history'
import { useToast } from '../../../client/src/hooks/use-toast'

const mockUseMessageHistory = vi.mocked(useMessageHistory)
const mockUseToast = vi.mocked(useToast)

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

describe('MessageHistory Component', () => {
  const mockToast = vi.fn()
  const mockClearHistory = vi.fn()
  const mockRemoveMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseToast.mockReturnValue({ toast: mockToast })
  })

  it('renders loading state correctly', () => {
    mockUseMessageHistory.mockReturnValue({
      messages: [],
      isLoading: true,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    expect(screen.getByText('Message History')).toBeInTheDocument()
    expect(screen.getByText('Loading message history...')).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    mockUseMessageHistory.mockReturnValue({
      messages: [],
      isLoading: false,
      error: new Error('Network error'),
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    expect(screen.getByText('Failed to load messages')).toBeInTheDocument()
    expect(screen.getByText('Unable to fetch message history from server')).toBeInTheDocument()
  })

  it('renders empty state when no messages', () => {
    mockUseMessageHistory.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    expect(screen.getByText('No messages signed yet')).toBeInTheDocument()
    expect(screen.getByText('Your personal signed messages will appear here')).toBeInTheDocument()
  })

  it('renders messages list correctly', () => {
    const mockMessages = [
      {
        id: '1',
        message: 'Hello World',
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: new Date().toISOString(),
        isVerified: true
      },
      {
        id: '2',
        message: 'Test Message',
        signature: '0xabcdef1234567890abcdef1234567890abcdef12',
        signerAddress: '0x0987654321098765432109876543210987654321',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        isVerified: false
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    expect(screen.getByText('My Signed Messages')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
    expect(screen.getByText('Test Message')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('handles clear history action', async () => {
    const mockMessages = [
      {
        id: '1',
        message: 'Hello World',
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: new Date().toISOString(),
        isVerified: true
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    const clearButton = screen.getByTestId('button-clear-history')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockClearHistory).toHaveBeenCalled()
    })
  })

  it('handles delete message action', async () => {
    const mockMessages = [
      {
        id: '1',
        message: 'Hello World',
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: new Date().toISOString(),
        isVerified: true
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    const deleteButton = screen.getByTestId('button-delete-message-1')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockRemoveMessage).toHaveBeenCalledWith('1')
    })
  })

  it('opens and closes message details modal', async () => {
    const mockMessages = [
      {
        id: '1',
        message: 'Hello World',
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: new Date().toISOString(),
        isVerified: true
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    const viewDetailsButton = screen.getByTestId('button-view-details-1')
    fireEvent.click(viewDetailsButton)

    expect(screen.getByText('Message Details')).toBeInTheDocument()

    const closeButton = screen.getByTestId('button-close-details')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Message Details')).not.toBeInTheDocument()
    })
  })

  it('formats time correctly', () => {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    
    const mockMessages = [
      {
        id: '1',
        message: 'Hello World',
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: oneMinuteAgo.toISOString(),
        isVerified: true
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    const timeElement = screen.getByTestId('text-message-time-1')
    expect(timeElement.textContent).toMatch(/1m ago/)
  })

  it('truncates long messages correctly', () => {
    const longMessage = 'This is a very long message that should be truncated when displayed in the message history list'
    
    const mockMessages = [
      {
        id: '1',
        message: longMessage,
        signature: '0x1234567890abcdef1234567890abcdef12345678',
        signerAddress: '0x1234567890123456789012345678901234567890',
        timestamp: new Date().toISOString(),
        isVerified: true
      }
    ]

    mockUseMessageHistory.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      clearHistory: mockClearHistory,
      removeMessage: mockRemoveMessage
    })

    render(<MessageHistory />, { wrapper: createTestWrapper() })
    
    const messageContent = screen.getByTestId('text-message-content-1')
    expect(messageContent.textContent).toContain('...')
    expect(messageContent.textContent?.length).toBeLessThan(longMessage.length)
  })
})