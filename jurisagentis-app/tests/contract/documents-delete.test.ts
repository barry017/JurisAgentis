/**
 * Contract Test: DELETE /api/documents/{id} - Document Archive
 * T010: Document archiving (soft delete) endpoint
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('DELETE /api/documents/{id} - Document Archive Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}`;

  it('should archive document successfully (soft delete)', async () => {
    const response = await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('content-length')).toBe('0');
    
    // Verify document is archived, not deleted
    const getResponse = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(getResponse.status).toBe(200);
    const document = await getResponse.json();
    expect(document.archived_at).toBeDefined();
    expect(new Date(document.archived_at)).toBeInstanceOf(Date);
  });

  it('should remove document from default listings', async () => {
    // Archive the document
    await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    // Check that it doesn't appear in default document list
    const listResponse = await fetch(`${API_BASE}/api/documents`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(listResponse.status).toBe(200);
    const { documents } = await listResponse.json();
    
    const archivedDoc = documents.find((doc: unknown) => doc.id === testDocumentId);
    expect(archivedDoc).toBeUndefined();
  });

  it('should include archived documents when explicitly requested', async () => {
    // Archive the document
    await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    // Check that it appears when include_archived=true
    const listResponse = await fetch(`${API_BASE}/api/documents?include_archived=true`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(listResponse.status).toBe(200);
    const { documents } = await listResponse.json();
    
    const archivedDoc = documents.find((doc: unknown) => doc.id === testDocumentId);
    expect(archivedDoc).toBeDefined();
    expect(archivedDoc.archived_at).toBeDefined();
  });

  it('should return 404 for non-existent document', async () => {
    const nonExistentId = '000e0000-e00b-00d0-a000-000000000000';
    
    const response = await fetch(`${API_BASE}/api/documents/${nonExistentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(404);
  });

  it('should require delete permissions', async () => {
    const response = await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token-view-only' }
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('permission');
  });

  it('should prevent deletion of executed documents', async () => {
    const executedDocId = 'executed-doc-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${executedDocId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('executed');
  });

  it('should prevent deletion of documents on legal hold', async () => {
    const legalHoldDocId = 'legal-hold-doc-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${legalHoldDocId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('legal hold');
  });

  it('should prevent deletion of documents with active signatures', async () => {
    const activeSignatureDocId = 'active-signature-doc-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${activeSignatureDocId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('signature');
  });

  it('should require authentication', async () => {
    const response = await fetch(testEndpoint, {
      method: 'DELETE'
    });

    expect(response.status).toBe(401);
  });

  it('should validate UUID format', async () => {
    const invalidId = 'invalid-uuid-format';
    
    const response = await fetch(`${API_BASE}/api/documents/${invalidId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('invalid');
  });

  it('should handle double deletion gracefully', async () => {
    // First deletion
    const firstResponse = await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    expect(firstResponse.status).toBe(204);
    
    // Second deletion of same document
    const secondResponse = await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    // Should be idempotent (still success)
    expect(secondResponse.status).toBe(204);
  });

  it('should create audit log for deletion', async () => {
    const response = await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(204);
    
    // Verify audit log creation
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const deleteLog = auditLogs.find((log: unknown) => log.action_type === 'archive');
    expect(deleteLog).toBeDefined();
    expect(deleteLog.document_id).toBe(testDocumentId);
  });

  it('should preserve document relationships when archived', async () => {
    // Archive document
    await fetch(testEndpoint, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    // Verify versions are still accessible
    const versionsResponse = await fetch(`${testEndpoint}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(versionsResponse.status).toBe(200);
    const versions = await versionsResponse.json();
    expect(Array.isArray(versions)).toBe(true);
  });
});

export {};