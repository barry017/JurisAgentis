/**
 * Analytics API - Comprehensive reporting and analytics data
 */

import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  addCORSHeaders
} from '@/lib/api/response'
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware'

interface ReportFilter {
  start_date?: string
  end_date?: string
  matter_id?: string
  client_id?: string
  attorney_id?: string
  practice_area?: string
  report_type: 'financial' | 'productivity' | 'client' | 'matter' | 'billing' | 'time_tracking'
}

interface FinancialReport {
  total_revenue: number
  total_expenses: number
  net_profit: number
  outstanding_invoices: number
  overdue_amount: number
  collection_rate: number
  average_invoice_amount: number
  revenue_by_practice_area: Array<{
    practice_area: string
    revenue: number
    percentage: number
  }>
  monthly_revenue: Array<{
    month: string
    revenue: number
    invoices_sent: number
    payments_received: number
  }>
}

interface ProductivityReport {
  total_hours_logged: number
  billable_hours: number
  non_billable_hours: number
  utilization_rate: number
  average_hourly_rate: number
  hours_by_attorney: Array<{
    attorney_name: string
    total_hours: number
    billable_hours: number
    utilization_rate: number
  }>
  hours_by_practice_area: Array<{
    practice_area: string
    hours: number
    percentage: number
  }>
  daily_productivity: Array<{
    date: string
    hours_logged: number
    billable_hours: number
  }>
}

