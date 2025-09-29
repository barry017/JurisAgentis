/**
 * Contract Test: GET /api/documents/{id} - Document Details
 * T008: Document detail retrieval with access control
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('GET /api/documents/{id} - Document Details Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}`;

  it('should return document details with full data', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const document = await response.json();
    
    // Core document fields
    expect(document).toHaveProperty('id', testDocumentId);
    expect(document).toHaveProperty('title');
    expect(document).toHaveProperty('document_type');
    expect(document).toHaveProperty('status');
    expect(document).toHaveProperty('matter_id');
    expect(document).toHaveProperty('confidentiality_level');
    
    // Timestamps
    expect(document).toHaveProperty('created_at');
    expect(document).toHaveProperty('updated_at');
    
    // Nested data
    expect(document).toHaveProperty('versions');
    expect(document).toHaveProperty('access_permissions');
    expect(Array.isArray(document.versions)).toBe(true);
    expect(Array.isArray(document.access_permissions)).toBe(true);
  });

  it('should include signature request if exists', async () => {
    const docWithSignature = '456e7890-e89b-12d3-a456-426614174001';
    const response = await fetch(`${API_BASE}/api/documents/${docWithSignature}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const document = await response.json();
    
    if (document.signature_required) {
      expect(document).toHaveProperty('signature_request');
      expect(document.signature_request).toHaveProperty('status');
      expect(document.signature_request).toHaveProperty('signers');
    }
  });

  it('should return 404 for non-existent document', async () => {
    const nonExistentId = '000e0000-e00b-00d0-a000-000000000000';
    const response = await fetch(`${API_BASE}/api/documents/${nonExistentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(404);
    const error = await response.json();
    expect(error.error).toContain('not found');
  });

  it('should return 403 for unauthorized document access', async () => {
    const restrictedDocId = '999e9999-e99b-99d9-a999-999999999999';
    const response = await fetch(`${API_BASE}/api/documents/${restrictedDocId}`, {
      headers: { 'Authorization': 'Bearer test-token-limited' }
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('access');
  });

  it('should validate UUID format', async () => {
    const invalidId = 'invalid-uuid-format';
    const response = await fetch(`${API_BASE}/api/documents/${invalidId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('invalid');
  });

  it('should require authentication', async () => {
    const response = await fetch(testEndpoint);
    expect(response.status).toBe(401);
  });

  it('should filter sensitive data for client users', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token-client' }
    });

    if (response.status === 200) {
      const document = await response.json();
      
      // Clients shouldn't see draft versions or internal comments
      if (document.versions) {
        document.versions.forEach((version: unknown) => {
          expect(version.review_status).not.toBe('pending');
        });
      }
      
      // Clients shouldn't see full access permissions
      expect(document.access_permissions).toBeUndefined();
    }
  });

  it('should include audit trail for authorized users', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(response.status).toBe(200);
    const document = await response.json();
    
    // Attorneys should see access logs
    expect(document).toHaveProperty('access_logs');
    if (document.access_logs) {
      expect(Array.isArray(document.access_logs)).toBe(true);
    }
  });
});

export {};