/**
 * Integration Test: Document Transformation Pipeline
 * T077: Integration tests for document transformation and indexing
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createReadStream } from 'fs';
import path from 'path';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Document Transformation Pipeline', () => {
  let authToken: string;
  let testDocumentId: string;
  let transformationJobId: string;

  beforeAll(async () => {
    // Get auth token for tests
    const authResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@jurisagentis.com',
        password: 'test-password'
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.access_token;
    }
  });

  afterAll(async () => {
    // Cleanup test documents
    if (testDocumentId && authToken) {
      await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  });

  describe('Document Upload and Transformation', () => {
    it('should upload and transform DOCX document to PDF', async () => {
      // Create test document
      const formData = new FormData();
      formData.append('title', 'Test Document - DOCX to PDF');
      formData.append('document_type', 'contract');
      formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
      
      // Mock file upload (in real test, would use actual file)
      const mockFile = new Blob(['Test DOCX content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      formData.append('file', mockFile, 'test-document.docx');

      const uploadResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      expect(uploadResponse.status).toBe(201);
      const document = await uploadResponse.json();
      testDocumentId = document.id;

      expect(document.file_name).toBe('test-document.docx');
      expect(document.status).toBe('processing');
    });

    it('should trigger document transformation job', async () => {
      const transformResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          target_format: 'pdf',
          options: {
            quality: 'high',
            preserve_formatting: true,
            include_metadata: true
          }
        })
      });

      expect(transformResponse.status).toBe(200);
      const transformResult = await transformResponse.json();
      
      expect(transformResult.job_id).toBeDefined();
      expect(transformResult.status).toBe('queued');
      expect(transformResult.target_format).toBe('pdf');
      
      transformationJobId = transformResult.job_id;
    });

    it('should check transformation job status', async () => {
      const statusResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/transform/${transformationJobId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      
      expect(status.job_id).toBe(transformationJobId);
      expect(['queued', 'processing', 'completed', 'failed']).toContain(status.status);
      expect(status.progress_percentage).toBeGreaterThanOrEqual(0);
      expect(status.progress_percentage).toBeLessThanOrEqual(100);
    });

    it('should handle transformation completion webhook', async () => {
      const webhookPayload = {
        job_id: transformationJobId,
        document_id: testDocumentId,
        status: 'completed',
        output_format: 'pdf',
        output_file_path: `transformations/${testDocumentId}/output.pdf`,
        metadata: {
          pages: 5,
          file_size: 1024000,
          transformation_time_ms: 2500
        }
      };

      const webhookResponse = await fetch(`${API_BASE}/api/documents/transform/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': 'test-signature'
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(webhookResponse.status).toBe(200);
      const webhookResult = await webhookResponse.json();
      expect(webhookResult.processed).toBe(true);
    });

    it('should verify transformed document is available', async () => {
      const documentResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(documentResponse.status).toBe(200);
      const document = await documentResponse.json();
      
      expect(document.status).toBe('ready');
      expect(document.transformations).toBeDefined();
      expect(document.transformations.length).toBeGreaterThan(0);
      
      const pdfTransformation = document.transformations.find(t => t.target_format === 'pdf');
      expect(pdfTransformation).toBeDefined();
      expect(pdfTransformation.status).toBe('completed');
    });

    it('should download transformed PDF', async () => {
      const downloadResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/download?format=pdf`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toBe('application/pdf');
      
      const pdfBuffer = await downloadResponse.arrayBuffer();
      expect(pdfBuffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Document Indexing and Search', () => {
    it('should index document content for search', async () => {
      const indexResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/index`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(indexResponse.status).toBe(200);
      const indexResult = await indexResponse.json();
      
      expect(indexResult.indexed).toBe(true);
      expect(indexResult.extracted_text_length).toBeGreaterThan(0);
      expect(indexResult.indexed_at).toBeDefined();
    });

    it('should search indexed documents', async () => {
      const searchResponse = await fetch(`${API_BASE}/api/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: 'test document',
          filters: {
            document_type: 'contract'
          },
          options: {
            highlight: true,
            include_content: true
          }
        })
      });

      expect(searchResponse.status).toBe(200);
      const searchResults = await searchResponse.json();
      
      expect(searchResults.documents).toBeDefined();
      expect(searchResults.total_count).toBeGreaterThan(0);
      expect(searchResults.search_time_ms).toBeGreaterThan(0);
      
      const foundDocument = searchResults.documents.find(d => d.id === testDocumentId);
      expect(foundDocument).toBeDefined();
    });

    it('should provide search suggestions', async () => {
      const suggestionsResponse = await fetch(`${API_BASE}/api/documents/search/suggestions?q=test&limit=5`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(suggestionsResponse.status).toBe(200);
      const suggestions = await suggestionsResponse.json();
      
      expect(suggestions.suggestions).toBeDefined();
      expect(Array.isArray(suggestions.suggestions)).toBe(true);
    });

    it('should handle advanced search with multiple filters', async () => {
      const advancedSearchResponse = await fetch(`${API_BASE}/api/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: 'test',
          filters: {
            document_type: ['contract', 'agreement'],
            status: ['ready', 'draft'],
            date_range: {
              start: '2024-01-01',
              end: '2024-12-31'
            },
            file_size: {
              min: 1000,
              max: 10000000
            }
          },
          sort: {
            field: 'created_at',
            order: 'desc'
          },
          pagination: {
            page: 1,
            limit: 10
          }
        })
      });

      expect(advancedSearchResponse.status).toBe(200);
      const advancedResults = await advancedSearchResponse.json();
      
      expect(advancedResults.documents).toBeDefined();
      expect(advancedResults.pagination).toBeDefined();
      expect(advancedResults.pagination.page).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unsupported file formats', async () => {
      const formData = new FormData();
      formData.append('title', 'Unsupported Format Test');
      formData.append('document_type', 'other');
      formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
      
      const mockFile = new Blob(['Test content'], { type: 'application/x-unsupported' });
      formData.append('file', mockFile, 'test.unsupported');

      const uploadResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      expect(uploadResponse.status).toBe(400);
      const error = await uploadResponse.json();
      expect(error.error_code).toBe('UNSUPPORTED_FILE_FORMAT');
    });

    it('should handle transformation of corrupted files', async () => {
      // Upload a corrupted file first
      const formData = new FormData();
      formData.append('title', 'Corrupted File Test');
      formData.append('document_type', 'contract');
      formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
      
      const corruptedFile = new Blob(['Invalid PDF content'], { type: 'application/pdf' });
      formData.append('file', corruptedFile, 'corrupted.pdf');

      const uploadResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      if (uploadResponse.ok) {
        const document = await uploadResponse.json();

        const transformResponse = await fetch(`${API_BASE}/api/documents/${document.id}/transform`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            target_format: 'docx'
          })
        });

        expect(transformResponse.status).toBe(422);
        const error = await transformResponse.json();
        expect(error.error_code).toBe('TRANSFORMATION_FAILED');
      }
    });

    it('should handle large file uploads', async () => {
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB of content
      const formData = new FormData();
      formData.append('title', 'Large File Test');
      formData.append('document_type', 'contract');
      formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
      
      const largeFile = new Blob([largeContent], { type: 'text/plain' });
      formData.append('file', largeFile, 'large-document.txt');

      const uploadResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      // Should either succeed or fail with appropriate error
      if (uploadResponse.status === 413) {
        const error = await uploadResponse.json();
        expect(error.error_code).toBe('FILE_TOO_LARGE');
      } else {
        expect(uploadResponse.status).toBe(201);
      }
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent transformations', async () => {
      const concurrentJobs = [];
      
      for (let i = 0; i < 3; i++) {
        const formData = new FormData();
        formData.append('title', `Concurrent Test ${i}`);
        formData.append('document_type', 'contract');
        formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
        
        const testFile = new Blob([`Test content ${i}`], { type: 'text/plain' });
        formData.append('file', testFile, `concurrent-${i}.txt`);

        const uploadPromise = fetch(`${API_BASE}/api/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        }).then(async (response) => {
          if (response.ok) {
            const document = await response.json();
            return fetch(`${API_BASE}/api/documents/${document.id}/transform`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ target_format: 'pdf' })
            });
          }
          return response;
        });

        concurrentJobs.push(uploadPromise);
      }

      const results = await Promise.all(concurrentJobs);
      const successfulJobs = results.filter(r => r.status === 200 || r.status === 201);
      
      expect(successfulJobs.length).toBeGreaterThan(0);
    });

    it('should provide transformation progress updates', async () => {
      // This test would typically require a longer-running transformation
      // For demonstration, we'll check that the progress endpoint works
      const progressResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/transform/${transformationJobId}/progress`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (progressResponse.status === 200) {
        const progress = await progressResponse.json();
        expect(progress.job_id).toBe(transformationJobId);
        expect(progress.current_step).toBeDefined();
        expect(progress.estimated_completion).toBeDefined();
      } else {
        // Job might be completed or not found, which is also valid
        expect([404, 410]).toContain(progressResponse.status);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain document metadata through transformations', async () => {
      const documentResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const document = await documentResponse.json();
      
      expect(document.title).toBe('Test Document - DOCX to PDF');
      expect(document.document_type).toBe('contract');
      expect(document.matter_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      
      // Check that transformations preserve original metadata
      if (document.transformations && document.transformations.length > 0) {
        const transformation = document.transformations[0];
        expect(transformation.original_format).toBeDefined();
        expect(transformation.target_format).toBeDefined();
        expect(transformation.created_at).toBeDefined();
      }
    });

    it('should handle transformation rollback on failure', async () => {
      // Create a document that will fail transformation
      const formData = new FormData();
      formData.append('title', 'Rollback Test Document');
      formData.append('document_type', 'contract');
      formData.append('matter_id', '123e4567-e89b-12d3-a456-426614174000');
      
      const invalidFile = new Blob(['Invalid content for PDF'], { type: 'application/pdf' });
      formData.append('file', invalidFile, 'invalid.pdf');

      const uploadResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      if (uploadResponse.ok) {
        const document = await uploadResponse.json();

        // Attempt transformation that should fail
        const transformResponse = await fetch(`${API_BASE}/api/documents/${document.id}/transform`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            target_format: 'docx'
          })
        });

        // Check document status after failed transformation
        const finalDocResponse = await fetch(`${API_BASE}/api/documents/${document.id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const finalDocument = await finalDocResponse.json();
        expect(finalDocument.status).not.toBe('corrupted');
        expect(finalDocument.status).not.toBe('lost');
      }
    });
  });
});