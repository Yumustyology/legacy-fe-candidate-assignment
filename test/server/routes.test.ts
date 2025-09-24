import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { registerRoutes } from '../../server/routes'

describe('API Routes', () => {
  let app: Express

  beforeEach(async () => {
    app = express() as Express
    app.use(express.json())
    await registerRoutes(app)
  })

  describe('POST /api/verify-signature', () => {
    it('should verify a valid signature', async () => {
      const validMessage = 'Hello World'
      const validSignature = '0x7b771a57b1f3a135b41f6f8b5da0d5d0b4f95c29b4de7d82b2b6f24d4b7b4f9d5a2d2c5f3b3a3f3e3d3c3b3a3938373635343332313029282726252423222120'
      
      const response = await request(app)
        .post('/api/verify-signature')
        .send({
          message: validMessage,
          signature: validSignature
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('isValid')
      expect(response.body).toHaveProperty('signer')
      expect(response.body).toHaveProperty('originalMessage', validMessage)
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should reject invalid signature format', async () => {
      const response = await request(app)
        .post('/api/verify-signature')
        .send({
          message: 'Hello World',
          signature: 'invalid-signature'
        })

      expect(response.status).toBe(200)
      expect(response.body.isValid).toBe(false)
      expect(response.body.signer).toBeNull()
    })

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/verify-signature')
        .send({
          message: '',
          signature: '0x123'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message', 'Invalid request data')
    })

    it('should handle missing fields', async () => {
      const response = await request(app)
        .post('/api/verify-signature')
        .send({
          message: 'Hello World'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message', 'Invalid request data')
    })
  })

  describe('GET /api/messages', () => {
    it('should return all messages', async () => {
      const response = await request(app)
        .get('/api/messages')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('GET /api/messages/address/:address', () => {
    it('should return messages for valid address', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890'
      
      const response = await request(app)
        .get(`/api/messages/address/${validAddress}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should reject invalid address format', async () => {
      const invalidAddress = 'not-an-address'
      
      const response = await request(app)
        .get(`/api/messages/address/${invalidAddress}`)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message', 'Invalid Ethereum address')
    })

    it('should handle missing address', async () => {
      const response = await request(app)
        .get('/api/messages/address/')

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/messages/:id', () => {
    it('should delete existing message', async () => {
      const createResponse = await request(app)
        .post('/api/verify-signature')
        .send({
          message: 'Test message',
          signature: '0x7b771a57b1f3a135b41f6f8b5da0d5d0b4f95c29b4de7d82b2b6f24d4b7b4f9d5a2d2c5f3b3a3f3e3d3c3b3a3938373635343332313029282726252423222120'
        })

      const messagesResponse = await request(app).get('/api/messages')
      const messageId = messagesResponse.body[0]?.id

      if (messageId) {
        const deleteResponse = await request(app)
          .delete(`/api/messages/${messageId}`)

        expect(deleteResponse.status).toBe(200)
        expect(deleteResponse.body).toHaveProperty('message', 'Message deleted successfully')
        expect(deleteResponse.body).toHaveProperty('id', messageId)
      }
    })

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .delete('/api/messages/non-existent-id')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('message', 'Message not found')
    })

    it('should validate message ID', async () => {
      const response = await request(app)
        .delete('/api/messages/invalid-id-format')

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/messages/address/:address', () => {
    it('should delete messages for valid address', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890'
      
      const response = await request(app)
        .delete(`/api/messages/address/${validAddress}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('address', validAddress)
      expect(response.body).toHaveProperty('deletedCount')
    })

    it('should reject invalid address format', async () => {
      const invalidAddress = 'not-an-address'
      
      const response = await request(app)
        .delete(`/api/messages/address/${invalidAddress}`)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message', 'Invalid Ethereum address')
    })
  })

  describe('DELETE /api/messages', () => {
    it('should delete all messages', async () => {
      const response = await request(app)
        .delete('/api/messages')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'All messages deleted successfully')
    })
  })
})