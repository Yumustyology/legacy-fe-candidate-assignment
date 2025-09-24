import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMessageHistory } from '../../../client/src/hooks/use-message-history'

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn()
}))

global.fetch = vi.fn()

import { useDynamicContext } from '@dynamic-labs/sdk-react-core'

const mockUseDynamicContext = vi.mocked(useDynamicContext)
const mockFetch = vi.mocked(fetch)

const createWrapper = () => {
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

const mockUserAddress = '0x1234567890123456789012345678901234567890'
const mockMessages = [
  {
    id: '1',
    message: 'Hello World',
    signature: '0xsignature1',
    signerAddress: mockUserAddress,
    timestamp: '2023-01-01T00:00:00.000Z',
    isVerified: true
  },
  {
    id: '2',
    message: 'Test Message',
    signature: '0xsignature2',
    signerAddress: mockUserAddress,
    timestamp: '2023-01-02T00:00:00.000Z',
    isVerified: false
  }
]

describe('useMessageHistory Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: [{ address: mockUserAddress }]
      }
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns empty array when user has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: null
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('returns empty array when user has no verified credentials', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: {
        verifiedCredentials: []
      }
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches messages for user address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMessages)
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith(`/api/messages/address/${mockUserAddress}`)
    expect(result.current.messages).toEqual(mockMessages)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.messages).toEqual([])
  })

  it('handles network error correctly', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.messages).toEqual([])
  })

  it('normalizes timestamp format', async () => {
    const messagesWithVariousTimestamps = [
      {
        ...mockMessages[0],
        timestamp: new Date('2023-01-01T00:00:00.000Z')
      },
      {
        ...mockMessages[1],
        timestamp: '2023-01-02T00:00:00.000Z'
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(messagesWithVariousTimestamps)
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.messages.forEach(message => {
      expect(typeof message.timestamp).toBe('string')
      expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  it('adds message optimistically', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newMessage = {
      message: 'New Message',
      signature: '0xnewsignature',
      signerAddress: mockUserAddress,
      isVerified: true
    }

    act(() => {
      result.current.addMessage(newMessage)
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })
    
    expect(result.current.messages[0]).toMatchObject(newMessage)
    expect(result.current.messages[0].id).toMatch(/^temp-\d+$/)
  })

  it('does not add message when user has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: null
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    const newMessage = {
      message: 'New Message',
      signature: '0xnewsignature',
      signerAddress: mockUserAddress,
      isVerified: true
    }

    act(() => {
      result.current.addMessage(newMessage)
    })

    expect(result.current.messages).toHaveLength(0)
  })

  it('clears history successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages)
      } as Response)
      .mockResolvedValueOnce({
        ok: true
      } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await act(async () => {
      await result.current.clearHistory()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/messages/address/${mockUserAddress}`,
      { method: 'DELETE' }
    )
  })

  it('handles clear history error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages)
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await expect(
      act(async () => {
        await result.current.clearHistory()
      })
    ).rejects.toThrow('Failed to clear messages')
  })

  it('does not clear history when user has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: null
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await result.current.clearHistory()
    })

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/messages/address/'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('removes individual message successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages)
      } as Response)
      .mockResolvedValueOnce({
        ok: true
      } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await act(async () => {
      await result.current.removeMessage('1')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/messages/1', { method: 'DELETE' })
    
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
    })
    
    expect(result.current.messages[0].id).toBe('2')
  })

  it('handles remove message error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages)
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    await expect(
      act(async () => {
        await result.current.removeMessage('1')
      })
    ).rejects.toThrow('Failed to delete message')
  })

  it('does not remove message when user has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: null
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await result.current.removeMessage('1')
    })

    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/messages/1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('refreshes messages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMessages)
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    act(() => {
      result.current.refreshMessages()
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does not refresh when user has no address', async () => {
    mockUseDynamicContext.mockReturnValue({
      user: null
    })

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    act(() => {
      result.current.refreshMessages()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('exports StoredMessage type correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMessages)
    } as Response)

    const { result } = renderHook(() => useMessageHistory(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    const message: any = result.current.messages[0]
    expect(message).toBeDefined()
    expect(message.id).toBeDefined()
  })
})