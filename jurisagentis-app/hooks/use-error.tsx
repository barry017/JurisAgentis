/**
 * Error Handling Hook
 * 
 * Provides consistent error handling for React components
 */

'use client'

import { useCallback } from 'react'
import { handleError, withErrorHandling, AppError } from '@/lib/errors'
import { toast } from '@/hooks/use-toast'

export interface UseErrorOptions {
  defaultShowToast?: boolean
  defaultLogError?: boolean
  onError?: (error: AppError) => void
}

export function useError(options: UseErrorOptions = {}) {
  const {
    defaultShowToast = true,
    defaultLogError = true,
    onError
  } = options

  const handleErrorCallback = useCallback((
    error: unknown,
    context?: {
      operation?: string
      showToast?: boolean
      logError?: boolean
      fallbackMessage?: string
    }
  ) => {
    const appError = handleError(error, {
      showToast: context?.showToast ?? defaultShowToast,
      logError: context?.logError ?? defaultLogError,
      operation: context?.operation,
      fallbackMessage: context?.fallbackMessage
    })

    if (onError) {
      onError(appError)
    }

    return appError
  }, [defaultShowToast, defaultLogError, onError])

  const withErrorHandlingCallback = useCallback(<T,>(
    operation: () => Promise<T>,
    context?: {
      operationName?: string
      showToast?: boolean
      logError?: boolean
      fallbackMessage?: string
      onError?: (error: AppError) => void
    }
  ) => {
    return withErrorHandling(operation, {
      ...context,
      showToast: context?.showToast ?? defaultShowToast,
      logError: context?.logError ?? defaultLogError,
      onError: context?.onError || onError
    })
  }, [defaultShowToast, defaultLogError, onError])

  const showError = useCallback((
    message: string,
    title?: string
  ) => {
    toast({
      title: title || 'Error',
      description: message,
      variant: 'destructive'
    })
  }, [])

  const showSuccess = useCallback((
    message: string,
    title?: string
  ) => {
    toast({
      title: title || 'Success',
      description: message,
      variant: 'default'
    })
  }, [])

  const showWarning = useCallback((
    message: string,
    title?: string
  ) => {
    toast({
      title: title || 'Warning',
      description: message,
      variant: 'default' // Note: You might want to add a warning variant to your toast
    })
  }, [])

  return {
    handleError: handleErrorCallback,
    withErrorHandling: withErrorHandlingCallback,
    showError,
    showSuccess,
    showWarning
  }
}