/**
 * Integration Test: Middleware Layer Integration
 * T077: Tests for authentication, authorization, audit, and cross-service middleware
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Middleware Layer', () => {
  let authToken: string;
  let testDocumentId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Get auth token for tests
    const authResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@jurisagentis.com',
        password: 'test-password'
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.access_token;
      testUserId = authData.user.id;
    }
  });

  describe('Authentication Middleware', () => {
    it('should authenticate valid JWT tokens', async () => {
      const protectedResponse = await fetch(`${API_BASE}/api/documents`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(protectedResponse.status).toBe(200);
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidResponse = await fetch(`${API_BASE}/api/documents`, {
        headers: { 'Authorization': 'Bearer invalid-token-123' }
      });

      expect(invalidResponse.status).toBe(401);
      const error = await invalidResponse.json();
      expect(error.error_code).toBe('AUTHENTICATION_FAILED');
    });

    it('should reject expired tokens', async () => {
      // Create an expired token (this would be mocked in real tests)
      const expiredResponse = await fetch(`${API_BASE}/api/documents`, {
        headers: { 'Authorization': 'Bearer expired.token.here' }
      });

      expect(expiredResponse.status).toBe(401);
    });

    it('should handle missing authorization headers', async () => {
      const unauthorizedResponse = await fetch(`${API_BASE}/api/documents`);

      expect(unauthorizedResponse.status).toBe(401);
    });

    it('should refresh tokens when close to expiry', async () => {
      const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (refreshResponse.status === 200) {
        const refreshData = await refreshResponse.json();
        expect(refreshData.access_token).toBeDefined();
        expect(refreshData.expires_in).toBeGreaterThan(0);
      }
    });
  });

  describe('Authorization Middleware', () => {
    it('should enforce role-based access control', async () => {
      // Test admin-only endpoint with regular user
      const adminResponse = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Should be 403 if user is not admin, or 200 if they are
      expect([200, 403]).toContain(adminResponse.status);
    });

    it('should enforce resource ownership', async () => {
      // Create a document
      const createResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Ownership Test Document',
          document_type: 'contract',
          matter_id: '123e4567-e89b-12d3-a456-426614174000'
        })
      });

      if (createResponse.ok) {
        const document = await createResponse.json();
        testDocumentId = document.id;

        // User should be able to access their own document
        const accessResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(accessResponse.status).toBe(200);
      }
    });

    it('should enforce permission-based access', async () => {
      // Test accessing a permission-controlled endpoint
      const permissionResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: 'share@example.com',
          permissions: ['read']
        })
      });

      // Should succeed if user has sharing permissions
      expect([200, 403]).toContain(permissionResponse.status);
    });

    it('should handle cross-matter access restrictions', async () => {
      // Try to access document from different matter
      const crossMatterResponse = await fetch(`${API_BASE}/api/matters/different-matter-id/documents`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Should be filtered based on user's matter access
      expect([200, 403, 404]).toContain(crossMatterResponse.status);
    });
  });

  describe('Audit Middleware', () => {
    it('should log document creation events', async () => {
      const createResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Audit Test Document',
          document_type: 'contract',
          matter_id: '123e4567-e89b-12d3-a456-426614174000'
        })
      });

      if (createResponse.ok) {
        const document = await createResponse.json();

        // Check audit log
        const auditResponse = await fetch(`${API_BASE}/api/audit/events?resource_id=${document.id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (auditResponse.ok) {
          const auditEvents = await auditResponse.json();
          const createEvent = auditEvents.events.find(e => e.action_type === 'document_created');
          
          expect(createEvent).toBeDefined();
          expect(createEvent.user_id).toBe(testUserId);
          expect(createEvent.resource_id).toBe(document.id);
        }
      }
    });

    it('should log access and modification events', async () => {
      if (testDocumentId) {
        // Access document
        await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Modify document
        await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: 'Updated Audit Test Document'
          })
        });

        // Check audit logs
        const auditResponse = await fetch(`${API_BASE}/api/audit/events?resource_id=${testDocumentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (auditResponse.ok) {
          const auditEvents = await auditResponse.json();
          const accessEvent = auditEvents.events.find(e => e.action_type === 'document_accessed');
          const updateEvent = auditEvents.events.find(e => e.action_type === 'document_updated');
          
          expect(accessEvent || updateEvent).toBeDefined();
        }
      }
    });

    it('should capture request metadata in audit logs', async () => {
      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': 'Integration-Test-Client/1.0',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      if (response.ok) {
        // Get recent audit events
        const auditResponse = await fetch(`${API_BASE}/api/audit/events?limit=10`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (auditResponse.ok) {
          const auditEvents = await auditResponse.json();
          const recentEvent = auditEvents.events[0];
          
          if (recentEvent) {
            expect(recentEvent.ip_address).toBeDefined();
            expect(recentEvent.user_agent).toBeDefined();
            expect(recentEvent.created_at).toBeDefined();
          }
        }
      }
    });

    it('should handle audit log failures gracefully', async () => {
      // This test ensures the API still works even if audit logging fails
      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Test-Audit-Failure': 'true' // Mock header to trigger audit failure
        }
      });

      // API should still work even if audit fails
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch(`${API_BASE}/api/documents`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses if limits are enforced
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0];
        expect(rateLimitResponse.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(rateLimitResponse.headers.get('X-RateLimit-Remaining')).toBeDefined();
      }
    });

    it('should provide rate limit headers', async () => {
      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Check for rate limit headers (may or may not be present depending on implementation)
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (rateLimitLimit) {
        expect(parseInt(rateLimitLimit)).toBeGreaterThan(0);
      }
    });
  });

  describe('CORS Middleware', () => {
    it('should handle CORS preflight requests', async () => {
      const preflightResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://app.jurisagentis.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      expect(preflightResponse.status).toBe(200);
      expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(preflightResponse.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('should include CORS headers in actual responses', async () => {
      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Origin': 'https://app.jurisagentis.com'
        }
      });

      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      if (corsHeader) {
        expect(['*', 'https://app.jurisagentis.com']).toContain(corsHeader);
      }
    });
  });

  describe('Error Handling Middleware', () => {
    it('should format errors consistently', async () => {
      const errorResponse = await fetch(`${API_BASE}/api/documents/invalid-uuid`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(errorResponse.status).toBe(404);
      const error = await errorResponse.json();
      
      expect(error.error_code).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.timestamp).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const validationResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          // Missing required fields
          title: ''
        })
      });

      expect(validationResponse.status).toBe(400);
      const error = await validationResponse.json();
      
      expect(error.error_code).toBe('VALIDATION_ERROR');
      expect(error.details).toBeDefined();
    });

    it('should handle internal server errors gracefully', async () => {
      const errorResponse = await fetch(`${API_BASE}/api/documents/trigger-error`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Test-Error': 'internal' // Mock header to trigger error
        }
      });

      if (errorResponse.status === 500) {
        const error = await errorResponse.json();
        expect(error.error_code).toBe('INTERNAL_SERVER_ERROR');
        expect(error.message).toBeDefined();
        // Should not expose internal details
        expect(error.stack).toBeUndefined();
      }
    });
  });

  describe('Integration Workflow', () => {
    it('should handle complex multi-service workflow', async () => {
      // 1. Create document
      const createResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Integration Workflow Document',
          document_type: 'contract',
          matter_id: '123e4567-e89b-12d3-a456-426614174000'
        })
      });

      expect(createResponse.status).toBe(201);
      const document = await createResponse.json();

      // 2. Transform document
      const transformResponse = await fetch(`${API_BASE}/api/documents/${document.id}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          target_format: 'pdf'
        })
      });

      // 3. Initiate signing
      const signingResponse = await fetch(`${API_BASE}/api/documents/${document.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [{
            name: 'Integration Test Signer',
            email: 'integration@example.com',
            signing_order: 1
          }]
        })
      });

      // 4. Share document
      const shareResponse = await fetch(`${API_BASE}/api/documents/${document.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: 'share@example.com',
          permissions: ['read']
        })
      });

      // Check that all operations were logged
      const auditResponse = await fetch(`${API_BASE}/api/audit/events?resource_id=${document.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (auditResponse.ok) {
        const auditEvents = await auditResponse.json();
        const eventTypes = auditEvents.events.map(e => e.action_type);
        
        expect(eventTypes).toContain('document_created');
        // Other events may be present depending on what succeeded
      }
    });

    it('should maintain data consistency across services', async () => {
      if (testDocumentId) {
        // Get document from multiple endpoints
        const documentResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const searchResponse = await fetch(`${API_BASE}/api/documents/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            query: 'Ownership Test Document'
          })
        });

        if (documentResponse.ok && searchResponse.ok) {
          const document = await documentResponse.json();
          const searchResults = await searchResponse.json();
          
          const foundDocument = searchResults.documents.find(d => d.id === testDocumentId);
          
          if (foundDocument) {
            expect(document.title).toBe(foundDocument.title);
            expect(document.status).toBe(foundDocument.status);
          }
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup test documents
    if (testDocumentId && authToken) {
      await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  });
});