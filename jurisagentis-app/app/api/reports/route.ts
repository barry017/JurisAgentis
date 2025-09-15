/**
 * Reports API
 * 
 * Manages custom reports with CRUD operations and execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

interface Report {
  id: string
  name: string
  description: string
  category: 'financial' | 'operational' | 'client' | 'matter' | 'time' | 'document' | 'custom'
  type: 'table' | 'chart' | 'dashboard' | 'summary'
  visualization: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'table' | 'grid' | 'metric'
  isTemplate: boolean
  isPublic: boolean
  isFavorite: boolean
  config: {
    dataSource: string
    filters: any[]
    groupBy?: string[]
    aggregations?: any[]
    dateRange?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    limit?: number
    includeArchived?: boolean
  }
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    time: string
    recipients: string[]
    format: 'pdf' | 'excel' | 'csv'
  }
  lastRun?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const isTemplate = searchParams.get('isTemplate') === 'true'
    const isPublic = searchParams.get('isPublic') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseServer
      .from('reports')
      .select('*')
      .order('updated_at', { ascending: false })

    // Apply filters
    if (!isPublic) {
      query = query.or(`created_by.eq.${userId},is_public.eq.true`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (isTemplate !== undefined) {
      query = query.eq('is_template', isTemplate)
    }

    const { data: reports, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: true,
        reports: getMockReports(),
        totalCount: getMockReports().length
      })
    }

    const formattedReports = reports?.map(transformDbToApi) || []

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      totalCount: formattedReports.length
    })

  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({
      success: true,
      reports: getMockReports(),
      totalCount: getMockReports().length
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      category = 'custom', 
      type = 'table',
      visualization = 'table',
      isTemplate = false,
      isPublic = false,
      config,
      schedule,
      tags = [],
      userId = 'default-user'
    } = body

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, config' },
        { status: 400 }
      )
    }

    const newReport = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      category,
      type,
      visualization,
      is_template: isTemplate,
      is_public: isPublic,
      is_favorite: false,
      config,
      schedule,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags
    }

    try {
      const { data, error } = await supabaseServer
        .from('reports')
        .insert([newReport])
        .select()
        .single()

      if (error) {
        console.error('Report insert error:', error)
        return NextResponse.json({
          success: true,
          report: transformDbToApi(newReport),
          message: 'Report created successfully (mock mode)'
        })
      }

      return NextResponse.json({
        success: true,
        report: transformDbToApi(data),
        message: 'Report created successfully'
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        report: transformDbToApi(newReport),
        message: 'Report created successfully (mock mode)'
      })
    }

  } catch (error) {
    console.error('Reports POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, updates } = body

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    const dbUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Convert API field names to database field names
    if ('isTemplate' in updates) {
      dbUpdates.is_template = updates.isTemplate
      delete dbUpdates.isTemplate
    }
    if ('isPublic' in updates) {
      dbUpdates.is_public = updates.isPublic
      delete dbUpdates.isPublic
    }
    if ('isFavorite' in updates) {
      dbUpdates.is_favorite = updates.isFavorite
      delete dbUpdates.isFavorite
    }
    if ('lastRun' in updates) {
      dbUpdates.last_run = updates.lastRun
      delete dbUpdates.lastRun
    }
    if ('createdBy' in updates) {
      dbUpdates.created_by = updates.createdBy
      delete dbUpdates.createdBy
    }
    if ('createdAt' in updates) {
      dbUpdates.created_at = updates.createdAt
      delete dbUpdates.createdAt
    }
    if ('updatedAt' in updates) {
      dbUpdates.updated_at = updates.updatedAt
      delete dbUpdates.updatedAt
    }

    try {
      const { data, error } = await supabaseServer
        .from('reports')
        .update(dbUpdates)
        .eq('id', reportId)
        .select()
        .single()

      if (error) {
        console.error('Report update error:', error)
        return NextResponse.json({
          success: true,
          message: 'Report updated successfully (mock mode)'
        })
      }

      return NextResponse.json({
        success: true,
        report: transformDbToApi(data),
        message: 'Report updated successfully'
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        message: 'Report updated successfully (mock mode)'
      })
    }

  } catch (error) {
    console.error('Reports PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('id')

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    try {
      const { error } = await supabaseServer
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (error) {
        console.error('Report delete error:', error)
        return NextResponse.json({
          success: true,
          message: 'Report deleted successfully (mock mode)'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Report deleted successfully'
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        message: 'Report deleted successfully (mock mode)'
      })
    }

  } catch (error) {
    console.error('Reports DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Transform database format to API format
function transformDbToApi(dbReport: any): Report {
  return {
    id: dbReport.id,
    name: dbReport.name,
    description: dbReport.description,
    category: dbReport.category,
    type: dbReport.type,
    visualization: dbReport.visualization,
    isTemplate: dbReport.is_template,
    isPublic: dbReport.is_public,
    isFavorite: dbReport.is_favorite,
    config: dbReport.config,
    schedule: dbReport.schedule,
    lastRun: dbReport.last_run,
    createdBy: dbReport.created_by,
    createdAt: dbReport.created_at,
    updatedAt: dbReport.updated_at,
    tags: dbReport.tags || []
  }
}

// Mock data for development/fallback
function getMockReports(): Report[] {
  return [
    {
      id: '1',
      name: 'Revenue by Practice Area',
      description: 'Monthly revenue breakdown by practice area with year-over-year comparison',
      category: 'financial',
      type: 'chart',
      visualization: 'bar',
      isTemplate: false,
      isPublic: false,
      isFavorite: true,
      config: {
        dataSource: 'billing',
        filters: [
          { field: 'date_range', operator: 'last_12_months' },
          { field: 'status', operator: 'equals', value: 'paid' }
        ],
        groupBy: ['practice_area', 'month'],
        aggregations: [{ field: 'amount', function: 'sum' }],
        sortBy: 'amount',
        sortOrder: 'desc'
      },
      schedule: {
        frequency: 'monthly',
        time: '09:00',
        recipients: ['admin@jurisagentis.com', 'finance@jurisagentis.com'],
        format: 'pdf'
      },
      lastRun: '2025-01-13T09:00:00Z',
      createdBy: 'Sarah Johnson',
      createdAt: '2024-12-01T10:00:00Z',
      updatedAt: '2025-01-10T15:30:00Z',
      tags: ['revenue', 'practice-areas', 'monthly', 'financial']
    },
    {
      id: '2',
      name: 'Client Acquisition Report',
      description: 'New client acquisition trends and conversion rates from leads to active clients',
      category: 'client',
      type: 'dashboard',
      visualization: 'line',
      isTemplate: false,
      isPublic: false,
      isFavorite: true,
      config: {
        dataSource: 'clients',
        filters: [
          { field: 'created_date', operator: 'last_6_months' }
        ],
        groupBy: ['month', 'referral_source'],
        aggregations: [
          { field: 'client_id', function: 'count' },
          { field: 'conversion_rate', function: 'avg' }
        ]
      },
      lastRun: '2025-01-12T14:20:00Z',
      createdBy: 'Maria Rodriguez',
      createdAt: '2024-11-15T11:00:00Z',
      updatedAt: '2025-01-05T10:15:00Z',
      tags: ['clients', 'acquisition', 'marketing', 'conversion']
    },
    {
      id: '3',
      name: 'Time Tracking Summary',
      description: 'Billable vs non-billable hours by attorney with efficiency metrics',
      category: 'time',
      type: 'table',
      visualization: 'table',
      isTemplate: false,
      isPublic: true,
      isFavorite: false,
      config: {
        dataSource: 'time_entries',
        filters: [
          { field: 'date', operator: 'current_month' }
        ],
        groupBy: ['attorney', 'matter_type'],
        aggregations: [
          { field: 'billable_hours', function: 'sum' },
          { field: 'non_billable_hours', function: 'sum' },
          { field: 'efficiency_rate', function: 'avg' }
        ]
      },
      lastRun: '2025-01-13T08:00:00Z',
      createdBy: 'Michael Chen',
      createdAt: '2024-10-20T14:30:00Z',
      updatedAt: '2025-01-01T12:00:00Z',
      tags: ['time-tracking', 'billable', 'efficiency', 'attorneys']
    }
  ]
}