/**
 * Audit Logs API - Enhanced audit reporting and log management
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'

interface AuditLogQuery {
  user_id?: string
  event_type?: string
  start_date?: string
  end_date?: string
  ip_address?: string
  limit?: number
  offset?: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: 'authentication' | 'data_access' | 'user_management' | 'system' | 'security'
}

interface AuditLogExport {
  format: 'csv' | 'json' | 'pdf'
  query: AuditLogQuery
}

interface UserActivityStats {
  user_id: string
  email: string
  name: string
  activity_count: number
}

interface SecurityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical'
  event_type: string
  success?: boolean
  ip_address?: string
  user_profiles?: {
    email: string
  }
}

interface SuspiciousPattern {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip_address?: string
  count?: number
}

// GET /api/admin/audit-logs - Retrieve audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const query: AuditLogQuery = {
      user_id: url.searchParams.get('user_id') || undefined,
      event_type: url.searchParams.get('event_type') || undefined,
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      ip_address: url.searchParams.get('ip_address') || undefined,
      severity: url.searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null || undefined,
      category: url.searchParams.get('category') as 'authentication' | 'data_access' | 'user_management' | 'system' | 'security' | null || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    }

    // Build the query
    let auditQuery = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user_profiles(id, email, first_name, last_name)
      `)
      .range(query.offset!, query.offset! + query.limit! - 1)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.user_id) {
      auditQuery = auditQuery.eq('user_id', query.user_id)
    }

    if (query.event_type) {
      auditQuery = auditQuery.eq('event_type', query.event_type)
    }

    if (query.start_date) {
      auditQuery = auditQuery.gte('created_at', query.start_date)
    }

    if (query.end_date) {
      auditQuery = auditQuery.lte('created_at', query.end_date)
    }

    if (query.ip_address) {
      auditQuery = auditQuery.eq('ip_address', query.ip_address)
    }

    if (query.severity) {
      auditQuery = auditQuery.eq('severity', query.severity)
    }

    if (query.category) {
      auditQuery = auditQuery.eq('category', query.category)
    }

    const { data: auditLogs, error } = await auditQuery

    if (error) {
      console.error('Error fetching audit logs:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve audit logs',
        500
      ))
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (query.user_id) countQuery = countQuery.eq('user_id', query.user_id)
    if (query.event_type) countQuery = countQuery.eq('event_type', query.event_type)
    if (query.start_date) countQuery = countQuery.gte('created_at', query.start_date)
    if (query.end_date) countQuery = countQuery.lte('created_at', query.end_date)
    if (query.ip_address) countQuery = countQuery.eq('ip_address', query.ip_address)
    if (query.severity) countQuery = countQuery.eq('severity', query.severity)
    if (query.category) countQuery = countQuery.eq('category', query.category)

    const { count } = await countQuery

    // Format the audit logs
    const formattedLogs = auditLogs?.map(log => ({
      id: log.id,
      event_type: log.event_type,
      category: log.category || 'system',
      severity: log.severity || 'low',
      user: log.user_profiles ? {
        id: log.user_profiles.id,
        email: log.user_profiles.email,
        name: `${log.user_profiles.first_name} ${log.user_profiles.last_name}`
      } : null,
      user_id: log.user_id,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      details: log.details,
      resource: log.resource,
      resource_id: log.resource_id,
      success: log.success,
      error_message: log.error_message,
      session_id: log.session_id,
      created_at: log.created_at
    })) || []

    return addCORSHeaders(createSuccessResponse({
      audit_logs: formattedLogs,
      pagination: {
        total: count || 0,
        offset: query.offset,
        limit: query.limit,
        has_more: (count || 0) > (query.offset! + query.limit!)
      },
      query: query
    }))

  } catch (error) {
    console.error('Audit logs retrieval error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve audit logs',
      500
    ))
  }
}

// POST /api/admin/audit-logs - Generate audit reports and exports
export async function POST(request: NextRequest) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    const { action } = await parseRequestBody<{ action: string }>(request)

    if (action === 'export') {
      return handleAuditLogExport(request)
    } else if (action === 'summary') {
      return handleAuditLogSummary(request)
    } else if (action === 'alerts') {
      return handleSecurityAlerts(request)
    } else {
      return addCORSHeaders(createErrorResponse(
        'INVALID_ACTION',
        'Action must be "export", "summary", or "alerts"',
        400
      ))
    }

  } catch (error) {
    console.error('Audit logs POST error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

async function handleAuditLogExport(request: NextRequest) {
  try {
    const { format, query } = await parseRequestBody<AuditLogExport>(request)

    if (!format || !['csv', 'json', 'pdf'].includes(format)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_FORMAT',
        'Export format must be csv, json, or pdf',
        400
      ))
    }

    // Build query with same logic as GET
    let auditQuery = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user_profiles(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.user_id) auditQuery = auditQuery.eq('user_id', query.user_id)
    if (query.event_type) auditQuery = auditQuery.eq('event_type', query.event_type)
    if (query.start_date) auditQuery = auditQuery.gte('created_at', query.start_date)
    if (query.end_date) auditQuery = auditQuery.lte('created_at', query.end_date)
    if (query.ip_address) auditQuery = auditQuery.eq('ip_address', query.ip_address)
    if (query.severity) auditQuery = auditQuery.eq('severity', query.severity)
    if (query.category) auditQuery = auditQuery.eq('category', query.category)

    // Limit to reasonable export size
    auditQuery = auditQuery.limit(query.limit || 1000)

    const { data: auditLogs, error } = await auditQuery

    if (error) {
      console.error('Error fetching audit logs for export:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve audit logs for export',
        500
      ))
    }

    // Format for export
    const exportData = auditLogs?.map(log => ({
      timestamp: log.created_at,
      event_type: log.event_type,
      category: log.category || 'system',
      severity: log.severity || 'low',
      user_email: log.user_profiles?.email || 'system',
      user_name: log.user_profiles ? `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 'System',
      ip_address: log.ip_address,
      resource: log.resource,
      resource_id: log.resource_id,
      success: log.success,
      error_message: log.error_message,
      details: JSON.stringify(log.details)
    })) || []

    // Generate export based on format
    let exportContent: string
    let contentType: string
    let filename: string

    switch (format) {
      case 'csv':
        exportContent = generateCSVExport(exportData)
        contentType = 'text/csv'
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'json':
        exportContent = JSON.stringify(exportData, null, 2)
        contentType = 'application/json'
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
        break
      case 'pdf':
        // For PDF, we'll return instructions to generate client-side
        return addCORSHeaders(createSuccessResponse({
          export_type: 'pdf',
          data: exportData,
          message: 'PDF export data prepared. Generate PDF on client side.'
        }))
      default:
        throw new Error('Unsupported export format')
    }

    return addCORSHeaders(createSuccessResponse({
      export_type: format,
      content: exportContent,
      content_type: contentType,
      filename: filename,
      record_count: exportData.length
    }))

  } catch (error) {
    console.error('Audit log export error:', error)
    return addCORSHeaders(createErrorResponse(
      'EXPORT_ERROR',
      'Failed to generate audit log export',
      500
    ))
  }
}

async function handleAuditLogSummary(request: NextRequest) {
  try {
    const { start_date, end_date } = await parseRequestBody<{
      start_date?: string
      end_date?: string
    }>(request)

    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = end_date || new Date().toISOString()

    // Get summary statistics
    const { data: totalEvents } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const { data: successfulEvents } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('success', true)

    const { data: failedEvents } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('success', false)

    // Get event type breakdown
    const { data: eventTypes } = await supabaseAdmin
      .from('audit_logs')
      .select('event_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // Get severity breakdown
    const { data: severityBreakdown } = await supabaseAdmin
      .from('audit_logs')
      .select('severity')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // Get top users by activity
    const { data: userActivity } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        user_id,
        user_profiles(email, first_name, last_name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('user_id', 'is', null)

    // Process the data
    const eventTypeStats = eventTypes?.reduce((acc: Record<string, number>, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const severityStats = severityBreakdown?.reduce((acc: Record<string, number>, log) => {
      const severity = log.severity || 'low'
      acc[severity] = (acc[severity] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const userStats = userActivity?.reduce((acc: Record<string, UserActivityStats>, log) => {
      if (log.user_id && log.user_profiles) {
        const key = log.user_id
        if (!acc[key]) {
          acc[key] = {
            user_id: log.user_id,
            email: log.user_profiles.email,
            name: `${log.user_profiles.first_name} ${log.user_profiles.last_name}`,
            activity_count: 0
          }
        }
        acc[key].activity_count += 1
      }
      return acc
    }, {} as Record<string, UserActivityStats>) || {}

    const topUsers = Object.values(userStats)
      .sort((a: UserActivityStats, b: UserActivityStats) => b.activity_count - a.activity_count)
      .slice(0, 10)

    return addCORSHeaders(createSuccessResponse({
      summary: {
        date_range: { start_date: startDate, end_date: endDate },
        total_events: totalEvents?.length || 0,
        successful_events: successfulEvents?.length || 0,
        failed_events: failedEvents?.length || 0,
        success_rate: totalEvents?.length ? 
          ((successfulEvents?.length || 0) / totalEvents.length * 100).toFixed(2) : '0.00'
      },
      event_types: eventTypeStats,
      severity_breakdown: severityStats,
      top_users: topUsers,
      charts: {
        event_distribution: Object.entries(eventTypeStats).map(([type, count]) => ({
          name: type,
          value: count
        })),
        severity_distribution: Object.entries(severityStats).map(([severity, count]) => ({
          name: severity,
          value: count
        }))
      }
    }))

  } catch (error) {
    console.error('Audit summary error:', error)
    return addCORSHeaders(createErrorResponse(
      'SUMMARY_ERROR',
      'Failed to generate audit summary',
      500
    ))
  }
}

async function handleSecurityAlerts(request: NextRequest) {
  try {
    const { hours_back } = await parseRequestBody<{ hours_back?: number }>(request)
    
    const hoursBack = hours_back || 24
    const alertThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

    // Define security alert conditions
    const securityEvents = [
      'login_failed',
      'password_reset_requested',
      'unauthorized_access_attempt',
      'suspicious_activity',
      'account_locked',
      'privilege_escalation',
      'data_export',
      'bulk_data_access'
    ]

    // Get recent security events
    const { data: alerts } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user_profiles(email, first_name, last_name)
      `)
      .in('event_type', securityEvents)
      .gte('created_at', alertThreshold)
      .order('created_at', { ascending: false })

    // Analyze for suspicious patterns
    const suspiciousActivity = await analyzeSuspiciousActivity(alerts || [])

    const formattedAlerts = alerts?.map(alert => ({
      id: alert.id,
      event_type: alert.event_type,
      severity: alert.severity || 'medium',
      user: alert.user_profiles ? {
        email: alert.user_profiles.email,
        name: `${alert.user_profiles.first_name} ${alert.user_profiles.last_name}`
      } : null,
      ip_address: alert.ip_address,
      details: alert.details,
      created_at: alert.created_at,
      risk_score: calculateRiskScore(alert)
    })) || []

    return addCORSHeaders(createSuccessResponse({
      security_alerts: formattedAlerts,
      suspicious_patterns: suspiciousActivity,
      summary: {
        total_alerts: formattedAlerts.length,
        high_risk_alerts: formattedAlerts.filter(a => a.risk_score >= 7).length,
        unique_ips: [...new Set(formattedAlerts.map(a => a.ip_address))].length,
        affected_users: [...new Set(formattedAlerts.map(a => a.user?.email))].filter(Boolean).length
      }
    }))

  } catch (error) {
    console.error('Security alerts error:', error)
    return addCORSHeaders(createErrorResponse(
      'ALERTS_ERROR',
      'Failed to retrieve security alerts',
      500
    ))
  }
}

// Helper functions
function generateCSVExport(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value
    ).join(',')
  )
  
  return [headers, ...rows].join('\n')
}

function calculateRiskScore(alert: SecurityAlert): number {
  let score = 1

  // Base severity score
  switch (alert.severity) {
    case 'critical': score += 4; break
    case 'high': score += 3; break
    case 'medium': score += 2; break
    case 'low': score += 1; break
  }

  // Event type risk
  const highRiskEvents = ['unauthorized_access_attempt', 'privilege_escalation', 'suspicious_activity']
  if (highRiskEvents.includes(alert.event_type)) {
    score += 3
  }

  // Failed operations are riskier
  if (alert.success === false) {
    score += 2
  }

  return Math.min(score, 10) // Cap at 10
}

async function analyzeSuspiciousActivity(alerts: SecurityAlert[]): Promise<SuspiciousPattern[]> {
  const patterns: SuspiciousPattern[] = []

  // Multiple failed logins from same IP
  const ipFailures = alerts
    .filter(a => a.event_type === 'login_failed')
    .reduce((acc: Record<string, number>, alert) => {
      if (alert.ip_address) {
        acc[alert.ip_address] = (acc[alert.ip_address] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

  Object.entries(ipFailures).forEach(([ip, count]) => {
    if ((count as number) >= 5) {
      patterns.push({
        type: 'multiple_failed_logins',
        description: `${count} failed login attempts from IP ${ip}`,
        severity: 'high',
        ip_address: ip,
        count: count
      })
    }
  })

  // Multiple users from same IP
  const ipUsers = alerts.reduce((acc: Record<string, Set<string>>, alert) => {
    if (alert.user_profiles?.email && alert.ip_address) {
      if (!acc[alert.ip_address]) acc[alert.ip_address] = new Set()
      acc[alert.ip_address].add(alert.user_profiles.email)
    }
    return acc
  }, {} as Record<string, Set<string>>)

  Object.entries(ipUsers).forEach(([ip, users]) => {
    if ((users as Set<string>).size >= 3) {
      patterns.push({
        type: 'multiple_users_same_ip',
        description: `${(users as Set<string>).size} different users from IP ${ip}`,
        severity: 'medium',
        ip_address: ip,
        user_count: (users as Set<string>).size
      })
    }
  })

  return patterns
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}