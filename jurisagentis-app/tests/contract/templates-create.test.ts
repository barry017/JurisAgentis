/**
 * Contract Test: POST /api/templates - Template Creation
 * T017: Document template creation endpoint
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${API_BASE}/api/templates`;

describe('POST /api/templates - Template Creation Contract', () => {
  const validTemplateData = {
    name: 'Test Revocable Living Trust',
    description: 'Standard revocable living trust template for estate planning',
    document_type: 'trust',
    practice_area: 'estate_planning',
    template_content: `# {{client_name}} Revocable Living Trust\n\nThis trust agreement is made on {{trust_date}} by {{client_name}} as Grantor.\n\n{{#has_spouse}}\nSpouse: {{spouse_name}}\n{{/has_spouse}}\n\n## Article I: Trust Property\n{{trust_property_description}}`,
    default_fields: {
      client_name: { type: 'text', required: true },
      trust_date: { type: 'date', required: true },
      spouse_name: { type: 'text', required: false },
      has_spouse: { type: 'boolean', required: false }
    },
    is_public: false
  };

  it('should create template successfully', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(201);
    const template = await response.json();
    
    expect(template).toHaveProperty('id');
    expect(template.name).toBe(validTemplateData.name);
    expect(template.description).toBe(validTemplateData.description);
    expect(template.document_type).toBe(validTemplateData.document_type);
    expect(template.practice_area).toBe(validTemplateData.practice_area);
    expect(template.template_content).toBe(validTemplateData.template_content);
    expect(template.default_fields).toEqual(validTemplateData.default_fields);
    expect(template.is_public).toBe(validTemplateData.is_public);
    expect(template.is_active).toBe(true);
    expect(template.version).toBe('1.0');
    expect(template.usage_count).toBe(0);
    expect(template.created_at).toBeDefined();
  });

  it('should validate required fields', async () => {
    const incompleteData = {
      name: 'Incomplete Template'
      // Missing required fields
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(incompleteData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('required');
    expect(error.details).toEqual(expect.arrayContaining([
      expect.stringContaining('document_type'),
      expect.stringContaining('template_content')
    ]));
  });

  it('should validate document_type values', async () => {
    const invalidTypeData = {
      ...validTemplateData,
      document_type: 'invalid_document_type'
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(invalidTypeData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('document_type');
  });

  it('should validate practice_area values', async () => {
    const invalidAreaData = {
      ...validTemplateData,
      practice_area: 'invalid_practice_area'
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(invalidAreaData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('practice_area');
  });

  it('should validate template syntax', async () => {
    const invalidSyntaxData = {
      ...validTemplateData,
      template_content: '{{unclosed_tag} and {{#invalid_block}}'
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(invalidSyntaxData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('syntax');
  });

  it('should validate default_fields format', async () => {
    const invalidFieldsData = {
      ...validTemplateData,
      default_fields: {
        invalid_field: 'not_an_object',
        another_field: { invalid: 'structure' }
      }
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(invalidFieldsData)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('fields');
  });

  it('should require template creation permissions', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-paralegal'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('permission');
  });

  it('should allow admins to create templates', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-admin'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(201);
  });

  it('should prevent duplicate template names within same document type', async () => {
    // Create first template
    await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(validTemplateData)
    });

    // Attempt duplicate
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.error).toContain('already exists');
  });

  it('should allow same name for different document types', async () => {
    const willTemplateData = {
      ...validTemplateData,
      name: 'Standard Will Template',
      document_type: 'will'
    };

    const trustTemplateData = {
      ...validTemplateData,
      name: 'Standard Will Template', // Same name
      document_type: 'trust' // Different type
    };

    // Create will template
    const willResponse = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(willTemplateData)
    });

    expect(willResponse.status).toBe(201);

    // Create trust template with same name
    const trustResponse = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(trustTemplateData)
    });

    expect(trustResponse.status).toBe(201);
  });

  it('should extract field count from template content', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(201);
    const template = await response.json();
    
    // Should count the mustache variables in template_content
    expect(template.field_count).toBeGreaterThan(0);
    expect(typeof template.field_count).toBe('number');
  });

  it('should create audit log for template creation', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(validTemplateData)
    });

    expect(response.status).toBe(201);
    const template = await response.json();
    
    // Verify audit log creation
    const auditResponse = await fetch(`${API_BASE}/api/audit/templates/${template.id}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });
    
    expect(auditResponse.status).toBe(200);
    const auditLogs = await auditResponse.json();
    
    const creationLog = auditLogs.find((log: { action_type: string }) => log.action_type === 'create');
    expect(creationLog).toBeDefined();
  });

  it('should require approval for public templates', async () => {
    const publicTemplateData = {
      ...validTemplateData,
      is_public: true
    };

    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify(publicTemplateData)
    });

    expect(response.status).toBe(201);
    const template = await response.json();
    
    // Public templates should require approval
    expect(template.approval_required).toBe(true);
    expect(template.approved_by).toBeNull();
    expect(template.approved_at).toBeNull();
  });
});

export {};