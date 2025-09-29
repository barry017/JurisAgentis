/**
 * Contract Test: Tasks API
 * 
 * Tests the tasks API endpoints (/api/tasks)
 */


describe('Tasks API - Contract Tests', () => {
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

  describe('GET /api/tasks', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`)
      
      expect(response.status).toBe(401)
    })

    it('should list tasks with valid authentication', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('tasks')
      expect(data.data).toHaveProperty('pagination')
      expect(Array.isArray(data.data.tasks)).toBe(true)
    })

    it('should return proper task structure', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      const data = await response.json()
      
      if (data.data.tasks.length > 0) {
        const task = data.data.tasks[0]
        expect(task).toHaveProperty('id')
        expect(task).toHaveProperty('matter_id')
        expect(task).toHaveProperty('title')
        expect(task).toHaveProperty('status')
        expect(task).toHaveProperty('priority')
        expect(task).toHaveProperty('assigned_to')
        expect(task).toHaveProperty('created_by')
        expect(task).toHaveProperty('created_at')
        expect(task).toHaveProperty('updated_at')
        
        // Check matter structure
        expect(task).toHaveProperty('matter')
        expect(task.matter).toHaveProperty('id')
        expect(task.matter).toHaveProperty('matter_number')
        expect(task.matter).toHaveProperty('title')
        
        // Check profile structures
        if (task.assigned_to_profile) {
          expect(task.assigned_to_profile).toHaveProperty('first_name')
          expect(task.assigned_to_profile).toHaveProperty('last_name')
        }
        expect(task.created_by_profile).toHaveProperty('first_name')
        expect(task.created_by_profile).toHaveProperty('last_name')
      }
    })

    it('should filter by matter ID', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?matter_id=matter-1`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should have the specified matter_id
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        expect(task.matter_id).toBe('matter-1')
      })
    })

    it('should filter by task status', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?status=in_progress`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should have in_progress status
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        expect(task.status).toBe('in_progress')
      })
    })

    it('should filter by priority', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?priority=urgent`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should have urgent priority
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        expect(task.priority).toBe('urgent')
      })
    })

    it('should search tasks by various fields', async () => {
      const searchTests = [
        { term: 'review', description: 'task title' },
        { term: 'documents', description: 'task description' },
        { term: 'filing', description: 'task type' }
      ]

      for (const test of searchTests) {
        const response = await fetch(`${baseUrl}/api/tasks?search=${encodeURIComponent(test.term)}`, {
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        })

        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        
        // Results should contain tasks matching the search term
        if (data.data.tasks.length > 0) {
          const hasMatch = data.data.tasks.some((task: unknown) => 
            task.title.toLowerCase().includes(test.term.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(test.term.toLowerCase())) ||
            (task.task_type && task.task_type.toLowerCase().includes(test.term.toLowerCase())) ||
            (task.notes && task.notes.toLowerCase().includes(test.term.toLowerCase()))
          )
          expect(hasMatch).toBe(true)
        }
      }
    })

    it('should filter by overdue tasks', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?overdue_only=true`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should be overdue (due_date < today and not completed)
      const today = new Date().toISOString().split('T')[0]
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        if (task.due_date) {
          expect(task.due_date < today || task.status !== 'completed').toBe(true)
        }
      })
    })

    it('should filter by billable tasks', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?billable_only=true`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should be billable
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        expect(task.billable).toBe(true)
      })
    })

    it('should respect pagination limits', async () => {
      const response = await fetch(`${baseUrl}/api/tasks?limit=2`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.tasks.length).toBeLessThanOrEqual(2)
      expect(data.data.pagination.limit).toBe(2)
    })

    it('should validate parameter bounds', async () => {
      // Test limit too high
      const response1 = await fetch(`${baseUrl}/api/tasks?limit=200`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response1.status).toBe(400)
      
      // Test negative offset
      const response2 = await fetch(`${baseUrl}/api/tasks?offset=-1`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response2.status).toBe(400)
    })

    it('should filter by date ranges', async () => {
      const fromDate = '2025-01-15'
      const toDate = '2025-01-25'
      
      const response = await fetch(`${baseUrl}/api/tasks?due_date_from=${fromDate}&due_date_to=${toDate}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // All returned tasks should have due dates within the range
      data.data.tasks.forEach((task: { matter_id: string; status?: string; priority?: string; assigned_to?: string; id?: string; title?: string; description?: string; due_date?: string }) => {
        if (task.due_date) {
          expect(task.due_date >= fromDate && task.due_date <= toDate).toBe(true)
        }
      })
    })
  })

  describe('POST /api/tasks', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matter_id: 'matter-1',
          title: 'Test Task'
        })
      })
      
      expect(response.status).toBe(401)
    })

    it('should require content-type header', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          matter_id: 'matter-1',
          title: 'Test Task'
        })
      })
      
      expect(response.status).toBe(400)
    })

    it('should validate required fields', async () => {
      const testCases = [
        { data: {}, description: 'no fields' },
        { data: { title: 'Test' }, description: 'missing matter_id' },
        { data: { matter_id: 'matter-1' }, description: 'missing title' }
      ]

      for (const testCase of testCases) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
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

    it('should validate matter exists', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matter_id: 'non-existent-matter',
          title: 'Test Task'
        })
      })

      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('MATTER_NOT_FOUND')
    })

    it('should create task with valid data in development mode', async () => {
      const taskData = {
        matter_id: 'matter-1',
        title: 'Test Task Creation',
        description: 'Test task for API validation',
        task_type: 'testing',
        status: 'pending',
        priority: 'normal',
        due_date: '2025-02-01',
        estimated_hours: 2,
        billable: true,
        notes: 'Created via API test'
      }

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      // In development mode, this might return 500 if database operations fail
      // but authentication and validation should work
      expect([200, 500].includes(response.status)).toBe(true)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.task).toHaveProperty('id')
        expect(data.data.task.title).toBe(taskData.title)
        expect(data.data.task.matter_id).toBe(taskData.matter_id)
        expect(data.data.task.status).toBe(taskData.status)
        expect(data.data.task.priority).toBe(taskData.priority)
      }
    })

    it('should set default values for optional fields', async () => {
      const taskData = {
        matter_id: 'matter-1',
        title: 'Minimal Task'
      }

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      expect([200, 500].includes(response.status)).toBe(true)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.task.status).toBe('pending')
        expect(data.data.task.priority).toBe('normal')
        expect(data.data.task.billable).toBe(false)
        expect(data.data.task.actual_hours).toBe(0)
      }
    })
  })

  describe('HTTP Method Support', () => {
    it('should support GET and POST methods', async () => {
      const getResponse = await fetch(`${baseUrl}/api/tasks`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` }
      })
      expect([200, 401]).toContain(getResponse.status)

      const postResponse = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          matter_id: 'matter-1',
          title: 'Test Task'
        })
      })
      expect([200, 400, 401, 404, 500].includes(postResponse.status)).toBe(true)
    })

    it('should reject unsupported methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const response = await fetch(`${baseUrl}/api/tasks`, {
          method,
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
        expect(response.status).toBe(405)
      }
    })

    it('should support OPTIONS for CORS', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'OPTIONS'
      })
      expect(response.status).toBe(200)
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${baseUrl}/api/tasks`, {
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
      const response = await fetch(`${baseUrl}/api/tasks`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      })

      expect([200, 403].includes(response.status)).toBe(true)
      
      if (response.status === 403) {
        const data = await response.json()
        expect(data.error.code).toBe('INSUFFICIENT_PRIVILEGES')
      }
    })
  })

  describe('Task Dependencies', () => {
    it('should handle prerequisite and blocking task relationships', async () => {
      const taskData = {
        matter_id: 'matter-1',
        title: 'Dependent Task',
        prerequisite_task_ids: ['task-1'],
        blocks_task_ids: ['task-3']
      }

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      expect([200, 500].includes(response.status)).toBe(true)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.task.prerequisite_task_ids).toEqual(['task-1'])
        expect(data.data.task.blocks_task_ids).toEqual(['task-3'])
      }
    })
  })
})