/**
 * API Helper Functions
 */

export interface DatabaseResponse<T = unknown> {
  data: T | null
  message: string
  status: 'SUCCESS' | 'ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'PERMISSION_DENIED' | 'DUPLICATE_EMAIL' | 'INTERNAL_ERROR'
  meta?: {
    total_count?: number
    limit?: number
    offset?: number
    page?: number
    has_more?: boolean
    [key: string]: unknown
  }
  timestamp: string
}

export function createDatabaseResponse<T>(
  data: T | null,
  message: string,
  status: DatabaseResponse['status'],
  meta?: DatabaseResponse['meta']
): DatabaseResponse<T> {
  return {
    data,
    message,
    status,
    meta,
    timestamp: new Date().toISOString()
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  // Basic phone validation - allows various formats
  const phoneRegex = /^\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function sanitizeSearchTerm(term: string): string {
  // Remove special characters that could cause issues in database queries
  return term.replace(/[%_\\]/g, '\\$&').trim()
}

export function formatClientName(firstName: string, lastName: string, businessName?: string, preferredName?: string): string {
  if (businessName) {
    return `${businessName} (${preferredName || firstName} ${lastName})`
  }
  return `${preferredName || firstName} ${lastName}`
}

export function formatMatterNumber(practiceArea: string, year?: number, sequence?: number): string {
  const currentYear = year || new Date().getFullYear()
  const yearCode = currentYear.toString().slice(-2)
  const sequenceStr = sequence?.toString().padStart(4, '0') || '0001'
  
  const practiceAreaCodes: { [key: string]: string } = {
    estate_planning: 'EST',
    trust_administration: 'TRU',
    probate: 'PRO',
    business_law: 'BUS',
    real_estate: 'REA',
    family_law: 'FAM',
    litigation: 'LIT'
  }
  
  const areaCode = practiceAreaCodes[practiceArea] || 'GEN'
  return `${yearCode}-${areaCode}-${sequenceStr}`
}

export function parseApiError(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.details) {
    return error.details
  }
  
  return 'An unexpected error occurred'
}

export function buildPaginationMeta(
  totalCount: number | null,
  limit: number,
  offset: number
): DatabaseResponse['meta'] {
  if (totalCount === null) {
    return { limit, offset }
  }
  
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalCount / limit)
  const hasMore = offset + limit < totalCount
  
  return {
    total_count: totalCount,
    limit,
    offset,
    page,
    total_pages: totalPages,
    has_more: hasMore
  }
}