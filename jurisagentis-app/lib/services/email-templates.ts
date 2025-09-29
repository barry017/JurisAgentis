/**
 * Email Template Service - Persistent template storage and management
 * Implements FR-039: Template system with database storage
 */

import { supabaseAdmin } from '@/lib/supabase'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  auto_send: boolean
  tone: 'professional' | 'casual' | 'formal'
  category: 'client' | 'internal' | 'marketing' | 'legal'
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  usage_count: number
}

export interface CreateTemplateRequest {
  name: string
  subject: string
  body: string
  variables?: string[]
  auto_send?: boolean
  tone?: 'professional' | 'casual' | 'formal'
  category?: 'client' | 'internal' | 'marketing' | 'legal'
}

export interface TemplateUsageStats {
  template_id: string
  used_at: string
  used_by: string
  contact_type: string
  success: boolean
}

export class EmailTemplateService {
  
  /**
   * Get all active templates
   */
  async getTemplates(category?: string): Promise<EmailTemplate[]> {
    try {
      const baseQuery = supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
      
      let query = baseQuery
        .order('usage_count', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching templates:', error)
        return this.getDefaultTemplates()
      }

      return data || this.getDefaultTemplates()
    } catch (error) {
      console.error('Template service error:', error)
      return this.getDefaultTemplates()
    }
  }

  /**
   * Get template by ID or name
   */
  async getTemplate(identifier: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .or(`id.eq.${identifier},name.ilike.${identifier}`)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching template:', error)
        return this.getDefaultTemplateByName(identifier)
      }

