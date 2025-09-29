/**
 * Contract Test: POST /api/documents/{id}/versions - Version Creation
 * T011: Document version creation with file upload
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('POST /api/documents/{id}/versions - Version Creation Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}/versions`;

  it('should create new version with file upload', async () => {
    const formData = new FormData();
    const testFile = new Blob(['Updated document content'], { type: 'application/pdf' });
    formData.append('file', testFile, 'updated-document.pdf');
    formData.append('change_summary', 'Added client amendments');
    formData.append('change_type', 'major');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(201);
    const version = await response.json();
    
    expect(version).toHaveProperty('id');
    expect(version.document_id).toBe(testDocumentId);
    expect(version.version_number).toBeGreaterThan(0);
    expect(version.change_summary).toBe('Added client amendments');
    expect(version.change_type).toBe('major');
    expect(version.file_path).toBeDefined();
    expect(version.file_size).toBeGreaterThan(0);
    expect(version.checksum).toBeDefined();
  });

  it('should auto-increment version number', async () => {
    const formData = new FormData();
    const testFile = new Blob(['Version 2 content'], { type: 'application/pdf' });
    formData.append('file', testFile, 'version-2.pdf');
    formData.append('change_summary', 'Second version');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(201);
    const version = await response.json();
    
    // Should be next version number
    expect(version.version_number).toBeGreaterThan(1);
  });

  it('should validate file upload requirements', async () => {
    const formData = new FormData();
    formData.append('change_summary', 'Missing file');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('file');
  });

  it('should validate file types', async () => {
    const formData = new FormData();
    const invalidFile = new Blob(['executable'], { type: 'application/x-executable' });
    formData.append('file', invalidFile, 'malicious.exe');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('file type');
  });

  it('should enforce file size limits', async () => {
    const formData = new FormData();
    // Create a large file (simulate 100MB)
    const largeContent = 'x'.repeat(100 * 1024 * 1024);
    const largeFile = new Blob([largeContent], { type: 'application/pdf' });
    formData.append('file', largeFile, 'large-file.pdf');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(413);
    const error = await response.json();
    expect(error.error).toContain('file size');
  });

  it('should require edit permissions', async () => {
    const formData = new FormData();
    const testFile = new Blob(['content'], { type: 'application/pdf' });
    formData.append('file', testFile, 'test.pdf');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token-view-only' },
      body: formData
    });

    expect(response.status).toBe(403);
  });

  it('should prevent versioning of executed documents', async () => {
    const executedDocId = 'executed-doc-123';
    const formData = new FormData();
    const testFile = new Blob(['new version'], { type: 'application/pdf' });
    formData.append('file', testFile, 'should-fail.pdf');

    const response = await fetch(`${API_BASE}/api/documents/${executedDocId}/versions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('executed');
  });

  it('should support branching with parent_version_id', async () => {
    const formData = new FormData();
    const testFile = new Blob(['branch content'], { type: 'application/pdf' });
    formData.append('file', testFile, 'branch.pdf');
    formData.append('parent_version_id', 'version-123');
    formData.append('branch_name', 'client-review-branch');

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: formData
    });

    expect(response.status).toBe(201);
    const version = await response.json();
    
    expect(version.parent_version_id).toBe('version-123');
    expect(version.branch_name).toBe('client-review-branch');
  });
});

export {};