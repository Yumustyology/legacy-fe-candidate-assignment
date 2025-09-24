import { describe, it, expect, beforeEach } from 'vitest'
import { MemStorage } from '../../server/storage'
import type { InsertSignedMessage } from '../../shared/schema'

describe('MemStorage', () => {
  let storage: MemStorage

  beforeEach(() => {
    storage = new MemStorage()
  })

  describe('createSignedMessage', () => {
    it('should create a new signed message', async () => {
      const messageData: InsertSignedMessage = {
        message: 'Hello World',
        signature: '0x123456789',
        signerAddress: '0x1234567890123456789012345678901234567890'
      }

      const result = await storage.createSignedMessage(messageData)

      expect(result).toMatchObject({
        ...messageData,
        isVerified: true
      })
      expect(result.id).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })

    it('should prevent duplicate signatures', async () => {
      const messageData: InsertSignedMessage = {
        message: 'Hello World',
        signature: '0x123456789',
        signerAddress: '0x1234567890123456789012345678901234567890'
      }

      const first = await storage.createSignedMessage(messageData)
      const second = await storage.createSignedMessage(messageData)

      expect(first.id).toBe(second.id)
      expect(await storage.getAllSignedMessages()).toHaveLength(1)
    })
  })

  describe('getSignedMessage', () => {
    it('should retrieve a message by ID', async () => {
      const messageData: InsertSignedMessage = {
        message: 'Test Message',
        signature: '0xabcdef',
        signerAddress: '0x1234567890123456789012345678901234567890'
      }

      const created = await storage.createSignedMessage(messageData)
      const retrieved = await storage.getSignedMessage(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should return undefined for non-existent ID', async () => {
      const result = await storage.getSignedMessage('non-existent-id')
      expect(result).toBeUndefined()
    })
  })

  describe('getSignedMessagesByAddress', () => {
    it('should return messages for specific address', async () => {
      const address1 = '0x1111111111111111111111111111111111111111'
      const address2 = '0x2222222222222222222222222222222222222222'

      await storage.createSignedMessage({
        message: 'Message 1',
        signature: '0x111',
        signerAddress: address1
      })

      await storage.createSignedMessage({
        message: 'Message 2',
        signature: '0x222',
        signerAddress: address2
      })

      await storage.createSignedMessage({
        message: 'Message 3',
        signature: '0x333',
        signerAddress: address1
      })

      const address1Messages = await storage.getSignedMessagesByAddress(address1)
      const address2Messages = await storage.getSignedMessagesByAddress(address2)

      expect(address1Messages).toHaveLength(2)
      expect(address2Messages).toHaveLength(1)
      expect(address1Messages.every(msg => msg.signerAddress.toLowerCase() === address1.toLowerCase())).toBe(true)
    })

    it('should be case insensitive for addresses', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const addressUpperCase = address.toUpperCase()

      await storage.createSignedMessage({
        message: 'Test',
        signature: '0x123',
        signerAddress: address
      })

      const messages = await storage.getSignedMessagesByAddress(addressUpperCase)
      expect(messages).toHaveLength(1)
    })
  })

  describe('deleteSignedMessage', () => {
    it('should delete a message and return true', async () => {
      const created = await storage.createSignedMessage({
        message: 'To be deleted',
        signature: '0xdelete',
        signerAddress: '0x1234567890123456789012345678901234567890'
      })

      const deleted = await storage.deleteSignedMessage(created.id)
      expect(deleted).toBe(true)

      const retrieved = await storage.getSignedMessage(created.id)
      expect(retrieved).toBeUndefined()
    })

    it('should return false for non-existent message', async () => {
      const deleted = await storage.deleteSignedMessage('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('deleteSignedMessagesByAddress', () => {
    it('should delete all messages for an address', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const otherAddress = '0x2222222222222222222222222222222222222222'

      await storage.createSignedMessage({
        message: 'Message 1',
        signature: '0x111',
        signerAddress: address
      })

      await storage.createSignedMessage({
        message: 'Message 2',
        signature: '0x222',
        signerAddress: address
      })

      await storage.createSignedMessage({
        message: 'Other Message',
        signature: '0x333',
        signerAddress: otherAddress
      })

      const deletedCount = await storage.deleteSignedMessagesByAddress(address)
      expect(deletedCount).toBe(2)

      const remainingMessages = await storage.getAllSignedMessages()
      expect(remainingMessages).toHaveLength(1)
      expect(remainingMessages[0].signerAddress).toBe(otherAddress)
    })
  })

  describe('deleteAllSignedMessages', () => {
    it('should clear all messages', async () => {
      await storage.createSignedMessage({
        message: 'Message 1',
        signature: '0x111',
        signerAddress: '0x1111111111111111111111111111111111111111'
      })

      await storage.createSignedMessage({
        message: 'Message 2',
        signature: '0x222',
        signerAddress: '0x2222222222222222222222222222222222222222'
      })

      await storage.deleteAllSignedMessages()

      const messages = await storage.getAllSignedMessages()
      expect(messages).toHaveLength(0)
    })
  })

  describe('getAllSignedMessages', () => {
    it('should return messages sorted by timestamp (newest first)', async () => {
      const message1 = await storage.createSignedMessage({
        message: 'First',
        signature: '0x111',
        signerAddress: '0x1111111111111111111111111111111111111111'
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const message2 = await storage.createSignedMessage({
        message: 'Second',
        signature: '0x222',
        signerAddress: '0x2222222222222222222222222222222222222222'
      })

      const messages = await storage.getAllSignedMessages()
      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe(message2.id)
      expect(messages[1].id).toBe(message1.id)
    })
  })
})