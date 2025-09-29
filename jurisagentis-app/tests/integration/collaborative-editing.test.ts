/**
 * Integration Test: Collaborative Document Review & Version Control
 * T023: Scenario 2 - Multiple users collaborating with version tracking
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Collaborative Document Review', () => {
  let testDocumentId: string;
  const versionIds: string[] = [];

  beforeAll(async () => {
    // Create test document
    const createResponse = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        matter_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Collaborative Test Document',
        document_type: 'trust'
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

  it('should complete collaborative review workflow', async () => {
    // Step 1: Luke (attorney) shares document with Sarah (paralegal)
    const shareResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        user_id: 'sarah-paralegal-id',
        can_view: true,
        can_comment: true,
        can_edit: false
      })
    });

    expect(shareResponse.status).toBe(201);
    const accessGrant = await shareResponse.json();
    expect(accessGrant.user_id).toBe('sarah-paralegal-id');
    expect(accessGrant.can_comment).toBe(true);

    // Step 2: Sarah reviews document and adds comments
    const commentResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-paralegal'
      },
      body: JSON.stringify({
        content: 'Please review the trustee succession provisions in Article III',
        section: 'article_3',
        comment_type: 'review'
      })
    });

    expect(commentResponse.status).toBe(201);
    const comment = await commentResponse.json();
    expect(comment.content).toContain('trustee succession');

    // Step 3: Luke makes revisions based on comments
    const revisionFile = new Blob(['Updated document content with revised trustee provisions'], 
      { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', revisionFile, 'revised-trust.pdf');
    formData.append('change_summary', 'Revised trustee succession provisions per Sarah\'s review');
    formData.append('change_type', 'major');

    const versionResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/versions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token-attorney' },
      body: formData
    });

    expect(versionResponse.status).toBe(201);
    const newVersion = await versionResponse.json();
    versionIds.push(newVersion.id);
    
    expect(newVersion.version_number).toBe(2);
    expect(newVersion.change_summary).toContain('Revised trustee succession');
    expect(newVersion.change_type).toBe('major');

    // Step 4: Verify version comparison
    const versionsResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/versions`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(versionsResponse.status).toBe(200);
    const versions = await versionsResponse.json();
    
    expect(versions).toHaveLength(2);
    expect(versions[0].version_number).toBe(2); // Latest first
    expect(versions[1].version_number).toBe(1);

    // Step 5: Sarah approves revised version
    const approvalResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/versions/${newVersion.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-paralegal'
      },
      body: JSON.stringify({
        review_status: 'approved',
        review_comments: 'Trustee provisions look good now'
      })
    });

    expect(approvalResponse.status).toBe(200);
    const reviewResult = await approvalResponse.json();
    expect(reviewResult.review_status).toBe('approved');

    // Step 6: Luke promotes document to review status
    const statusUpdateResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        status: 'review'
      })
    });

    expect(statusUpdateResponse.status).toBe(200);
    const updatedDocument = await statusUpdateResponse.json();
    expect(updatedDocument.status).toBe('review');
  });

  it('should track all changes in audit trail', async () => {
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    // Should have logs for all collaborative activities
    const activityTypes = auditLogs.map((log: unknown) => log.action_type);
    
    expect(activityTypes).toContain('create');
    expect(activityTypes).toContain('grant_access');
    expect(activityTypes).toContain('add_comment');
    expect(activityTypes).toContain('create_version');
    expect(activityTypes).toContain('review_version');
    expect(activityTypes).toContain('update_status');
  });

  it('should handle version conflicts appropriately', async () => {
    // Simulate concurrent editing attempt
    const conflictFile = new Blob(['Conflicting changes'], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', conflictFile, 'conflict-version.pdf');
    formData.append('change_summary', 'Conflicting changes');
    formData.append('parent_version_id', 'version-1'); // Based on older version

    const conflictResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/versions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token-attorney' },
      body: formData
    });

    // Should handle conflict gracefully (either create branch or require merge)
    expect([201, 409]).toContain(conflictResponse.status);
    
    if (conflictResponse.status === 201) {
      const conflictVersion = await conflictResponse.json();
      expect(conflictVersion.branch_name).toBeDefined();
    }
  });

  it('should respect permission levels during collaboration', async () => {
    // Test that paralegal cannot edit when only given comment permission
    const unauthorizedEditResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-paralegal'
      },
      body: JSON.stringify({
        title: 'Unauthorized Title Change'
      })
    });

    expect(unauthorizedEditResponse.status).toBe(403);
  });

  it('should send real-time notifications for collaboration events', async () => {
    // Test real-time notification system
    const notificationResponse = await fetch(`${API_BASE}/api/notifications/realtime/document/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token-paralegal' }
    });

    expect(notificationResponse.status).toBe(200);
    const notifications = await notificationResponse.json();
    
    // Should have notifications for document updates
    expect(Array.isArray(notifications)).toBe(true);
    
    const collaborationNotifications = notifications.filter((n: unknown) => 
      n.type === 'document_updated' || n.type === 'new_comment' || n.type === 'version_created'
    );
    
    expect(collaborationNotifications.length).toBeGreaterThan(0);
  });

  it('should maintain comment threading and resolution', async () => {
    // Add a threaded reply to existing comment
    const replyResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        content: 'Thanks for the review, I\'ve updated Article III as suggested',
        parent_comment_id: 'comment-123',
        comment_type: 'reply'
      })
    });

    expect(replyResponse.status).toBe(201);
    const reply = await replyResponse.json();
    expect(reply.parent_comment_id).toBe('comment-123');

    // Resolve the comment thread
    const resolveResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/comments/comment-123/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      }
    });

    expect(resolveResponse.status).toBe(200);
    const resolvedComment = await resolveResponse.json();
    expect(resolvedComment.resolved).toBe(true);
    expect(resolvedComment.resolved_by).toBeDefined();
  });
});

export {};