interface ClientReport {
  total_clients: number
  active_clients: number
  new_clients_this_period: number
  client_retention_rate: number
  average_matter_value: number
  clients_by_type: Array<{
    client_type: string
    count: number
    percentage: number
  }>
  top_clients_by_revenue: Array<{
    client_name: string
    total_revenue: number
    active_matters: number
  }>
  client_acquisition_trend: Array<{
    month: string
    new_clients: number
    lost_clients: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can view reports
    if (!['admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to view analytics',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const report_type = url.searchParams.get('type') as ReportFilter['report_type'] || 'financial'
    const start_date = url.searchParams.get('start_date')
    const end_date = url.searchParams.get('end_date')
    const matter_id = url.searchParams.get('matter_id')
    const client_id = url.searchParams.get('client_id')
    const attorney_id = url.searchParams.get('attorney_id')
    const practice_area = url.searchParams.get('practice_area')

    let reportData = {}
    let error = null

    try {
      // In a real implementation, this would query the database
      // For now, we'll use comprehensive mock data
      reportData = generateMockReport(report_type, {
        start_date,
        end_date,
        matter_id,
        client_id,
        attorney_id,
        practice_area,
        report_type
      })
      
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock report data')
        reportData = generateMockReport(report_type, {
          start_date,
          end_date,
          matter_id,
          client_id,
          attorney_id,
          practice_area,
          report_type
        })
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to generate analytics report',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'analytics_report_generated',
      user.uid,
      request,
      { 
        report_type,
        filters: { start_date, end_date, matter_id, client_id, attorney_id, practice_area }
      }
    )

    return addCORSHeaders(createSuccessResponse({
      report_type,
      generated_at: new Date().toISOString(),
      filters: { start_date, end_date, matter_id, client_id, attorney_id, practice_area },
      data: reportData
    }))

  } catch (error) {
    console.error('Analytics report generation error:', error)
    
    // Handle authentication errors properly
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ))
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

function generateMockReport(reportType: string, filters: ReportFilter): FinancialReport | ProductivityReport | ClientReport | Record<string, unknown> {
  // const currentDate = new Date() // Unused for now, will be used for date-based filtering

  switch (reportType) {
    case 'financial':
      return {
        total_revenue: 485750.00,
        total_expenses: 125300.00,
        net_profit: 360450.00,
        outstanding_invoices: 18,
        overdue_amount: 45280.00,
        collection_rate: 92.5,
        average_invoice_amount: 3250.00,
        revenue_by_practice_area: [
          { practice_area: 'Estate Planning', revenue: 195000.00, percentage: 40.1 },
          { practice_area: 'Business Law', revenue: 146300.00, percentage: 30.1 },
          { practice_area: 'Real Estate', revenue: 87200.00, percentage: 18.0 },
          { practice_area: 'Family Law', revenue: 57250.00, percentage: 11.8 }
        ],
        monthly_revenue: [
          { month: '2024-07', revenue: 42500.00, invoices_sent: 15, payments_received: 13 },
          { month: '2024-08', revenue: 38900.00, invoices_sent: 12, payments_received: 14 },
          { month: '2024-09', revenue: 45200.00, invoices_sent: 18, payments_received: 16 },
          { month: '2024-10', revenue: 52800.00, invoices_sent: 16, payments_received: 17 },
          { month: '2024-11', revenue: 48300.00, invoices_sent: 14, payments_received: 15 },
          { month: '2024-12', revenue: 41250.00, invoices_sent: 13, payments_received: 12 },
          { month: '2025-01', revenue: 28750.00, invoices_sent: 9, payments_received: 8 }
        ]
      } as FinancialReport

    case 'productivity':
      return {
        total_hours_logged: 2840.5,
        billable_hours: 2130.75,
        non_billable_hours: 709.75,
        utilization_rate: 75.0,
        average_hourly_rate: 285.00,
        hours_by_attorney: [
          { attorney_name: 'Sarah Johnson', total_hours: 845.25, billable_hours: 650.50, utilization_rate: 77.0 },
          { attorney_name: 'Michael Davis', total_hours: 782.00, billable_hours: 598.25, utilization_rate: 76.5 },
          { attorney_name: 'Lisa Wilson', total_hours: 695.50, billable_hours: 512.00, utilization_rate: 73.6 },
          { attorney_name: 'Robert Brown', total_hours: 517.75, billable_hours: 370.00, utilization_rate: 71.5 }
        ],
        hours_by_practice_area: [
          { practice_area: 'Estate Planning', hours: 1152.25, percentage: 40.6 },
          { practice_area: 'Business Law', hours: 895.50, percentage: 31.5 },
          { practice_area: 'Real Estate', hours: 512.75, percentage: 18.0 },
          { practice_area: 'Family Law', hours: 280.00, percentage: 9.9 }
        ],
        daily_productivity: generateDailyProductivity()
      } as ProductivityReport

    case 'client':
      return {
        total_clients: 247,
        active_clients: 189,
        new_clients_this_period: 23,
        client_retention_rate: 88.5,
        average_matter_value: 8750.00,
        clients_by_type: [
          { client_type: 'Individual', count: 156, percentage: 63.2 },
          { client_type: 'Small Business', count: 67, percentage: 27.1 },
          { client_type: 'Corporation', count: 18, percentage: 7.3 },
          { client_type: 'Non-Profit', count: 6, percentage: 2.4 }
        ],
        top_clients_by_revenue: [
          { client_name: 'TechStart LLC', total_revenue: 45250.00, active_matters: 3 },
          { client_name: 'Smith Family Trust', total_revenue: 28900.00, active_matters: 2 },
          { client_name: 'Acme Corporation', total_revenue: 22450.00, active_matters: 4 },
          { client_name: 'Williams Estate', total_revenue: 19800.00, active_matters: 1 },
          { client_name: 'Green Energy Partners', total_revenue: 18750.00, active_matters: 2 }
        ],
        client_acquisition_trend: generateClientTrend()
      } as ClientReport

    case 'matter':
      return {
        total_matters: 156,
        active_matters: 89,
        completed_matters_this_period: 34,
        average_matter_duration: 4.2, // months
        average_matter_value: 8750.00,
        matters_by_status: [
          { status: 'Active', count: 89, percentage: 57.1 },
          { status: 'Pending', count: 23, percentage: 14.7 },
          { status: 'On Hold', count: 12, percentage: 7.7 },
          { status: 'Completed', count: 32, percentage: 20.5 }
        ],
        matters_by_practice_area: [
          { practice_area: 'Estate Planning', count: 67, percentage: 42.9 },
          { practice_area: 'Business Law', count: 45, percentage: 28.8 },
          { practice_area: 'Real Estate', count: 28, percentage: 17.9 },
          { practice_area: 'Family Law', count: 16, percentage: 10.3 }
        ],
        matter_completion_trend: generateMatterTrend()
      }

    case 'billing':
      return {
        total_invoiced: 485750.00,
        total_collected: 449420.00,
        outstanding_balance: 36330.00,
        overdue_balance: 12450.00,
        collection_efficiency: 92.5,
        average_days_to_payment: 18.5,
        invoice_status_breakdown: [
          { status: 'Paid', count: 145, amount: 449420.00, percentage: 78.4 },
          { status: 'Sent', count: 23, amount: 23880.00, percentage: 12.4 },
          { status: 'Overdue', count: 12, amount: 12450.00, percentage: 6.7 },
          { status: 'Draft', count: 5, amount: 8250.00, percentage: 2.7 }
        ],
        payment_method_breakdown: [
          { method: 'ACH Transfer', amount: 267850.00, percentage: 59.6 },
          { method: 'Check', amount: 123680.00, percentage: 27.5 },
          { method: 'Credit Card', amount: 42390.00, percentage: 9.4 },
          { method: 'Wire Transfer', amount: 15500.00, percentage: 3.4 }
        ],
        aging_report: [
          { age_range: '0-30 days', amount: 23880.00, count: 23 },
          { age_range: '31-60 days', amount: 8750.00, count: 8 },
          { age_range: '61-90 days', amount: 3700.00, count: 4 },
          { age_range: '90+ days', amount: 12450.00, count: 12 }
        ]
      }

    case 'time_tracking':
      return {
        total_time_entries: 1247,
        total_hours_logged: 2840.5,
        billable_hours: 2130.75,
        non_billable_hours: 709.75,
        average_daily_hours: 7.2,
        time_by_activity: [
          { activity: 'Client Meetings', hours: 485.25, percentage: 17.1 },
          { activity: 'Document Drafting', hours: 842.50, percentage: 29.7 },
          { activity: 'Research', hours: 395.75, percentage: 13.9 },
          { activity: 'Court Appearances', hours: 215.00, percentage: 7.6 },
          { activity: 'Administrative', hours: 425.50, percentage: 15.0 },
          { activity: 'Phone Calls', hours: 312.25, percentage: 11.0 },
          { activity: 'Travel', hours: 164.25, percentage: 5.8 }
        ],
        time_entry_accuracy: 94.2,
        late_entries_percentage: 8.5,
        weekly_time_trend: generateWeeklyTimeTrend()
      }

    default:
      return generateMockReport('financial', filters)
  }
}

function generateDailyProductivity() {
  const data = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const baseHours = isWeekend ? 0 : 7 + Math.random() * 3
    const billableHours = baseHours * (0.7 + Math.random() * 0.2)
    
    data.push({
      date: date.toISOString().split('T')[0],
      hours_logged: Number(baseHours.toFixed(1)),
      billable_hours: Number(billableHours.toFixed(1))
    })
  }
  
  return data
}

function generateClientTrend() {
  const data = []
  const today = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    
    data.push({
      month: date.toISOString().substring(0, 7),
      new_clients: Math.floor(Math.random() * 8) + 2,
      lost_clients: Math.floor(Math.random() * 3)
    })
  }
  
  return data
}

function generateMatterTrend() {
  const data = []
  const today = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    
    data.push({
      month: date.toISOString().substring(0, 7),
      completed_matters: Math.floor(Math.random() * 12) + 3,
      new_matters: Math.floor(Math.random() * 15) + 5
    })
  }
  
  return data
}

function generateWeeklyTimeTrend() {
  const data = []
  const today = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (i * 7))
    
    const weekHours = 35 + Math.random() * 15
    const billableHours = weekHours * (0.7 + Math.random() * 0.2)
    
    data.push({
      week_start: startDate.toISOString().split('T')[0],
      total_hours: Number(weekHours.toFixed(1)),
      billable_hours: Number(billableHours.toFixed(1))
    })
  }
  
  return data
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function POST() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'OPTIONS']))
}

export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'OPTIONS']))
}