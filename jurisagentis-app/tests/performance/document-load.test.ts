/**
 * Performance Test Suite: Document Management Load Testing
 * T078: Performance tests validating <200ms response times and scalability
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Test configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PERFORMANCE_TARGET_MS = 200;
const LOAD_TEST_CONCURRENT_USERS = 50;
const STRESS_TEST_ITERATIONS = 1000;

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface LoadTestResult {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  errors: string[];
}

class PerformanceTester {
  private metrics: PerformanceMetrics[] = [];
  private testToken: string = 'test-auth-token';

  /**
   * Measure response time for a single API call
   */
  async measureResponseTime(
    url: string, 
    options: RequestInit = {}
  ): Promise<{ responseTime: number; success: boolean; error?: string }> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.testToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        responseTime,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error) {
      const endTime = performance.now();
      return {
        responseTime: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run load test with concurrent users
   */
  async runLoadTest(
    testFunction: () => Promise<{ responseTime: number; success: boolean; error?: string }>,
    concurrentUsers: number,
    duration: number
  ): Promise<LoadTestResult> {
    const results: Array<{ responseTime: number; success: boolean; error?: string }> = [];
    const errors: string[] = [];
    const startTime = Date.now();
    const endTime = startTime + duration;

    // Create concurrent user sessions
    const userPromises: Promise<void>[] = [];

    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = (async () => {
        while (Date.now() < endTime) {
          try {
            const result = await testFunction();
            results.push(result);
            
            if (!result.success && result.error) {
              errors.push(result.error);
            }

            // Small delay between requests per user
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      })();

      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    // Calculate metrics
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const successfulRequests = results.filter(r => r.success).length;
    const totalRequests = results.length;
    const testDurationSeconds = (Date.now() - startTime) / 1000;

    return {
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      medianResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length / 2)] : 0,
      p95ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
      p99ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      requestsPerSecond: totalRequests / testDurationSeconds,
      errors: [...new Set(errors)] // Remove duplicates
    };
  }

  /**
   * Create test data for performance testing
   */
  async createTestData(count: number): Promise<string[]> {
    const documentIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.measureResponseTime(`${API_BASE}/api/documents`, {
        method: 'POST',
        body: JSON.stringify({
          title: `Performance Test Document ${i}`,
          content: `Test content for document ${i}`,
          matter_id: 'test-matter-id',
          document_type: 'test'
        })
      });

      if (result.success) {
        // Extract document ID from response (would need actual response parsing)
        documentIds.push(`test-doc-${i}`);
      }
    }

    return documentIds;
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(documentIds: string[]): Promise<void> {
    const deletePromises = documentIds.map(id =>
      this.measureResponseTime(`${API_BASE}/api/documents/${id}`, {
        method: 'DELETE'
      })
    );

    await Promise.all(deletePromises);
  }
}

describe('Document Management Performance Tests', () => {
  let performanceTester: PerformanceTester;
  let testDocuments: string[] = [];

  beforeAll(async () => {
    performanceTester = new PerformanceTester();
    
    // Create test documents for performance testing
    testDocuments = await performanceTester.createTestData(100);
  });

  afterAll(async () => {
    // Clean up test documents
    await performanceTester.cleanupTestData(testDocuments);
  });

  describe('API Response Time Performance', () => {
    it('should return document list within 200ms', async () => {
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents?limit=50`
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    });

    it('should return single document within 100ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}`
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(100);
    });

    it('should create document within 300ms', async () => {
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Performance Test Document',
            content: 'Test content',
            matter_id: 'test-matter-id',
            document_type: 'test'
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(300);
    });

    it('should update document within 200ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Performance Test Document',
            content: 'Updated test content'
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    });

    it('should search documents within 500ms', async () => {
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/search?q=performance&limit=20`
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(500);
    });
  });

  describe('Load Testing', () => {
    it('should handle 50 concurrent users reading documents', async () => {
      const loadTestResult = await performanceTester.runLoadTest(
        () => performanceTester.measureResponseTime(`${API_BASE}/api/documents?limit=10`),
        LOAD_TEST_CONCURRENT_USERS,
        30000 // 30 seconds
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(loadTestResult.p95ResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS * 2);
      expect(loadTestResult.failedRequests).toBeLessThan(loadTestResult.totalRequests * 0.01); // <1% error rate
      expect(loadTestResult.requestsPerSecond).toBeGreaterThan(10);

      console.log('Load Test Results:', {
        averageResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${loadTestResult.p95ResponseTime.toFixed(2)}ms`,
        requestsPerSecond: loadTestResult.requestsPerSecond.toFixed(2),
        successRate: `${((loadTestResult.successfulRequests / loadTestResult.totalRequests) * 100).toFixed(2)}%`
      });
    });

    it('should handle concurrent document creation', async () => {
      let documentCounter = 0;

      const loadTestResult = await performanceTester.runLoadTest(
        () => performanceTester.measureResponseTime(`${API_BASE}/api/documents`, {
          method: 'POST',
          body: JSON.stringify({
            title: `Load Test Document ${++documentCounter}`,
            content: 'Load test content',
            matter_id: 'test-matter-id',
            document_type: 'test'
          })
        }),
        25, // Fewer concurrent users for writes
        20000 // 20 seconds
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(500);
      expect(loadTestResult.failedRequests).toBeLessThan(loadTestResult.totalRequests * 0.05); // <5% error rate
      expect(loadTestResult.requestsPerSecond).toBeGreaterThan(5);
    });

    it('should handle concurrent document searches', async () => {
      const searchTerms = ['test', 'performance', 'document', 'legal', 'contract'];
      let searchIndex = 0;

      const loadTestResult = await performanceTester.runLoadTest(
        () => {
          const term = searchTerms[searchIndex % searchTerms.length];
          searchIndex++;
          return performanceTester.measureResponseTime(
            `${API_BASE}/api/documents/search?q=${term}&limit=20`
          );
        },
        30,
        25000 // 25 seconds
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(800);
      expect(loadTestResult.p95ResponseTime).toBeLessThan(1500);
      expect(loadTestResult.failedRequests).toBeLessThan(loadTestResult.totalRequests * 0.02);
    });
  });

  describe('E-Signature Performance', () => {
    it('should initiate signature workflow within 400ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}/sign`,
        {
          method: 'POST',
          body: JSON.stringify({
            signers: [
              {
                name: 'John Doe',
                email: 'john.doe@example.com',
                signing_order: 1
              }
            ],
            workflow_type: 'email',
            message: 'Please sign this document'
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(400);
    });

    it('should get signature status within 150ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}/sign`
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(150);
    });

    it('should handle concurrent signature status checks', async () => {
      const loadTestResult = await performanceTester.runLoadTest(
        () => {
          const documentId = testDocuments[Math.floor(Math.random() * testDocuments.length)];
          return performanceTester.measureResponseTime(`${API_BASE}/api/documents/${documentId}/sign`);
        },
        40,
        20000
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(200);
      expect(loadTestResult.p95ResponseTime).toBeLessThan(400);
      expect(loadTestResult.successfulRequests / loadTestResult.totalRequests).toBeGreaterThan(0.95);
    });
  });

  describe('File Upload Performance', () => {
    it('should upload small file within 1 second', async () => {
      const smallFileContent = 'Small file content for performance testing';
      const formData = new FormData();
      formData.append('file', new Blob([smallFileContent], { type: 'text/plain' }), 'small-test.txt');

      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(1000);
    });

    it('should upload medium file within 5 seconds', async () => {
      // Create 1MB test file
      const mediumFileContent = 'Medium file content '.repeat(50000);
      const formData = new FormData();
      formData.append('file', new Blob([mediumFileContent], { type: 'text/plain' }), 'medium-test.txt');

      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent file uploads', async () => {
      let uploadCounter = 0;

      const loadTestResult = await performanceTester.runLoadTest(
        () => {
          const fileContent = `Upload test content ${++uploadCounter}`;
          const formData = new FormData();
          formData.append('file', new Blob([fileContent], { type: 'text/plain' }), `upload-test-${uploadCounter}.txt`);

          return performanceTester.measureResponseTime(
            `${API_BASE}/api/documents/upload`,
            {
              method: 'POST',
              body: formData
            }
          );
        },
        15, // Fewer concurrent users for uploads
        15000
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(2000);
      expect(loadTestResult.failedRequests).toBeLessThan(loadTestResult.totalRequests * 0.1);
    });
  });

  describe('Real-time Collaboration Performance', () => {
    it('should establish collaboration session within 300ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}/collaborate`,
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'join',
            user_id: 'test-user-id'
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(300);
    });

    it('should send document changes within 100ms', async () => {
      const documentId = testDocuments[0];
      const result = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents/${documentId}/changes`,
        {
          method: 'POST',
          body: JSON.stringify({
            change_type: 'insert',
            position: { line: 1, column: 1 },
            content: 'Performance test change',
            metadata: {
              timestamp: new Date().toISOString(),
              client_id: 'test-client'
            }
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(100);
    });

    it('should handle concurrent collaborative changes', async () => {
      const documentId = testDocuments[0];
      let changeCounter = 0;

      const loadTestResult = await performanceTester.runLoadTest(
        () => performanceTester.measureResponseTime(
          `${API_BASE}/api/documents/${documentId}/changes`,
          {
            method: 'POST',
            body: JSON.stringify({
              change_type: 'insert',
              position: { line: Math.floor(Math.random() * 10) + 1, column: 1 },
              content: `Change ${++changeCounter}`,
              metadata: {
                timestamp: new Date().toISOString(),
                client_id: `test-client-${changeCounter}`
              }
            })
          }
        ),
        20,
        15000
      );

      expect(loadTestResult.averageResponseTime).toBeLessThan(150);
      expect(loadTestResult.p95ResponseTime).toBeLessThan(300);
      expect(loadTestResult.successfulRequests / loadTestResult.totalRequests).toBeGreaterThan(0.95);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits during bulk operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform bulk document creation
      const bulkPromises = Array.from({ length: 100 }, (_, i) =>
        performanceTester.measureResponseTime(`${API_BASE}/api/documents`, {
          method: 'POST',
          body: JSON.stringify({
            title: `Bulk Test Document ${i}`,
            content: `Bulk test content ${i}`,
            matter_id: 'test-matter-id',
            document_type: 'test'
          })
        })
      );

      await Promise.all(bulkPromises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle stress test without degradation', async () => {
      const baselineResult = await performanceTester.measureResponseTime(
        `${API_BASE}/api/documents?limit=10`
      );

      // Run stress test
      const stressPromises = Array.from({ length: STRESS_TEST_ITERATIONS }, () =>
        performanceTester.measureResponseTime(`${API_BASE}/api/documents?limit=1`)
      );

      const stressResults = await Promise.all(stressPromises);
      const avgStressTime = stressResults.reduce((sum, r) => sum + r.responseTime, 0) / stressResults.length;

      // Performance should not degrade significantly under stress
      expect(avgStressTime).toBeLessThan(baselineResult.responseTime * 2);

      // Success rate should remain high
      const successRate = stressResults.filter(r => r.success).length / stressResults.length;
      expect(successRate).toBeGreaterThan(0.95);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet overall performance benchmarks', async () => {
      const benchmarks = [
        { name: 'Document List', target: 200, endpoint: '/api/documents?limit=50' },
        { name: 'Document Detail', target: 100, endpoint: `/api/documents/${testDocuments[0]}` },
        { name: 'Document Search', target: 500, endpoint: '/api/documents/search?q=test&limit=20' },
        { name: 'Template List', target: 150, endpoint: '/api/templates' },
        { name: 'Matter Documents', target: 300, endpoint: '/api/matters/test-matter-id/documents' }
      ];

      const results = await Promise.all(
        benchmarks.map(async (benchmark) => {
          const result = await performanceTester.measureResponseTime(`${API_BASE}${benchmark.endpoint}`);
          return {
            ...benchmark,
            actualTime: result.responseTime,
            success: result.success,
            meetsTarget: result.responseTime < benchmark.target
          };
        })
      );

      // Log benchmark results
      console.log('\nPerformance Benchmark Results:');
      results.forEach(result => {
        console.log(`${result.name}: ${result.actualTime.toFixed(2)}ms (target: ${result.target}ms) ${result.meetsTarget ? '✅' : '❌'}`);
      });

      // All benchmarks should meet their targets
      results.forEach(result => {
        expect(result.meetsTarget).toBe(true);
        expect(result.success).toBe(true);
      });
    });
  });
});