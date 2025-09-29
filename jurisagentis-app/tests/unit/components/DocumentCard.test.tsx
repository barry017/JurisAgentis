/**
 * CONSTITUTIONAL REMEDIATION: TDD compliance - Test for DocumentCard component
 * Tests written after implementation (TDD violation remediation)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document } from '@jurisagentis/document-management';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockDocument: Document = {
  id: 'doc-1',
  matter_id: 'matter-1',
  title: 'Test Document',
  description: 'Test document description',
  document_type: 'contract',
  status: 'draft',
  priority: 'medium',
  confidentiality_level: 'client_confidential',
  tags: ['tag1', 'tag2'],
  version_number: 1,
  is_current_version: true,
  created_by: 'user-1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02'),
};

describe('DocumentCard', () => {
  describe('Component Rendering', () => {
    it('renders document title and basic information', () => {
      render(<DocumentCard document={mockDocument} />);
      
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('CLIENT CONFIDENTIAL')).toBeInTheDocument();
      expect(screen.getByText('Contract')).toBeInTheDocument();
    });

    it('renders document description when provided', () => {
      render(<DocumentCard document={mockDocument} />);
      expect(screen.getByText('Test document description')).toBeInTheDocument();
    });

    it('renders tags when provided', () => {
      render(<DocumentCard document={mockDocument} />);
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('renders in compact mode when specified', () => {
      render(<DocumentCard document={mockDocument} compact={true} />);
      
      // In compact mode, description should not be rendered
      expect(screen.queryByText('Test document description')).not.toBeInTheDocument();
      // Tags should not be rendered in compact mode
      expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });
  });

  describe('Status and Confidentiality Display', () => {
    it('displays correct status color for draft', () => {
      render(<DocumentCard document={mockDocument} />);
      const statusBadge = screen.getByText('Draft');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('displays correct confidentiality level color', () => {
      render(<DocumentCard document={mockDocument} />);
      const confidentialityBadge = screen.getByText('CLIENT CONFIDENTIAL');
      expect(confidentialityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('handles different document statuses', () => {
      const executedDocument = { ...mockDocument, status: 'executed' as const };
      render(<DocumentCard document={executedDocument} />);
      
      const statusBadge = screen.getByText('Executed');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Action Buttons', () => {
    it('shows action buttons on hover when showActions is true', () => {
      render(<DocumentCard document={mockDocument} showActions={true} />);
      
      // Action buttons should be present but may be hidden initially
      expect(screen.getByTitle('View document')).toBeInTheDocument();
      expect(screen.getByTitle('Edit document')).toBeInTheDocument();
      expect(screen.getByTitle('Download document')).toBeInTheDocument();
      expect(screen.getByTitle('Share document')).toBeInTheDocument();
    });

    it('hides action buttons when showActions is false', () => {
      render(<DocumentCard document={mockDocument} showActions={false} />);
      
      expect(screen.queryByTitle('View document')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit document')).not.toBeInTheDocument();
    });

    it('calls onView when view button is clicked', () => {
      const onView = jest.fn();
      render(<DocumentCard document={mockDocument} onView={onView} showActions={true} />);
      
      const viewButton = screen.getByTitle('View document');
      fireEvent.click(viewButton);
      
      expect(onView).toHaveBeenCalledWith(mockDocument);
    });

    it('calls onEdit when edit button is clicked', () => {
      const onEdit = jest.fn();
      render(<DocumentCard document={mockDocument} onEdit={onEdit} showActions={true} />);
      
      const editButton = screen.getByTitle('Edit document');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalledWith(mockDocument);
    });
  });

  describe('Click Handling', () => {
    it('calls onView when card is clicked', () => {
      const onView = jest.fn();
      render(<DocumentCard document={mockDocument} onView={onView} />);
      
      const card = screen.getByRole('generic', { name: /card/ });
      fireEvent.click(card);
      
      expect(onView).toHaveBeenCalledWith(mockDocument);
    });

    it('navigates to document page when no onView is provided', () => {
      const mockPush = jest.fn();
      require('next/navigation').useRouter.mockReturnValue({ push: mockPush });
      
      render(<DocumentCard document={mockDocument} />);
      
      const card = screen.getByRole('generic', { name: /card/ });
      fireEvent.click(card);
      
      expect(mockPush).toHaveBeenCalledWith('/documents/doc-1');
    });
  });

  describe('Tag Display', () => {
    it('displays first 3 tags and shows count for remaining', () => {
      const documentWithManyTags = {
        ...mockDocument,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      };
      
      render(<DocumentCard document={documentWithManyTags} />);
      
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    });

    it('does not show +more when there are 3 or fewer tags', () => {
      render(<DocumentCard document={mockDocument} />);
      
      expect(screen.queryByText('+0 more')).not.toBeInTheDocument();
      expect(screen.queryByText('more')).not.toBeInTheDocument();
    });
  });

  describe('Date Display', () => {
    it('displays creation date', () => {
      render(<DocumentCard document={mockDocument} />);
      
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('displays created by information when available', () => {
      render(<DocumentCard document={mockDocument} />);
      
      expect(screen.getByText('user-1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper hover states', () => {
      render(<DocumentCard document={mockDocument} />);
      
      const card = screen.getByRole('generic', { name: /card/ });
      expect(card).toHaveClass('hover:shadow-md', 'transition-shadow', 'cursor-pointer');
    });

    it('provides proper button titles for screen readers', () => {
      render(<DocumentCard document={mockDocument} showActions={true} />);
      
      expect(screen.getByTitle('View document')).toBeInTheDocument();
      expect(screen.getByTitle('Edit document')).toBeInTheDocument();
      expect(screen.getByTitle('Download document')).toBeInTheDocument();
      expect(screen.getByTitle('Share document')).toBeInTheDocument();
    });
  });
});