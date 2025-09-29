/**
 * Performance Optimization Utilities
 * T078: Performance optimization and final polish
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache configuration
export interface CacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
}

// Performance monitoring
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: NodeJS.MemoryUsage;
  requestId: string;
}

/**
 * API Response Caching Utility
 */
export class APICache {
  private static cache = new Map<string, { data: any; expires: number }>();
  
  static set(key: string, data: any, ttl: number = 300000): void {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }
  
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  static delete(key: string): void {
    this.cache.delete(key);
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  static generateKey(request: NextRequest, ...params: string[]): string {
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    return `${request.method}:${url.pathname}:${searchParams}:${params.join(':')}`;
  }
}

/**
 * Performance Monitoring Middleware
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      requestId: Math.random().toString(36).substr(2, 9)
    };

    try {
      const result = await fn(...args);
      
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      
      // Log performance metrics for slow operations
      if (metrics.duration > 1000) {
        console.warn(`Slow operation detected: ${name}`, {
          duration: metrics.duration,
          requestId: metrics.requestId,
          memoryDelta: process.memoryUsage().heapUsed - metrics.memoryUsage.heapUsed
        });
      }
      
      return result;
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      
      console.error(`Operation failed: ${name}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: metrics.duration,
        requestId: metrics.requestId
      });
      
      throw error;
    }
  };
}

/**
 * Response Compression Utility
 */
export function addCompressionHeaders(response: NextResponse): NextResponse {
  if (response.headers.get('content-encoding')) {
    return response;
  }
  
  const contentType = response.headers.get('content-type') || '';
  
  // Add compression hints for compressible content
  if (
    contentType.includes('application/json') ||
    contentType.includes('text/') ||
    contentType.includes('application/javascript') ||
    contentType.includes('application/xml')
  ) {
    response.headers.set('Vary', 'Accept-Encoding');
  }
  
  return response;
}

/**
 * Database Query Optimization
 */
export class QueryOptimizer {
  private static queryCache = new Map<string, { result: any; expires: number }>();
  
  static async optimizeQuery<T>(
    query: () => Promise<T>,
    cacheKey: string,
    ttl: number = 60000
  ): Promise<T> {
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }
    
    // Execute query with performance monitoring
    const startTime = Date.now();
    const result = await query();
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > 500) {
      console.warn(`Slow database query detected`, {
        cacheKey,
        duration,
        timestamp: new Date().toISOString()
      });
    }
    
    // Cache result
    this.queryCache.set(cacheKey, {
      result,
      expires: Date.now() + ttl
    });
    
    return result;
  }
  
  static invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.queryCache.clear();
      return;
    }
    
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }
}

/**
 * Request Rate Limiting
 */
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  static checkLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const current = this.requests.get(identifier);
    
    if (!current || now > current.resetTime) {
      // Reset window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs
      };
    }
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }
    
    current.count++;
    this.requests.set(identifier, current);
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime
    };
  }
  
  static addHeaders(response: NextResponse, rateLimitInfo: {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit?: number;
  }): NextResponse {
    response.headers.set('X-RateLimit-Limit', (rateLimitInfo.limit || 100).toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
    
    if (!rateLimitInfo.allowed) {
      response.headers.set('Retry-After', Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString());
    }
    
    return response;
  }
}

/**
 * Memory Management Utilities
 */
export class MemoryManager {
  private static readonly MAX_HEAP_USAGE = 0.85; // 85% of available heap
  
  static checkMemoryUsage(): {
    usage: NodeJS.MemoryUsage;
    isHigh: boolean;
    percentUsed: number;
  } {
    const usage = process.memoryUsage();
    const percentUsed = usage.heapUsed / usage.heapTotal;
    
    return {
      usage,
      isHigh: percentUsed > this.MAX_HEAP_USAGE,
      percentUsed: percentUsed * 100
    };
  }
  
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
  
