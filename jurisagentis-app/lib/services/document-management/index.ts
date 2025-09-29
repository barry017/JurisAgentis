/**
 * Document Management Services Integration
 * T018: App integration layer for Document Management System
 * 
 * Centralized initialization and access to document management services
 */

import { 
  DocumentService, 
  VersionService, 
  AccessService, 
  SharingService, 
  SearchService,
  AIGenerationService
} from '@jurisagentis/document-management';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client for document services
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize all document management services
export const documentService = new DocumentService(supabase);
export const versionService = new VersionService(supabase);
export const accessService = new AccessService(supabase);
export const sharingService = new SharingService(supabase);
export const searchService = new SearchService(supabase);
export const aiGenerationService = new AIGenerationService(
  process.env.OPENAI_API_KEY!,
  supabase
);

// Export types for use in the app
export type {
  Document,
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentSearchParams,
  DocumentSearchResult,
  DocumentVersion,
  DocumentAccess,
  DocumentShare,
  VersionCreateInput,
  AccessGrantInput,
  ShareCreateInput,
  AIGenerationRequest,
  AIGenerationResult,
  DocumentStatus,
  DocumentType,
  DocumentConfidentialityLevel,
  PriorityLevel,
  AccessLevel,
  ShareType
} from '@jurisagentis/document-management';

// Helper function to get service with proper error handling
export function getDocumentService() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for document services');
  }
  return documentService;
}

export function getVersionService() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for version services');
  }
  return versionService;
}

export function getAccessService() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for access services');
  }
  return accessService;
}

export function getSharingService() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for sharing services');
  }
  return sharingService;
}

export function getSearchService() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for search services');
  }
  return searchService;
}

export function getAIGenerationService() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key missing for AI generation services');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for AI generation services');
  }
  return aiGenerationService;
}

// Utility function to initialize all services for a specific Supabase client
export function createDocumentServices(customSupabase: unknown) {
  return {
    documentService: new DocumentService(customSupabase),
    versionService: new VersionService(customSupabase),
    accessService: new AccessService(customSupabase),
    sharingService: new SharingService(customSupabase),
    searchService: new SearchService(customSupabase),
    aiGenerationService: new AIGenerationService(
      process.env.OPENAI_API_KEY!,
      customSupabase
    )
  };
}