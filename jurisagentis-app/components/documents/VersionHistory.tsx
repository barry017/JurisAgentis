/**
 * Version History Component - Document version comparison and rollback
 * T068: Version control component for Document Management System
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  History,
  Eye,
  Download,
  RestoreIcon,
  GitBranch,
  Clock,
  User,
  FileText,
  Compare,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentVersion } from '@jurisagentis/document-management'

interface VersionHistoryProps {
  documentId: string
  currentVersion?: DocumentVersion
  onVersionRestore?: (versionId: string) => Promise<void>
  onVersionDownload?: (versionId: string) => Promise<void>
  onVersionPreview?: (versionId: string) => void
  onCreateBranch?: (fromVersionId: string, branchName: string) => Promise<void>
  showComparison?: boolean
  allowRestore?: boolean
}

interface VersionComparison {
  added: Array<{ line: number, content: string }>
  removed: Array<{ line: number, content: string }>
  modified: Array<{ line: number, old: string, new: string }>
}

interface BranchInfo {
  name: string
  versions: DocumentVersion[]
  isActive: boolean
}

export function VersionHistory({
  documentId,
  currentVersion,
  onVersionRestore,
  onVersionDownload,
  onVersionPreview,
  onCreateBranch,
  showComparison = true,
  allowRestore = true
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{
    base: DocumentVersion | null
    compare: DocumentVersion | null
  }>({ base: null, compare: null })
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  // Fetch versions for the current branch
  const fetchVersions = async (branchName: string = 'main') => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions?branch=${encodeURIComponent(branchName)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch versions')
      }
      
      const data = await response.json()
      setVersions(data.versions || [])
      
      // Mock branches data for demo
      setBranches([
        {
          name: 'main',
          versions: data.versions || [],
          isActive: branchName === 'main'
        },
        {
          name: 'draft-review',
          versions: [],
          isActive: branchName === 'draft-review'
        }
      ])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
      console.error('Error fetching versions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions(selectedBranch)
  }, [documentId, selectedBranch])

  // Handle version comparison
  const handleCompareVersions = async (base: DocumentVersion, compare: DocumentVersion) => {
    try {
      // In a real implementation, this would call an API to get the diff
      // For now, we'll simulate a comparison
      const mockComparison: VersionComparison = {
        added: [
          { line: 10, content: 'This is a new paragraph added in version ' + compare.version_number },
          { line: 25, content: 'Additional content here' }
        ],
        removed: [
          { line: 5, content: 'This content was removed' }
        ],
        modified: [
          { 
            line: 15, 
            old: 'Original text in version ' + base.version_number,
            new: 'Modified text in version ' + compare.version_number
          }
        ]
      }
      
      setComparison(mockComparison)
      setCompareVersions({ base, compare })
      setCompareMode(true)
    } catch (error) {
      console.error('Error comparing versions:', error)
    }
  }

  // Handle version restore
  const handleRestore = async (version: DocumentVersion) => {
    if (!onVersionRestore) return
    
    const confirmed = window.confirm(
      `Are you sure you want to restore to version ${version.version_number}? This will create a new version with the restored content.`
    )
    
    if (confirmed) {
      try {
        await onVersionRestore(version.id)
        fetchVersions(selectedBranch) // Refresh versions
      } catch (error) {
        console.error('Error restoring version:', error)
      }
    }
  }

  // Handle branch creation
  const handleCreateBranch = async (fromVersion: DocumentVersion) => {
    if (!onCreateBranch) return
    
    const branchName = prompt('Enter branch name:')
    if (branchName) {
      try {
        await onCreateBranch(fromVersion.id, branchName)
        fetchVersions(selectedBranch) // Refresh
      } catch (error) {
        console.error('Error creating branch:', error)
      }
    }
  }

  // Toggle version expansion
  const toggleVersionExpansion = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(versionId)) {
        newSet.delete(versionId)
      } else {
        newSet.add(versionId)
      }
      return newSet
    })
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-2">Loading version history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading version history: {error}</p>
            <Button onClick={() => fetchVersions(selectedBranch)} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Version History
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-4 w-4" />
                        <span>{branch.name}</span>
                        {branch.isActive && <Badge variant="secondary">Active</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {showComparison && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareMode(!compareMode)}
                >
                  <Compare className="h-4 w-4 mr-2" />
                  {compareMode ? 'Exit Compare' : 'Compare'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {compareMode ? (
            <Tabs defaultValue="select" className="w-full">
              <TabsList>
                <TabsTrigger value="select">Select Versions</TabsTrigger>
                <TabsTrigger value="diff" disabled={!comparison}>
                  View Differences
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="select" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Base Version</h4>
                    <Select
                      value={compareVersions.base?.id || ''}
                      onValueChange={(value) => {
                        const version = versions.find(v => v.id === value)
                        setCompareVersions(prev => ({ ...prev, base: version || null }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select base version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            v{version.version_number} - {new Date(version.created_at).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Compare Version</h4>
                    <Select
                      value={compareVersions.compare?.id || ''}
                      onValueChange={(value) => {
                        const version = versions.find(v => v.id === value)
                        setCompareVersions(prev => ({ ...prev, compare: version || null }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select compare version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            v{version.version_number} - {new Date(version.created_at).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    if (compareVersions.base && compareVersions.compare) {
                      handleCompareVersions(compareVersions.base, compareVersions.compare)
                    }
                  }}
                  disabled={!compareVersions.base || !compareVersions.compare}
                  className="w-full"
                >
                  Compare Versions
                </Button>
              </TabsContent>
              
              <TabsContent value="diff" className="space-y-4">
                {comparison && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Comparing v{compareVersions.base?.version_number} → v{compareVersions.compare?.version_number}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center text-green-600">
                          <Plus className="h-4 w-4 mr-1" />
                          {comparison.added.length} additions
                        </span>
                        <span className="flex items-center text-red-600">
                          <Minus className="h-4 w-4 mr-1" />
                          {comparison.removed.length} deletions
                        </span>
                        <span className="flex items-center text-blue-600">
                          <ArrowRight className="h-4 w-4 mr-1" />
                          {comparison.modified.length} modifications
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {comparison.added.map((addition, index) => (
                        <div key={`add-${index}`} className="bg-green-50 border-l-4 border-green-400 p-3">
                          <div className="flex items-center text-green-700 text-sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Line {addition.line} - Added
                          </div>
                          <p className="mt-1 text-sm font-mono">{addition.content}</p>
                        </div>
                      ))}
                      
                      {comparison.removed.map((removal, index) => (
                        <div key={`remove-${index}`} className="bg-red-50 border-l-4 border-red-400 p-3">
                          <div className="flex items-center text-red-700 text-sm">
                            <Minus className="h-4 w-4 mr-2" />
                            Line {removal.line} - Removed
                          </div>
                          <p className="mt-1 text-sm font-mono line-through">{removal.content}</p>
                        </div>
                      ))}
                      
                      {comparison.modified.map((modification, index) => (
                        <div key={`modify-${index}`} className="bg-blue-50 border-l-4 border-blue-400 p-3">
                          <div className="flex items-center text-blue-700 text-sm">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Line {modification.line} - Modified
                          </div>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm font-mono text-red-600 line-through">{modification.old}</p>
                            <p className="text-sm font-mono text-green-600">{modification.new}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No versions found for this branch</p>
              ) : (
                versions.map((version, index) => (
                  <Card key={version.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVersionExpansion(version.id)}
                          >
                            {expandedVersions.has(version.id) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">Version {version.version_number}</h4>
                              {currentVersion?.id === version.id && (
                                <Badge variant="default">Current</Badge>
                              )}
                              {index === 0 && (
                                <Badge variant="secondary">Latest</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(version.created_at).toLocaleString()}
                              </span>
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {version.created_by || 'Unknown'}
                              </span>
                              <span className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                {formatFileSize(version.file_size)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVersionPreview?.(version.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVersionDownload?.(version.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {allowRestore && currentVersion?.id !== version.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(version)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateBranch(version)}
                          >
                            <GitBranch className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {expandedVersions.has(version.id) && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="space-y-2">
                            <div>
                              <h5 className="font-medium text-sm">Change Summary</h5>
                              <p className="text-sm text-gray-600">{version.change_summary}</p>
                            </div>
                            
                            {version.change_type && (
                              <div>
                                <h5 className="font-medium text-sm">Change Type</h5>
                                <Badge variant="outline">{version.change_type}</Badge>
                              </div>
                            )}
                            
                            <div>
                              <h5 className="font-medium text-sm">File Information</h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>File: {version.file_name}</p>
                                <p>Hash: {version.file_hash}</p>
                                <p>Branch: {version.branch_name || 'main'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}