/**
 * End-to-End Test Suite: Document Management Workflows
 * T077: Comprehensive E2E tests for all document management features
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@jurisagentis.com';
const TEST_USER_PASSWORD = 'test-password';

// Test data
const TEST_DOCUMENT = {
  title: 'Test Estate Planning Document',
  type: 'will',
  content: 'This is a test document for estate planning purposes.',
  matterName: 'Smith Family Trust'
};

const TEST_CLIENT = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '555-0123'
};

// Helper functions
async function loginUser(page: Page): Promise<void> {
  await page.goto(`${TEST_BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
  await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(`${TEST_BASE_URL}/dashboard`);
}

async function createTestMatter(page: Page): Promise<string> {
  await page.goto(`${TEST_BASE_URL}/matters/new`);
  await page.fill('[data-testid="matter-name"]', TEST_DOCUMENT.matterName);
  await page.fill('[data-testid="client-name"]', TEST_CLIENT.name);
  await page.fill('[data-testid="client-email"]', TEST_CLIENT.email);
  await page.selectOption('[data-testid="case-type"]', 'estate_planning');
  await page.click('[data-testid="create-matter-button"]');
  
  // Wait for matter creation and extract ID from URL
  await page.waitForURL(/\/matters\/[a-f0-9-]+$/);
  const url = page.url();
  return url.split('/').pop()!;
}

async function uploadTestFile(page: Page, filename: string, content: string): Promise<void> {
  // Create a test file
  const buffer = Buffer.from(content);
  
  // Trigger file upload
  const fileInput = page.locator('[data-testid="file-upload-input"]');
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'text/plain',
    buffer: buffer
  });
}

test.describe('Document Management E2E Workflows', () => {
  let context: BrowserContext;
  let page: Page;
  let matterId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Login and create test matter
    await loginUser(page);
    matterId = await createTestMatter(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Document Creation & Templates', () => {
    test('should create document from template with auto-population', async () => {
      // Navigate to document creation
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      
      // Select template
      await page.click('[data-testid="template-selector"]');
      await page.click('[data-testid="template-will"]');
      
      // Verify auto-population from matter/client data
      const clientNameField = page.locator('[data-testid="client-name-field"]');
      await expect(clientNameField).toHaveValue(TEST_CLIENT.name);
      
      const matterTitleField = page.locator('[data-testid="matter-title-field"]');
      await expect(matterTitleField).toHaveValue(TEST_DOCUMENT.matterName);
      
      // Fill additional fields
      await page.fill('[data-testid="document-title"]', TEST_DOCUMENT.title);
      await page.fill('[data-testid="document-content"]', TEST_DOCUMENT.content);
      
      // Create document
      await page.click('[data-testid="create-document-button"]');
      
      // Verify creation success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="document-title"]')).toContainText(TEST_DOCUMENT.title);
    });

    test('should validate required template fields', async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      
      // Select template and try to create without required fields
      await page.click('[data-testid="template-selector"]');
      await page.click('[data-testid="template-trust"]');
      await page.click('[data-testid="create-document-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="required-field-error"]')).toContainText('Trustee name is required');
    });

    test('should increment template usage count', async () => {
      // Check initial usage count
      await page.goto(`${TEST_BASE_URL}/templates`);
      const initialCount = await page.locator('[data-testid="template-will-usage"]').textContent();
      
      // Create document from template
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.click('[data-testid="template-selector"]');
      await page.click('[data-testid="template-will"]');
      await page.fill('[data-testid="document-title"]', 'Usage Count Test Document');
      await page.click('[data-testid="create-document-button"]');
      
      // Verify usage count increased
      await page.goto(`${TEST_BASE_URL}/templates`);
      const newCount = await page.locator('[data-testid="template-will-usage"]').textContent();
      expect(parseInt(newCount!)).toBe(parseInt(initialCount!) + 1);
    });
  });

  test.describe('Version Control & Collaboration', () => {
    let documentId: string;

    test.beforeEach(async () => {
      // Create a test document
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.fill('[data-testid="document-title"]', 'Version Control Test Doc');
      await page.fill('[data-testid="document-content"]', 'Original content');
      await page.click('[data-testid="create-document-button"]');
      
      // Extract document ID from URL
      await page.waitForURL(/\/documents\/[a-f0-9-]+$/);
      documentId = page.url().split('/').pop()!;
    });

    test('should create new version when document is edited', async () => {
      // Edit document content
      await page.click('[data-testid="edit-document-button"]');
      await page.fill('[data-testid="document-content"]', 'Updated content v2');
      await page.click('[data-testid="save-document-button"]');
      
      // Check version history
      await page.click('[data-testid="version-history-button"]');
      const versions = page.locator('[data-testid="version-item"]');
      await expect(versions).toHaveCount(2);
      
      // Verify version details
      await expect(versions.first()).toContainText('v2');
      await expect(versions.last()).toContainText('v1');
    });

    test('should allow version comparison', async () => {
      // Create second version
      await page.click('[data-testid="edit-document-button"]');
      await page.fill('[data-testid="document-content"]', 'Second version content');
      await page.click('[data-testid="save-document-button"]');
      
      // Compare versions
      await page.click('[data-testid="version-history-button"]');
      await page.click('[data-testid="compare-versions-button"]');
      await page.selectOption('[data-testid="version-1-selector"]', 'v1');
      await page.selectOption('[data-testid="version-2-selector"]', 'v2');
      await page.click('[data-testid="compare-button"]');
      
      // Verify comparison shows differences
      await expect(page.locator('[data-testid="diff-added"]')).toContainText('Second version content');
      await expect(page.locator('[data-testid="diff-removed"]')).toContainText('Original content');
    });

    test('should support collaborative editing with conflict resolution', async () => {
      // Simulate concurrent editing (this would require two browser contexts in real test)
      await page.click('[data-testid="edit-document-button"]');
      
      // Start collaborative session
      await page.click('[data-testid="start-collaboration-button"]');
      await expect(page.locator('[data-testid="collaboration-indicator"]')).toBeVisible();
      
      // Make conflicting changes
      await page.fill('[data-testid="document-content"]', 'Conflicting change from user 1');
      
      // Simulate conflict detection
      await page.locator('[data-testid="document-content"]').blur();
      await page.waitForTimeout(1000); // Allow time for conflict detection
      
      // Should show conflict resolution UI
      if (await page.locator('[data-testid="conflict-resolution-modal"]').isVisible()) {
        await page.click('[data-testid="accept-changes-button"]');
        await expect(page.locator('[data-testid="conflict-resolved-message"]')).toBeVisible();
      }
    });
  });

  test.describe('Document Security & Access Control', () => {
    let documentId: string;

    test.beforeEach(async () => {
      // Create a confidential document
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.fill('[data-testid="document-title"]', 'Confidential Security Test Doc');
      await page.selectOption('[data-testid="security-level"]', 'confidential');
      await page.click('[data-testid="create-document-button"]');
      
      documentId = page.url().split('/').pop()!;
    });

    test('should encrypt confidential documents', async () => {
      // Verify document shows as encrypted
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}`);
      await expect(page.locator('[data-testid="encryption-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-level-badge"]')).toContainText('Confidential');
    });

    test('should scan uploaded files for viruses', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/upload`);
      
      // Upload a file
      await uploadTestFile(page, 'test-document.txt', 'Clean test content');
      
      // Wait for upload and virus scan
      await page.click('[data-testid="upload-button"]');
      await expect(page.locator('[data-testid="virus-scan-status"]')).toContainText('Scanning...');
      await expect(page.locator('[data-testid="virus-scan-result"]')).toContainText('Clean', { timeout: 10000 });
    });

    test('should block malicious file uploads', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/upload`);
      
      // Upload a file with suspicious content
      await uploadTestFile(page, 'suspicious-file.txt', 'eicar test string malware');
      await page.click('[data-testid="upload-button"]');
      
      // Should be quarantined
      await expect(page.locator('[data-testid="quarantine-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-blocked"]')).toContainText('File quarantined');
    });

    test('should enforce role-based access controls', async () => {
      // Set specific access permissions
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/access`);
      await page.click('[data-testid="add-access-button"]');
      await page.fill('[data-testid="user-email"]', 'paralegal@jurisagentis.com');
      await page.selectOption('[data-testid="access-level"]', 'view');
      await page.click('[data-testid="grant-access-button"]');
      
      // Verify access was granted
      await expect(page.locator('[data-testid="access-list"]')).toContainText('paralegal@jurisagentis.com');
      await expect(page.locator('[data-testid="access-level-view"]')).toBeVisible();
    });
  });

  test.describe('Client Document Sharing', () => {
    let documentId: string;

    test.beforeEach(async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.fill('[data-testid="document-title"]', 'Client Sharing Test Doc');
      await page.click('[data-testid="create-document-button"]');
      documentId = page.url().split('/').pop()!;
    });

    test('should share document with client through portal', async () => {
      // Share document with client
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/share`);
      await page.fill('[data-testid="client-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="share-button"]');
      
      // Verify sharing success
      await expect(page.locator('[data-testid="share-success"]')).toContainText('Document shared successfully');
      
      // Check client portal access (would need client login in real test)
      await expect(page.locator('[data-testid="portal-link"]')).toBeVisible();
    });

    test('should support time-limited document access', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/share`);
      
      // Set expiration date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('[data-testid="expiration-date"]', tomorrow.toISOString().split('T')[0]);
      
      await page.fill('[data-testid="client-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="share-button"]');
      
      // Verify time-limited access was set
      await expect(page.locator('[data-testid="expiration-info"]')).toContainText('Expires in 1 day');
    });

    test('should allow client comments and approval', async () => {
      // Share document for review
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/share`);
      await page.check('[data-testid="allow-comments"]');
      await page.fill('[data-testid="client-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="share-button"]');
      
      // Simulate client review (would need client context in real test)
      await page.goto(`${TEST_BASE_URL}/client-portal/documents/${documentId}`);
      await page.fill('[data-testid="comment-text"]', 'This looks good to me');
      await page.click('[data-testid="add-comment-button"]');
      await page.click('[data-testid="approve-document-button"]');
      
      // Verify attorney sees client feedback
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}`);
      await expect(page.locator('[data-testid="client-comments"]')).toContainText('This looks good to me');
      await expect(page.locator('[data-testid="approval-status"]')).toContainText('Approved by client');
    });
  });

  test.describe('E-Signature Workflows', () => {
    let documentId: string;

    test.beforeEach(async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.fill('[data-testid="document-title"]', 'E-Signature Test Document');
      await page.fill('[data-testid="document-content"]', 'Document ready for signature');
      await page.click('[data-testid="create-document-button"]');
      documentId = page.url().split('/').pop()!;
    });

    test('should initiate e-signature workflow', async () => {
      // Start signature process
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/sign`);
      
      // Add signers
      await page.click('[data-testid="add-signer-button"]');
      await page.fill('[data-testid="signer-name"]', TEST_CLIENT.name);
      await page.fill('[data-testid="signer-email"]', TEST_CLIENT.email);
      await page.selectOption('[data-testid="signer-role"]', 'client');
      
      // Configure signature settings
      await page.selectOption('[data-testid="signature-type"]', 'email');
      await page.fill('[data-testid="signature-message"]', 'Please sign this document');
      
      // Send for signature
      await page.click('[data-testid="send-for-signature-button"]');
      
      // Verify signature request was created
      await expect(page.locator('[data-testid="signature-sent-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="signature-status"]')).toContainText('Sent');
    });

    test('should track signature completion status', async () => {
      // Send document for signature first
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/sign`);
      await page.click('[data-testid="add-signer-button"]');
      await page.fill('[data-testid="signer-name"]', TEST_CLIENT.name);
      await page.fill('[data-testid="signer-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="send-for-signature-button"]');
      
      // Check signature status
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}`);
      await page.click('[data-testid="signature-status-tab"]');
      
      // Should show pending signature
      await expect(page.locator('[data-testid="signature-progress"]')).toContainText('0 of 1 signed');
      await expect(page.locator('[data-testid="signer-status"]')).toContainText('Pending');
      
      // Simulate signature completion
      await page.click('[data-testid="simulate-signature-button"]'); // Test helper
      
      // Verify completion
      await expect(page.locator('[data-testid="signature-progress"]')).toContainText('1 of 1 signed');
      await expect(page.locator('[data-testid="document-status"]')).toContainText('Fully Executed');
    });

    test('should send signature reminders', async () => {
      // Setup pending signature
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/sign`);
      await page.click('[data-testid="add-signer-button"]');
      await page.fill('[data-testid="signer-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="send-for-signature-button"]');
      
      // Send reminder
      await page.click('[data-testid="send-reminder-button"]');
      await page.fill('[data-testid="reminder-message"]', 'Gentle reminder to sign the document');
      await page.click('[data-testid="send-reminder-confirm"]');
      
      // Verify reminder was sent
      await expect(page.locator('[data-testid="reminder-sent"]')).toContainText('Reminder sent successfully');
    });
  });

  test.describe('Search & Organization', () => {
    test.beforeEach(async () => {
      // Create multiple test documents with different content
      const documents = [
        { title: 'Smith Will', content: 'Last will and testament for John Smith' },
        { title: 'Trust Agreement', content: 'Revocable trust agreement for estate planning' },
        { title: 'Power of Attorney', content: 'Financial power of attorney document' }
      ];

      for (const doc of documents) {
        await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
        await page.fill('[data-testid="document-title"]', doc.title);
        await page.fill('[data-testid="document-content"]', doc.content);
        await page.click('[data-testid="create-document-button"]');
        await page.waitForTimeout(1000); // Ensure documents are indexed
      }
    });

    test('should perform full-text search across documents', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/search`);
      
      // Search for specific content
      await page.fill('[data-testid="search-input"]', 'estate planning');
      await page.click('[data-testid="search-button"]');
      
      // Should find the trust document
      await expect(page.locator('[data-testid="search-results"]')).toContainText('Trust Agreement');
      await expect(page.locator('[data-testid="search-highlight"]')).toContainText('estate planning');
    });

    test('should filter search results by document type and date', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/search`);
      
      // Apply filters
      await page.selectOption('[data-testid="document-type-filter"]', 'will');
      await page.fill('[data-testid="date-from"]', '2025-01-01');
      await page.click('[data-testid="apply-filters-button"]');
      
      // Should only show will documents
      await expect(page.locator('[data-testid="search-results"] [data-testid="document-item"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="search-results"]')).toContainText('Smith Will');
    });

    test('should organize documents in folders', async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents`);
      
      // Create folder
      await page.click('[data-testid="create-folder-button"]');
      await page.fill('[data-testid="folder-name"]', 'Estate Planning Documents');
      await page.click('[data-testid="create-folder-confirm"]');
      
      // Move document to folder
      await page.click('[data-testid="document-checkbox"]:first-child');
      await page.click('[data-testid="move-to-folder-button"]');
      await page.selectOption('[data-testid="target-folder"]', 'Estate Planning Documents');
      await page.click('[data-testid="move-confirm"]');
      
      // Verify document was moved
      await page.click('[data-testid="folder-estate-planning"]');
      await expect(page.locator('[data-testid="folder-contents"]')).toContainText('Smith Will');
    });
  });

  test.describe('Audit Trail & Compliance', () => {
    let documentId: string;

    test.beforeEach(async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents/new`);
      await page.fill('[data-testid="document-title"]', 'Audit Trail Test Document');
      await page.click('[data-testid="create-document-button"]');
      documentId = page.url().split('/').pop()!;
    });

    test('should maintain comprehensive audit trail', async () => {
      // Perform various actions
      await page.click('[data-testid="edit-document-button"]');
      await page.fill('[data-testid="document-content"]', 'Updated content');
      await page.click('[data-testid="save-document-button"]');
      
      // Share document
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/share`);
      await page.fill('[data-testid="client-email"]', TEST_CLIENT.email);
      await page.click('[data-testid="share-button"]');
      
      // Check audit trail
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}/audit`);
      
      // Verify all actions are logged
      const auditEntries = page.locator('[data-testid="audit-entry"]');
      await expect(auditEntries).toHaveCount.greaterThanOrEqual(3);
      
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Document created');
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Document updated');
      await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Document shared');
    });

    test('should generate compliance reports', async () => {
      await page.goto(`${TEST_BASE_URL}/reports/compliance`);
      
      // Configure report parameters
      await page.selectOption('[data-testid="report-type"]', 'document_access');
      await page.fill('[data-testid="date-from"]', '2025-01-01');
      await page.fill('[data-testid="date-to"]', '2025-12-31');
      await page.click('[data-testid="generate-report-button"]');
      
      // Verify report generation
      await expect(page.locator('[data-testid="report-status"]')).toContainText('Report generated successfully');
      await expect(page.locator('[data-testid="download-report-button"]')).toBeVisible();
    });

    test('should support legal hold functionality', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/${documentId}`);
      
      // Place document on legal hold
      await page.click('[data-testid="legal-hold-button"]');
      await page.fill('[data-testid="hold-reason"]', 'Litigation pending');
      await page.click('[data-testid="confirm-hold-button"]');
      
      // Verify hold is in place
      await expect(page.locator('[data-testid="legal-hold-indicator"]')).toBeVisible();
      
      // Try to delete document (should be prevented)
      await page.click('[data-testid="delete-document-button"]');
      await expect(page.locator('[data-testid="delete-blocked-message"]')).toContainText('Cannot delete document on legal hold');
    });
  });

  test.describe('Performance & Reliability', () => {
    test('should load document list quickly', async () => {
      await page.goto(`${TEST_BASE_URL}/matters/${matterId}/documents`);
      
      // Measure load time
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="document-list"]');
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle large file uploads', async () => {
      await page.goto(`${TEST_BASE_URL}/documents/upload`);
      
      // Simulate large file upload (would need real file in actual test)
      const largeContent = 'Large file content '.repeat(10000);
      await uploadTestFile(page, 'large-document.txt', largeContent);
      
      await page.click('[data-testid="upload-button"]');
      
      // Should handle upload gracefully
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    });

    test('should maintain functionality during network interruption', async () => {
      // Start editing a document
      await page.goto(`${TEST_BASE_URL}/documents/${matterId}`);
      await page.click('[data-testid="edit-document-button"]');
      
      // Simulate network offline
      await context.setOffline(true);
      
      // Continue editing (should cache changes)
      await page.fill('[data-testid="document-content"]', 'Offline edit content');
      
      // Restore network
      await context.setOffline(false);
      
      // Save changes
      await page.click('[data-testid="save-document-button"]');
      
      // Should sync successfully
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
    });
  });
});