/**
 * Contract Test: GET /api/templates - Template Listing
 * T016: Document template listing and filtering
 */

import { describe, it, expect } from '@jest/globals';

interface Template {
  id: string;
  name: string;
  document_type: string;
  practice_area: string;
  is_active: boolean;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  created_by?: string;
  field_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${API_BASE}/api/templates`;

describe('GET /api/templates - Template Listing Contract', () => {
  it('should list available templates', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    expect(Array.isArray(templates)).toBe(true);
    templates.forEach((template: Template) => {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('document_type');
      expect(template).toHaveProperty('practice_area');
      expect(template).toHaveProperty('is_active');
      expect(template).toHaveProperty('is_public');
      expect(template).toHaveProperty('usage_count');
      expect(template).toHaveProperty('created_at');
    });
  });

  it('should filter by document_type', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?document_type=trust`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template.document_type).toBe('trust');
    });
  });

  it('should filter by practice_area', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?practice_area=estate_planning`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template.practice_area).toBe('estate_planning');
    });
  });

  it('should filter by is_public status', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?is_public=true`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template.is_public).toBe(true);
    });
  });

  it('should only show active templates by default', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template.is_active).toBe(true);
    });
  });

  it('should include inactive templates when requested', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?include_inactive=true`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    // Should include both active and inactive
    const activeTemplates = templates.filter((t: Template) => t.is_active);
    const _inactiveTemplates = templates.filter((t: Template) => !t.is_active);
    
    expect(activeTemplates.length).toBeGreaterThan(0);
    // May or may not have inactive templates, but endpoint should accept the parameter
  });

  it('should respect template visibility based on user role', async () => {
    // Test with paralegal token (should only see public templates + their own)
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token-paralegal' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      // Should be either public or created by this user
      expect(
        template.is_public === true || template.created_by === 'paralegal-user-id'
      ).toBe(true);
    });
  });

  it('should show all templates to admin users', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token-admin' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    // Admin should see both public and private templates
    const publicTemplates = templates.filter((t: Template) => t.is_public);
    const privateTemplates = templates.filter((t: Template) => !t.is_public);
    
    expect(publicTemplates.length).toBeGreaterThan(0);
    expect(privateTemplates.length).toBeGreaterThan(0);
  });

  it('should require authentication', async () => {
    const response = await fetch(TEST_ENDPOINT);
    expect(response.status).toBe(401);
  });

  it('should sort by usage_count when requested', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?sort=usage_count&order=desc`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    // Verify descending order by usage count
    for (let i = 1; i < templates.length; i++) {
      expect(templates[i-1].usage_count).toBeGreaterThanOrEqual(templates[i].usage_count);
    }
  });

  it('should include template field count in response', async () => {
    const response = await fetch(TEST_ENDPOINT, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template).toHaveProperty('field_count');
      expect(typeof template.field_count).toBe('number');
      expect(template.field_count).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle multiple filter combinations', async () => {
    const response = await fetch(`${TEST_ENDPOINT}?document_type=trust&practice_area=estate_planning&is_public=true`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });

    expect(response.status).toBe(200);
    const templates = await response.json();
    
    templates.forEach((template: Template) => {
      expect(template.document_type).toBe('trust');
      expect(template.practice_area).toBe('estate_planning');
      expect(template.is_public).toBe(true);
    });
  });
});

export {};