/**
 * React hooks for Document Management
 * T018: App integration layer for Document Management System
 * 
 * Custom hooks for interacting with document management APIs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Document,
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentSearchParams,
  DocumentVersion,
  DocumentAccess,
  DocumentShare
} from '@jurisagentis/document-management';

// API response types
interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface DocumentListResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

interface DocumentSearchResponse {
  documents: Document[];
  total: number;
  facets?: Record<string, Record<string, number>>;
  suggestions?: string[];
  execution_time_ms?: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Hook for document CRUD operations
export function useDocument(documentId?: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async (id: string, includeVersions = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = includeVersions ? '?include_versions=true' : '';
      const response = await fetch(`/api/documents/${id}${params}`);
      const result: APIResponse<{ document: Document }> = await response.json();
      
      if (result.success && result.data) {
        setDocument(result.data.document);
      } else {
        setError(result.error?.message || 'Failed to fetch document');
      }
    } catch (_err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocument = useCallback(async (id: string, data: DocumentUpdateInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result: APIResponse<{ document: Document }> = await response.json();
      
      if (result.success && result.data) {
        setDocument(result.data.document);
        return result.data.document;
      } else {
        setError(result.error?.message || 'Failed to update document');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      });
      
      const result: APIResponse = await response.json();
      
      if (result.success) {
        setDocument(null);
        return true;
      } else {
        setError(result.error?.message || 'Failed to delete document');
        return false;
      }
    } catch (_err) {
      setError('Network error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, fetchDocument]);

  return {
    document,
    loading,
    error,
    fetchDocument,
    updateDocument,
    deleteDocument,
    refresh: () => documentId && fetchDocument(documentId)
  };
}

// Hook for document list/search operations
export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<DocumentListResponse['pagination'] | null>(null);

  const createDocument = useCallback(async (data: DocumentCreateInput) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result: APIResponse<{ document: Document }> = await response.json();
      
      if (result.success && result.data) {
        return result.data.document;
      } else {
        setError(result.error?.message || 'Failed to create document');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listDocuments = useCallback(async (params: {
    page?: number;
    limit?: number;
    search?: string;
    matter_id?: string;
    client_id?: string;
    document_type?: string;
    status?: string;
    confidentiality_level?: string;
    include_archived?: boolean;
  } = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/documents?${queryParams}`);
      const result: APIResponse<DocumentListResponse> = await response.json();
      
      if (result.success && result.data) {
        setDocuments(result.data.documents);
        setPagination(result.data.pagination);
      } else {
        setError(result.error?.message || 'Failed to fetch documents');
      }
    } catch (_err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDocuments = useCallback(async (params: DocumentSearchParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add simple parameters
      if (params.query) queryParams.append('query', params.query);
      if (params.matter_id) queryParams.append('matter_id', params.matter_id);
      if (params.client_id) queryParams.append('client_id', params.client_id);
      if (params.confidentiality_level) queryParams.append('confidentiality_level', params.confidentiality_level);
      if (params.created_by) queryParams.append('created_by', params.created_by);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.sort_order) queryParams.append('sort_order', params.sort_order);
      if (params.include_archived) queryParams.append('include_archived', 'true');
      
      // Add array parameters
      params.document_type?.forEach(type => queryParams.append('document_type', type));
      params.status?.forEach(status => queryParams.append('status', status));
      params.priority?.forEach(priority => queryParams.append('priority', priority));
      params.tags?.forEach(tag => queryParams.append('tags', tag));
      
      // Add date parameters
      if (params.created_after) queryParams.append('created_after', params.created_after.toISOString());
      if (params.created_before) queryParams.append('created_before', params.created_before.toISOString());
      if (params.updated_after) queryParams.append('updated_after', params.updated_after.toISOString());
      if (params.updated_before) queryParams.append('updated_before', params.updated_before.toISOString());
      
      const response = await fetch(`/api/documents/search?${queryParams}`);
      const result: APIResponse<DocumentSearchResponse> = await response.json();
      
      if (result.success && result.data) {
        setDocuments(result.data.documents);
        return result.data;
      } else {
        setError(result.error?.message || 'Search failed');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    documents,
    loading,
    error,
    pagination,
    createDocument,
    listDocuments,
    searchDocuments
  };
}

// Hook for document versions
export function useDocumentVersions(documentId: string) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async (branchName = 'main') => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = branchName !== 'main' ? `?branch=${branchName}` : '';
      const response = await fetch(`/api/documents/${documentId}/versions${params}`);
      const result: APIResponse<{ versions: DocumentVersion[] }> = await response.json();
      
      if (result.success && result.data) {
        setVersions(result.data.versions);
      } else {
        setError(result.error?.message || 'Failed to fetch versions');
      }
    } catch (_err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const createVersion = useCallback(async (data: {
    file_path: string;
    file_name: string;
    file_size: number;
    file_hash: string;
    change_summary: string;
    change_type?: 'minor' | 'major' | 'patch';
    branch_name?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result: APIResponse<{ version: DocumentVersion }> = await response.json();
      
      if (result.success && result.data) {
        // Refresh versions list
        await fetchVersions();
        return result.data.version;
      } else {
        setError(result.error?.message || 'Failed to create version');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchVersions]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    loading,
    error,
    fetchVersions,
    createVersion,
    refresh: () => fetchVersions()
  };
}

// Hook for document access management
export function useDocumentAccess(documentId: string) {
  const [accessRecords, setAccessRecords] = useState<DocumentAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async (userId?: string) => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = userId ? `?user_id=${userId}` : '';
      const response = await fetch(`/api/documents/${documentId}/access${params}`);
      const result: APIResponse<{ access_records: DocumentAccess[] }> = await response.json();
      
      if (result.success && result.data) {
        setAccessRecords(result.data.access_records);
      } else {
        setError(result.error?.message || 'Failed to fetch access records');
      }
    } catch (_err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const grantAccess = useCallback(async (data: {
    user_id: string;
    access_level: 'view' | 'comment' | 'edit' | 'manage';
    permissions?: Record<string, boolean>;
    expires_at?: string;
    access_reason?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result: APIResponse<{ access: DocumentAccess }> = await response.json();
      
      if (result.success && result.data) {
        // Refresh access list
        await fetchAccess();
        return result.data.access;
      } else {
        setError(result.error?.message || 'Failed to grant access');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchAccess]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  return {
    accessRecords,
    loading,
    error,
    fetchAccess,
    grantAccess,
    refresh: () => fetchAccess()
  };
}

// Hook for document sharing
export function useDocumentShares(documentId: string) {
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/shares`);
      const result: APIResponse<{ shares: DocumentShare[] }> = await response.json();
      
      if (result.success && result.data) {
        setShares(result.data.shares);
      } else {
        setError(result.error?.message || 'Failed to fetch shares');
      }
    } catch (_err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const createShare = useCallback(async (data: {
    recipient_email: string;
    share_type: 'client_portal' | 'external_link' | 'email_attachment' | 'secure_download';
    permissions: {
      can_view: boolean;
      can_download: boolean;
      can_comment: boolean;
      can_approve: boolean;
      can_print?: boolean;
    };
    expires_in_hours?: number;
    custom_message?: string;
    require_password?: boolean;
    password?: string;
    apply_watermark?: boolean;
    max_views?: number;
    max_downloads?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result: APIResponse<{ share: DocumentShare }> = await response.json();
      
      if (result.success && result.data) {
        // Refresh shares list
        await fetchShares();
        return result.data.share;
      } else {
        setError(result.error?.message || 'Failed to create share');
        return null;
      }
    } catch (_err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchShares]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  return {
    shares,
    loading,
    error,
    fetchShares,
    createShare,
    refresh: () => fetchShares()
  };
}