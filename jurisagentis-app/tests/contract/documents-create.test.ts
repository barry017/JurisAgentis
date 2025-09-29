/**
 * Contract Test: POST /api/documents - Document Creation
 * 
 * This test validates the API contract for document creation endpoint.
 * Must pass before implementation begins (TDD compliance).
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Test configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${API_BASE}/api/documents`;

// Mock test data
const validDocumentData = {
  matter_id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Legal Document',
  document_type: 'contract',
  confidentiality_level: 'client_confidential',
};

const validTemplateDocumentData = {
  matter_id: '123e4567-e89b-12d3-a456-426614174000',
  template_id: '987fcdeb-51a2-43d7-9876-543210987654',
  title: 'Generated Trust Document',
  document_type: 'trust',
};

const invalidDocumentData = {
  // Missing required matter_id
  title: 'Invalid Document',
  document_type: 'contract',
};

describe('POST /api/documents - Document Creation Contract', () => {
  let createdDocumentIds: string[] = [];

  beforeEach(() => {
    // Setup for each test
    createdDocumentIds = [];
  });

  afterEach(async () => {
    // Cleanup created documents
    for (const documentId of createdDocumentIds) {
      try {
        await fetch(`${API_BASE}/api/documents/${documentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        });
      } catch (error) {
        console.warn(`Failed to cleanup document ${documentId}:`, error);
      }
    }
  });

  describe('Successful Document Creation', () => {
    it('should create a new document with valid data', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validDocumentData),
      });

      // Response status validation
      expect(response.status).toBe(201);
      expect(response.headers.get('content-type')).toContain('application/json');

      // Response body validation
      const document = await response.json();
      createdDocumentIds.push(document.id);

      // Required fields validation
      expect(document).toHaveProperty('id');
      expect(document.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      
      expect(document.matter_id).toBe(validDocumentData.matter_id);
      expect(document.title).toBe(validDocumentData.title);
      expect(document.document_type).toBe(validDocumentData.document_type);
      expect(document.confidentiality_level).toBe(validDocumentData.confidentiality_level);

      // Default field validation
      expect(document.status).toBe('draft');
      expect(document.signature_required).toBe(false);
      expect(document.created_at).toBeDefined();
      expect(document.updated_at).toBeDefined();
      expect(new Date(document.created_at)).toBeInstanceOf(Date);
      expect(new Date(document.updated_at)).toBeInstanceOf(Date);

      // Security field validation
      expect(document.attorney_client_privileged).toBe(true);
      expect(document.legal_hold).toBe(false);

      // Field absence validation (sensitive data not exposed)
      expect(document).not.toHaveProperty('file_path');
      expect(document).not.toHaveProperty('checksum');
    });

    it('should create document from template with template_id', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validTemplateDocumentData),
      });

      expect(response.status).toBe(201);
      
      const document = await response.json();
      createdDocumentIds.push(document.id);

      expect(document.template_id).toBe(validTemplateDocumentData.template_id);
      expect(document.matter_id).toBe(validTemplateDocumentData.matter_id);
      expect(document.title).toBe(validTemplateDocumentData.title);
      expect(document.document_type).toBe(validTemplateDocumentData.document_type);
    });

    it('should auto-populate title if not provided', async () => {
      const dataWithoutTitle = {
        matter_id: validDocumentData.matter_id,
        document_type: validDocumentData.document_type,
      };

      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(dataWithoutTitle),
      });

      expect(response.status).toBe(201);
      
      const document = await response.json();
      createdDocumentIds.push(document.id);

      expect(document.title).toBeDefined();
      expect(document.title).not.toBe('');
      expect(document.title).toContain(document.document_type);
    });
  });

  describe('Validation Errors', () => {
    it('should reject request with missing required fields', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidDocumentData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('matter_id');
      expect(error).toHaveProperty('details');
      expect(Array.isArray(error.details)).toBe(true);
    });

    it('should reject request with invalid matter_id format', async () => {
      const invalidMatterData = {
        ...validDocumentData,
        matter_id: 'invalid-uuid-format',
      };

      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidMatterData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('matter_id');
      expect(error.error.toLowerCase()).toContain('uuid');
    });

    it('should reject request with invalid document_type', async () => {
      const invalidTypeData = {
        ...validDocumentData,
        document_type: 'invalid_type_not_supported',
      };

      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidTypeData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('document_type');
    });

    it('should reject request with invalid confidentiality_level', async () => {
      const invalidConfidentialityData = {
        ...validDocumentData,
        confidentiality_level: 'invalid_level',
      };

      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidConfidentialityData),
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('confidentiality_level');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validDocumentData),
      });

      expect(response.status).toBe(401);
      
      const error = await response.json();
      expect(error.error).toContain('authentication');
    });

    it('should reject request with invalid token', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify(validDocumentData),
      });

      expect(response.status).toBe(401);
    });

    it('should reject request if user lacks matter access', async () => {
      const unauthorizedMatterData = {
        ...validDocumentData,
        matter_id: '000e0000-e00b-00d0-a000-000000000000', // Matter user has no access to
      };

      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-limited-access',
        },
        body: JSON.stringify(unauthorizedMatterData),
      });

      expect(response.status).toBe(403);
      
      const error = await response.json();
      expect(error.error).toContain('matter');
      expect(error.error.toLowerCase()).toContain('access');
    });
  });

  describe('Content Type Validation', () => {
    it('should reject request with invalid content type', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validDocumentData),
      });

      expect(response.status).toBe(415);
      
      const error = await response.json();
      expect(error.error).toContain('content-type');
    });

    it('should reject request with malformed JSON', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: 'invalid json {',
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error.toLowerCase()).toContain('json');
    });
  });

  describe('Rate Limiting & Performance', () => {
    it('should handle reasonable request load', async () => {
      const requests = Array.from({ length: 5 }, () =>
        fetch(TEST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            ...validDocumentData,
            title: `Load Test Document ${Math.random()}`,
          }),
        })
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Track created documents for cleanup
      const documents = await Promise.all(
        responses.map((response) => response.json())
      );
      createdDocumentIds.push(...documents.map((doc) => doc.id));
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validDocumentData),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      
      const document = await response.json();
      createdDocumentIds.push(document.id);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log entry for document creation', async () => {
      const response = await fetch(TEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validDocumentData),
      });

      expect(response.status).toBe(201);
      
      const document = await response.json();
      createdDocumentIds.push(document.id);

      // Check audit log (would need audit log endpoint in real implementation)
      // This validates that audit logging is working
      const auditResponse = await fetch(
        `${API_BASE}/api/audit/documents/${document.id}`,
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(auditResponse.status).toBe(200);
      
      const auditLogs = await auditResponse.json();
      expect(Array.isArray(auditLogs)).toBe(true);
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const creationLog = auditLogs.find(
        (log: unknown) => log.action_type === 'create'
      );
      expect(creationLog).toBeDefined();
      expect(creationLog.document_id).toBe(document.id);
    });
  });
});

export {};