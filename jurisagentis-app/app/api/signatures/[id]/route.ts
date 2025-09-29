/**
 * Individual Signature Request API Routes - GET, PUT, DELETE operations
 * T067: Signature request by ID operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/services/e-signature';
import { z } from 'zod';

// Initialize services
const signatureService = new SignatureService();

// Validation schemas
const UpdateSignatureRequestSchema = z.object({
  subject: z.string().optional(),
  message: z.string().optional(),
  signing_deadline: z.string().datetime().optional(),
  auto_reminders: z.boolean().optional(),
  reminder_frequency_days: z.number().int().positive().optional()
});

/**
 * GET /api/signatures/[id] - Get signature request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Validate UUID format
    if (!isValidUUID(requestId)) {
      return NextResponse.json({
        error: 'Invalid signature request ID format'
      }, { status: 400 });
    }

    // Fetch signature request
    const signatureRequest = await signatureService.getSignatureRequest(requestId);

    if (!signatureRequest) {
      return NextResponse.json({
        error: 'Signature request not found'
      }, { status: 404 });
    }

    return NextResponse.json(signatureRequest, { status: 200 });

  } catch (error) {
    console.error('Signature request fetch error:', error);

    return NextResponse.json({
      error: 'Failed to fetch signature request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/signatures/[id] - Update signature request (only for pending requests)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Validate UUID format
    if (!isValidUUID(requestId)) {
      return NextResponse.json({
        error: 'Invalid signature request ID format'
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validatedData = UpdateSignatureRequestSchema.parse(body);

    // Convert signing_deadline string to Date if provided
    const updateInput = {
      ...validatedData,
      signing_deadline: validatedData.signing_deadline ? new Date(validatedData.signing_deadline) : undefined
    };

    // Update signature request
    const signatureRequest = await signatureService.updateSignatureRequest(requestId, updateInput);

    return NextResponse.json(signatureRequest, { status: 200 });

  } catch (error) {
    console.error('Signature request update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        error: 'Signature request not found'
      }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('cannot be updated')) {
      return NextResponse.json({
        error: 'Signature request cannot be updated in its current state'
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to update signature request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/signatures/[id] - Cancel signature request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Validate UUID format
    if (!isValidUUID(requestId)) {
      return NextResponse.json({
        error: 'Invalid signature request ID format'
      }, { status: 400 });
    }

    // Parse query parameters for cancellation reason
    const url = new URL(request.url);
    const cancellationReason = url.searchParams.get('reason') || 'Cancelled by user';

    // Cancel signature request
    const cancelledRequest = await signatureService.cancelSignatureRequest(requestId, cancellationReason);

    return NextResponse.json({
      message: 'Signature request cancelled successfully',
      request_id: requestId,
      status: cancelledRequest.status,
      cancellation_reason: cancelledRequest.cancellation_reason,
      cancelled_at: cancelledRequest.cancelled_at
    }, { status: 200 });

  } catch (error) {
    console.error('Signature request cancellation error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        error: 'Signature request not found'
      }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('cannot be cancelled')) {
      return NextResponse.json({
        error: 'Signature request cannot be cancelled in its current state'
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to cancel signature request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper function to validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}