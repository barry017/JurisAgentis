'use client';

/**
 * Document Templates Management Page
 * T073: Template management interface with search, filtering, and actions
 * Updated to work with new API structure and modern UI components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  Download, 
  Trash2,
  FileText,
  User,
  Tag,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  document_type: string;
  practice_area?: string;
  jurisdiction?: string;
  template_file_path: string;
  template_file_name: string;
  template_file_size: number;
  template_version: string;
  field_definitions: unknown[];
  required_fields: string[];
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  category?: string;
  tags: string[];
  usage_count: number;
  last_used_at?: Date;
  is_latest_version: boolean;
  is_public: boolean;
  allowed_roles: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface SearchFilters {
  query: string;
  document_type: string[];
  practice_area: string[];
  category: string[];
  tags: string[];
  status: string[];
  is_public?: boolean;
}

const DOCUMENT_TYPES = [
  'contract', 'trust', 'will', 'power_of_attorney', 'operating_agreement',
  'lease', 'deed', 'application', 'insurance', 'correspondence',
  'memo', 'research', 'pleading', 'motion', 'brief', 'discovery',
  'settlement', 'other'
];

const PRACTICE_AREAS = [
  'estate_planning', 'trust_administration', 'business_law', 
  'real_estate', 'family_law', 'litigation', 'other'
];

const TEMPLATE_CATEGORIES = [
  'contracts', 'estate_planning', 'business_formation', 'real_estate',
  'litigation', 'letters', 'forms', 'other'
];

const STATUS_OPTIONS = ['draft', 'active', 'deprecated', 'archived'];

export default function TemplatesPage() {
  const _router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Search and filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    document_type: [],
    practice_area: [],
    category: [],
    tags: [],
    status: [],
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [_selectedTemplates, _setSelectedTemplates] = useState<string[]>([]);
  
  // Create template form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    document_type: '',
    practice_area: '',
    jurisdiction: '',
    category: '',
    tags: [] as string[],
    is_public: false,
    allowed_roles: [] as string[]
  });

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        sort_by: 'usage_count',
        sort_order: 'desc'
      });

      // Add search query
      if (filters.query) {
        params.append('query', filters.query);
      }

      // Add filters
      if (filters.document_type.length > 0) {
        params.append('document_type', filters.document_type.join(','));
      }
      if (filters.practice_area.length > 0) {
        params.append('practice_area', filters.practice_area.join(','));
      }
      if (filters.category.length > 0) {
        params.append('category', filters.category.join(','));
      }
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.is_public !== undefined) {
        params.append('is_public', filters.is_public.toString());
      }

      const response = await fetch(`/api/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setTotalCount(data.total || 0);
      } else {
        // Set mock data for demonstration
        setTemplates(getMockTemplates());
        setTotalCount(getMockTemplates().length);
      }
    } catch (error) {
      toast({
        title: 'Error loading templates',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setTemplates(getMockTemplates());
      setTotalCount(getMockTemplates().length);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Load templates on mount and filter changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Create new template
  const createTemplate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          template_file_path: `/templates/${createForm.name.toLowerCase().replace(/\s+/g, '_')}.docx`,
          template_file_name: `${createForm.name}.docx`,
          template_file_size: 0
        })
      });

      if (response.ok) {
        const newTemplate = await response.json();
        setTemplates(prev => [newTemplate, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({
          name: '',
          description: '',
          document_type: '',
          practice_area: '',
          jurisdiction: '',
          category: '',
          tags: [],
          is_public: false,
          allowed_roles: []
        });
        toast({
          title: 'Template created',
          description: 'Your template has been created successfully'
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create template');
      }
    } catch (error) {
      toast({
        title: 'Error creating template',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  const duplicateTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Copy)`,
          id: undefined
        })
      });

      if (response.ok) {
        const duplicatedTemplate = await response.json();
        setTemplates(prev => [duplicatedTemplate, ...prev]);
        toast({
          title: 'Template duplicated',
          description: 'Template has been duplicated successfully'
        });
      } else {
        throw new Error('Failed to duplicate template');
      }
    } catch (error) {
      toast({
        title: 'Error duplicating template',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        toast({
          title: 'Template deleted',
          description: 'Template has been deleted successfully'
        });
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      toast({
        title: 'Error deleting template',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'deprecated': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const _formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground">
            Manage document templates for your legal practice
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select 
                    value={createForm.document_type} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, document_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="practice_area">Practice Area</Label>
                  <Select 
                    value={createForm.practice_area} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, practice_area: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select practice area" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICE_AREAS.map(area => (
                        <SelectItem key={area} value={area}>
                          {area.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={createForm.category} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createTemplate} className="w-full">
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={loadTemplates}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Document Type</Label>
                  <Select onValueChange={(value) => {
                    if (value && !filters.document_type.includes(value)) {
                      setFilters(prev => ({
                        ...prev,
                        document_type: [...prev.document_type, value]
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Practice Area</Label>
                  <Select onValueChange={(value) => {
                    if (value && !filters.practice_area.includes(value)) {
                      setFilters(prev => ({
                        ...prev,
                        practice_area: [...prev.practice_area, value]
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICE_AREAS.map(area => (
                        <SelectItem key={area} value={area}>
                          {area.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select onValueChange={(value) => {
                    if (value && !filters.category.includes(value)) {
                      setFilters(prev => ({
                        ...prev,
                        category: [...prev.category, value]
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select onValueChange={(value) => {
                    if (value && !filters.status.includes(value)) {
                      setFilters(prev => ({
                        ...prev,
                        status: [...prev.status, value]
                      }));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters */}
              <div className="flex flex-wrap gap-2">
                {filters.document_type.map(type => (
                  <Badge 
                    key={type} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      document_type: prev.document_type.filter(t => t !== type)
                    }))}
                  >
                    {type} ×
                  </Badge>
                ))}
                {filters.practice_area.map(area => (
                  <Badge 
                    key={area} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      practice_area: prev.practice_area.filter(a => a !== area)
                    }))}
                  >
                    {area} ×
                  </Badge>
                ))}
                {filters.category.map(category => (
                  <Badge 
                    key={category} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      category: prev.category.filter(c => c !== category)
                    }))}
                  >
                    {category} ×
                  </Badge>
                ))}
                {filters.status.map(status => (
                  <Badge 
                    key={status} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      status: prev.status.filter(s => s !== status)
                    }))}
                  >
                    {status} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      v{template.template_version}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(template.status)}>
                      {template.status}
                    </Badge>
                    {template.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {template.document_type.replace('_', ' ')}
                    </span>
                    {template.practice_area && (
                      <span>{template.practice_area.replace('_', ' ')}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      Used {template.usage_count} times
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {template.created_by}
                    </span>
                  </div>

                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    {formatDate(template.updated_at)}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/templates/${template.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/templates/${template.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => duplicateTemplate(template.id)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-6">
              {filters.query || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f)
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first template'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} templates
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for demonstration
function getMockTemplates(): DocumentTemplate[] {
  return [
    {
      id: '1',
      name: 'Last Will and Testament',
      description: 'Standard last will and testament template for individual clients',
      document_type: 'will',
      practice_area: 'estate_planning',
      jurisdiction: 'California',
      template_file_path: '/templates/will-template.docx',
      template_file_name: 'will-template.docx',
      template_file_size: 45678,
      template_version: '2.1',
      field_definitions: [],
      required_fields: ['testator_name', 'executor_name'],
      status: 'active',
      category: 'estate_planning',
      tags: ['will', 'estate', 'testator'],
      usage_count: 45,
      last_used_at: new Date('2025-01-10'),
      is_latest_version: true,
      is_public: true,
      allowed_roles: ['attorney', 'paralegal'],
      created_by: 'John Smith',
      created_at: new Date('2024-06-15'),
      updated_at: new Date('2025-01-10')
    },
    {
      id: '2',
      name: 'LLC Operating Agreement',
      description: 'Multi-member LLC operating agreement template',
      document_type: 'operating_agreement',
      practice_area: 'business_law',
      jurisdiction: 'Delaware',
      template_file_path: '/templates/llc-operating-agreement.docx',
      template_file_name: 'llc-operating-agreement.docx',
      template_file_size: 67890,
      template_version: '1.5',
      field_definitions: [],
      required_fields: ['company_name', 'members'],
      status: 'active',
      category: 'business_formation',
      tags: ['llc', 'operating agreement', 'business'],
      usage_count: 23,
      last_used_at: new Date('2025-01-08'),
      is_latest_version: true,
      is_public: false,
      allowed_roles: ['attorney'],
      created_by: 'Sarah Johnson',
      created_at: new Date('2024-08-20'),
      updated_at: new Date('2025-01-08')
    },
    {
      id: '3',
      name: 'Client Engagement Letter',
      description: 'Standard client engagement letter for estate planning matters',
      document_type: 'correspondence',
      practice_area: 'estate_planning',
      jurisdiction: 'California',
      template_file_path: '/templates/engagement-letter.docx',
      template_file_name: 'engagement-letter.docx',
      template_file_size: 23456,
      template_version: '3.0',
      field_definitions: [],
      required_fields: ['client_name', 'attorney_name'],
      status: 'active',
      category: 'letters',
      tags: ['engagement', 'client', 'letter'],
      usage_count: 67,
      last_used_at: new Date('2025-01-12'),
      is_latest_version: true,
      is_public: true,
      allowed_roles: ['attorney', 'paralegal'],
      created_by: 'Michael Davis',
      created_at: new Date('2024-03-10'),
      updated_at: new Date('2025-01-12')
    }
  ];
}