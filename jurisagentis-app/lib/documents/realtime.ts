/**
 * Real-time Collaborative Document Editing
 * T076: Implement Supabase real-time subscriptions for collaborative editing
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export interface CollaborativeSession {
  documentId: string;
  sessionId: string;
  participants: CollaborativeUser[];
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface CollaborativeUser {
  userId: string;
  userName: string;
  userEmail: string;
  role: 'admin' | 'associate_attorney' | 'paralegal' | 'assistant' | 'client';
  joinedAt: string;
  lastSeen: string;
  isActive: boolean;
  cursor?: EditorCursor;
  selection?: EditorSelection;
}

export interface EditorCursor {
  line: number;
  column: number;
  position: number;
}

export interface EditorSelection {
  start: EditorCursor;
  end: EditorCursor;
  content: string;
}

export interface DocumentChange {
  id: string;
  documentId: string;
  sessionId: string;
  userId: string;
  changeType: 'insert' | 'delete' | 'replace' | 'format' | 'cursor_move' | 'selection_change';
  position: EditorCursor;
  content?: string;
  previousContent?: string;
  metadata: {
    timestamp: string;
    clientId: string;
    operationId: string;
    conflictResolved?: boolean;
  };
}

export interface ConflictResolution {
  conflictId: string;
  documentId: string;
  conflictingChanges: DocumentChange[];
  resolutionStrategy: 'merge' | 'manual' | 'accept_latest' | 'accept_first';
  resolvedBy?: string;
  resolvedAt?: string;
  mergedContent?: string;
}

export interface RealtimeEventHandlers {
  onUserJoined?: (user: CollaborativeUser) => void;
  onUserLeft?: (userId: string) => void;
  onUserPresenceUpdate?: (user: CollaborativeUser) => void;
  onDocumentChange?: (change: DocumentChange) => void;
  onConflictDetected?: (conflict: ConflictResolution) => void;
  onSessionStatusChange?: (session: CollaborativeSession) => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
}

export class RealtimeCollaborationService {
  private supabase;
  private serverSupabase;
  private channel: RealtimeChannel | null = null;
  private currentSession: CollaborativeSession | null = null;
  private currentUser: CollaborativeUser | null = null;
  private changeHistory: DocumentChange[] = [];
  private conflictQueue: ConflictResolution[] = [];
  private eventHandlers: RealtimeEventHandlers = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.serverSupabase = createServerClient();
  }

  /**
   * Join a collaborative editing session for a document
   */
  async joinSession(
    documentId: string,
    user: Omit<CollaborativeUser, 'joinedAt' | 'lastSeen' | 'isActive'>,
    handlers: RealtimeEventHandlers = {}
  ): Promise<CollaborativeSession> {
    try {
      this.eventHandlers = handlers;
      this.currentUser = {
        ...user,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isActive: true
      };

      // Create or join existing session
      const session = await this.createOrJoinSession(documentId);
      this.currentSession = session;

      // Set up real-time channel
      await this.setupRealtimeChannel(documentId);

      // Start heartbeat for presence
      this.startHeartbeat();

      // Notify handlers
      this.eventHandlers.onSessionStatusChange?.(session);

      return session;

    } catch (error) {
      console.error('Failed to join collaborative session:', error);
      throw new Error('Failed to join collaboration session');
    }
  }

  /**
   * Leave the current collaborative session
   */
  async leaveSession(): Promise<void> {
    try {
      if (!this.currentSession || !this.currentUser) return;

      // Update user status to inactive
      await this.updateUserPresence(false);

      // Clean up channel
      if (this.channel) {
        await this.channel.unsubscribe();
        this.channel = null;
      }

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Notify handlers
      this.eventHandlers.onUserLeft?.(this.currentUser.userId);

      // Clear state
      this.currentSession = null;
      this.currentUser = null;

    } catch (error) {
      console.error('Failed to leave collaborative session:', error);
    }
  }

  /**
   * Send a document change to all collaborators
   */
  async sendChange(change: Omit<DocumentChange, 'id' | 'documentId' | 'sessionId' | 'userId' | 'metadata'>): Promise<void> {
    if (!this.currentSession || !this.currentUser || !this.channel) {
      throw new Error('Not in an active collaborative session');
    }

    const documentChange: DocumentChange = {
      id: this.generateChangeId(),
      documentId: this.currentSession.documentId,
      sessionId: this.currentSession.sessionId,
      userId: this.currentUser.userId,
      ...change,
      metadata: {
        timestamp: new Date().toISOString(),
        clientId: this.currentUser.userId,
        operationId: this.generateOperationId()
      }
    };

    try {
      // Store change in history
      this.changeHistory.push(documentChange);

      // Send to other participants via real-time channel
      await this.channel.send({
        type: 'broadcast',
        event: 'document_change',
        payload: documentChange
      });

      // Persist change to database for conflict resolution
      await this.persistChange(documentChange);

    } catch (error) {
      console.error('Failed to send document change:', error);
      throw new Error('Failed to send change to collaborators');
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(cursor: EditorCursor): Promise<void> {
    if (!this.currentUser || !this.channel) return;

    this.currentUser.cursor = cursor;
    this.currentUser.lastSeen = new Date().toISOString();

    await this.channel.send({
      type: 'broadcast',
      event: 'cursor_update',
      payload: {
        userId: this.currentUser.userId,
        cursor,
        timestamp: this.currentUser.lastSeen
      }
    });
  }

  /**
   * Update text selection
   */
  async updateSelection(selection: EditorSelection): Promise<void> {
    if (!this.currentUser || !this.channel) return;

    this.currentUser.selection = selection;
    this.currentUser.lastSeen = new Date().toISOString();

    await this.channel.send({
      type: 'broadcast',
      event: 'selection_update',
      payload: {
        userId: this.currentUser.userId,
        selection,
        timestamp: this.currentUser.lastSeen
      }
    });
  }

  /**
   * Get current session participants
   */
  getCurrentParticipants(): CollaborativeUser[] {
    return this.currentSession?.participants || [];
  }

  /**
   * Get document change history
   */
  getChangeHistory(): DocumentChange[] {
    return [...this.changeHistory];
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictResolution[] {
    return [...this.conflictQueue];
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolution['resolutionStrategy'],
    mergedContent?: string
  ): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.conflictId === conflictId);
    if (!conflict) throw new Error('Conflict not found');

    const resolution: ConflictResolution = {
      ...conflict,
      resolutionStrategy: strategy,
      resolvedBy: this.currentUser?.userId,
      resolvedAt: new Date().toISOString(),
      mergedContent
    };

    // Apply resolution
    await this.applyConflictResolution(resolution);

    // Remove from queue
    this.conflictQueue = this.conflictQueue.filter(c => c.conflictId !== conflictId);

    // Notify participants
    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'conflict_resolved',
        payload: resolution
      });
    }
  }

  /**
   * Set up real-time channel for the document
   */
  private async setupRealtimeChannel(documentId: string): Promise<void> {
    const channelName = `document_collaboration_${documentId}`;
    
    this.channel = this.supabase.channel(channelName)
      .on('broadcast', { event: 'document_change' }, (payload) => {
        this.handleIncomingChange(payload.payload as DocumentChange);
      })
      .on('broadcast', { event: 'cursor_update' }, (payload) => {
        this.handleCursorUpdate(payload.payload);
      })
      .on('broadcast', { event: 'selection_update' }, (payload) => {
        this.handleSelectionUpdate(payload.payload);
      })
      .on('broadcast', { event: 'user_joined' }, (payload) => {
        this.handleUserJoined(payload.payload as CollaborativeUser);
      })
      .on('broadcast', { event: 'user_left' }, (payload) => {
        this.handleUserLeft(payload.payload.userId);
      })
      .on('broadcast', { event: 'conflict_detected' }, (payload) => {
        this.handleConflictDetected(payload.payload as ConflictResolution);
      })
      .on('broadcast', { event: 'conflict_resolved' }, (payload) => {
        this.handleConflictResolved(payload.payload as ConflictResolution);
      });

    // Subscribe and handle connection status
    const status = await this.channel.subscribe((status) => {
      this.eventHandlers.onConnectionStatusChange?.(
        status === 'SUBSCRIBED' ? 'connected' : 
        status === 'CHANNEL_ERROR' ? 'disconnected' : 'reconnecting'
      );
    });

    if (status !== 'SUBSCRIBED') {
      throw new Error('Failed to subscribe to real-time channel');
    }

    // Announce presence
    await this.announcePresence();
  }

  /**
   * Create or join existing collaborative session
   */
  private async createOrJoinSession(documentId: string): Promise<CollaborativeSession> {
    // Check for existing active session
    const { data: existingSession } = await this.serverSupabase
      .from('collaborative_sessions')
      .select('*')
      .eq('document_id', documentId)
      .eq('is_active', true)
      .single();

    if (existingSession) {
      // Join existing session
      await this.addParticipantToSession(existingSession.id, this.currentUser!);
      return this.mapSessionFromDB(existingSession);
    } else {
      // Create new session
      const sessionId = this.generateSessionId();
      const session: CollaborativeSession = {
        documentId,
        sessionId,
        participants: [this.currentUser!],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      await this.persistSession(session);
      return session;
    }
  }

  /**
   * Handle incoming document changes
   */
  private async handleIncomingChange(change: DocumentChange): Promise<void> {
    // Skip own changes
    if (change.userId === this.currentUser?.userId) return;

    // Check for conflicts
    const conflicts = this.detectConflicts(change);
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        this.conflictQueue.push(conflict);
        this.eventHandlers.onConflictDetected?.(conflict);
      }
      return;
    }

    // Apply change
    this.changeHistory.push(change);
    this.eventHandlers.onDocumentChange?.(change);
  }

  /**
   * Handle cursor updates from other users
   */
  private handleCursorUpdate(payload: { userId: string; cursor: EditorCursor; timestamp: string }): void {
    if (payload.userId === this.currentUser?.userId) return;

    const participant = this.currentSession?.participants.find(p => p.userId === payload.userId);
    if (participant) {
      participant.cursor = payload.cursor;
      participant.lastSeen = payload.timestamp;
      this.eventHandlers.onUserPresenceUpdate?.(participant);
    }
  }

  /**
   * Handle selection updates from other users
   */
  private handleSelectionUpdate(payload: { userId: string; selection: EditorSelection; timestamp: string }): void {
    if (payload.userId === this.currentUser?.userId) return;

    const participant = this.currentSession?.participants.find(p => p.userId === payload.userId);
    if (participant) {
      participant.selection = payload.selection;
      participant.lastSeen = payload.timestamp;
      this.eventHandlers.onUserPresenceUpdate?.(participant);
    }
  }

  /**
   * Handle user joining
   */
  private handleUserJoined(user: CollaborativeUser): void {
    if (this.currentSession && !this.currentSession.participants.find(p => p.userId === user.userId)) {
      this.currentSession.participants.push(user);
      this.eventHandlers.onUserJoined?.(user);
    }
  }

  /**
   * Handle user leaving
   */
  private handleUserLeft(userId: string): void {
    if (this.currentSession) {
      this.currentSession.participants = this.currentSession.participants.filter(p => p.userId !== userId);
      this.eventHandlers.onUserLeft?.(userId);
    }
  }

  /**
   * Handle conflict detection
   */
  private handleConflictDetected(conflict: ConflictResolution): void {
    this.conflictQueue.push(conflict);
    this.eventHandlers.onConflictDetected?.(conflict);
  }

  /**
   * Handle conflict resolution
   */
  private handleConflictResolved(resolution: ConflictResolution): void {
    this.conflictQueue = this.conflictQueue.filter(c => c.conflictId !== resolution.conflictId);
    this.eventHandlers.onConflictDetected?.(resolution);
  }

  /**
   * Detect conflicts between changes
   */
  private detectConflicts(incomingChange: DocumentChange): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    
    // Look for recent conflicting changes
    const recentChanges = this.changeHistory.filter(
      change => 
        Math.abs(new Date(change.metadata.timestamp).getTime() - new Date(incomingChange.metadata.timestamp).getTime()) < 5000 && // Within 5 seconds
        this.isPositionConflict(change.position, incomingChange.position)
    );

    if (recentChanges.length > 0) {
      conflicts.push({
        conflictId: this.generateConflictId(),
        documentId: incomingChange.documentId,
        conflictingChanges: [...recentChanges, incomingChange],
        resolutionStrategy: 'manual'
      });
    }

    return conflicts;
  }

  /**
   * Check if two positions conflict
   */
  private isPositionConflict(pos1: EditorCursor, pos2: EditorCursor): boolean {
    // Simple conflict detection - same line and nearby columns
    return pos1.line === pos2.line && Math.abs(pos1.column - pos2.column) < 10;
  }

  /**
   * Announce presence to other participants
   */
  private async announcePresence(): Promise<void> {
    if (!this.channel || !this.currentUser) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'user_joined',
      payload: this.currentUser
    });
  }

  /**
   * Update user presence
   */
  private async updateUserPresence(isActive: boolean): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.isActive = isActive;
    this.currentUser.lastSeen = new Date().toISOString();

    if (!isActive && this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'user_left',
        payload: { userId: this.currentUser.userId }
      });
    }
  }

  /**
   * Start heartbeat for presence
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentUser) {
        this.currentUser.lastSeen = new Date().toISOString();
        await this.updateUserPresence(true);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Persist change to database
   */
  private async persistChange(change: DocumentChange): Promise<void> {
    await this.serverSupabase
      .from('document_changes')
      .insert({
        id: change.id,
        document_id: change.documentId,
        session_id: change.sessionId,
        user_id: change.userId,
        change_type: change.changeType,
        position: change.position,
        content: change.content,
        previous_content: change.previousContent,
        metadata: change.metadata
      });
  }

  /**
   * Persist session to database
   */
  private async persistSession(session: CollaborativeSession): Promise<void> {
    await this.serverSupabase
      .from('collaborative_sessions')
      .insert({
        id: session.sessionId,
        document_id: session.documentId,
        participants: session.participants,
        created_at: session.createdAt,
        last_activity: session.lastActivity,
        is_active: session.isActive
      });
  }

  /**
   * Add participant to existing session
   */
  private async addParticipantToSession(sessionId: string, user: CollaborativeUser): Promise<void> {
    const { data: session } = await this.serverSupabase
      .from('collaborative_sessions')
      .select('participants')
      .eq('id', sessionId)
      .single();

    if (session) {
      const participants = [...(session.participants || []), user];
      await this.serverSupabase
        .from('collaborative_sessions')
        .update({ 
          participants,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(resolution: ConflictResolution): Promise<void> {
    // Store conflict resolution in database
    await this.serverSupabase
      .from('conflict_resolutions')
      .insert({
        id: resolution.conflictId,
        document_id: resolution.documentId,
        conflicting_changes: resolution.conflictingChanges,
        resolution_strategy: resolution.resolutionStrategy,
        resolved_by: resolution.resolvedBy,
        resolved_at: resolution.resolvedAt,
        merged_content: resolution.mergedContent
      });
  }

  /**
   * Map database session to interface
   */
  private mapSessionFromDB(dbSession: any): CollaborativeSession {
    return {
      documentId: dbSession.document_id,
      sessionId: dbSession.id,
      participants: dbSession.participants || [],
      createdAt: dbSession.created_at,
      lastActivity: dbSession.last_activity,
      isActive: dbSession.is_active
    };
  }

  /**
   * Generate unique IDs
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const realtimeCollaboration = new RealtimeCollaborationService();