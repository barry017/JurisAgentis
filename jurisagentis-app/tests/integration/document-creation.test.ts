/**
 * Integration Test: Document Creation from Template
 * T022: Scenario 1 - Complete document creation workflow
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Document Creation from Template', () => {
  let testMatterId: string;
  let testTemplateId: string;
  let createdDocumentId: string;

  beforeAll(async () => {
    // Setup test matter and template
    testMatterId = '123e4567-e89b-12d3-a456-426614174000';
    testTemplateId = '456e7890-e89b-12d3-a456-426614174001';
  });

  afterAll(async () => {
    // Cleanup created documents
    if (createdDocumentId) {
      try {
        await fetch(`${API_BASE}/api/documents/${createdDocumentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer test-token' }
        });
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  it('should complete full document creation workflow', async () => {
    // Step 1: Generate document from template
    const generateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        matter_id: testMatterId,
        title: 'Smith Family Revocable Living Trust - Draft 1',
        field_values: {
          client_name: 'John Smith',
          spouse_name: 'Jane Smith',
          trust_date: '2025-09-18',
          has_spouse: true,
          trustees: ['John Smith', 'Jane Smith', 'Mary Johnson']
        }
      })
    });

    expect(generateResponse.status).toBe(201);
    const document = await generateResponse.json();
    createdDocumentId = document.id;

    // Verify document creation
    expect(document.id).toBeDefined();
    expect(document.template_id).toBe(testTemplateId);
    expect(document.matter_id).toBe(testMatterId);
    expect(document.title).toBe('Smith Family Revocable Living Trust - Draft 1');
    expect(document.status).toBe('draft');
    expect(document.file_path).toBeDefined();
    expect(document.file_size).toBeGreaterThan(0);

    // Step 2: Verify document details
    const getResponse = await fetch(`${API_BASE}/api/documents/${document.id}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(getResponse.status).toBe(200);
    const fullDocument = await getResponse.json();
    
    expect(fullDocument.versions).toHaveLength(1);
    expect(fullDocument.versions[0].version_number).toBe(1);
    expect(fullDocument.access_permissions).toBeDefined();

    // Step 3: Verify client data population
    expect(fullDocument.auto_populated_fields).toEqual(expect.objectContaining({
      client_name: 'John Smith',
      spouse_name: 'Jane Smith'
    }));

    // Step 4: Verify audit trail
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${document.id}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const creationLog = auditLogs.find((log: unknown) => log.action_type === 'create');
    expect(creationLog).toBeDefined();
    
    const generationLog = auditLogs.find((log: unknown) => log.action_type === 'generate_from_template');
    expect(generationLog).toBeDefined();
    expect(generationLog.template_id).toBe(testTemplateId);
  });

  it('should handle template field validation during generation', async () => {
    // Test with missing required fields
    const invalidResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        matter_id: testMatterId,
        field_values: {
          client_name: 'John Smith'
          // Missing required fields
        }
      })
    });

    expect(invalidResponse.status).toBe(400);
    const error = await invalidResponse.json();
    expect(error.missing_fields).toBeDefined();
    expect(Array.isArray(error.missing_fields)).toBe(true);
  });

  it('should auto-populate client and matter data', async () => {
    const response = await fetch(`${API_BASE}/api/templates/${testTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        matter_id: testMatterId,
        field_values: {
          client_name: 'Auto Test Client',
          trust_date: '2025-09-18'
        }
      })
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    // Should have auto-populated fields from matter/client records
    expect(document.auto_populated_fields).toEqual(expect.objectContaining({
      client_address: expect.any(String) as string,
      matter_number: expect.any(String) as string,
      attorney_name: expect.any(String) as string
    }));
  });

  it('should increment template usage count', async () => {
    // Get initial usage count
    const initialTemplateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const initialTemplate = await initialTemplateResponse.json();
    const initialUsageCount = initialTemplate.usage_count;

    // Generate document
    const generateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        matter_id: testMatterId,
        field_values: {
          client_name: 'Usage Test Client',
          trust_date: '2025-09-18'
        }
      })
    });

    expect(generateResponse.status).toBe(201);

    // Verify usage count increased
    const updatedTemplateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const updatedTemplate = await updatedTemplateResponse.json();
    
    expect(updatedTemplate.usage_count).toBe(initialUsageCount + 1);
    expect(updatedTemplate.last_used_at).toBeDefined();
  });

  it('should respect matter access permissions', async () => {
    const unauthorizedMatterId = '000e0000-e00b-00d0-a000-000000000000';
    
    const response = await fetch(`${API_BASE}/api/templates/${testTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-limited'
      },
      body: JSON.stringify({
        matter_id: unauthorizedMatterId,
        field_values: {
          client_name: 'Unauthorized Test',
          trust_date: '2025-09-18'
        }
      })
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('matter access');
  });
});

export {};