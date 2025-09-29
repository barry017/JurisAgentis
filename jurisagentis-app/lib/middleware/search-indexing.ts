/**
 * Search Indexing Middleware - Document content extraction and indexing
 * T074: Document indexing and search middleware for Document Management System
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SearchService } from '@jurisagentis/document-management';

// Document content extraction imports
import mammoth from 'mammoth'; // For DOCX files
import * as pdfParse from 'pdf-parse'; // For PDF files
import { createHash } from 'crypto';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const searchService = new SearchService(supabase);

export interface DocumentIndexData {
  id: string;
  title: string;
  content: string;
  content_summary: string;
  extracted_entities: ExtractedEntity[];
  keywords: string[];
  content_hash: string;
  file_path: string;
  file_type: string;
  file_size: number;
  metadata: Record<string, any>;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'monetary_amount' | 'legal_reference' | 'case_number';
  text: string;
  confidence: number;
  start_position?: number;
  end_position?: number;
  normalized_value?: string;
}

export interface IndexingResult {
  success: boolean;
  document_id: string;
  content_length: number;
  entities_count: number;
  keywords_count: number;
  processing_time_ms: number;
  errors?: string[];
}

export class SearchIndexingMiddleware {
  private readonly MAX_CONTENT_LENGTH = 1000000; // 1MB text limit
  private readonly BATCH_SIZE = 10;
  
  /**
   * Process document upload and create search index entry
   */
  async processDocumentUpload(
    documentId: string,
    filePath: string,
    fileBuffer: Buffer,
    metadata: Record<string, any>
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Extract content from file
      const extractedContent = await this.extractDocumentContent(fileBuffer, filePath);
      
      if (!extractedContent.success) {
        errors.push(`Content extraction failed: ${extractedContent.error}`);
      }
      
      // Generate content summary
      const contentSummary = this.generateContentSummary(extractedContent.content || '');
      
      // Extract entities and keywords
      const entities = await this.extractEntities(extractedContent.content || '');
      const keywords = await this.extractKeywords(extractedContent.content || '');
      
      // Create content hash for duplicate detection
      const contentHash = this.generateContentHash(extractedContent.content || '');
      
      // Prepare index data
      const indexData: DocumentIndexData = {
        id: documentId,
        title: metadata.title || this.extractTitleFromContent(extractedContent.content || ''),
        content: extractedContent.content || '',
        content_summary: contentSummary,
        extracted_entities: entities,
        keywords,
        content_hash: contentHash,
        file_path: filePath,
        file_type: this.getFileType(filePath),
        file_size: fileBuffer.length,
        metadata
      };
      
      // Store in search index
      await this.storeDocumentIndex(indexData);
      
      // Update full-text search vectors
      await this.updateSearchVectors(documentId, extractedContent.content || '');
      
      // Generate embeddings for semantic search (if enabled)
      if (process.env.ENABLE_SEMANTIC_SEARCH === 'true') {
        await this.generateEmbeddings(documentId, extractedContent.content || '');
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: errors.length === 0,
        document_id: documentId,
        content_length: (extractedContent.content || '').length,
        entities_count: entities.length,
        keywords_count: keywords.length,
        processing_time_ms: processingTime,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        document_id: documentId,
        content_length: 0,
        entities_count: 0,
        keywords_count: 0,
        processing_time_ms: processingTime,
        errors: [errorMessage]
      };
    }
  }
  
  /**
   * Extract text content from various file types
   */
  private async extractDocumentContent(
    fileBuffer: Buffer,
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const fileType = this.getFileType(filePath);
      
      switch (fileType) {
        case 'pdf':
          return await this.extractPdfContent(fileBuffer);
          
        case 'docx':
          return await this.extractDocxContent(fileBuffer);
          
        case 'txt':
          return {
            success: true,
            content: fileBuffer.toString('utf-8')
          };
          
        case 'html':
          return {
            success: true,
            content: this.extractTextFromHtml(fileBuffer.toString('utf-8'))
          };
          
        default:
          return {
            success: false,
            error: `Unsupported file type: ${fileType}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content extraction failed'
      };
    }
  }
  
  /**
   * Extract content from PDF files
   */
  private async extractPdfContent(buffer: Buffer): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const data = await pdfParse(buffer);
      return {
        success: true,
        content: data.text
      };
    } catch (error) {
      return {
        success: false,
        error: `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Extract content from DOCX files
   */
  private async extractDocxContent(buffer: Buffer): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        success: true,
        content: result.value
      };
    } catch (error) {
      return {
        success: false,
        error: `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Extract text from HTML content
   */
  private extractTextFromHtml(html: string): string {
    // Simple HTML tag removal - in production, use a proper HTML parser
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Generate content summary
   */
  private generateContentSummary(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Find the last complete sentence within the limit
    const truncated = content.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.5) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }
  
  /**
   * Extract entities from document content
   */
  private async extractEntities(content: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Simple regex-based entity extraction
    // In production, use a proper NLP service like AWS Comprehend or Google NLP
    
    // Extract dates
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi;
    let match;
    while ((match = dateRegex.exec(content)) !== null) {
      entities.push({
        type: 'date',
        text: match[0],
        confidence: 0.8,
        start_position: match.index,
        end_position: match.index + match[0].length
      });
    }
    
    // Extract monetary amounts
    const moneyRegex = /\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*dollars?\b/gi;
    while ((match = moneyRegex.exec(content)) !== null) {
      entities.push({
        type: 'monetary_amount',
        text: match[0],
        confidence: 0.9,
        start_position: match.index,
        end_position: match.index + match[0].length
      });
    }
    
    // Extract case numbers
    const caseRegex = /\b(?:case|matter|file)\s*(?:no\.?|number|#)\s*[\w\d-]+\b/gi;
    while ((match = caseRegex.exec(content)) !== null) {
      entities.push({
        type: 'case_number',
        text: match[0],
        confidence: 0.7,
        start_position: match.index,
        end_position: match.index + match[0].length
      });
    }
    
    return entities;
  }
  
  /**
   * Extract keywords from document content
   */
  private async extractKeywords(content: string): Promise<string[]> {
    // Simple keyword extraction based on word frequency
    // In production, use TF-IDF or more sophisticated NLP techniques
    
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Filter out common stop words
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
      'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
      'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
      'such', 'take', 'than', 'them', 'well', 'were', 'said', 'each',
      'which', 'their', 'would', 'there', 'could', 'other', 'after',
      'first', 'never', 'these', 'think', 'where', 'being', 'every',
      'great', 'might', 'shall', 'still', 'those', 'under', 'while'
    ]);
    
    // Get top keywords
    return Array.from(wordCounts.entries())
      .filter(([word, count]) => !stopWords.has(word) && count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }
  
  /**
   * Generate content hash for duplicate detection
   */
  private generateContentHash(content: string): string {
    // Normalize content for hashing
    const normalizedContent = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    
    return createHash('sha256')
      .update(normalizedContent)
      .digest('hex');
  }
  
  /**
   * Store document index data
   */
  private async storeDocumentIndex(indexData: DocumentIndexData): Promise<void> {
    const { error } = await supabase
      .from('document_search_index')
      .upsert({
        document_id: indexData.id,
        title: indexData.title,
        content: indexData.content.substring(0, this.MAX_CONTENT_LENGTH),
        content_summary: indexData.content_summary,
        extracted_entities: indexData.extracted_entities,
        keywords: indexData.keywords,
        content_hash: indexData.content_hash,
        file_type: indexData.file_type,
        file_size: indexData.file_size,
        metadata: indexData.metadata,
        indexed_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Failed to store document index: ${error.message}`);
    }
  }
  
  /**
   * Update search vectors for full-text search
   */
  private async updateSearchVectors(documentId: string, content: string): Promise<void> {
    const { error } = await supabase.rpc('update_document_search_vectors', {
      p_document_id: documentId,
      p_content: content
    });
    
    if (error) {
      throw new Error(`Failed to update search vectors: ${error.message}`);
    }
  }
  
  /**
   * Generate embeddings for semantic search
   */
  private async generateEmbeddings(documentId: string, content: string): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping embedding generation');
      return;
    }
    
    try {
      // In production, this would call OpenAI embeddings API
      // For now, we'll create a placeholder
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      
      const { error } = await supabase
        .from('document_embeddings')
        .upsert({
          document_id: documentId,
          embedding: mockEmbedding,
          model: 'text-embedding-ada-002',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        throw new Error(`Failed to store embeddings: ${error.message}`);
      }
    } catch (error) {
      console.warn('Failed to generate embeddings:', error);
    }
  }
  
  /**
   * Extract title from content if not provided
   */
  private extractTitleFromContent(content: string): string {
    // Try to find a title in the first few lines
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 5 && firstLine.length < 100) {
        return firstLine;
      }
    }
    
    return 'Untitled Document';
  }
  
  /**
   * Get file type from file path
   */
  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
  
  /**
   * Batch reindex documents
   */
  async reindexDocuments(documentIds: string[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Process in batches
    for (let i = 0; i < documentIds.length; i += this.BATCH_SIZE) {
      const batch = documentIds.slice(i, i + this.BATCH_SIZE);
      
      await Promise.all(batch.map(async (documentId) => {
        try {
          results.processed++;
          
          // Get document data
          const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();
          
          if (error || !document) {
            throw new Error(`Document not found: ${documentId}`);
          }
          
          // Reindex the document
          await searchService.indexDocument(documentId);
          results.successful++;
          
        } catch (error) {
          results.failed++;
          results.errors.push(`${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }));
    }
    
    return results;
  }
  
  /**
   * Delete document from search index
   */
  async removeDocumentFromIndex(documentId: string): Promise<void> {
    const { error: indexError } = await supabase
      .from('document_search_index')
      .delete()
      .eq('document_id', documentId);
    
    if (indexError) {
      throw new Error(`Failed to remove from search index: ${indexError.message}`);
    }
    
    const { error: embeddingError } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);
    
    if (embeddingError) {
      console.warn(`Failed to remove embeddings: ${embeddingError.message}`);
    }
  }
}

// Export singleton instance
export const searchIndexingMiddleware = new SearchIndexingMiddleware();

/**
 * Middleware function for handling document upload indexing
 */
export async function handleDocumentIndexing(
  documentId: string,
  filePath: string,
  fileBuffer: Buffer,
  metadata: Record<string, any>
): Promise<IndexingResult> {
  return searchIndexingMiddleware.processDocumentUpload(
    documentId,
    filePath,
    fileBuffer,
    metadata
  );
}

/**
 * Middleware for real-time search index updates
 */
export async function updateDocumentIndex(
  documentId: string,
  updates: Partial<{
    title: string;
    content: string;
    metadata: Record<string, any>;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('document_search_index')
    .update({
      ...updates,
      indexed_at: new Date().toISOString()
    })
    .eq('document_id', documentId);
  
  if (error) {
    throw new Error(`Failed to update document index: ${error.message}`);
  }
}