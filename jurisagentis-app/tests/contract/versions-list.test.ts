/**
 * Contract Test: GET /api/documents/{id}/versions - Version History
 * T012: Document version history listing
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('GET /api/documents/{id}/versions - Version History Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}/versions`;

  it('should return version history in reverse chronological order', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const versions = await response.json();
    
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);
    
    // Verify descending order by version number
    for (let i = 1; i < versions.length; i++) {
      expect(versions[i-1].version_number).toBeGreaterThan(versions[i].version_number);
    }
    
    // Verify required fields
    versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
      expect(version).toHaveProperty('id');
      expect(version).toHaveProperty('version_number');
      expect(version).toHaveProperty('created_at');
      expect(version).toHaveProperty('created_by');
      expect(version).toHaveProperty('file_size');
      expect(version).toHaveProperty('checksum');
    });
  });

  it('should include change tracking information', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const versions = await response.json();
    
    versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
      if (version.version_number > 1) {
        expect(version.change_summary).toBeDefined();
        expect(version.change_type).toMatch(/^(minor|major|critical)$/);
      }
    });
  });

  it('should show review status for each version', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const versions = await response.json();
    
    versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
      expect(version.review_status).toMatch(/^(pending|approved|rejected)$/);
      if (version.review_status !== 'pending') {
        expect(version.reviewed_by).toBeDefined();
        expect(version.reviewed_at).toBeDefined();
      }
    });
  });

  it('should support branch filtering', async () => {
    const response = await fetch(`${testEndpoint}?branch=main`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const versions = await response.json();
    
    versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
      expect(version.branch_name).toBe('main');
    });
  });

  it('should filter sensitive data for client users', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token-client' }
    });

    if (response.status === 200) {
      const versions = await response.json();
      
      // Clients should only see approved versions
      versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
        expect(version.review_status).toBe('approved');
        expect(version).not.toHaveProperty('file_path');
        expect(version).not.toHaveProperty('diff_data');
      });
    }
  });

  it('should return 404 for non-existent document', async () => {
    const nonExistentId = '000e0000-e00b-00d0-a000-000000000000';
    
    const response = await fetch(`${API_BASE}/api/documents/${nonExistentId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(404);
  });

  it('should require read permissions', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token-no-access' }
    });

    expect(response.status).toBe(403);
  });

  it('should include file metadata without exposing paths', async () => {
    const response = await fetch(testEndpoint, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const versions = await response.json();
    
    versions.forEach((version: { id: string; version_number: number; created_at: string; created_by: string; file_size: number; checksum: string }) => {
      expect(version.file_size).toBeGreaterThan(0);
      expect(version.checksum).toBeDefined();
      
      // File paths should only be visible to authorized users
      if (version.file_path) {
        expect(version.file_path).not.toContain('absolute');
      }
    });
  });
});

export {};