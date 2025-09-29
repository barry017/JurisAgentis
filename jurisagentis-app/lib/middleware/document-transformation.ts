/**
 * Document Transformation Pipeline - Format conversion and processing
 * T075: Add document transformation pipeline (PDF, DOCX, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import * as sharp from 'sharp';
import { createHash } from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TransformationJob {
  id: string;
  document_id: string;
  source_format: string;
  target_format: string;
  options: TransformationOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  result_file_path?: string;
  result_file_size?: number;
}

export interface TransformationOptions {
  // PDF options
  pdf_quality?: 'high' | 'medium' | 'low';
  pdf_compression?: boolean;
  pdf_password?: string;
  pdf_watermark?: {
    text: string;
    opacity: number;
    position: 'center' | 'bottom-right' | 'top-left';
  };
  
  // Image options
  thumbnail_size?: { width: number; height: number };
  thumbnail_quality?: number;
  image_format?: 'jpeg' | 'png' | 'webp';
  
  // DOCX options
  docx_include_images?: boolean;
  docx_preserve_formatting?: boolean;
  
  // HTML options
  html_include_styles?: boolean;
  html_responsive?: boolean;
  
  // General options
  preserve_metadata?: boolean;
  output_filename?: string;
}

export interface TransformationResult {
  success: boolean;
  job_id: string;
  output_file_path?: string;
  output_file_size?: number;
  output_format: string;
  thumbnail_path?: string;
  processing_time_ms: number;
  error?: string;
  metadata?: {
    page_count?: number;
    word_count?: number;
    character_count?: number;
    has_images?: boolean;
    dimensions?: { width: number; height: number };
  };
}

export class DocumentTransformationPipeline {
  private readonly SUPPORTED_INPUT_FORMATS = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/html',
    'application/rtf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  
  private readonly SUPPORTED_OUTPUT_FORMATS = [
    'pdf', 'docx', 'html', 'txt', 'jpeg', 'png', 'webp'
  ];
  
  /**
   * Transform document to specified format
   */
  async transformDocument(
    documentId: string,
    sourceBuffer: Buffer,
    sourceFormat: string,
    targetFormat: string,
    options: TransformationOptions = {}
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    
    // Create transformation job
    const job = await this.createTransformationJob(
      documentId,
      sourceFormat,
      targetFormat,
      options
    );
    
    try {
      // Update job status
      await this.updateJobStatus(job.id, 'processing');
      
      // Validate formats
      if (!this.isFormatSupported(sourceFormat, 'input')) {
        throw new Error(`Unsupported input format: ${sourceFormat}`);
      }
      
      if (!this.isFormatSupported(targetFormat, 'output')) {
        throw new Error(`Unsupported output format: ${targetFormat}`);
      }
      
      // Perform transformation
      const result = await this.performTransformation(
        sourceBuffer,
        sourceFormat,
        targetFormat,
        options
      );
      
      // Generate thumbnail if requested or for certain formats
      let thumbnailPath: string | undefined;
      if (this.shouldGenerateThumbnail(targetFormat) || options.thumbnail_size) {
        thumbnailPath = await this.generateThumbnail(
          result.outputBuffer,
          targetFormat,
          options
        );
      }
      
      // Upload transformed file
      const outputPath = await this.uploadTransformedFile(
        documentId,
        result.outputBuffer,
        targetFormat,
        options.output_filename
      );
      
      const processingTime = Date.now() - startTime;
      
      // Update job completion
      await this.updateJobStatus(job.id, 'completed', {
        result_file_path: outputPath,
        result_file_size: result.outputBuffer.length,
        completed_at: new Date()
      });
      
      return {
        success: true,
        job_id: job.id,
        output_file_path: outputPath,
        output_file_size: result.outputBuffer.length,
        output_format: targetFormat,
        thumbnail_path: thumbnailPath,
        processing_time_ms: processingTime,
        metadata: result.metadata
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.updateJobStatus(job.id, 'failed', {
        error_message: errorMessage,
        completed_at: new Date()
      });
      
      return {
        success: false,
        job_id: job.id,
        output_format: targetFormat,
        processing_time_ms: processingTime,
        error: errorMessage
      };
    }
  }
  
  /**
   * Generate thumbnails for documents
   */
  async generateThumbnail(
    sourceBuffer: Buffer,
    sourceFormat: string,
    options: TransformationOptions = {}
  ): Promise<string> {
    const thumbnailSize = options.thumbnail_size || { width: 300, height: 400 };
    const quality = options.thumbnail_quality || 80;
    const format = options.image_format || 'jpeg';
    
    let thumbnailBuffer: Buffer;
    
    if (sourceFormat === 'pdf') {
      // For PDF thumbnails, we would typically use a library like pdf2pic
      // For now, we'll create a placeholder thumbnail
      thumbnailBuffer = await this.createPlaceholderThumbnail(
        thumbnailSize,
        'PDF Document',
        '#dc2626'
      );
    } else if (['jpeg', 'png', 'webp'].includes(sourceFormat)) {
      // Process image directly
      thumbnailBuffer = await sharp(sourceBuffer)
        .resize(thumbnailSize.width, thumbnailSize.height, { fit: 'inside' })
        .jpeg({ quality })
        .toBuffer();
    } else {
      // Create placeholder for other formats
      const formatName = this.getFormatDisplayName(sourceFormat);
      const color = this.getFormatColor(sourceFormat);
      thumbnailBuffer = await this.createPlaceholderThumbnail(
        thumbnailSize,
        formatName,
        color
      );
    }
    
    // Upload thumbnail
    const timestamp = Date.now();
    const thumbnailPath = `thumbnails/${timestamp}_thumbnail.${format}`;
    
    const { error } = await supabase.storage
      .from('documents')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: `image/${format}`,
        metadata: {
          width: thumbnailSize.width.toString(),
          height: thumbnailSize.height.toString()
        }
      });
    
    if (error) {
      throw new Error(`Failed to upload thumbnail: ${error.message}`);
    }
    
    return thumbnailPath;
  }
  
  /**
   * Convert document between formats
   */
  private async performTransformation(
    sourceBuffer: Buffer,
    sourceFormat: string,
    targetFormat: string,
    options: TransformationOptions
  ): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    // Handle same format (just return original with potential processing)
    if (this.getBaseFormat(sourceFormat) === targetFormat) {
      return {
        outputBuffer: sourceBuffer,
        metadata: await this.extractMetadata(sourceBuffer, sourceFormat)
      };
    }
    
    // Route to specific transformation methods
    const sourceType = this.getBaseFormat(sourceFormat);
    
    switch (`${sourceType}->${targetFormat}`) {
      case 'pdf->html':
        return this.pdfToHtml(sourceBuffer, options);
        
      case 'pdf->txt':
        return this.pdfToText(sourceBuffer, options);
        
      case 'docx->html':
        return this.docxToHtml(sourceBuffer, options);
        
      case 'docx->txt':
        return this.docxToText(sourceBuffer, options);
        
      case 'docx->pdf':
        return this.docxToPdf(sourceBuffer, options);
        
      case 'html->pdf':
        return this.htmlToPdf(sourceBuffer, options);
        
      case 'html->txt':
        return this.htmlToText(sourceBuffer, options);
        
      case 'txt->html':
        return this.textToHtml(sourceBuffer, options);
        
      case 'txt->pdf':
        return this.textToPdf(sourceBuffer, options);
        
      default:
        throw new Error(`Transformation from ${sourceType} to ${targetFormat} is not supported`);
    }
  }
  
  /**
   * PDF to HTML conversion
   */
  private async pdfToHtml(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    try {
      const pdfData = await pdfParse(buffer);
      
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted PDF</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .page { margin-bottom: 40px; page-break-after: always; }
        ${options.html_responsive ? '@media (max-width: 768px) { body { margin: 20px; font-size: 14px; } }' : ''}
    </style>
</head>
<body>
    <div class="page">
        ${pdfData.text.split('\n').map(line => `<p>${this.escapeHtml(line)}</p>`).join('\n')}
    </div>
</body>
</html>`;
      
      return {
        outputBuffer: Buffer.from(html, 'utf-8'),
        metadata: {
          page_count: pdfData.numpages,
          character_count: pdfData.text.length,
          word_count: pdfData.text.split(/\s+/).length
        }
      };
    } catch (error) {
      throw new Error(`PDF to HTML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * PDF to text conversion
   */
  private async pdfToText(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    try {
      const pdfData = await pdfParse(buffer);
      
      return {
        outputBuffer: Buffer.from(pdfData.text, 'utf-8'),
        metadata: {
          page_count: pdfData.numpages,
          character_count: pdfData.text.length,
          word_count: pdfData.text.split(/\s+/).length
        }
      };
    } catch (error) {
      throw new Error(`PDF to text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * DOCX to HTML conversion
   */
  private async docxToHtml(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    try {
      const result = await mammoth.convertToHtml({ buffer }, {
        includeDefaultStyleMap: options.docx_preserve_formatting !== false,
        includeEmbeddedStyleMap: options.html_include_styles !== false
      });
      
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        ${options.html_responsive ? '@media (max-width: 768px) { body { margin: 20px; font-size: 14px; } }' : ''}
    </style>
</head>
<body>
    ${result.value}
</body>
</html>`;
      
      const text = result.value.replace(/<[^>]*>/g, '');
      
      return {
        outputBuffer: Buffer.from(html, 'utf-8'),
        metadata: {
          character_count: text.length,
          word_count: text.split(/\s+/).length,
          has_images: result.value.includes('<img')
        }
      };
    } catch (error) {
      throw new Error(`DOCX to HTML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * DOCX to text conversion
   */
  private async docxToText(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        outputBuffer: Buffer.from(result.value, 'utf-8'),
        metadata: {
          character_count: result.value.length,
          word_count: result.value.split(/\s+/).length
        }
      };
    } catch (error) {
      throw new Error(`DOCX to text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * DOCX to PDF conversion (placeholder - would need puppeteer or similar)
   */
  private async docxToPdf(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    // This is a placeholder implementation
    // In production, you would use puppeteer, wkhtmltopdf, or a service like Pandoc
    throw new Error('DOCX to PDF conversion requires additional service setup');
  }
  
  /**
   * HTML to PDF conversion (placeholder - would need puppeteer)
   */
  private async htmlToPdf(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    // This is a placeholder implementation
    // In production, you would use puppeteer or wkhtmltopdf
    throw new Error('HTML to PDF conversion requires puppeteer or similar service');
  }
  
  /**
   * HTML to text conversion
   */
  private async htmlToText(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    const html = buffer.toString('utf-8');
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      outputBuffer: Buffer.from(text, 'utf-8'),
      metadata: {
        character_count: text.length,
        word_count: text.split(/\s+/).length
      }
    };
  }
  
  /**
   * Text to HTML conversion
   */
  private async textToHtml(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    const text = buffer.toString('utf-8');
    const paragraphs = text.split('\n').map(line => 
      line.trim() ? `<p>${this.escapeHtml(line)}</p>` : '<br>'
    ).join('\n');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Text</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        ${options.html_responsive ? '@media (max-width: 768px) { body { margin: 20px; font-size: 14px; } }' : ''}
    </style>
</head>
<body>
    ${paragraphs}
</body>
</html>`;
    
    return {
      outputBuffer: Buffer.from(html, 'utf-8'),
      metadata: {
        character_count: text.length,
        word_count: text.split(/\s+/).length
      }
    };
  }
  
  /**
   * Text to PDF conversion (placeholder)
   */
  private async textToPdf(buffer: Buffer, options: TransformationOptions): Promise<{
    outputBuffer: Buffer;
    metadata?: any;
  }> {
    // This is a placeholder implementation
    // In production, you would use puppeteer or a PDF generation library
    throw new Error('Text to PDF conversion requires additional service setup');
  }
  
  /**
   * Create placeholder thumbnail for unsupported formats
   */
  private async createPlaceholderThumbnail(
    size: { width: number; height: number },
    text: string,
    color: string
  ): Promise<Buffer> {
    return sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="${size.width}" height="${size.height}">
          <rect width="100%" height="100%" fill="${color}" opacity="0.1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                font-family="Arial, sans-serif" font-size="16" fill="${color}">
            ${text}
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();
  }
  
  /**
   * Helper methods
   */
  private isFormatSupported(format: string, type: 'input' | 'output'): boolean {
    if (type === 'input') {
      return this.SUPPORTED_INPUT_FORMATS.includes(format);
    }
    return this.SUPPORTED_OUTPUT_FORMATS.includes(format);
  }
  
  private getBaseFormat(mimeType: string): string {
    const mapping: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'docx',
      'text/html': 'html',
      'text/plain': 'txt',
      'application/rtf': 'txt',
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    return mapping[mimeType] || 'unknown';
  }
  
  private shouldGenerateThumbnail(format: string): boolean {
    return ['pdf', 'docx', 'html'].includes(format);
  }
  
  private getFormatDisplayName(format: string): string {
    const names: Record<string, string> = {
      'pdf': 'PDF Document',
      'docx': 'Word Document',
      'html': 'HTML Document',
      'txt': 'Text Document'
    };
    return names[format] || format.toUpperCase();
  }
  
  private getFormatColor(format: string): string {
    const colors: Record<string, string> = {
      'pdf': '#dc2626',
      'docx': '#2563eb',
      'html': '#ea580c',
      'txt': '#059669'
    };
    return colors[format] || '#6b7280';
  }
  
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  private async extractMetadata(buffer: Buffer, format: string): Promise<any> {
    try {
      const baseFormat = this.getBaseFormat(format);
      
      switch (baseFormat) {
        case 'pdf':
          const pdfData = await pdfParse(buffer);
          return {
            page_count: pdfData.numpages,
            character_count: pdfData.text?.length || 0,
            word_count: pdfData.text?.split(/\s+/).length || 0
          };
          
        case 'docx':
          const docxText = await mammoth.extractRawText({ buffer });
          return {
            character_count: docxText.value.length,
            word_count: docxText.value.split(/\s+/).length
          };
          
        default:
          return {};
      }
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return {};
    }
  }
  
  private async createTransformationJob(
    documentId: string,
    sourceFormat: string,
    targetFormat: string,
    options: TransformationOptions
  ): Promise<TransformationJob> {
    const jobId = `transform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: TransformationJob = {
      id: jobId,
      document_id: documentId,
      source_format: sourceFormat,
      target_format: targetFormat,
      options,
      status: 'pending',
      created_at: new Date()
    };
    
    // Store job in database
    const { error } = await supabase
      .from('transformation_jobs')
      .insert({
        job_id: job.id,
        document_id: job.document_id,
        source_format: job.source_format,
        target_format: job.target_format,
        options: job.options,
        status: job.status,
        created_at: job.created_at.toISOString()
      });
    
    if (error) {
      console.error('Failed to create transformation job:', error);
    }
    
    return job;
  }
  
  private async updateJobStatus(
    jobId: string,
    status: TransformationJob['status'],
    updates: Partial<TransformationJob> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('transformation_jobs')
      .update({
        status,
        ...updates,
        ...(status === 'processing' ? { started_at: new Date().toISOString() } : {})
      })
      .eq('job_id', jobId);
    
    if (error) {
      console.error('Failed to update job status:', error);
    }
  }
  
  private async uploadTransformedFile(
    documentId: string,
    buffer: Buffer,
    format: string,
    filename?: string
  ): Promise<string> {
    const timestamp = Date.now();
    const extension = format === 'jpeg' ? 'jpg' : format;
    const fileName = filename || `${documentId}_converted_${timestamp}.${extension}`;
    const filePath = `transformed/${new Date().getFullYear()}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: this.getMimeType(format),
        metadata: {
          document_id: documentId,
          transformation_timestamp: timestamp.toString()
        }
      });
    
    if (error) {
      throw new Error(`Failed to upload transformed file: ${error.message}`);
    }
    
    return filePath;
  }
  
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'html': 'text/html',
      'txt': 'text/plain',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}

// Export singleton instance
export const documentTransformationPipeline = new DocumentTransformationPipeline();