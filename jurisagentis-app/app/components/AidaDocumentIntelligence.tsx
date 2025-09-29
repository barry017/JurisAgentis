'use client'

import { useState, useCallback } from 'react'
import { 
  CloudArrowUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FolderIcon,
  UserGroupIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

// Interfaces for AI document intelligence
interface DocumentAnalysis {
  document_type: string
  confidence: number
  suggested_title: string
  suggested_category: string
  extracted_parties: string[]
  key_dates: Array<{
    date: string
    description: string
    type: 'deadline' | 'execution' | 'effective' | 'expiration'
  }>
  content_summary: string
  requires_action: boolean
  suggested_actions: Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    description: string
  }>
  filing_suggestion: {
    matter_id?: string
    client_id?: string
    folder_path: string
    reasoning: string
  }
  needs_esignature: boolean
  signature_parties?: string[]
}

interface ClarificationQuestion {
  id: string
  question: string
  type: 'client_identification' | 'matter_association' | 'document_type' | 'urgency' | 'action_required'
  options?: string[]
  required: boolean
}

interface AidaDocumentUploadProps {
  onDocumentProcessed: (analysis: DocumentAnalysis, clarifications: ClarificationQuestion[]) => void
  onUploadComplete: (documentId: string) => void
}

export function AidaDocumentUpload({ onDocumentProcessed, onUploadComplete }: AidaDocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([])
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({})

  // Real GPT-5 powered document intelligence
  const analyzeDocument = useCallback(async (file: File): Promise<{ analysis: DocumentAnalysis, clarifications: ClarificationQuestion[] }> => {
    try {
      console.log('🤖 Aida: Starting GPT-5 document analysis for:', file.name)
      
      // Prepare form data for API call
      const formData = new FormData()
      formData.append('file', file)
      formData.append('priority', 'medium')
      
      // Call the real AI analysis API
      const response = await fetch('/api/ai-assistant/document-analysis', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('🤖 Aida: GPT-5 analysis complete:', result.analysis.document_type)
      
      return {
        analysis: result.analysis,
        clarifications: result.clarifications || []
      }
      
    } catch (error) {
      console.error('GPT-5 analysis failed, falling back to intelligent inference:', error)
      
      // Fallback to intelligent inference if API fails
      return await fallbackDocumentAnalysis(file)
    }
  }, [fallbackDocumentAnalysis])

  // Fallback analysis using intelligent filename and type inference
  const fallbackDocumentAnalysis = useCallback(async (file: File): Promise<{ analysis: DocumentAnalysis, clarifications: ClarificationQuestion[] }> => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const fileName = file.name.toLowerCase()
    let analysis: DocumentAnalysis
    let clarifications: ClarificationQuestion[] = []

    if (fileName.includes('trust') || fileName.includes('will')) {
      analysis = {
        document_type: 'Estate Planning Document',
        confidence: 0.85, // Lower confidence for fallback
        suggested_title: `Estate Document - ${extractNameFromFile(fileName)}`,
        suggested_category: 'Estate Planning',
        extracted_parties: ['Client', 'Beneficiaries'],
        key_dates: [],
        content_summary: 'Estate planning document detected based on filename analysis. Full content analysis unavailable.',
        requires_action: true,
        suggested_actions: [
          { action: 'Attorney review required', priority: 'high', description: 'Document needs manual review due to analysis limitations' }
        ],
        filing_suggestion: {
          folder_path: '/Documents/Estate Planning/Needs Review/',
          reasoning: 'Estate document detected, requires manual review and proper categorization'
        },
        needs_esignature: false
      }
      
      clarifications = [
        {
          id: 'review_needed',
          question: 'I detected an estate planning document but need manual review. Should I schedule attorney review?',
          type: 'action_required',
          options: ['Yes, schedule review', 'I will handle manually'],
          required: true
        }
      ]
    } else if (fileName.includes('retainer') || fileName.includes('engagement')) {
      analysis = {
        document_type: 'Engagement Agreement',
        confidence: 0.80,
        suggested_title: `Engagement Agreement - ${extractNameFromFile(fileName)}`,
        suggested_category: 'Client Agreements',
        extracted_parties: ['Client', 'Attorney'],
        key_dates: [],
        content_summary: 'Client engagement agreement detected. Alabama e-signature compliance will be verified.',
        requires_action: true,
        suggested_actions: [
          { action: 'Verify Alabama compliance', priority: 'high', description: 'Ensure agreement meets Alabama bar requirements' },
          { action: 'Prepare for e-signature', priority: 'medium', description: 'Setup e-signature process if compliant' }
        ],
        filing_suggestion: {
          folder_path: '/Clients/New Engagements/',
          reasoning: 'Engagement agreement ready for compliance review and processing'
        },
        needs_esignature: true,
        signature_parties: ['Client', 'Attorney']
      }
      
      clarifications = [
        {
          id: 'new_client_check',
          question: 'Is this for a new client engagement?',
          type: 'action_required',
          options: ['Yes, new client', 'No, existing client', 'Unsure'],
          required: true
        }
      ]
    } else {
      analysis = {
        document_type: 'Legal Document',
        confidence: 0.60,
        suggested_title: file.name.replace(/\.[^/.]+$/, ''),
        suggested_category: 'General',
        extracted_parties: [],
        key_dates: [],
        content_summary: 'Document analysis limited. Manual review recommended for proper categorization.',
        requires_action: true,
        suggested_actions: [
          { action: 'Manual document review', priority: 'medium', description: 'Full analysis requires manual review' }
        ],
        filing_suggestion: {
          folder_path: '/Documents/Inbox/Needs Review/',
          reasoning: 'Document type unclear from filename, requires manual categorization'
        },
        needs_esignature: false
      }
      
      clarifications = [
        {
          id: 'document_type',
          question: 'I need help identifying this document. What type of legal document is this?',
          type: 'document_type',
          required: true
        }
      ]
    }

    return { analysis, clarifications }
  }, [])

  // Extract potential name from filename for AI processing
  const extractNameFromFile = (filename: string): string => {
    // Simple pattern matching for names in filenames
    const namePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+)/
    const match = filename.match(namePattern)
    return match ? match[1] : 'Client'
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }, [processFile])

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    
    try {
      // Simulate Aida's AI analysis
      const result = await analyzeDocument(file)
      setAnalysis(result.analysis)
      setClarifications(result.clarifications)
      onDocumentProcessed(result.analysis, result.clarifications)
    } catch (error) {
      console.error('Document processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onDocumentProcessed, analyzeDocument])

  const handleClarificationAnswer = (questionId: string, answer: string) => {
    setClarificationAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const processWithAnswers = async () => {
    if (!analysis) return

    try {
      console.log('🤖 Aida: Processing document with AI-enhanced metadata...')
      
      // Enhanced metadata with user clarifications
      const enhancedMetadata = {
        ...analysis,
        clarifications: clarificationAnswers,
        processing_timestamp: new Date().toISOString()
      }

      // Upload document to document management system
      const documentId = await uploadDocumentWithMetadata(enhancedMetadata)
      console.log('🤖 Aida: Document uploaded successfully:', documentId)
      
      // Trigger appropriate automated workflows based on document type and answers
      await triggerAutomatedWorkflows(analysis, clarificationAnswers, documentId)
      
      onUploadComplete(documentId)
      
    } catch (error) {
      console.error('🤖 Aida: Document processing failed:', error)
      // Handle error appropriately
    }
  }

  // Upload document with AI-enhanced metadata
  const uploadDocumentWithMetadata = async (metadata: DocumentAnalysis & { clarifications: Record<string, string>; processing_timestamp: string }): Promise<string> => {
    // In real implementation, this would upload to your document management system
    // and return the actual document ID
    const documentId = `doc_${Date.now()}`
    
    // Simulate document upload with metadata
    console.log('📁 Uploading document with metadata:', {
      document_id: documentId,
      title: metadata.suggested_title,
      category: metadata.suggested_category,
      filing_path: metadata.filing_suggestion.folder_path,
      parties: metadata.extracted_parties,
      key_dates: metadata.key_dates,
      requires_esignature: metadata.needs_esignature,
      alabama_compliance: metadata.alabama_specific_requirements || {}
    })
    
    return documentId
  }

  // Trigger automated workflows based on analysis and user responses
  const triggerAutomatedWorkflows = async (
    documentAnalysis: DocumentAnalysis, 
    answers: Record<string, string>, 
    documentId: string
  ) => {
    const workflows: Array<{
      type: string
      priority: string
      metadata: Record<string, unknown>
    }> = []

    // New client engagement workflow
    if (documentAnalysis.document_type === 'Engagement Agreement' || 
        documentAnalysis.document_type === 'Client Engagement Agreement') {
      
      const isNewClient = answers.new_client === 'Yes, start new client process' || 
                         answers.new_client_check === 'Yes, new client'
      
      if (isNewClient) {
        workflows.push({
          type: 'client_engagement',
          priority: 'high',
          metadata: {
            document_id: documentId,
            document_type: documentAnalysis.document_type,
            practice_area: answers.practice_area || answers.practice_area_confirm || 'General Legal',
            client_name: extractNameFromFile(documentAnalysis.suggested_title),
            requires_esignature: documentAnalysis.needs_esignature,
            alabama_compliance_required: true
          }
        })
      }
    }

    // Document processing workflow for estate planning
    if (documentAnalysis.document_type === 'Estate Planning Document') {
      const needsReview = answers.review_needed === 'Yes, schedule review'
      
      workflows.push({
        type: 'document_upload',
        priority: needsReview ? 'high' : 'medium',
        metadata: {
          document_id: documentId,
          document_type: documentAnalysis.document_type,
          requires_attorney_review: needsReview,
          alabama_compliance_required: true,
          execution_method: 'wet_signature' // Estate docs typically require wet signatures in Alabama
        }
      })
    }

    // E-signature workflow for qualifying documents
    if (documentAnalysis.needs_esignature && 
        documentAnalysis.document_type !== 'Estate Planning Document') {
      
      workflows.push({
        type: 'document_upload',
        priority: 'medium',
        metadata: {
          document_id: documentId,
          document_type: documentAnalysis.document_type,
          requires_esignature: true,
          alabama_compliance_required: true,
          signature_parties: documentAnalysis.signature_parties || ['Client']
        }
      })
    }

    // Execute workflows
    for (const workflow of workflows) {
      try {
        console.log(`🤖 Aida: Triggering ${workflow.type} workflow...`)
        
        const response = await fetch('/api/workflows/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: workflow.type,
            source: 'document_upload',
            priority: workflow.priority,
            metadata: workflow.metadata,
            client_info: {
              name: extractNameFromFile(documentAnalysis.suggested_title),
              practice_area: workflow.metadata.practice_area
            },
            document_info: {
              document_id: documentId,
              document_type: documentAnalysis.document_type,
              requires_esignature: documentAnalysis.needs_esignature,
              alabama_compliance_required: true
            }
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`🤖 Aida: ${workflow.type} workflow initiated:`, result.workflow_id)
        } else {
          console.error(`🤖 Aida: Failed to trigger ${workflow.type} workflow:`, response.statusText)
        }
        
      } catch (error) {
        console.error(`🤖 Aida: Error triggering ${workflow.type} workflow:`, error)
      }
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High Confidence'
    if (confidence >= 0.7) return 'Medium Confidence'
    return 'Low Confidence'
  }

  return (
    <div className="space-y-6">
      {/* Magic Upload Area */}
      {!analysis && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <SparklesIcon className="h-12 w-12 text-indigo-600 mx-auto animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🤖 Aida is analyzing your document...</h3>
                <p className="text-gray-600 mt-2">
                  I&apos;m reading the content, identifying the document type, extracting key information, 
                  and determining the best way to handle this document.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">✨ Magic Document Upload</h3>
                <p className="text-gray-600 mt-2">
                  Drop a document here and I&apos;ll automatically figure out what it is, 
                  where it should go, and what actions need to be taken.
                </p>
              </div>
              <div className="flex justify-center">
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors">
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">🤖 Aida&apos;s Analysis</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(analysis.confidence)}`}>
              {getConfidenceText(analysis.confidence)} ({Math.round(analysis.confidence * 100)}%)
            </span>
          </div>

          {/* Document Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Document Type</label>
                <p className="text-gray-900">{analysis.document_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Suggested Title</label>
                <p className="text-gray-900">{analysis.suggested_title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <p className="text-gray-900">{analysis.suggested_category}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Filing Location</label>
                <p className="text-gray-900 flex items-center">
                  <FolderIcon className="h-4 w-4 mr-2" />
                  {analysis.filing_suggestion.folder_path}
                </p>
                <p className="text-sm text-gray-600 mt-1">{analysis.filing_suggestion.reasoning}</p>
              </div>
              {analysis.needs_esignature && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <PencilSquareIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Requires E-Signature</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Summary */}
          <div>
            <label className="text-sm font-medium text-gray-700">Content Summary</label>
            <p className="text-gray-900 mt-1">{analysis.content_summary}</p>
          </div>

          {/* Extracted Information */}
          {analysis.extracted_parties.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Parties Involved</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {analysis.extracted_parties.map((party, index) => (
                  <span key={index} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    <UserGroupIcon className="h-3 w-3 mr-1" />
                    {party}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Dates */}
          {analysis.key_dates.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Important Dates</label>
              <div className="space-y-2 mt-1">
                {analysis.key_dates.map((dateInfo, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{dateInfo.date}</span>
                    <span>{dateInfo.description}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dateInfo.type === 'deadline' ? 'bg-red-100 text-red-800' :
                      dateInfo.type === 'execution' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {dateInfo.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {analysis.suggested_actions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Recommended Actions</label>
              <div className="space-y-2 mt-1">
                {analysis.suggested_actions.map((action, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    action.priority === 'high' ? 'bg-red-50 border-red-400' :
                    action.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {action.priority === 'high' && <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
                      {action.priority === 'medium' && <InformationCircleIcon className="h-4 w-4 text-yellow-600" />}
                      {action.priority === 'low' && <CheckCircleIcon className="h-4 w-4 text-blue-600" />}
                      <span className="font-medium">{action.action}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aida's Clarifying Questions */}
      {clarifications.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">🤖 I need some clarification...</h4>
          </div>

          <div className="space-y-4">
            {clarifications.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="text-sm font-medium text-blue-900">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {question.options ? (
                  <select
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={clarificationAnswers[question.id] || ''}
                    onChange={(e) => handleClarificationAnswer(question.id, e.target.value)}
                  >
                    <option value="">Select an option...</option>
                    {question.options.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Please provide more details..."
                    value={clarificationAnswers[question.id] || ''}
                    onChange={(e) => handleClarificationAnswer(question.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={processWithAnswers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              disabled={clarifications.some(q => q.required && !clarificationAnswers[q.id])}
            >
              Process Document
            </button>
            <button
              onClick={() => {
                setAnalysis(null)
                setClarifications([])
                setClarificationAnswers({})
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for using Aida's document intelligence in other components
export function useAidaDocumentIntelligence() {
  const [isProcessing, setIsProcessing] = useState(false)

  const analyzeAndFile = async (file: File, context?: {
    clientId?: string
    matterId?: string
    priority?: 'high' | 'medium' | 'low'
  }) => {
    setIsProcessing(true)
    
    try {
      // This would call the actual AI service
      const formData = new FormData()
      formData.append('file', file)
      if (context?.clientId) formData.append('client_id', context.clientId)
      if (context?.matterId) formData.append('matter_id', context.matterId)
      if (context?.priority) formData.append('priority', context.priority)

      const response = await fetch('/api/ai-assistant/document-analysis', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Analysis failed')
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Document analysis failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const triggerAutomatedWorkflow = async (workflowType: string, documentId: string, _metadata: Record<string, unknown>) => {
    // This would trigger your automated workflows
    // - New client engagement
    // - E-signature processing
    // - Follow-up reminders
    // - Invoice generation based on milestones
    
    console.log(`🤖 Aida: Triggering ${workflowType} workflow for document ${documentId}`)
    
    // Example: New client engagement workflow
    if (workflowType === 'new_client_engagement') {
      // 1. Create client record
      // 2. Setup matter
      // 3. Send welcome email
      // 4. Schedule follow-up tasks
      // 5. Monitor e-signature completion
      // 6. Trigger next steps when signed
    }
  }

  return {
    isProcessing,
    analyzeAndFile,
    triggerAutomatedWorkflow
  }
}