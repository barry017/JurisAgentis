/**
 * E-Signature API Routes - Signature request management
 * T066: Signature request CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/services/e-signature';
import { z } from 'zod';

// Initialize services
const signatureService = new SignatureService();

// Validation schemas
const SignerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  signing_order: z.number().int().positive(),
  access_code: z.string().optional(),
  id_verification_required: z.boolean().optional(),
  signature_fields: z.array(z.object({
    page_number: z.number().int().positive(),
    x_position: z.number().min(0),
    y_position: z.number().min(0),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    field_type: z.enum(['signature', 'initial', 'date', 'text', 'checkbox', 'radio', 'dropdown']),
    field_name: z.string().optional(),
    field_value: z.string().optional(),
    is_required: z.boolean().optional()
  }))
});

const CreateSignatureRequestSchema = z.object({
  document_id: z.string().uuid(),
  signers: z.array(SignerSchema).min(1),
  subject: z.string().optional(),
  message: z.string().optional(),
  signing_deadline: z.string().datetime().optional(),
  sequential_signing: z.boolean().optional(),
  require_id_verification: z.boolean().optional(),
  auto_reminders: z.boolean().optional(),
  reminder_frequency_days: z.number().int().positive().optional()
});

const SearchSignatureRequestsSchema = z.object({
  document_id: z.string().uuid().optional(),
  status: z.array(z.string()).optional(),
  signer_email: z.string().email().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  deadline_after: z.string().datetime().optional(),
  deadline_before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  sort_by: z.enum(['created_at', 'signing_deadline', 'completion_percentage']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

/**
 * GET /api/signatures - Search and list signature requests
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // Handle array parameters
    ['status'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param].split(',');
      }
    });
    
    // Handle numeric parameters
    ['limit', 'offset'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = parseInt(queryParams[param] as string);
      }
    });

    // Validate parameters
    const searchParams = SearchSignatureRequestsSchema.parse(queryParams);

    // Convert string dates to Date objects
    const params = {
      ...searchParams,
      created_after: searchParams.created_after ? new Date(searchParams.created_after) : undefined,
      created_before: searchParams.created_before ? new Date(searchParams.created_before) : undefined,
      deadline_after: searchParams.deadline_after ? new Date(searchParams.deadline_after) : undefined,
      deadline_before: searchParams.deadline_before ? new Date(searchParams.deadline_before) : undefined
    };

    // Execute search
    const result = await signatureService.searchSignatureRequests(params);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Signature request search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to search signature requests',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/signatures - Create a new signature request
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validatedData = CreateSignatureRequestSchema.parse(body);

    // Convert signing_deadline string to Date if provided
    const createInput = {
      ...validatedData,
      signing_deadline: validatedData.signing_deadline ? new Date(validatedData.signing_deadline) : undefined
    };

    // Create signature request
    const signatureRequest = await signatureService.createSignatureRequest(createInput);

    return NextResponse.json(signatureRequest, { status: 201 });

  } catch (error) {
    console.error('Signature request creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create signature request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}