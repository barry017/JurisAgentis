/**
 * Contract Test: POST /api/templates/{id}/generate - Document Generation
 * T018: Document generation from template endpoint
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('POST /api/templates/{id}/generate - Document Generation Contract', () => {
  const testTemplateId = '123e4567-e89b-12d3-a456-426614174000';
  const testEndpoint = `${API_BASE}/api/templates/${testTemplateId}/generate`;

  const validGenerationData = {
    matter_id: '456e7890-e89b-12d3-a456-426614174001',
    title: 'Smith Family Revocable Living Trust',
    field_values: {
      client_name: 'John Smith',
      spouse_name: 'Jane Smith',
      trust_date: '2025-09-18',
      has_spouse: true,
      trust_property_description: 'All real and personal property owned by the Grantors'
    }
  };

  it('should generate document from template successfully', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    expect(document).toHaveProperty('id');
    expect(document.template_id).toBe(testTemplateId);
    expect(document.matter_id).toBe(validGenerationData.matter_id);
    expect(document.title).toBe(validGenerationData.title);
    expect(document.status).toBe('draft');
    expect(document.created_at).toBeDefined();
    
    // Document should be associated with the template
    expect(document.document_type).toBeDefined();
    expect(document.file_path).toBeDefined();
    expect(document.file_size).toBeGreaterThan(0);
  });

  it('should validate required fields', async () => {
    const incompleteData = {
      matter_id: validGenerationData.matter_id
      // Missing field_values
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(incompleteData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('field_values');
  });

  it('should validate matter_id format', async () => {
    const invalidMatterData = {
      ...validGenerationData,
      matter_id: 'invalid-uuid-format'
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidMatterData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('matter_id');
  });

  it('should validate required template fields are provided', async () => {
    const missingFieldData = {
      ...validGenerationData,
      field_values: {
        client_name: 'John Smith'
        // Missing other required fields
      }
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(missingFieldData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('required field');
    expect(error.missing_fields).toBeDefined();
    expect(Array.isArray(error.missing_fields)).toBe(true);
  });

  it('should auto-generate title if not provided', async () => {
    const noTitleData = {
      matter_id: validGenerationData.matter_id,
      field_values: validGenerationData.field_values
      // No title provided
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(noTitleData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    expect(document.title).toBeDefined();
    expect(document.title).not.toBe('');
    expect(document.title).toContain(validGenerationData.field_values.client_name);
  });

  it('should validate field data types', async () => {
    const invalidTypeData = {
      ...validGenerationData,
      field_values: {
        ...validGenerationData.field_values,
        trust_date: 'invalid-date-format',
        has_spouse: 'not-a-boolean'
      }
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(invalidTypeData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('field type');
    expect(error.field_errors).toBeDefined();
  });

  it('should return 404 for non-existent template', async () => {
    const nonExistentTemplateId = '000e0000-e00b-00d0-a000-000000000000';
    
    const response = await fetch(`${API_BASE}/api/templates/${nonExistentTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(404);
    const error = await response.json();
    expect(error.error).toContain('template not found');
  });

  it('should require matter access permissions', async () => {
    const unauthorizedMatterData = {
      ...validGenerationData,
      matter_id: '000e0000-e00b-00d0-a000-000000000000' // No access
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(unauthorizedMatterData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('matter access');
  });

  it('should prevent generation from inactive templates', async () => {
    const inactiveTemplateId = 'inactive-template-123';
    
    const response = await fetch(`${API_BASE}/api/templates/${inactiveTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('inactive');
  });

  it('should apply conditional logic in template', async () => {
    const conditionalData = {
      ...validGenerationData,
      field_values: {
        ...validGenerationData.field_values,
        has_spouse: false,
        spouse_name: undefined // Should not appear if has_spouse is false
      }
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(conditionalData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    // Generated content should not contain spouse references
    expect(document.generated_preview).toBeDefined();
    expect(document.generated_preview).not.toContain('spouse_name');
  });

  it('should populate client and matter data automatically', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    // Should have automatically populated client/matter data
    expect(document.auto_populated_fields).toBeDefined();
    expect(document.auto_populated_fields).toEqual(expect.objectContaining({
      client_address: expect.any(String) as string,
      matter_number: expect.any(String) as string
    }));
  });

  it('should increment template usage count', async () => {
    // Get initial usage count
    const templateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const initialTemplate = await templateResponse.json();
    const initialUsageCount = initialTemplate.usage_count;

    // Generate document
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(201);

    // Verify usage count increased
    const updatedTemplateResponse = await fetch(`${API_BASE}/api/templates/${testTemplateId}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const updatedTemplate = await updatedTemplateResponse.json();
    
    expect(updatedTemplate.usage_count).toBe(initialUsageCount + 1);
    expect(updatedTemplate.last_used_at).toBeDefined();
  });

  it('should support PDF generation format', async () => {
    const pdfGenerationData = {
      ...validGenerationData,
      output_format: 'pdf'
    };

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(pdfGenerationData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    expect(document.mime_type).toBe('application/pdf');
    expect(document.file_path).toContain('.pdf');
  });

  it('should create audit log for generation', async () => {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(validGenerationData)
    });

    expect(response.status).toBe(201);
    const document = await response.json();
    
    // Verify audit log creation
    const auditResponse = await fetch(`${API_BASE}/api/audit/documents/${document.id}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const generationLog = auditLogs.find((log: unknown) => 
      log.action_type === 'generate_from_template' &&
      log.template_id === testTemplateId
    );
    expect(generationLog).toBeDefined();
  });
});

export {};