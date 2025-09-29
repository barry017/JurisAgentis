/**
 * Contract Test: POST /api/documents/{id}/access - Access Grant
 * T013: Document access permission management
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('POST /api/documents/{id}/access - Access Grant Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}/access`;

  const validAccessData = {
    user_id: '456e7890-e89b-12d3-a456-426614174001',
    can_view: true,
    can_edit: false,
    can_comment: true,
    can_share: false,
    can_download: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  it('should grant document access with specified permissions', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validAccessData)
    });

    expect(response.status).toBe(201);
    const access = await response.json();
    
    expect(access).toHaveProperty('id');
    expect(access.user_id).toBe(validAccessData.user_id);
    expect(access.can_view).toBe(validAccessData.can_view);
    expect(access.can_edit).toBe(validAccessData.can_edit);
    expect(access.can_comment).toBe(validAccessData.can_comment);
    expect(access.can_share).toBe(validAccessData.can_share);
    expect(access.can_download).toBe(validAccessData.can_download);
    expect(access.expires_at).toBe(validAccessData.expires_at);
    expect(access.created_at).toBeDefined();
  });

  it('should use default permissions when not specified', async () => {
    const minimalAccessData = {
      user_id: '789e0123-e89b-12d3-a456-426614174002'
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(minimalAccessData)
    });

    expect(response.status).toBe(201);
    const access = await response.json();
    
    expect(access.can_view).toBe(true); // Default
    expect(access.can_edit).toBe(false); // Default
    expect(access.can_comment).toBe(false); // Default
    expect(access.can_share).toBe(false); // Default
    expect(access.can_download).toBe(false); // Default
  });

  it('should validate user_id is required', async () => {
    const invalidData = {
      can_view: true
      // Missing user_id
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('user_id');
  });

  it('should validate UUID format for user_id', async () => {
    const invalidData = {
      user_id: 'invalid-uuid-format',
      can_view: true
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('user_id');
  });

  it('should validate expiration date format', async () => {
    const invalidData = {
      user_id: validAccessData.user_id,
      expires_at: 'invalid-date-format'
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('expires_at');
  });

  it('should prevent granting access to non-existent users', async () => {
    const nonExistentUserData = {
      user_id: '000e0000-e00b-00d0-a000-000000000000',
      can_view: true
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(nonExistentUserData)
    });

    expect(response.status).toBe(404);
    const error = await response.json();
    expect(error.error).toContain('user');
  });

  it('should prevent duplicate access grants', async () => {
    // First grant
    await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validAccessData)
    });

    // Duplicate grant
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validAccessData)
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('already has access');
  });

  it('should require share permissions to grant access', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-no-share'
      },
      body: JSON.stringify(validAccessData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('share');
  });

  it('should respect matter-level access controls', async () => {
    const outsideUserData = {
      user_id: 'user-outside-matter-123',
      can_view: true
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(outsideUserData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('matter access');
  });

  it('should prevent granting higher permissions than grantor has', async () => {
    const elevatedAccessData = {
      user_id: validAccessData.user_id,
      can_edit: true,
      can_share: true // Grantor doesn't have share permission
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-limited'
      },
      body: JSON.stringify(elevatedAccessData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('cannot grant');
  });

  it('should enforce confidentiality level restrictions', async () => {
    const privilegedDocId = 'attorney-client-privileged-doc';
    
    const response = await fetch(`${API_BASE}/api/documents/${privilegedDocId}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        user_id: 'client-user-123',
        can_view: true
      })
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('confidentiality');
  });

  it('should create audit log for access grant', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validAccessData)
    });

    expect(response.status).toBe(201);
    
    // Verify audit log
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const accessLog = auditLogs.find((log: { action_type: string; affected_user_id: string }) => 
      log.action_type === 'grant_access' &&
      log.affected_user_id === validAccessData.user_id
    );
    expect(accessLog).toBeDefined();
  });
});

export {};