      return data
    } catch (error) {
      console.error('Template fetch error:', error)
      return this.getDefaultTemplateByName(identifier)
    }
  }

  /**
   * Create new template
   */
  async createTemplate(templateData: CreateTemplateRequest, userId: string): Promise<EmailTemplate | null> {
    try {
      const newTemplate = {
        name: templateData.name,
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || this.extractVariables(templateData.subject + ' ' + templateData.body),
        auto_send: templateData.auto_send || false,
        tone: templateData.tone || 'professional',
        category: templateData.category || 'client',
        created_by: userId,
        is_active: true,
        usage_count: 0
      }

      const { data, error } = await supabaseAdmin
        .from('email_templates')
        .insert(newTemplate)
        .select()
        .single()

      if (error) {
        console.error('Error creating template:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Template creation error:', error)
      return null
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, updates: Partial<CreateTemplateRequest>): Promise<EmailTemplate | null> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      if (updates.subject || updates.body) {
        updateData.variables = this.extractVariables(
          (updates.subject || '') + ' ' + (updates.body || '')
        )
      }

      const { data, error } = await supabaseAdmin
        .from('email_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        console.error('Error updating template:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Template update error:', error)
      return null
    }
  }

  /**
   * Record template usage for analytics (FR-043)
   */
  async recordUsage(templateId: string, userId: string, contactType: string, success: boolean): Promise<void> {
    try {
      // Record usage in analytics table
      await supabaseAdmin
        .from('template_usage_stats')
        .insert({
          template_id: templateId,
          used_by: userId,
          contact_type: contactType,
          success: success,
          used_at: new Date().toISOString()
        })

      // Increment usage count on template
      await supabaseAdmin
        .from('email_templates')
        .update({
          usage_count: supabaseAdmin.raw('usage_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

    } catch (error) {
      console.error('Error recording template usage:', error)
    }
  }

  /**
   * Get template suggestions based on context (FR-043)
   */
  async getTemplateSuggestions(contactType: string, messageKeywords: string[]): Promise<EmailTemplate[]> {
    try {
      // Get templates that match contact type and have high usage
      const baseQuery = supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
      
      const query = baseQuery
        .eq('category', this.mapContactTypeToCategory(contactType))
        .order('usage_count', { ascending: false })
        .limit(5)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching template suggestions:', error)
        return this.getDefaultTemplates().slice(0, 3)
      }

      // Score templates based on keyword relevance
      const scoredTemplates = (data || []).map(template => ({
        ...template,
        relevanceScore: this.calculateRelevanceScore(template, messageKeywords)
      }))

      // Sort by relevance score and usage count
      return scoredTemplates
        .sort((a, b) => (b.relevanceScore * 2 + b.usage_count) - (a.relevanceScore * 2 + a.usage_count))
        .slice(0, 3)

    } catch (error) {
      console.error('Template suggestion error:', error)
      return this.getDefaultTemplates().slice(0, 3)
    }
  }

  /**
   * Extract variables from template text
   */
  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{([^}]+)\}\}/g)
    if (!matches) return []
    
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))]
  }

  /**
   * Map contact type to template category
   */
  private mapContactTypeToCategory(contactType: string): string {
    switch (contactType) {
      case 'client':
      case 'related_party':
        return 'client'
      case 'attorney':
      case 'staff':
        return 'internal'
      default:
        return 'client'
    }
  }

  /**
   * Calculate relevance score for template suggestions
   */
  private calculateRelevanceScore(template: EmailTemplate, keywords: string[]): number {
    if (keywords.length === 0) return 0

    const templateText = (template.name + ' ' + template.subject + ' ' + template.body).toLowerCase()
    let score = 0

    for (const keyword of keywords) {
      if (templateText.includes(keyword.toLowerCase())) {
        score += 1
      }
    }

    return score / keywords.length
  }

  /**
   * Default templates as fallback
   */
  private getDefaultTemplates(): EmailTemplate[] {
    return [
      {
        id: 'welcome-email',
        name: 'Welcome Email',
        subject: 'Welcome to {{firm_name}} - {{client_name}}',
        body: `Dear {{client_name}},

Welcome to {{firm_name}}! We're excited to work with you on your legal matters.

Your case has been assigned to {{attorney_name}}, and we'll be in touch shortly to schedule your initial consultation.

In the meantime, please don't hesitate to reach out if you have any questions.

Best regards,
{{attorney_name}}
{{firm_name}}`,
        variables: ['client_name', 'firm_name', 'attorney_name'],
        auto_send: true,
        tone: 'professional',
        category: 'client',
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        usage_count: 0
      },
      {
        id: 'document-review-request',
        name: 'Document Review Request',
        subject: 'Document Review Required - {{client_name}}',
        body: `Dear {{client_name}},

The documents for your {{matter_type}} are ready for your review.

Please review the attached documents and let us know if you have any questions or require any changes.

Once you've reviewed and approved the documents, we can proceed with the next steps.

Best regards,
{{attorney_name}}
{{firm_name}}`,
        variables: ['client_name', 'matter_type', 'attorney_name', 'firm_name'],
        auto_send: false,
        tone: 'professional',
        category: 'client',
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        usage_count: 0
      },
      {
        id: 'appointment-confirmation',
        name: 'Appointment Confirmation',
        subject: 'Appointment Confirmation - {{date}} at {{time}}',
        body: `Dear {{client_name}},

This is to confirm your appointment scheduled for {{date}} at {{time}}.

Location: {{office_address}}

Please bring the following documents:
{{required_documents}}

If you need to reschedule, please contact us at least 24 hours in advance.

Best regards,
{{firm_name}} Team`,
        variables: ['client_name', 'date', 'time', 'office_address', 'required_documents'],
        auto_send: true,
        tone: 'professional',
        category: 'client',
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        usage_count: 0
      }
    ]
  }

  /**
   * Get default template by name
   */
  private getDefaultTemplateByName(name: string): EmailTemplate | null {
    const templates = this.getDefaultTemplates()
    return templates.find(t => 
      t.name.toLowerCase() === name.toLowerCase() || 
      t.id.toLowerCase() === name.toLowerCase()
    ) || null
  }
}

// Singleton instance
export const emailTemplateService = new EmailTemplateService()