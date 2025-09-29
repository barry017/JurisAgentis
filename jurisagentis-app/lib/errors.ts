/**
 * Standardized Error Handling Utilities
 * 
 * Provides consistent error handling, logging, and user feedback across the application
 */

import { toast } from '@/hooks/use-toast'

export interface AppError {
  message: string
  code: string
  statusCode?: number
  details?: Record<string, unknown>
  cause?: Error
}

export class AppErrorClass extends Error implements AppError {
  public code: string
  public statusCode?: number
  public details?: Record<string, unknown>
  public cause?: Error

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.cause = cause
  }
}

/**
 * Error codes for different types of application errors
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  MFA_REQUIRED: 'MFA_REQUIRED',

  // Network & API
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Data & Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_INPUT: 'INVALID_INPUT',

  // File & Document
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DOCUMENT_PROCESSING_ERROR: 'DOCUMENT_PROCESSING_ERROR',

  // System & Infrastructure
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

/**
 * User-friendly error messages for different error codes
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Please log in to continue.',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ERROR_CODES.ACCESS_DENIED]: 'You do not have permission to perform this action.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.MFA_REQUIRED]: 'Multi-factor authentication is required.',

  [ERROR_CODES.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
  [ERROR_CODES.API_ERROR]: 'Service temporarily unavailable. Please try again later.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait and try again.',

  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.CONFLICT]: 'This action conflicts with existing data.',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided.',

  [ERROR_CODES.FILE_UPLOAD_ERROR]: 'File upload failed. Please try again.',
  [ERROR_CODES.FILE_SIZE_EXCEEDED]: 'File size is too large. Please choose a smaller file.',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type. Please choose a supported file format.',
  [ERROR_CODES.DOCUMENT_PROCESSING_ERROR]: 'Document processing failed. Please try again.',

  [ERROR_CODES.DATABASE_ERROR]: 'Data operation failed. Please try again.',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service is temporarily unavailable.',
  [ERROR_CODES.CONFIGURATION_ERROR]: 'System configuration error. Please contact support.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
} as const

/**
 * Parse and standardize errors from different sources
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppErrorClass) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
      return {
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        code: ERROR_CODES.NETWORK_ERROR,
        statusCode: 0,
        cause: error
      }
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return {
        message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR],
        code: ERROR_CODES.TIMEOUT_ERROR,
        statusCode: 408,
        cause: error
      }
    }

    // Generic error
    return {
      message: error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
      code: ERROR_CODES.UNKNOWN_ERROR,
      cause: error
    }
  }

  // Response errors (from fetch)
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const response = error as Response
    const code = getErrorCodeFromStatus(response.status)
    return {
      message: ERROR_MESSAGES[code],
      code,
      statusCode: response.status
    }
  }

  // String errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: ERROR_CODES.UNKNOWN_ERROR
    }
  }

  // Unknown error type
  return {
    message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    code: ERROR_CODES.UNKNOWN_ERROR,
    details: { originalError: error }
  }
}

/**
 * Map HTTP status codes to error codes
 */
function getErrorCodeFromStatus(status: number): keyof typeof ERROR_CODES {
  switch (status) {
    case 400:
      return ERROR_CODES.VALIDATION_ERROR
    case 401:
      return ERROR_CODES.AUTHENTICATION_REQUIRED
    case 403:
      return ERROR_CODES.ACCESS_DENIED
    case 404:
      return ERROR_CODES.NOT_FOUND
    case 409:
      return ERROR_CODES.CONFLICT
    case 413:
      return ERROR_CODES.FILE_SIZE_EXCEEDED
    case 415:
      return ERROR_CODES.INVALID_FILE_TYPE
    case 429:
      return ERROR_CODES.RATE_LIMIT_EXCEEDED
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_CODES.API_ERROR
    default:
      return ERROR_CODES.UNKNOWN_ERROR
  }
}

/**
 * Handle errors consistently with logging and user feedback
 */
export function handleError(
  error: unknown,
  context?: {
    operation?: string
    showToast?: boolean
    logError?: boolean
    fallbackMessage?: string
  }
) {
  const parsedError = parseError(error)
  const { operation, showToast = true, logError = true, fallbackMessage } = context || {}

  // Log error for debugging
  if (logError) {
    const logData = {
      message: parsedError.message,
      code: parsedError.code,
      statusCode: parsedError.statusCode,
      operation,
      details: parsedError.details,
      stack: parsedError.cause?.stack,
      timestamp: new Date().toISOString()
    }
    
    console.error('Application Error:', logData)
    
    // In production, you might want to send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
    }
  }

  // Show user-friendly toast
  if (showToast) {
    const displayMessage = fallbackMessage || parsedError.message
    toast({
      title: operation ? `${operation} Failed` : 'Error',
      description: displayMessage,
      variant: 'destructive'
    })
  }

  return parsedError
}

/**
 * Wrapper for async operations with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: {
    operationName?: string
    showToast?: boolean
    logError?: boolean
    fallbackMessage?: string
    onError?: (error: AppError) => void
  }
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error) {
    const appError = handleError(error, {
      operation: context?.operationName,
      showToast: context?.showToast,
      logError: context?.logError,
      fallbackMessage: context?.fallbackMessage
    })
    
    // Custom error handler
    if (context?.onError) {
      context.onError(appError)
    }
    
    return { data: null, error: appError }
  }
}

/**
 * Handle API response errors
 */
export async function handleApiResponse<T = unknown>(
  response: Response,
  _operation?: string
): Promise<T> {
  if (!response.ok) {
    let errorMessage = ERROR_MESSAGES[getErrorCodeFromStatus(response.status)]
    
    try {
      const errorData = await response.json()
      if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Ignore JSON parsing errors
    }
    
    const error = new AppErrorClass(
      errorMessage,
      getErrorCodeFromStatus(response.status),
      response.status
    )
    
    throw error
  }
  
  return response.json()
}

/**
 * Create specific error types for common scenarios
 */
export const createAuthError = (message?: string) => 
  new AppErrorClass(
    message || ERROR_MESSAGES[ERROR_CODES.AUTHENTICATION_REQUIRED],
    ERROR_CODES.AUTHENTICATION_REQUIRED,
    401
  )

export const createValidationError = (message: string, details?: Record<string, unknown>) =>
  new AppErrorClass(
    message,
    ERROR_CODES.VALIDATION_ERROR,
    400,
    details
  )

export const createNotFoundError = (resource?: string) =>
  new AppErrorClass(
    resource ? `${resource} not found` : ERROR_MESSAGES[ERROR_CODES.NOT_FOUND],
    ERROR_CODES.NOT_FOUND,
    404
  )

export const createFileError = (message: string, code: keyof typeof ERROR_CODES = ERROR_CODES.FILE_UPLOAD_ERROR) =>
  new AppErrorClass(
    message,
    code,
    400
  )