/**
 * Document Status Component - Visual status indicators and management
 * T020: Frontend component integration for Document Management System
 */

'use client'

import { useState } from 'react'
import { 
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Eye,
  Edit3,
  Archive,
  RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Document, DocumentStatus } from '@jurisagentis/document-management'

interface DocumentStatusProps {
  document: Document
  onStatusChange?: (newStatus: DocumentStatus, reason?: string) => void
  showChangeButton?: boolean
  compact?: boolean
}

interface StatusInfo {
  label: string
  color: string
  bgColor: string
  textColor: string
  icon: React.ReactNode
  description: string
}

const statusInfo: Record<DocumentStatus, StatusInfo> = {
  'draft': {
    label: 'Draft',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: <Edit3 className="h-4 w-4" />,
    description: 'Document is being created or edited'
  },
  'review': {
    label: 'Under Review',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: <Eye className="h-4 w-4" />,
    description: 'Document is being reviewed for accuracy and completeness'
  },
  'ready_for_signature': {
    label: 'Ready for Signature',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: <FileCheck className="h-4 w-4" />,
    description: 'Document is finalized and ready to be signed'
  },
  'pending_signature': {
    label: 'Pending Signature',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: <Clock className="h-4 w-4" />,
    description: 'Document has been sent for signature'
  },
  'executed': {
    label: 'Executed',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Document has been fully signed and executed'
  },
  'completed': {
    label: 'Completed',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Document work has been completed'
  },
  'archived': {
    label: 'Archived',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    icon: <Archive className="h-4 w-4" />,
    description: 'Document has been archived'
  }
}

// Define allowed status transitions
const allowedTransitions: Record<DocumentStatus, DocumentStatus[]> = {
  'draft': ['review', 'ready_for_signature', 'archived'],
  'review': ['draft', 'ready_for_signature', 'archived'],
  'ready_for_signature': ['pending_signature', 'review', 'archived'],
  'pending_signature': ['executed', 'ready_for_signature', 'archived'],
  'executed': ['archived'],
  'completed': ['archived'],
  'archived': []
}

export function DocumentStatus({ 
  document, 
  onStatusChange, 
  showChangeButton = false, 
  compact = false 
}: DocumentStatusProps) {
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<DocumentStatus>(document.status)
  const [changeReason, setChangeReason] = useState('')

  const currentStatus = statusInfo[document.status]
  const availableTransitions = allowedTransitions[document.status]

  const handleStatusChange = async () => {
    if (onStatusChange && newStatus !== document.status) {
      await onStatusChange(newStatus, changeReason)
      setIsChangeDialogOpen(false)
      setChangeReason('')
    }
  }

  if (compact) {
    return (
      <Badge className={`${currentStatus.bgColor} ${currentStatus.textColor} flex items-center space-x-1`}>
        {currentStatus.icon}
        <span>{currentStatus.label}</span>
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Document Status
          </span>
          {showChangeButton && availableTransitions.length > 0 && (
            <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Change Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Document Status</DialogTitle>
                  <DialogDescription>
                    Update the status of "{document.title}" and provide a reason for the change.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new_status">New Status</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) => setNewStatus(value as DocumentStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTransitions.map((status) => {
                          const info = statusInfo[status]
                          return (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center space-x-2">
                                {info.icon}
                                <span>{info.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {newStatus !== document.status && (
                      <p className="text-sm text-gray-600 mt-1">
                        {statusInfo[newStatus].description}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="change_reason">Reason for Change</Label>
                    <Textarea
                      id="change_reason"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Briefly explain why this status change is being made..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsChangeDialogOpen(false)
                        setNewStatus(document.status)
                        setChangeReason('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleStatusChange}
                      disabled={newStatus === document.status || !changeReason.trim()}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${currentStatus.bgColor}`}>
            <div className={currentStatus.textColor}>
              {currentStatus.icon}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{currentStatus.label}</h3>
              <Badge className={`${currentStatus.bgColor} ${currentStatus.textColor}`}>
                Current
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {currentStatus.description}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Status History</h4>
          <div className="space-y-2">
            {/* Current status */}
            <div className="flex items-center space-x-3 text-sm">
              <div className={`w-2 h-2 rounded-full ${currentStatus.bgColor.replace('bg-', 'bg-')}`}></div>
              <span className="font-medium">{currentStatus.label}</span>
              <span className="text-gray-500">
                {new Date(document.updated_at).toLocaleDateString()}
              </span>
            </div>
            
            {/* Creation date */}
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span>Created</span>
              <span className="text-gray-500">
                {new Date(document.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Available Transitions */}
        {availableTransitions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Available Actions</h4>
            <div className="space-y-2">
              {availableTransitions.map((status) => {
                const info = statusInfo[status]
                return (
                  <div 
                    key={status}
                    className="flex items-center space-x-3 text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => {
                      if (showChangeButton) {
                        setNewStatus(status)
                        setIsChangeDialogOpen(true)
                      }
                    }}
                  >
                    <div className={`p-1 rounded ${info.bgColor}`}>
                      <div className={info.textColor}>
                        {info.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{info.label}</div>
                      <div className="text-gray-600 text-xs">{info.description}</div>
                    </div>
                    {showChangeButton && (
                      <Button size="sm" variant="ghost">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Document Information</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span>{new Date(document.updated_at).toLocaleDateString()}</span>
            </div>
            {document.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className={
                  new Date(document.due_date) < new Date() 
                    ? 'text-red-600 font-medium' 
                    : ''
                }>
                  {new Date(document.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {document.requires_signature && (
              <div className="flex justify-between">
                <span className="text-gray-600">Signature Required:</span>
                <div className="flex items-center space-x-1 text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs">Yes</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {getStatusProgress(document.status)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getStatusProgress(document.status)}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusProgress(status: DocumentStatus): number {
  const progressMap: Record<DocumentStatus, number> = {
    'draft': 10,
    'review': 30,
    'ready_for_signature': 60,
    'pending_signature': 80,
    'executed': 100,
    'completed': 100,
    'archived': 100
  }
  return progressMap[status] || 0
}