  static async cleanupIfNeeded(): Promise<void> {
    const memoryStatus = this.checkMemoryUsage();
    
    if (memoryStatus.isHigh) {
      console.warn('High memory usage detected', {
        percentUsed: memoryStatus.percentUsed.toFixed(2),
        heapUsed: Math.round(memoryStatus.usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryStatus.usage.heapTotal / 1024 / 1024)
      });
      
      // Clear caches
      APICache.clear();
      QueryOptimizer.invalidateCache();
      
      // Force garbage collection if available
      this.forceGarbageCollection();
      
      // Wait for cleanup to complete
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

/**
 * Response Time Optimization
 */
export class ResponseOptimizer {
  static async optimizeResponse(
    data: any,
    options: {
      compress?: boolean;
      paginate?: boolean;
      fields?: string[];
      maxSize?: number;
    } = {}
  ): Promise<any> {
    let optimizedData = data;
    
    // Field selection
    if (options.fields && Array.isArray(optimizedData)) {
      optimizedData = optimizedData.map(item => 
        this.selectFields(item, options.fields!)
      );
    } else if (options.fields && typeof optimizedData === 'object') {
      optimizedData = this.selectFields(optimizedData, options.fields);
    }
    
    // Size limiting
    if (options.maxSize && Array.isArray(optimizedData)) {
      if (optimizedData.length > options.maxSize) {
        optimizedData = optimizedData.slice(0, options.maxSize);
      }
    }
    
    return optimizedData;
  }
  
  private static selectFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: any = {};
    for (const field of fields) {
      if (field.includes('.')) {
        // Handle nested fields
        const [parent, ...nested] = field.split('.');
        if (obj[parent]) {
          result[parent] = result[parent] || {};
          this.setNestedField(result[parent], nested.join('.'), obj[parent]);
        }
      } else if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    }
    
    return result;
  }
  
  private static setNestedField(obj: any, field: string, sourceObj: any): void {
    if (field.includes('.')) {
      const [parent, ...nested] = field.split('.');
      obj[parent] = obj[parent] || {};
      this.setNestedField(obj[parent], nested.join('.'), sourceObj[parent]);
    } else if (sourceObj && sourceObj.hasOwnProperty(field)) {
      obj[field] = sourceObj[field];
    }
  }
}

/**
 * Background Task Processing
 */
export class BackgroundProcessor {
  private static tasks: Array<() => Promise<void>> = [];
  private static processing = false;
  
  static addTask(task: () => Promise<void>): void {
    this.tasks.push(task);
    this.processQueue();
  }
  
  private static async processQueue(): Promise<void> {
    if (this.processing || this.tasks.length === 0) return;
    
    this.processing = true;
    
    try {
      while (this.tasks.length > 0) {
        const task = this.tasks.shift();
        if (task) {
          try {
            await task();
          } catch (error) {
            console.error('Background task failed:', error);
          }
        }
        
        // Check memory between tasks
        await MemoryManager.cleanupIfNeeded();
        
        // Yield control periodically
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally {
      this.processing = false;
    }
  }
}

/**
 * Health Check Utilities
 */
export class HealthChecker {
  static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, { status: 'pass' | 'fail'; details?: any }>;
  }> {
    const checks: Record<string, { status: 'pass' | 'fail'; details?: any }> = {};
    
    // Memory check
    const memoryStatus = MemoryManager.checkMemoryUsage();
    checks.memory = {
      status: memoryStatus.isHigh ? 'fail' : 'pass',
      details: {
        percentUsed: memoryStatus.percentUsed.toFixed(2),
        heapUsed: Math.round(memoryStatus.usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryStatus.usage.heapTotal / 1024 / 1024)
      }
    };
    
    // Cache size check
    const cacheSize = APICache['cache'].size;
    checks.cache = {
      status: cacheSize > 1000 ? 'fail' : 'pass',
      details: { size: cacheSize }
    };
    
    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (failedChecks.length > 0) {
      status = failedChecks.length > 1 ? 'critical' : 'warning';
    }
    
    return { status, checks };
  }
}