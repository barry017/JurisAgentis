/**
 * Contract Test: Clients API
 * 
 * Tests the clients API endpoints (/api/clients)
 */

import { NextRequest } from 'next/server'

describe('Clients API - Contract Tests', () => {
  const baseUrl = 'http://localhost:3000'
  let validToken: string

  beforeAll(async () => {
    // Get a valid auth token for testing
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@jurisagentis.com',
        password: 'testpass'
      }),
    })

    if (response.ok) {
      const data = await response.json()
      validToken = data.token
    } else {
      validToken = 'mock-token-test'
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/clients', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/clients`)
      
      expect(response.status).toBe(401)
    })

    it('should list clients with valid authentication', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('clients')
      expect(data.data).toHaveProperty('pagination')
      expect(Array.isArray(data.data.clients)).toBe(true)
    })

    it('should return proper client structure', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      const data = await response.json()
      
      if (data.data.clients.length > 0) {
        const client = data.data.clients[0]
        expect(client).toHaveProperty('id')
        expect(client).toHaveProperty('first_name')
        expect(client).toHaveProperty('last_name')
        expect(client).toHaveProperty('email')
        expect(client).toHaveProperty('client_status')
        expect(client).toHaveProperty('client_type')
        expect(client).toHaveProperty('created_at')
        expect(client).toHaveProperty('updated_at')
      }
    })

    it('should filter by client status', async () => {
      const response = await fetch(`${baseUrl}/api/clients?status=active`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned clients should have active status
      data.data.clients.forEach((client: any) => {
        expect(client.client_status).toBe('active')
      })
    })

    it('should filter by client type', async () => {
      const response = await fetch(`${baseUrl}/api/clients?type=business`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned clients should have business type
      data.data.clients.forEach((client: any) => {
        expect(client.client_type).toBe('business')
      })
    })

    it('should search clients by name', async () => {
      const response = await fetch(`${baseUrl}/api/clients?search=John`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Results should contain clients matching the search term
      if (data.data.clients.length > 0) {
        const hasMatch = data.data.clients.some((client: any) => 
          client.first_name.toLowerCase().includes('john') ||
          client.last_name.toLowerCase().includes('john') ||
          (client.preferred_name && client.preferred_name.toLowerCase().includes('john'))
        )
        expect(hasMatch).toBe(true)
      }
    })

    it('should respect pagination limits', async () => {
      const response = await fetch(`${baseUrl}/api/clients?limit=2`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.clients.length).toBeLessThanOrEqual(2)
      expect(data.data.pagination.limit).toBe(2)
    })

    it('should validate limit parameter bounds', async () => {
      // Test limit too high
      const response1 = await fetch(`${baseUrl}/api/clients?limit=200`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response1.status).toBe(400)
      
      // Test negative offset
      const response2 = await fetch(`${baseUrl}/api/clients?offset=-1`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response2.status).toBe(400)
    })
  })

  describe('POST /api/clients', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User'
        })
      })
      
      expect(response.status).toBe(401)
    })

    it('should require content-type header', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User'
        })
      })
      
      expect(response.status).toBe(400)
    })

    it('should create client with valid data', async () => {
      const clientData = {
        first_name: 'Test',
        last_name: 'Client',
        email: `test-${Date.now()}@example.com`,
        client_type: 'individual',
        client_status: 'prospect'
      }

      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.client).toHaveProperty('id')
      expect(data.data.client.first_name).toBe(clientData.first_name)
      expect(data.data.client.last_name).toBe(clientData.last_name)
      expect(data.data.client.email).toBe(clientData.email)
    })

    it('should require first_name and last_name', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'incomplete@example.com'
        })
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('MISSING_REQUIRED_FIELDS')
    })

    it('should validate email format', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: 'invalid-email'
        })
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_EMAIL_FORMAT')
    })

    it('should validate client_status enum', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          client_status: 'invalid_status'
        })
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_CLIENT_STATUS')
    })

    it('should validate client_type enum', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          client_type: 'invalid_type'
        })
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_CLIENT_TYPE')
    })
  })

  describe('HTTP Method Support', () => {
    it('should support GET and POST methods', async () => {
      const getResponse = await fetch(`${baseUrl}/api/clients`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` }
      })
      expect([200, 401]).toContain(getResponse.status)

      const postResponse = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
      })
      expect([200, 400, 401]).toContain(postResponse.status)
    })

    it('should reject unsupported methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const response = await fetch(`${baseUrl}/api/clients`, {
          method,
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
        expect(response.status).toBe(405)
      }
    })

    it('should support OPTIONS for CORS', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        method: 'OPTIONS'
      })
      expect(response.status).toBe(200)
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${baseUrl}/api/clients`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      })

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })
})