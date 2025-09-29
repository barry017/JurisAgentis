/**
 * Document Thumbnails API - Generate and manage document thumbnails
 * T075: Document transformation pipeline - thumbnail generation
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { documentTransformationPipeline } from '@/lib/middleware/document-transformation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ThumbnailRequest {
  document_id: string;
  size?: { width: number; height: number };
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  force_regenerate?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse request body
    const requestData = await parseRequestBody<ThumbnailRequest>(request);
    
    // Validate required fields
    if (!requestData.document_id) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'document_id is required',
        400
      ));
    }
    
    // Set defaults
    const options = {
      thumbnail_size: requestData.size || { width: 300, height: 400 },
      thumbnail_quality: requestData.quality || 80,
      image_format: requestData.format || 'jpeg' as const
    };
    
    // Get document information
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, file_path, file_name, mime_type')
      .eq('id', requestData.document_id)
      .single();
    
    if (docError || !document) {
      return addCORSHeaders(createErrorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document ${requestData.document_id} not found`,
        404
      ));
    }
    
    // Check if thumbnail already exists (unless force regenerate)
    if (!requestData.force_regenerate) {
      const { data: existingThumbnail } = await supabase
        .from('document_thumbnails')
        .select('thumbnail_path, created_at')
        .eq('document_id', requestData.document_id)
        .single();
      
      if (existingThumbnail) {
        const thumbnailUrl = supabase.storage
          .from('documents')
          .getPublicUrl(existingThumbnail.thumbnail_path).data.publicUrl;
        
        return addCORSHeaders(createSuccessResponse({
          document_id: requestData.document_id,
          thumbnail_path: existingThumbnail.thumbnail_path,
          thumbnail_url: thumbnailUrl,
          size: options.thumbnail_size,
          format: options.image_format,
          cached: true,
          created_at: existingThumbnail.created_at,
          message: 'Using existing thumbnail'
        }));
      }
    }
    
    // Check if file exists in storage
    if (!document.file_path) {
      return addCORSHeaders(createErrorResponse(
        'NO_FILE_ATTACHED',
        'Document has no file attached',
        400
      ));
    }
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);
    
    if (downloadError || !fileData) {
      return addCORSHeaders(createErrorResponse(
        'FILE_DOWNLOAD_FAILED',
        `Failed to download file: ${downloadError?.message || 'File not found'}`,
        500
      ));
    }
    
    // Convert file to buffer
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    
    // Generate thumbnail
    const thumbnailPath = await documentTransformationPipeline.generateThumbnail(
      fileBuffer,
      getFormatFromMimeType(document.mime_type),
      options
    );
    
    // Store thumbnail record
    const { error: insertError } = await supabase
      .from('document_thumbnails')
      .upsert({
        document_id: requestData.document_id,
        thumbnail_path: thumbnailPath,
        width: options.thumbnail_size.width,
        height: options.thumbnail_size.height,
        format: options.image_format,
        quality: options.thumbnail_quality,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Failed to store thumbnail record:', insertError);
    }
    
    const thumbnailUrl = supabase.storage
      .from('documents')
      .getPublicUrl(thumbnailPath).data.publicUrl;
    
    // Log audit event
    await logAuditEvent(
      'thumbnail_generated',
      user.uid,
      request,
      {
        document_id: requestData.document_id,
        thumbnail_path: thumbnailPath,
        size: options.thumbnail_size,
        format: options.image_format,
        force_regenerate: requestData.force_regenerate || false
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: requestData.document_id,
      thumbnail_path: thumbnailPath,
      thumbnail_url: thumbnailUrl,
      size: options.thumbnail_size,
      format: options.image_format,
      quality: options.thumbnail_quality,
      cached: false,
      created_at: new Date().toISOString(),
      message: 'Thumbnail generated successfully'
    }));
    
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate thumbnail';
    return addCORSHeaders(createErrorResponse(
      'THUMBNAIL_GENERATION_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    if (documentId) {
      // Get thumbnail for specific document
      const { data: thumbnail, error } = await supabase
        .from('document_thumbnails')
        .select('*')
        .eq('document_id', documentId)
        .single();
      
      if (error || !thumbnail) {
        return addCORSHeaders(createErrorResponse(
          'THUMBNAIL_NOT_FOUND',
          `Thumbnail for document ${documentId} not found`,
          404
        ));
      }
      
      const thumbnailUrl = supabase.storage
        .from('documents')
        .getPublicUrl(thumbnail.thumbnail_path).data.publicUrl;
      
      return addCORSHeaders(createSuccessResponse({
        document_id: thumbnail.document_id,
        thumbnail_path: thumbnail.thumbnail_path,
        thumbnail_url: thumbnailUrl,
        size: { width: thumbnail.width, height: thumbnail.height },
        format: thumbnail.format,
        quality: thumbnail.quality,
        created_at: thumbnail.created_at
      }));
    }
    
    // List thumbnails
    const { data: thumbnails, error } = await supabase
      .from('document_thumbnails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    
    if (error) {
      throw new Error(`Failed to get thumbnails: ${error.message}`);
    }
    
    // Add URLs to thumbnails
    const thumbnailsWithUrls = (thumbnails || []).map(thumbnail => ({
      ...thumbnail,
      thumbnail_url: supabase.storage
        .from('documents')
        .getPublicUrl(thumbnail.thumbnail_path).data.publicUrl,
      size: { width: thumbnail.width, height: thumbnail.height }
    }));
    
    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      {
        resource: 'document_thumbnails',
        action: 'list',
        result_count: thumbnailsWithUrls.length
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      thumbnails: thumbnailsWithUrls,
      total: thumbnailsWithUrls.length,
      message: 'Thumbnails retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get thumbnails error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get thumbnails';
    return addCORSHeaders(createErrorResponse(
      'GET_THUMBNAILS_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');
    
    if (!documentId) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_DOCUMENT_ID',
        'document_id parameter is required',
        400
      ));
    }
    
    // Get thumbnail record
    const { data: thumbnail, error: getError } = await supabase
      .from('document_thumbnails')
      .select('thumbnail_path')
      .eq('document_id', documentId)
      .single();
    
    if (getError || !thumbnail) {
      return addCORSHeaders(createErrorResponse(
        'THUMBNAIL_NOT_FOUND',
        `Thumbnail for document ${documentId} not found`,
        404
      ));
    }
    
    // Delete thumbnail file from storage
    const { error: deleteFileError } = await supabase.storage
      .from('documents')
      .remove([thumbnail.thumbnail_path]);
    
    if (deleteFileError) {
      console.error('Failed to delete thumbnail file:', deleteFileError);
    }
    
    // Delete thumbnail record
    const { error: deleteRecordError } = await supabase
      .from('document_thumbnails')
      .delete()
      .eq('document_id', documentId);
    
    if (deleteRecordError) {
      throw new Error(`Failed to delete thumbnail record: ${deleteRecordError.message}`);
    }
    
    // Log audit event
    await logAuditEvent(
      'thumbnail_deleted',
      user.uid,
      request,
      {
        document_id: documentId,
        thumbnail_path: thumbnail.thumbnail_path
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: documentId,
      message: 'Thumbnail deleted successfully'
    }));
    
  } catch (error) {
    console.error('Delete thumbnail error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete thumbnail';
    return addCORSHeaders(createErrorResponse(
      'DELETE_THUMBNAIL_FAILED',
      errorMessage,
      500
    ));
  }
}

function getFormatFromMimeType(mimeType: string): string {
  const mapping: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'text/html': 'html',
    'text/plain': 'txt',
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  return mapping[mimeType] || 'unknown';
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}