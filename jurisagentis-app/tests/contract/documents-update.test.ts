/**
 * Contract Test: PUT /api/documents/{id} - Document Update
 * T009: Document metadata update endpoint
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('PUT /api/documents/{id} - Document Update Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}`;

  const validUpdateData = {
    title: 'Updated Legal Document Title',
    status: 'review',
    confidentiality_level: 'attorney_client_privileged'
  };

  it('should update document metadata successfully', async () => {
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validUpdateData)
    });

    expect(response.status).toBe(200);
    const document = await response.json();
    
    expect(document.id).toBe(testDocumentId);
    expect(document.title).toBe(validUpdateData.title);
    expect(document.status).toBe(validUpdateData.status);
    expect(document.confidentiality_level).toBe(validUpdateData.confidentiality_level);
    expect(document.updated_at).toBeDefined();
    
    // Ensure updated_at is recent
    const updatedTime = new Date(document.updated_at);
    const now = new Date();
    expect(now.getTime() - updatedTime.getTime()).toBeLessThan(5000);
  });

  it('should allow partial updates', async () => {
    const partialUpdate = { title: 'Only Title Updated' };
    
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(partialUpdate)
    });

    expect(response.status).toBe(200);
    const document = await response.json();
    
    expect(document.title).toBe(partialUpdate.title);
    // Other fields should remain unchanged
    expect(document.status).toBeDefined();
    expect(document.confidentiality_level).toBeDefined();
  });

  it('should validate status transitions', async () => {
    // Attempt invalid status transition (e.g., executed -> draft)
    const invalidTransition = { status: 'draft' };
    
    const response = await fetch(`${API_BASE}/api/documents/executed-doc-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidTransition)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('status transition');
  });

  it('should reject invalid status values', async () => {
    const invalidStatus = { status: 'invalid_status' };
    
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidStatus)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('status');
  });

  it('should reject invalid confidentiality levels', async () => {
    const invalidConfidentiality = { confidentiality_level: 'invalid_level' };
    
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidConfidentiality)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('confidentiality_level');
  });

  it('should return 404 for non-existent document', async () => {
    const nonExistentId = '000e0000-e00b-00d0-a000-000000000000';
    
    const response = await fetch(`${API_BASE}/api/documents/${nonExistentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validUpdateData)
    });

    expect(response.status).toBe(404);
  });

  it('should require edit permissions', async () => {
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-view-only'
      },
      body: JSON.stringify(validUpdateData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('permission');
  });

  it('should prevent updates to executed documents', async () => {
    const executedDocId = 'executed-doc-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${executedDocId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ title: 'Should not update' })
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('executed');
  });

  it('should prevent updates to documents on legal hold', async () => {
    const legalHoldDocId = 'legal-hold-doc-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${legalHoldDocId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ title: 'Should not update' })
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('legal hold');
  });

  it('should create audit log for update', async () => {
    const response = await fetch(testEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ title: 'Audit Test Update' })
    });

    expect(response.status).toBe(200);
    
    // Verify audit log creation
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const updateLog = auditLogs.find((log: unknown) => 
      log.action_type === 'update' && 
      log.new_values?.title === 'Audit Test Update'
    );
    expect(updateLog).toBeDefined();
  });
});

export {};