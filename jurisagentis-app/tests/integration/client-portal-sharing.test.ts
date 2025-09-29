/**
 * Integration Test: Client Portal Document Sharing
 * T024: Scenario 3 - Secure client portal sharing with external access
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Client Portal Document Sharing', () => {
  let testDocumentId: string;
  let clientPortalLinkId: string;

  beforeAll(async () => {
    // Create test document for sharing
    const createResponse = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        matter_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Client Estate Plan - Final Draft',
        document_type: 'trust',
        status: 'review'
      })
    });

    const document = await createResponse.json();
    testDocumentId = document.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testDocumentId) {
      await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token-attorney' }
      });
    }
  });

  it('should complete secure client portal sharing workflow', async () => {
    // Step 1: Attorney creates secure client portal link
    const portalLinkResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/portal-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        client_email: 'john.smith@example.com',
        expires_in_days: 7,
        permissions: {
          can_view: true,
          can_download: true,
          can_comment: false,
          can_approve: true
        },
        require_password: true,
        password: 'SecurePass123!',
        send_notification: true
      })
    });

    expect(portalLinkResponse.status).toBe(201);
    const portalLink = await portalLinkResponse.json();
    clientPortalLinkId = portalLink.id;

    expect(portalLink.link_url).toContain('/portal/');
    expect(portalLink.expires_at).toBeDefined();
    expect(portalLink.client_email).toBe('john.smith@example.com');
    expect(portalLink.permissions.can_view).toBe(true);
    expect(portalLink.permissions.can_approve).toBe(true);

    // Step 2: Verify email notification was sent
    const notificationResponse = await fetch(`${API_BASE}/api/notifications/email-log`, {
      headers: {
        'Authorization': 'Bearer test-token-attorney'
      }
    });

    expect(notificationResponse.status).toBe(200);
    const emailLogs = await notificationResponse.json();
    
    const portalNotification = emailLogs.find((log: unknown) => 
      log.to_email === 'john.smith@example.com' && 
      log.template_type === 'client_portal_access'
    );
    
    expect(portalNotification).toBeDefined();
    expect(portalNotification.subject).toContain('Document Review');

    // Step 3: Client accesses portal (simulate external access)
    const portalAccessResponse = await fetch(`${API_BASE}/api/portal/${portalLink.access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: 'SecurePass123!'
      })
    });

    expect(portalAccessResponse.status).toBe(200);
    const portalSession = await portalAccessResponse.json();
    
    expect(portalSession.access_granted).toBe(true);
    expect(portalSession.session_token).toBeDefined();
    expect(portalSession.document).toEqual(expect.objectContaining({
      id: testDocumentId,
      title: 'Client Estate Plan - Final Draft'
    }));

    // Step 4: Client views document through portal
    const documentViewResponse = await fetch(`${API_BASE}/api/portal/${portalLink.access_token}/document`, {
      headers: {
        'Authorization': `Bearer ${portalSession.session_token}`
      }
    });

    expect(documentViewResponse.status).toBe(200);
    const documentData = await documentViewResponse.json();
    
    expect(documentData.id).toBe(testDocumentId);
    expect(documentData.file_url).toBeDefined();
    expect(documentData.watermarked).toBe(true); // Documents should be watermarked for portal access

    // Step 5: Client approves document
    const approvalResponse = await fetch(`${API_BASE}/api/portal/${portalLink.access_token}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${portalSession.session_token}`
      },
      body: JSON.stringify({
        approval_status: 'approved',
        client_signature: 'John Smith',
        approval_comments: 'The estate plan looks good. Please proceed with finalization.'
      })
    });

    expect(approvalResponse.status).toBe(200);
    const approval = await approvalResponse.json();
    
    expect(approval.status).toBe('approved');
    expect(approval.client_signature).toBe('John Smith');
    expect(approval.approved_at).toBeDefined();

    // Step 6: Verify document status updated
    const updatedDocResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(updatedDocResponse.status).toBe(200);
    const updatedDocument = await updatedDocResponse.json();
    
    expect(updatedDocument.client_approval_status).toBe('approved');
    expect(updatedDocument.client_approved_at).toBeDefined();

    // Step 7: Attorney receives approval notification
    const attorneyNotificationsResponse = await fetch(`${API_BASE}/api/notifications/realtime/user/attorney-user-id`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(attorneyNotificationsResponse.status).toBe(200);
    const notifications = await attorneyNotificationsResponse.json();
    
    const approvalNotification = notifications.find((n: unknown) => 
      n.type === 'client_document_approved' && n.document_id === testDocumentId
    );
    
    expect(approvalNotification).toBeDefined();
  });

  it('should enforce portal link security restrictions', async () => {
    // Test expired link
    const expiredLinkResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/portal-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        client_email: 'test@example.com',
        expires_in_days: -1, // Already expired
        permissions: { can_view: true }
      })
    });

    const expiredLink = await expiredLinkResponse.json();

    const accessExpiredResponse = await fetch(`${API_BASE}/api/portal/${expiredLink.access_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test' })
    });

    expect(accessExpiredResponse.status).toBe(403);
    const expiredError = await accessExpiredResponse.json();
    expect(expiredError.error).toContain('expired');

    // Test wrong password
    const wrongPasswordResponse = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' })
    });

    expect(wrongPasswordResponse.status).toBe(401);
  });

  it('should track portal access analytics', async () => {
    const analyticsResponse = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}/analytics`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(analyticsResponse.status).toBe(200);
    const analytics = await analyticsResponse.json();
    
    expect(analytics.total_accesses).toBeGreaterThan(0);
    expect(analytics.unique_visitors).toBeGreaterThan(0);
    expect(analytics.last_accessed_at).toBeDefined();
    expect(Array.isArray(analytics.access_log)).toBe(true);
    
    const accessLog = analytics.access_log[0];
    expect(accessLog).toHaveProperty('timestamp');
    expect(accessLog).toHaveProperty('ip_address');
    expect(accessLog).toHaveProperty('user_agent');
    expect(accessLog).toHaveProperty('action');
  });

  it('should allow portal link management', async () => {
    // Revoke portal link
    const revokeResponse = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        revocation_reason: 'Client requested changes'
      })
    });

    expect(revokeResponse.status).toBe(200);
    const revokedLink = await revokeResponse.json();
    
    expect(revokedLink.status).toBe('revoked');
    expect(revokedLink.revoked_at).toBeDefined();
    expect(revokedLink.revocation_reason).toBe('Client requested changes');

    // Verify revoked link cannot be accessed
    const accessRevokedResponse = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SecurePass123!' })
    });

    expect(accessRevokedResponse.status).toBe(403);
    const revokedError = await accessRevokedResponse.json();
    expect(revokedError.error).toContain('revoked');
  });

  it('should support different permission levels', async () => {
    // Create view-only portal link
    const viewOnlyLinkResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/portal-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        client_email: 'viewer@example.com',
        expires_in_days: 3,
        permissions: {
          can_view: true,
          can_download: false,
          can_comment: false,
          can_approve: false
        }
      })
    });

    expect(viewOnlyLinkResponse.status).toBe(201);
    const viewOnlyLink = await viewOnlyLinkResponse.json();

    // Access with view-only permissions
    const viewOnlyAccessResponse = await fetch(`${API_BASE}/api/portal/${viewOnlyLink.access_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(viewOnlyAccessResponse.status).toBe(200);
    const viewOnlySession = await viewOnlyAccessResponse.json();

    // Try to approve (should fail)
    const unauthorizedApprovalResponse = await fetch(`${API_BASE}/api/portal/${viewOnlyLink.access_token}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewOnlySession.session_token}`
      },
      body: JSON.stringify({ approval_status: 'approved' })
    });

    expect(unauthorizedApprovalResponse.status).toBe(403);
  });

  it('should handle concurrent portal access', async () => {
    // Create multiple simultaneous portal sessions
    const session1Response = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SecurePass123!' })
    });

    const session2Response = await fetch(`${API_BASE}/api/portal/${clientPortalLinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SecurePass123!' })
    });

    expect(session1Response.status).toBe(200);
    expect(session2Response.status).toBe(200);

    const session1 = await session1Response.json();
    const session2 = await session2Response.json();

    // Both sessions should be valid but tracked separately
    expect(session1.session_token).toBeDefined();
    expect(session2.session_token).toBeDefined();
    expect(session1.session_token).not.toBe(session2.session_token);
  });
});

export {};