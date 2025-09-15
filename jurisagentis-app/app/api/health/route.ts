/**
 * Health Check API - For production monitoring and load balancing
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy'
    redis?: 'healthy' | 'degraded' | 'unhealthy'
    email?: 'healthy' | 'degraded' | 'unhealthy'
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    duration: number
    message?: string
  }>
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const checks: HealthStatus['checks'] = []
  let overallStatus: HealthStatus['status'] = 'healthy'
  
  try {
    // Check database connectivity
    const dbStartTime = Date.now()
    let databaseStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    try {
      const { data, error } = await supabaseAdmin
        .from('user_allowlist')
        .select('id')
        .limit(1)
      
      const dbDuration = Date.now() - dbStartTime
      
      if (error || !data) {
        databaseStatus = 'unhealthy'
        overallStatus = 'unhealthy'
        checks.push({
          name: 'database',
          status: 'fail',
          duration: dbDuration,
          message: error?.message || 'No data returned'
        })
      } else if (dbDuration > 1000) {
        databaseStatus = 'degraded'
        if (overallStatus === 'healthy') overallStatus = 'degraded'
        checks.push({
          name: 'database',
          status: 'warn',
          duration: dbDuration,
          message: 'Slow response time'
        })
      } else {
        checks.push({
          name: 'database',
          status: 'pass',
          duration: dbDuration
        })
      }
    } catch (dbError) {
      databaseStatus = 'unhealthy'
      overallStatus = 'unhealthy'
      checks.push({
        name: 'database',
        status: 'fail',
        duration: Date.now() - dbStartTime,
        message: dbError instanceof Error ? dbError.message : 'Database connection failed'
      })
    }
    
    // Memory usage check
    const memoryStartTime = Date.now()
    const memoryUsage = process.memoryUsage()
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryPercentage = (memoryUsedMB / memoryTotalMB) * 100
    const memoryDuration = Date.now() - memoryStartTime
    
    if (memoryPercentage > 90) {
      if (overallStatus === 'healthy') overallStatus = 'degraded'
      checks.push({
        name: 'memory',
        status: 'warn',
        duration: memoryDuration,
        message: `High memory usage: ${memoryPercentage.toFixed(1)}%`
      })
    } else {
      checks.push({
        name: 'memory',
        status: 'pass',
        duration: memoryDuration
      })
    }
    
    // Environment variables check
    const envStartTime = Date.now()
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    const envDuration = Date.now() - envStartTime
    
    if (missingEnvVars.length > 0) {
      overallStatus = 'unhealthy'
      checks.push({
        name: 'environment',
        status: 'fail',
        duration: envDuration,
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      })
    } else {
      checks.push({
        name: 'environment',
        status: 'pass',
        duration: envDuration
      })
    }
    
    // Response time check
    const totalDuration = Date.now() - startTime
    if (totalDuration > 5000) {
      if (overallStatus === 'healthy') overallStatus = 'degraded'
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseStatus
      },
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: Math.round(memoryPercentage)
      },
      checks
    }
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    const response = addCORSHeaders(createSuccessResponse(healthStatus))
    
    // Override status for unhealthy
    if (overallStatus === 'unhealthy') {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'SERVICE_UNHEALTHY',
          message: 'One or more health checks failed'
        },
        data: healthStatus
      }), {
        status: 503,
        headers: response.headers
      })
    }
    
    return new Response(response.body, {
      status: httpStatus,
      headers: response.headers
    })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    const unhealthyStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unhealthy'
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      checks: [
        {
          name: 'health_check',
          status: 'fail',
          duration: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'Health check failed'
        }
      ]
    }
    
    return addCORSHeaders(new Response(JSON.stringify({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check encountered an error'
      },
      data: unhealthyStatus
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    }))
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}