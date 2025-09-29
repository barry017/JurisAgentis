/**
 * Mock API Service for Demo Mode
 * 
 * Provides mock data and responses when the application is running in demo mode
 * without a backend connection.
 */

export interface MockMatter {
  id: string
  title: string
  client_name: string
  matter_type: string
  status: string
  priority: string
  assigned_attorney: string
  created_at: string
  updated_at: string
  description?: string
}

export interface MockDocument {
  id: string
  title: string
  type: string
  status: string
  created_at: string
  updated_at: string
  created_by: string
  matter_id?: string
  client_id?: string
}

export interface MockCase {
  id: string
  title: string
  case_number: string
  client_name: string
  status: string
  priority: string
  assigned_attorney: string
  created_at: string
  updated_at: string
}

export class MockAPIService {
  private static instance: MockAPIService
  
  // Mock data
  private matters: MockMatter[] = [
    {
      id: 'matter-1',
      title: 'Corporate Merger Documentation',
      client_name: 'TechCorp Industries',
      matter_type: 'Corporate Law',
      status: 'active',
      priority: 'high',
      assigned_attorney: 'Demo User',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z',
      description: 'Handling documentation for corporate merger between TechCorp and InnovateCo'
    },
    {
      id: 'matter-2', 
      title: 'Employment Contract Review',
      client_name: 'StartupXYZ',
      matter_type: 'Employment Law',
      status: 'active',
      priority: 'medium',
      assigned_attorney: 'Demo User',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-18T16:00:00Z',
      description: 'Review and revision of employment contracts for new hires'
    },
    {
      id: 'matter-3',
      title: 'IP Licensing Agreement',
      client_name: 'Creative Solutions LLC',
      matter_type: 'Intellectual Property',
      status: 'review',
      priority: 'high',
      assigned_attorney: 'Demo User',
      created_at: '2024-01-08T11:00:00Z',
      updated_at: '2024-01-19T13:45:00Z',
      description: 'Drafting licensing agreement for proprietary software'
    }
  ]

  private documents: MockDocument[] = [
    {
      id: 'doc-1',
      title: 'Merger Agreement Draft v3.2',
      type: 'Contract',
      status: 'draft',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z',
      created_by: 'Demo User',
      matter_id: 'matter-1'
    },
    {
      id: 'doc-2',
      title: 'Due Diligence Checklist',
      type: 'Checklist',
      status: 'approved',
      created_at: '2024-01-18T09:00:00Z',
      updated_at: '2024-01-19T16:00:00Z',
      created_by: 'Demo User',
      matter_id: 'matter-1'
    },
    {
      id: 'doc-3',
      title: 'Employment Contract Template',
      type: 'Template',
      status: 'approved',
      created_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-17T13:45:00Z',
      created_by: 'Demo User',
      matter_id: 'matter-2'
    }
  ]

  private cases: MockCase[] = [
    {
      id: 'case-1',
      title: 'Smith vs. Johnson Construction',
      case_number: 'CV-2024-001',
      client_name: 'John Smith',
      status: 'active',
      priority: 'high',
      assigned_attorney: 'Demo User',
      created_at: '2024-01-12T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z'
    },
    {
      id: 'case-2',
      title: 'Property Dispute - Riverside Development',
      case_number: 'CV-2024-002',
      client_name: 'Riverside Properties',
      status: 'discovery',
      priority: 'medium',
      assigned_attorney: 'Demo User',
      created_at: '2024-01-05T09:00:00Z',
      updated_at: '2024-01-18T16:00:00Z'
    }
  ]

  public static getInstance(): MockAPIService {
    if (!MockAPIService.instance) {
      MockAPIService.instance = new MockAPIService()
    }
    return MockAPIService.instance
  }

  // Check if we should use mock data (demo mode)
  public static shouldUseMockData(): boolean {
    return process.env.NODE_ENV === 'development' || 
           typeof window !== 'undefined' && window.location.hostname === 'localhost'
  }

  // Simulate API delay
  private async simulateDelay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Mock API endpoints
  async getMatters(params?: URLSearchParams): Promise<{ matters: MockMatter[], total: number }> {
    await this.simulateDelay()
    
    let filteredMatters = [...this.matters]
    
    if (params) {
      const search = params.get('search')
      const status = params.get('status')
      
      if (search) {
        filteredMatters = filteredMatters.filter(matter => 
          matter.title.toLowerCase().includes(search.toLowerCase()) ||
          matter.client_name.toLowerCase().includes(search.toLowerCase())
        )
      }
      
      if (status && status !== 'all') {
        filteredMatters = filteredMatters.filter(matter => matter.status === status)
      }
    }
    
    return {
      matters: filteredMatters,
      total: filteredMatters.length
    }
  }

  async getDocuments(params?: URLSearchParams): Promise<{ documents: MockDocument[], total: number }> {
    await this.simulateDelay()
    
    let filteredDocs = [...this.documents]
    
    if (params) {
      const search = params.get('search')
      const type = params.get('type')
      const matterId = params.get('matter_id')
      
      if (search) {
        filteredDocs = filteredDocs.filter(doc => 
          doc.title.toLowerCase().includes(search.toLowerCase())
        )
      }
      
      if (type && type !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.type === type)
      }
      
      if (matterId) {
        filteredDocs = filteredDocs.filter(doc => doc.matter_id === matterId)
      }
    }
    
    return {
      documents: filteredDocs,
      total: filteredDocs.length
    }
  }

  async getCases(params?: URLSearchParams): Promise<{ cases: MockCase[], total: number }> {
    await this.simulateDelay()
    
    let filteredCases = [...this.cases]
    
    if (params) {
      const search = params.get('search')
      const status = params.get('status')
      
      if (search) {
        filteredCases = filteredCases.filter(caseItem => 
          caseItem.title.toLowerCase().includes(search.toLowerCase()) ||
          caseItem.case_number.toLowerCase().includes(search.toLowerCase()) ||
          caseItem.client_name.toLowerCase().includes(search.toLowerCase())
        )
      }
      
      if (status && status !== 'all') {
        filteredCases = filteredCases.filter(caseItem => caseItem.status === status)
      }
    }
    
    return {
      cases: filteredCases,
      total: filteredCases.length
    }
  }

  // Create standardized mock response
  public createMockResponse(data: unknown, message: string = 'Success'): Response {
    return new Response(JSON.stringify({
      success: true,
      message,
      data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Create mock error response
  public createMockErrorResponse(message: string, status: number = 400): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        message,
        code: 'MOCK_ERROR'
      }
    }), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

// Export singleton instance
export const mockAPI = MockAPIService.getInstance()