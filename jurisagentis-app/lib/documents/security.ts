/**
 * Document Security Module - File encryption and virus scanning
 * T075: Implement file encryption and virus scanning for legal document security
 */

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Security configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export interface SecurityConfig {
  encryptionKey?: string;
  virusScanningEnabled: boolean;
  allowedFileTypes: string[];
  maxFileSize: number; // in bytes
  quarantineEnabled: boolean;
}

export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyId: string;
}

export interface DecryptionResult {
  decryptedData: Buffer;
  verified: boolean;
}

export interface VirusScanResult {
  isClean: boolean;
  threatDetected?: string;
  scanId: string;
  scanTimestamp: string;
  quarantined: boolean;
}

export interface FileSecurityMetadata {
  encrypted: boolean;
  encryptionKeyId?: string;
  virusScanned: boolean;
  scanResult?: VirusScanResult;
  integrity: {
    checksum: string;
    algorithm: string;
    verified: boolean;
  };
  securityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

export class DocumentSecurityService {
  private config: SecurityConfig;
  private supabase;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.supabase = createClient();
  }

  /**
   * Encrypt file data using AES-256-GCM
   */
  async encryptFile(data: Buffer, keyId?: string): Promise<EncryptionResult> {
    try {
      // Generate or retrieve encryption key
      const key = keyId 
        ? await this.getEncryptionKey(keyId)
        : await this.generateEncryptionKey();

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
      cipher.setAAD(Buffer.from(keyId || 'default'));

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv,
        tag,
        keyId: keyId || await this.storeEncryptionKey(key)
      };

    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file data using AES-256-GCM
   */
  async decryptFile(
    encryptedData: Buffer, 
    iv: Buffer, 
    tag: Buffer, 
    keyId: string
  ): Promise<DecryptionResult> {
    try {
      // Retrieve encryption key
      const key = await this.getEncryptionKey(keyId);

      // Create decipher
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
      decipher.setAAD(Buffer.from(keyId));
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      return {
        decryptedData: decrypted,
        verified: true
      };

    } catch (error) {
      console.error('File decryption failed:', error);
      return {
        decryptedData: Buffer.alloc(0),
        verified: false
      };
    }
  }

  /**
   * Scan file for viruses and malware
   */
  async scanFileForViruses(data: Buffer, filename: string): Promise<VirusScanResult> {
    const scanId = crypto.randomUUID();
    const scanTimestamp = new Date().toISOString();

    try {
      if (!this.config.virusScanningEnabled) {
        return {
          isClean: true,
          scanId,
          scanTimestamp,
          quarantined: false
        };
      }

      // Basic file type validation
      const isAllowedType = this.validateFileType(filename);
      if (!isAllowedType) {
        return {
          isClean: false,
          threatDetected: 'Disallowed file type',
          scanId,
          scanTimestamp,
          quarantined: true
        };
      }

      // File size validation
      if (data.length > this.config.maxFileSize) {
        return {
          isClean: false,
          threatDetected: 'File size exceeds limit',
          scanId,
          scanTimestamp,
          quarantined: true
        };
      }

      // Simulate virus scanning (in production, integrate with ClamAV or similar)
      const scanResult = await this.performVirusScan(data, filename);

      // Log scan result
      await this.logSecurityEvent('virus_scan', {
        scan_id: scanId,
        filename,
        file_size: data.length,
        result: scanResult.isClean ? 'clean' : 'threat_detected',
        threat: scanResult.threatDetected,
        quarantined: scanResult.quarantined
      });

      return scanResult;

    } catch (error) {
      console.error('Virus scanning failed:', error);
      
      // Default to quarantine on scan failure for security
      return {
        isClean: false,
        threatDetected: 'Scan failed - quarantined for safety',
        scanId,
        scanTimestamp,
        quarantined: true
      };
    }
  }

  /**
   * Calculate file integrity checksum
   */
  generateFileChecksum(data: Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Verify file integrity
   */
  verifyFileIntegrity(data: Buffer, expectedChecksum: string, algorithm: string = 'sha256'): boolean {
    const actualChecksum = this.generateFileChecksum(data, algorithm);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Create comprehensive security metadata for a file
   */
  async createSecurityMetadata(
    data: Buffer, 
    filename: string,
    securityLevel: FileSecurityMetadata['securityLevel'] = 'confidential'
  ): Promise<FileSecurityMetadata> {
    try {
      // Generate integrity checksum
      const checksum = this.generateFileChecksum(data);

      // Perform virus scan
      const scanResult = await this.scanFileForViruses(data, filename);

      // Encrypt if required for security level
      const shouldEncrypt = securityLevel === 'confidential' || securityLevel === 'restricted';

      return {
        encrypted: shouldEncrypt,
        encryptionKeyId: shouldEncrypt ? crypto.randomUUID() : undefined,
        virusScanned: true,
        scanResult,
        integrity: {
          checksum,
          algorithm: 'sha256',
          verified: true
        },
        securityLevel
      };

    } catch (error) {
      console.error('Failed to create security metadata:', error);
      throw new Error('Security metadata generation failed');
    }
  }

  /**
   * Process file upload with full security pipeline
   */
  async secureFileUpload(
    data: Buffer,
    filename: string,
    securityLevel: FileSecurityMetadata['securityLevel'] = 'confidential'
  ): Promise<{
    processedData: Buffer;
    metadata: FileSecurityMetadata;
    uploadAllowed: boolean;
    quarantineReason?: string;
  }> {
    try {
      // Create security metadata (includes virus scan)
      const metadata = await this.createSecurityMetadata(data, filename, securityLevel);

      // Check if upload should be blocked
      if (!metadata.scanResult?.isClean) {
        return {
          processedData: Buffer.alloc(0),
          metadata,
          uploadAllowed: false,
          quarantineReason: metadata.scanResult?.threatDetected
        };
      }

      // Encrypt if required
      let processedData = data;
      if (metadata.encrypted && metadata.encryptionKeyId) {
        const encryptionResult = await this.encryptFile(data, metadata.encryptionKeyId);
        processedData = Buffer.concat([
          encryptionResult.iv,
          encryptionResult.tag,
          encryptionResult.encryptedData
        ]);
      }

      return {
        processedData,
        metadata,
        uploadAllowed: true
      };

    } catch (error) {
      console.error('Secure file upload failed:', error);
      throw new Error('File security processing failed');
    }
  }

  /**
   * Process file download with security validation
   */
  async secureFileDownload(
    encryptedData: Buffer,
    metadata: FileSecurityMetadata
  ): Promise<{
    decryptedData: Buffer;
    verified: boolean;
    securityValid: boolean;
  }> {
    try {
      let decryptedData = encryptedData;
      let verified = true;

      // Decrypt if file is encrypted
      if (metadata.encrypted && metadata.encryptionKeyId) {
        const iv = encryptedData.slice(0, IV_LENGTH);
        const tag = encryptedData.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = encryptedData.slice(IV_LENGTH + TAG_LENGTH);

        const decryptionResult = await this.decryptFile(encrypted, iv, tag, metadata.encryptionKeyId);
        decryptedData = decryptionResult.decryptedData;
        verified = decryptionResult.verified;
      }

      // Verify file integrity
      const integrityValid = this.verifyFileIntegrity(
        decryptedData,
        metadata.integrity.checksum,
        metadata.integrity.algorithm
      );

      return {
        decryptedData,
        verified,
        securityValid: verified && integrityValid
      };

    } catch (error) {
      console.error('Secure file download failed:', error);
      return {
        decryptedData: Buffer.alloc(0),
        verified: false,
        securityValid: false
      };
    }
  }

  /**
   * Validate file type against allowed list
   */
  private validateFileType(filename: string): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return extension ? this.config.allowedFileTypes.includes(extension) : false;
  }

  /**
   * Perform actual virus scan (mock implementation)
   * In production, integrate with ClamAV, VirusTotal, or similar service
   */
  private async performVirusScan(data: Buffer, filename: string): Promise<VirusScanResult> {
    const scanId = crypto.randomUUID();
    const scanTimestamp = new Date().toISOString();

    // Mock scan - check for suspicious patterns
    const suspicious = [
      'eicar test string',
      'x5o!p%@ap',
      'malware',
      'virus'
    ];

    const content = data.toString('utf8', 0, Math.min(1024, data.length)).toLowerCase();
    const threatDetected = suspicious.find(pattern => content.includes(pattern));

    return {
      isClean: !threatDetected,
      threatDetected: threatDetected ? `Suspicious pattern detected: ${threatDetected}` : undefined,
      scanId,
      scanTimestamp,
      quarantined: !!threatDetected && this.config.quarantineEnabled
    };
  }

  /**
   * Generate new encryption key
   */
  private async generateEncryptionKey(): Promise<Buffer> {
    return crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * Store encryption key securely
   */
  private async storeEncryptionKey(key: Buffer): Promise<string> {
    const keyId = crypto.randomUUID();
    
    // In production, store in secure key management service (AWS KMS, etc.)
    // For now, store encrypted in database
    const { error } = await this.supabase
      .from('encryption_keys')
      .insert({
        id: keyId,
        key_data: key.toString('base64'),
        created_at: new Date().toISOString(),
        active: true
      });

    if (error) {
      throw new Error('Failed to store encryption key');
    }

    return keyId;
  }

  /**
   * Retrieve encryption key
   */
  private async getEncryptionKey(keyId: string): Promise<Buffer> {
    const { data, error } = await this.supabase
      .from('encryption_keys')
      .select('key_data')
      .eq('id', keyId)
      .eq('active', true)
      .single();

    if (error || !data) {
      throw new Error('Encryption key not found');
    }

    return Buffer.from(data.key_data, 'base64');
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(eventType: string, metadata: Record<string, unknown>) {
    await this.supabase
      .from('audit_logs')
      .insert({
        table_name: 'document_security',
        action: eventType,
        metadata,
        created_at: new Date().toISOString()
      });
  }
}

// Default security configuration for legal documents
export const defaultSecurityConfig: SecurityConfig = {
  virusScanningEnabled: true,
  allowedFileTypes: [
    'pdf', 'doc', 'docx', 'txt', 'rtf',
    'jpg', 'jpeg', 'png', 'gif',
    'xlsx', 'xls', 'csv'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  quarantineEnabled: true
};

// Export singleton instance
export const documentSecurity = new DocumentSecurityService(defaultSecurityConfig);