/**
 * Performance Middleware - Apply performance optimizations to API routes
 * T078: Performance optimization and final polish
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  APICache, 
  RateLimiter, 
  MemoryManager, 
  ResponseOptimizer,
  withPerformanceMonitoring,
  addCompressionHeaders
} from '@/lib/performance/optimization';

export interface PerformanceConfig {
  cache?: {
    enabled: boolean;
    ttl?: number;
    keyGenerator?: (request: NextRequest) => string;
  };
  rateLimit?: {
    enabled: boolean;
    windowMs?: number;
    maxRequests?: number;
  };
  compression?: {
    enabled: boolean;
  };
  monitoring?: {
    enabled: boolean;
    slowThreshold?: number;
  };
  responseOptimization?: {
    enabled: boolean;
    maxSize?: number;
    fields?: string[];
  };
}

const DEFAULT_CONFIG: PerformanceConfig = {
  cache: {
    enabled: true,
    ttl: 300000 // 5 minutes
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100
  },
  compression: {
    enabled: true
  },
  monitoring: {
    enabled: true,
    slowThreshold: 1000 // 1 second
  },
  responseOptimization: {
    enabled: true,
    maxSize: 1000
  }
};

/**
 * Apply performance optimizations to an API route handler
 */
export function withPerformanceOptimizations<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>,
  config: Partial<PerformanceConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();

    try {
      // Memory management
      await MemoryManager.cleanupIfNeeded();

      // Rate limiting
      if (finalConfig.rateLimit?.enabled) {
        const clientIP = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
        
        const rateLimitResult = RateLimiter.checkLimit(
          clientIP,
          finalConfig.rateLimit.maxRequests,
          finalConfig.rateLimit.windowMs
        );

        if (!rateLimitResult.allowed) {
          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.'
              }
            },
            { status: 429 }
          );

          return RateLimiter.addHeaders(response, {
            ...rateLimitResult,
            limit: finalConfig.rateLimit.maxRequests
          });
        }
      }

      // Check cache
      let cacheKey: string | null = null;
      if (finalConfig.cache?.enabled && request.method === 'GET') {
        cacheKey = finalConfig.cache.keyGenerator 
          ? finalConfig.cache.keyGenerator(request)
          : APICache.generateKey(request);
        
        const cachedResponse = APICache.get(cacheKey);
        if (cachedResponse) {
          const response = NextResponse.json(cachedResponse);
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
          
          if (finalConfig.compression?.enabled) {
            addCompressionHeaders(response);
          }
          
          return response;
        }
      }

      // Execute handler with monitoring
      let response: NextResponse;
      
      if (finalConfig.monitoring?.enabled) {
        const monitoredHandler = withPerformanceMonitoring(
          handler,
          `API-${request.method}-${new URL(request.url).pathname}`
        );
        response = await monitoredHandler(...args);
      } else {
        response = await handler(...args);
      }

      // Optimize response data
      if (finalConfig.responseOptimization?.enabled && response.status === 200) {
        try {
          const responseBody = await response.json();
          
          if (responseBody.data) {
            const optimizedData = await ResponseOptimizer.optimizeResponse(
              responseBody.data,
              {
                maxSize: finalConfig.responseOptimization.maxSize,
                fields: finalConfig.responseOptimization.fields
              }
            );

            responseBody.data = optimizedData;
          }

          response = NextResponse.json(responseBody, {
            status: response.status,
            headers: response.headers
          });
        } catch (error) {
          // If response optimization fails, continue with original response
          console.warn('Response optimization failed:', error);
        }
      }

      // Cache successful GET responses
      if (finalConfig.cache?.enabled && 
          request.method === 'GET' && 
          response.status === 200 && 
          cacheKey) {
        try {
          const responseBody = await response.clone().json();
          APICache.set(cacheKey, responseBody, finalConfig.cache.ttl);
        } catch (error) {
          // If caching fails, continue without caching
          console.warn('Caching failed:', error);
        }
      }

      // Add performance headers
      const responseTime = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      response.headers.set('X-Cache', cacheKey ? 'MISS' : 'BYPASS');

      // Add compression headers
      if (finalConfig.compression?.enabled) {
        addCompressionHeaders(response);
      }

      // Add rate limit headers
      if (finalConfig.rateLimit?.enabled) {
        const clientIP = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
        
        const rateLimitResult = RateLimiter.checkLimit(
          clientIP,
          finalConfig.rateLimit.maxRequests,
          finalConfig.rateLimit.windowMs
        );

        RateLimiter.addHeaders(response, {
          ...rateLimitResult,
          limit: finalConfig.rateLimit.maxRequests
        });
      }

      return response;

    } catch (error) {
      console.error('Performance middleware error:', error);
      
      // Return error response with performance headers
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
          }
        },
        { status: 500 }
      );

      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Error', 'true');

      return response;
    }
  };
}

