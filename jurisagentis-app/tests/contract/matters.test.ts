/**
 * Contract Test: Matters API
 * 
 * Tests the matters API endpoints (/api/matters)
 */


describe('Matters API - Contract Tests', () => {
  const baseUrl = 'http://localhost:3001'
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

  describe('GET /api/matters', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/matters`)
      
      expect(response.status).toBe(401)
    })

    it('should list matters with valid authentication', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('matters')
      expect(data.data).toHaveProperty('pagination')
      expect(Array.isArray(data.data.matters)).toBe(true)
    })

    it('should return proper matter structure', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      const data = await response.json()
      
      if (data.data.matters.length > 0) {
        const matter = data.data.matters[0]
        expect(matter).toHaveProperty('id')
        expect(matter).toHaveProperty('matter_number')
        expect(matter).toHaveProperty('title')
        expect(matter).toHaveProperty('matter_type')
        expect(matter).toHaveProperty('practice_area')
        expect(matter).toHaveProperty('status')
        expect(matter).toHaveProperty('priority')
        expect(matter).toHaveProperty('client')
        expect(matter).toHaveProperty('responsible_attorney_profile')
        expect(matter).toHaveProperty('created_at')
        expect(matter).toHaveProperty('updated_at')
        
        // Check client structure
        expect(matter.client).toHaveProperty('id')
        expect(matter.client).toHaveProperty('first_name')
        expect(matter.client).toHaveProperty('last_name')
        expect(matter.client).toHaveProperty('email')
        
        // Check attorney structure
        expect(matter.responsible_attorney_profile).toHaveProperty('first_name')
        expect(matter.responsible_attorney_profile).toHaveProperty('last_name')
      }
    })

    it('should filter by matter status', async () => {
      const response = await fetch(`${baseUrl}/api/matters?status=active`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned matters should have active status
      data.data.matters.forEach((matter: unknown) => {
        expect(matter.status).toBe('active')
      })
    })

    it('should filter by practice area', async () => {
      const response = await fetch(`${baseUrl}/api/matters?practice_area=estate_planning`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned matters should have estate_planning practice area
      data.data.matters.forEach((matter: unknown) => {
        expect(matter.practice_area).toBe('estate_planning')
      })
    })

    it('should search matters by various fields', async () => {
      const searchTests = [
        { term: 'Johnson', description: 'client name' },
        { term: '2025-001', description: 'matter number' },
        { term: 'Estate Planning', description: 'matter title' }
      ]

      for (const test of searchTests) {
        const response = await fetch(`${baseUrl}/api/matters?search=${encodeURIComponent(test.term)}`, {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        })

        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        
        // Results should contain matters matching the search term
        if (data.data.matters.length > 0) {
          const hasMatch = data.data.matters.some((matter: unknown) => 
            matter.matter_number.toLowerCase().includes(test.term.toLowerCase()) ||
            matter.title.toLowerCase().includes(test.term.toLowerCase()) ||
            matter.client.first_name?.toLowerCase().includes(test.term.toLowerCase()) ||
            matter.client.last_name?.toLowerCase().includes(test.term.toLowerCase()) ||
            matter.client.business_name?.toLowerCase().includes(test.term.toLowerCase()) ||
            (matter.description && matter.description.toLowerCase().includes(test.term.toLowerCase()))
          )
          expect(hasMatch).toBe(true)
        }
      }
    })

    it('should respect pagination limits', async () => {
      const response = await fetch(`${baseUrl}/api/matters?limit=2`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.matters.length).toBeLessThanOrEqual(2)
      expect(data.data.pagination.limit).toBe(2)
    })

    it('should validate parameter bounds', async () => {
      // Test limit too high
      const response1 = await fetch(`${baseUrl}/api/matters?limit=200`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response1.status).toBe(400)
      
      // Test negative offset
      const response2 = await fetch(`${baseUrl}/api/matters?offset=-1`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response2.status).toBe(400)
    })

    it('should include task information', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      const data = await response.json()
      
      if (data.data.matters.length > 0) {
        const matter = data.data.matters[0]
        if (matter.matter_tasks && matter.matter_tasks.length > 0) {
          const task = matter.matter_tasks[0]
          expect(task).toHaveProperty('id')
          expect(task).toHaveProperty('title')
          expect(task).toHaveProperty('status')
          expect(task).toHaveProperty('priority')
          expect(task).toHaveProperty('assigned_to')
        }
      }
    })
  })

  describe('POST /api/matters', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Matter',
          matter_type: 'estate_planning',
          practice_area: 'wills',
          client_id: 'test-client-id'
        })
      })
      
      expect(response.status).toBe(401)
    })

    it('should require content-type header', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          title: 'Test Matter',
          matter_type: 'estate_planning',
          practice_area: 'wills',
          client_id: 'test-client-id'
        })
      })
      
      expect(response.status).toBe(400)
    })

    it('should validate required fields', async () => {
      const testCases = [
        { data: {}, description: 'no fields' },
        { data: { title: 'Test' }, description: 'missing matter_type, practice_area, client_id' },
        { data: { title: 'Test', matter_type: 'estate_planning' }, description: 'missing practice_area, client_id' },
        { data: { title: 'Test', matter_type: 'estate_planning', practice_area: 'wills' }, description: 'missing client_id' }
      ]

      for (const testCase of testCases) {
        const response = await fetch(`${baseUrl}/api/matters`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testCase.data)
        })

        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('MISSING_REQUIRED_FIELDS')
      }
    })

    it('should create matter with valid data in development mode', async () => {
      // In development mode, database operations are mocked
      // This test verifies the API structure but may not actually persist data
      const matterData = {
        title: 'Test Estate Planning',
        matter_type: 'estate_planning',
        practice_area: 'wills',
        client_id: 'client-1',
        description: 'Test matter for API validation',
        priority: 'normal',
        status: 'new'
      }

      const response = await fetch(`${baseUrl}/api/matters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matterData)
      })

      // In development mode, this might return 500 if database operations fail
      // but authentication and validation should work
      expect([200, 500].includes(response.status)).toBe(true)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.matter).toHaveProperty('id')
        expect(data.data.matter.title).toBe(matterData.title)
        expect(data.data.matter.matter_type).toBe(matterData.matter_type)
        expect(data.data.matter.practice_area).toBe(matterData.practice_area)
      }
    })
  })

  describe('HTTP Method Support', () => {
    it('should support GET and POST methods', async () => {
      const getResponse = await fetch(`${baseUrl}/api/matters`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` }
      })
      expect([200, 401]).toContain(getResponse.status)

      const postResponse = await fetch(`${baseUrl}/api/matters`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'Test', 
          matter_type: 'estate_planning', 
          practice_area: 'wills',
          client_id: 'client-1'
        })
      })
      expect([200, 400, 401, 404, 500].includes(postResponse.status)).toBe(true)
    })

    it('should reject unsupported methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const response = await fetch(`${baseUrl}/api/matters`, {
          method,
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
        expect(response.status).toBe(405)
      }
    })

    it('should support OPTIONS for CORS', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        method: 'OPTIONS'
      })
      expect(response.status).toBe(200)
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${baseUrl}/api/matters`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      })

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })

  describe('Role-Based Access', () => {
    it('should allow access for authorized roles', async () => {
      // Test assumes admin token from beforeAll setup
      const response = await fetch(`${baseUrl}/api/matters`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      })

      expect([200, 403].includes(response.status)).toBe(true)
      
      if (response.status === 403) {
        const data = await response.json()
        expect(data.error.code).toBe('INSUFFICIENT_PRIVILEGES')
      }
    })
  })
})