/**
 * Document Card Component - Reusable document display card
 * T020: Frontend component integration for Document Management System
 */

'use client'

import { useState } from 'react'
import { 
  FileText,
  Eye,
  Edit,
  Download,
  Share,
  Clock,
  Tag,
  User,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import type { 
  Document, 
  DocumentStatus, 
  DocumentType,
  DocumentConfidentialityLevel 
} from '@jurisagentis/document-management'

interface DocumentCardProps {
  document: Document
  onView?: (document: Document) => void
  onEdit?: (document: Document) => void
  onDownload?: (document: Document) => void
  onShare?: (document: Document) => void
  onDelete?: (document: Document) => void
  showActions?: boolean
  compact?: boolean
}

const documentTypeLabels: Record<DocumentType, string> = {
  'contract': 'Contract',
  'lease': 'Lease',
  'will': 'Will',
  'trust': 'Trust',
  'power_of_attorney': 'Power of Attorney',
  'court_filing': 'Court Filing',
  'legal_memo': 'Legal Memo',
  'client_agreement': 'Client Agreement',
  'correspondence': 'Correspondence',
  'invoice': 'Invoice',
  'receipt': 'Receipt',
  'expert_report': 'Expert Report',
  'litigation_material': 'Litigation Material',
  'regulatory_filing': 'Regulatory Filing',
  'compliance_document': 'Compliance Document',
  'financial_record': 'Financial Record',
  'hr_record': 'HR Record',
  'policy': 'Policy',
  'other': 'Other'
}

const statusLabels: Record<DocumentStatus, string> = {
  'draft': 'Draft',
  'review': 'Under Review',
  'ready_for_signature': 'Ready for Signature',
  'pending_signature': 'Pending Signature',
  'executed': 'Executed',
  'completed': 'Completed',
  'archived': 'Archived'
}

const getStatusColor = (status: DocumentStatus): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800'
    case 'review': return 'bg-yellow-100 text-yellow-800'
    case 'ready_for_signature': return 'bg-blue-100 text-blue-800'
    case 'pending_signature': return 'bg-orange-100 text-orange-800'
    case 'executed': return 'bg-green-100 text-green-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'archived': return 'bg-gray-100 text-gray-600'
  }
}

const getConfidentialityColor = (level: DocumentConfidentialityLevel): string => {
  switch (level) {
    case 'public': return 'bg-green-100 text-green-800'
    case 'internal': return 'bg-blue-100 text-blue-800'
    case 'client_confidential': return 'bg-yellow-100 text-yellow-800'
    case 'attorney_client_privileged': return 'bg-red-100 text-red-800'
  }
}

export function DocumentCard({ 
  document, 
  onView,
  onEdit,
  onDownload,
  onShare,
  onDelete,
  showActions = true,
  compact = false
}: DocumentCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const handleCardClick = () => {
    if (onView) {
      onView(document)
    } else {
      router.push(`/documents/${document.id}`)
    }
  }

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <CardContent className={`p-6 ${compact ? 'p-4' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <h3 className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm' : 'text-lg'}`}>
                {document.title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              <Badge className={getStatusColor(document.status)}>
                {statusLabels[document.status]}
              </Badge>
              <Badge className={getConfidentialityColor(document.confidentiality_level)}>
                {document.confidentiality_level.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            {document.description && !compact && (
              <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                {document.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                {documentTypeLabels[document.document_type]}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {new Date(document.created_at).toLocaleDateString()}
              </span>
              {document.created_by && (
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {document.created_by}
                </span>
              )}
            </div>
            
            {document.tags && document.tags.length > 0 && !compact && (
              <div className="mt-3 flex flex-wrap gap-1">
                {document.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {document.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{document.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {showActions && (
            <div className={`flex items-center space-x-1 ml-4 transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleAction(e, () => onView?.(document) || router.push(`/documents/${document.id}`))}
                title="View document"
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleAction(e, () => onEdit?.(document))}
                title="Edit document"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleAction(e, () => onDownload?.(document))}
                title="Download document"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleAction(e, () => onShare?.(document))}
                title="Share document"
              >
                <Share className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(document)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(document)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.(document)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare?.(document)}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(document)}
                      className="text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}