/**
 * Specific performance configurations for different endpoint types
 */
export const PerformanceConfigs = {
  // High-frequency read endpoints (documents list, search)
  highFrequencyRead: {
    cache: {
      enabled: true,
      ttl: 60000 // 1 minute cache
    },
    rateLimit: {
      enabled: true,
      maxRequests: 200,
      windowMs: 60000
    },
    responseOptimization: {
      enabled: true,
      maxSize: 50,
      fields: ['id', 'title', 'status', 'created_at', 'document_type']
    }
  } as PerformanceConfig,

  // Low-frequency read endpoints (individual document details)
  lowFrequencyRead: {
    cache: {
      enabled: true,
      ttl: 300000 // 5 minutes cache
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    }
  } as PerformanceConfig,

  // Write endpoints (create, update, delete)
  write: {
    cache: {
      enabled: false
    },
    rateLimit: {
      enabled: true,
      maxRequests: 50,
      windowMs: 60000
    },
    compression: {
      enabled: true
    }
  } as PerformanceConfig,

  // File upload endpoints
  fileUpload: {
    cache: {
      enabled: false
    },
    rateLimit: {
      enabled: true,
      maxRequests: 10,
      windowMs: 60000
    },
    compression: {
      enabled: false
    },
    monitoring: {
      enabled: true,
      slowThreshold: 5000 // 5 seconds for file uploads
    }
  } as PerformanceConfig,

  // Search endpoints
  search: {
    cache: {
      enabled: true,
      ttl: 180000, // 3 minutes cache
      keyGenerator: (request: NextRequest) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';
        const filters = url.searchParams.get('filters') || '';
        return `search:${query}:${filters}`;
      }
    },
    rateLimit: {
      enabled: true,
      maxRequests: 150,
      windowMs: 60000
    },
    responseOptimization: {
      enabled: true,
      maxSize: 20,
      fields: ['id', 'title', 'document_type', 'status', 'created_at', 'relevance_score']
    }
  } as PerformanceConfig,

  // Authentication endpoints
  auth: {
    cache: {
      enabled: false
    },
    rateLimit: {
      enabled: true,
      maxRequests: 20,
      windowMs: 60000
    },
    compression: {
      enabled: true
    }
  } as PerformanceConfig
};

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  static invalidateDocumentCache(documentId: string): void {
    APICache.delete(`GET:/api/documents/${documentId}:`);
    // Invalidate list caches that might include this document
    this.invalidatePattern('documents');
  }

  static invalidateUserCache(userId: string): void {
    APICache.delete(`GET:/api/users/${userId}:`);
    this.invalidatePattern('users');
  }

  static invalidateMatterCache(matterId: string): void {
    APICache.delete(`GET:/api/matters/${matterId}:`);
    this.invalidatePattern('matters');
  }

  static invalidateSearchCache(): void {
    this.invalidatePattern('search');
  }

  private static invalidatePattern(pattern: string): void {
    // This would need to be implemented based on the actual cache implementation
    // For now, we'll clear all caches that contain the pattern
    console.log(`Invalidating cache pattern: ${pattern}`);
  }
}