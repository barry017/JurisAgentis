/**
 * Contract Test: GET /api/documents - Document Listing
 * T007: Document listing with filters and pagination
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${API_BASE}/api/documents`;

describe('GET /api/documents - Document Listing Contract', () => {
  it('should list documents with default pagination', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('documents');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.documents)).toBe(true);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(20);
  });

  it('should filter by matter_id', async () => {
    const matterId = '123e4567-e89b-12d3-a456-426614174000';
    const response = await fetch(`${TEST_ENDPOINT}?matter_id=${matterId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    data.documents.forEach((doc: unknown) => {
      expect(doc.matter_id).toBe(matterId);
    });
  });

  it('should filter by document_type and status', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?document_type=contract&status=draft`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    data.documents.forEach((doc: unknown) => {
      expect(doc.document_type).toBe('contract');
      expect(doc.status).toBe('draft');
    });
  });

  it('should support full-text search', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?search=trust`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    data.documents.forEach((doc: unknown) => {
      const searchableText = `${doc.title} ${doc.document_type}`.toLowerCase();
      expect(searchableText).toContain('trust');
    });
  });

  it('should handle pagination parameters', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?page=2&limit=5`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(data.documents.length).toBeLessThanOrEqual(5);
  });

  it('should reject unauthorized access', async () => {
    const response = await fetch(TEST_ENDPOINT);
    expect(response.status).toBe(401);
  });

  it('should respect role-based access control', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token-client' }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Clients should only see approved/executed documents
    data.documents.forEach((doc: unknown) => {
      expect(['approved', 'executed']).toContain(doc.status);
    });
  });
});

export {};