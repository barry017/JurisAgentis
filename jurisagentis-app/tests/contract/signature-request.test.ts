/**
 * Contract Test: POST /api/documents/{id}/signature-request - E-Signature
 * T015: E-signature workflow initiation
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('POST /api/documents/{id}/signature-request - E-Signature Contract', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/documents/${testDocumentId}/signature-request`;

  const validSignatureData = {
    signers: [
      {
        name: 'John Smith',
        email: 'john@example.com',
        role: 'grantor',
        signing_order: 1
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'co-grantor',
        signing_order: 2
      },
      {
        name: 'Luke Barry',
        email: 'luke@jurisagentis.com',
        role: 'attorney',
        signing_order: 3
      }
    ],
    completion_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    witness_required: false,
    notary_required: false
  };

  it('should create signature request with DocuSign integration', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(201);
    const signatureRequest = await response.json();
    
    expect(signatureRequest).toHaveProperty('id');
    expect(signatureRequest.document_id).toBe(testDocumentId);
    expect(signatureRequest).toHaveProperty('docusign_envelope_id');
    expect(signatureRequest.status).toBe('created');
    expect(signatureRequest.signing_order).toEqual([1, 2, 3]);
    expect(signatureRequest.completion_deadline).toBe(validSignatureData.completion_deadline);
    
    // Verify signers
    expect(signatureRequest.signatures).toHaveLength(3);
    signatureRequest.signatures.forEach((sig: unknown, index: number) => {
      expect(sig.signer_name).toBe(validSignatureData.signers[index].name);
      expect(sig.signer_email).toBe(validSignatureData.signers[index].email);
      expect(sig.signer_role).toBe(validSignatureData.signers[index].role);
      expect(sig.signing_order).toBe(validSignatureData.signers[index].signing_order);
      expect(sig.status).toBe('pending');
    });
  });

  it('should validate required signers array', async () => {
    const invalidData = {
      completion_deadline: validSignatureData.completion_deadline
      // Missing signers
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
    expect(error.error).toContain('signers');
  });

  it('should validate signer data completeness', async () => {
    const incompleteSignerData = {
      signers: [
        {
          name: 'John Smith',
          // Missing email and role
          signing_order: 1
        }
      ]
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(incompleteSignerData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toMatch(/(email|role)/);
  });

  it('should validate email format for signers', async () => {
    const invalidEmailData = {
      signers: [
        {
          name: 'John Smith',
          email: 'invalid-email-format',
          role: 'grantor',
          signing_order: 1
        }
      ]
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidEmailData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('email');
  });

  it('should validate signing order uniqueness', async () => {
    const duplicateOrderData = {
      signers: [
        {
          name: 'John Smith',
          email: 'john@example.com',
          role: 'grantor',
          signing_order: 1
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'co-grantor',
          signing_order: 1 // Duplicate order
        }
      ]
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(duplicateOrderData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('signing_order');
  });

  it('should support witness and notary requirements', async () => {
    const witnessNotaryData = {
      ...validSignatureData,
      witness_required: true,
      notary_required: true
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(witnessNotaryData)
    });

    expect(response.status).toBe(201);
    const signatureRequest = await response.json();
    
    expect(signatureRequest.witness_required).toBe(true);
    expect(signatureRequest.notary_required).toBe(true);
  });

  it('should prevent signature requests on draft documents', async () => {
    const draftDocId = 'draft-document-123';
    
    const response = await fetch(`${API_BASE}/api/documents/${draftDocId}/signature-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('draft');
  });

  it('should prevent duplicate signature requests', async () => {
    // Create first signature request
    const firstResponse = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(firstResponse.status).toBe(201);

    // Attempt duplicate
    const secondResponse = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(secondResponse.status).toBe(409);
    const error = await secondResponse.json();
    expect(error.error).toContain('signature request already exists');
  });

  it('should require signature permissions', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-no-signature'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('signature');
  });

  it('should validate completion deadline is in future', async () => {
    const pastDeadlineData = {
      ...validSignatureData,
      completion_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(pastDeadlineData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('deadline');
  });

  it('should integrate with DocuSign webhook system', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(201);
    const signatureRequest = await response.json();
    
    // Should have DocuSign envelope ID for webhook correlation
    expect(signatureRequest.docusign_envelope_id).toBeDefined();
    expect(signatureRequest.docusign_envelope_id).toMatch(/^[a-f0-9-]+$/);
  });

  it('should create audit log for signature request', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(201);
    const signatureRequest = await response.json();
    
    // Verify audit log
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const signatureLog = auditLogs.find((log: unknown) => 
      log.action_type === 'initiate_signature' &&
      log.signature_request_id === signatureRequest.id
    );
    expect(signatureLog).toBeDefined();
  });

  it('should update document status to signature_pending', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validSignatureData)
    });

    expect(response.status).toBe(201);
    
    // Check document status updated
    const docResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(docResponse.status).toBe(200);
    const document = await docResponse.json();
    expect(document.signature_required).toBe(true);
  });
});

export {};