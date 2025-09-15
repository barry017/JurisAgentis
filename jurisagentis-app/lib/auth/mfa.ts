/**
 * Multi-Factor Authentication (MFA) Utilities
 * 
 * Provides TOTP generation, QR code creation, and backup code management
 */

import { authenticator } from 'otplib'
import * as qrcode from 'qrcode'
import { randomBytes } from 'crypto'

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(
  userEmail: string, 
  secret: string, 
  serviceName: string = 'JurisAgentis'
): Promise<string> {
  const otpauth = authenticator.keyuri(userEmail, serviceName, secret)
  return await qrcode.toDataURL(otpauth)
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (error) {
    console.error('TOTP verification error:', error)
    return false
  }
}

/**
 * Check if TOTP code is expired (for more specific error handling)
 */
export function isTOTPCodeExpired(token: string, secret: string): boolean {
  try {
    // Generate current valid tokens (current + 1 step back/forward for clock skew)
    const currentTime = Math.floor(Date.now() / 1000)
    const window = 30 // TOTP window in seconds
    
    const validTokens = []
    for (let i = -1; i <= 1; i++) {
      const time = currentTime + (i * window)
      const validToken = authenticator.generate(secret, time)
      validTokens.push(validToken)
    }
    
    return !validTokens.includes(token)
  } catch (error) {
    return true // Consider expired if we can't verify
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character hexadecimal backup code
    const code = randomBytes(4).toString('hex')
    codes.push(code)
  }
  
  return codes
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, availableCodes: string[]): boolean {
  return availableCodes.includes(code.toLowerCase())
}

/**
 * Remove used backup code from available codes
 */
export function removeUsedBackupCode(usedCode: string, availableCodes: string[]): string[] {
  return availableCodes.filter(code => code !== usedCode.toLowerCase())
}

/**
 * Check if account should be locked based on failed attempts
 */
export function shouldLockAccount(failedAttempts: number, threshold: number = 5): boolean {
  return failedAttempts >= threshold
}

/**
 * Calculate lockout duration in minutes
 */
export function calculateLockoutDuration(failedAttempts: number): number {
  // Progressive lockout: 15 min, 30 min, 1 hour, 2 hours, etc.
  const baseLockout = 15 // minutes
  const multiplier = Math.min(failedAttempts - 4, 8) // Cap at 8x
  return baseLockout * Math.pow(2, multiplier - 1)
}

/**
 * Generate lockout expiry timestamp
 */
export function generateLockoutExpiry(failedAttempts: number): string {
  const duration = calculateLockoutDuration(failedAttempts)
  const expiryTime = new Date(Date.now() + (duration * 60 * 1000))
  return expiryTime.toISOString()
}

/**
 * Check if account is currently locked
 */
export function isAccountLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false
  
  const lockExpiry = new Date(lockedUntil)
  const now = new Date()
  
  return lockExpiry > now
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutTime(lockedUntil: string): number {
  const lockExpiry = new Date(lockedUntil)
  const now = new Date()
  
  const remainingMs = lockExpiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(remainingMs / 1000))
}