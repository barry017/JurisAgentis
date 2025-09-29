/**
 * Contract Test: POST /api/documents/{id}/share - Secure Sharing
 * T014: Document secure sharing link creation
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('POST /api/documents/{id}/share - Secure Sharing Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}/share`;

  const validShareData = {
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    password_protected: false,
    download_limit: 5,
    view_limit: 10
  };

  it('should create secure sharing link', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(201);
    const share = await response.json();
    
    expect(share).toHaveProperty('share_token');
    expect(share).toHaveProperty('share_url');
    expect(share.share_token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(share.share_url).toContain(share.share_token);
    expect(share.expires_at).toBe(validShareData.expires_at);
    expect(share.password_required).toBe(false);
  });

  it('should create password-protected share', async () => {
    const passwordShareData = {
      ...validShareData,
      password_protected: true
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(passwordShareData)
    });

    expect(response.status).toBe(201);
    const share = await response.json();
    
    expect(share.password_required).toBe(true);
    expect(share).toHaveProperty('share_password');
    expect(share.share_password).toMatch(/^[A-Za-z0-9]{8,}$/);
  });

  it('should use default expiration if not provided', async () => {
    const minimalShareData = {};

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(minimalShareData)
    });

    expect(response.status).toBe(201);
    const share = await response.json();
    
    expect(share.expires_at).toBeDefined();
    const expirationDate = new Date(share.expires_at);
    const now = new Date();
    expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should validate expiration date is in future', async () => {
    const pastShareData = {
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(pastShareData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('future');
  });

  it('should validate numeric limits', async () => {
    const invalidLimitsData = {
      download_limit: -1,
      view_limit: 'not-a-number'
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidLimitsData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toMatch(/(download_limit|view_limit)/);
  });

  it('should require share permissions', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-no-share'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('share');
  });

  it('should prevent sharing attorney-client privileged docs with non-attorneys', async () => {
    const privilegedDocId = 'attorney-client-privileged-doc';
    
    const response = await fetch(`${API_BASE}/api/documents/${privilegedDocId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-paralegal'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('confidentiality');
  });

  it('should prevent sharing draft documents', async () => {
    const draftDocId = 'draft-document-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${draftDocId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('draft');
  });

  it('should revoke existing shares when creating new one', async () => {
    // Create first share
    const firstResponse = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(firstResponse.status).toBe(201);
    const firstShare = await firstResponse.json();

    // Create second share
    const secondResponse = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(secondResponse.status).toBe(201);
    const secondShare = await secondResponse.json();

    // Tokens should be different
    expect(firstShare.share_token).not.toBe(secondShare.share_token);

    // First share should be revoked (test by accessing it)
    const accessFirstResponse = await fetch(`${API_BASE}/api/share/${firstShare.share_token}`);
    expect(accessFirstResponse.status).toBe(404); // Revoked
  });

  it('should generate unique tokens', async () => {
    const requests = Array.from({ length: 3 }, () =>
      fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(validShareData)
      })
    );

    const responses = await Promise.all(requests);
    const shares = await Promise.all(responses.map(r => r.json()));

    const tokens = shares.map(s => s.share_token);
    const uniqueTokens = new Set(tokens);
    
    expect(uniqueTokens.size).toBe(tokens.length);
  });

  it('should create audit log for share creation', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(201);
    const share = await response.json();
    
    // Verify audit log
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const shareLog = auditLogs.find((log: unknown) => 
      log.action_type === 'create_share' &&
      log.share_token === share.share_token
    );
    expect(shareLog).toBeDefined();
  });

  it('should include watermarking information', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validShareData)
    });

    expect(response.status).toBe(201);
    const share = await response.json();
    
    expect(share).toHaveProperty('watermark_enabled');
    expect(share.watermark_enabled).toBe(true);
  });
});

export {};