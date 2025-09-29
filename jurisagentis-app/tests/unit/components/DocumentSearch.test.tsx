/**
 * CONSTITUTIONAL REMEDIATION: TDD compliance - Test for DocumentSearch component  
 * Tests written after implementation (TDD violation remediation)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentSearch } from '@/components/documents/DocumentSearch';
import type { DocumentSearchParams } from '@jurisagentis/document-management';

// Mock the hooks
jest.mock('@/hooks/use-documents', () => ({
  useDocuments: () => ({
    searchDocuments: jest.fn(),
  }),
}));

describe('DocumentSearch', () => {
  const mockOnSearch = jest.fn();
  
  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders basic search interface', () => {
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      expect(screen.getByText('Document Search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search documents...')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      render(<DocumentSearch onSearch={mockOnSearch} compact={true} />);
      
      // Should still have search input
      expect(screen.getByPlaceholderText('Search documents...')).toBeInTheDocument();
      // Should have filter button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with initial filters', () => {
      const initialFilters = {
        query: 'test query',
        document_type: ['contract'],
        status: ['draft']
      };
      
      render(
        <DocumentSearch 
          onSearch={mockOnSearch} 
          initialFilters={initialFilters} 
        />
      );
      
      const searchInput = screen.getByDisplayValue('test query');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls onSearch when search input changes in full mode', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'contract');
      
      // Should trigger search on input change
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'contract'
          })
        );
      });
    });

    it('calls onSearch when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} compact={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'test{enter}');
      
      expect(mockOnSearch).toHaveBeenCalled();
    });

    it('calls onSearch when search button is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} compact={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'test document');
      
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test document'
        })
      );
    });
  });

  describe('Advanced Search Dialog', () => {
    it('opens advanced search dialog when filter button is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      expect(screen.getByText('Advanced Document Search')).toBeInTheDocument();
      expect(screen.getByText('Use advanced filters to find specific documents in your system.')).toBeInTheDocument();
    });

    it('contains all filter options in advanced dialog', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      // Check for various filter sections
      expect(screen.getByText('Document Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Confidentiality')).toBeInTheDocument();
      expect(screen.getByText('Date Range')).toBeInTheDocument();
      expect(screen.getByText('Entity Filters')).toBeInTheDocument();
      expect(screen.getByText('Tags (comma-separated)')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('allows setting document type filter', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      // Find and click document type dropdown
      const documentTypeSelect = screen.getByDisplayValue('All types');
      await user.click(documentTypeSelect);
      
      // Should show document type options
      expect(screen.getByText('Contract')).toBeInTheDocument();
      expect(screen.getByText('Will')).toBeInTheDocument();
      expect(screen.getByText('Trust')).toBeInTheDocument();
    });

    it('submits search with advanced filters', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      // Fill in some filters
      const queryInput = screen.getByLabelText('Search Query');
      await user.type(queryInput, 'contract terms');
      
      const searchButton = screen.getByText('Search Documents');
      await user.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'contract terms'
        })
      );
    });
  });

  describe('Active Filters Display', () => {
    it('displays active filters as badges', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'test');
      
      // Should show active filter badge
      await waitFor(() => {
        expect(screen.getByText(/Query: "test"/)).toBeInTheDocument();
      });
    });

    it('allows clearing individual filters', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        const filterBadge = screen.getByText(/Query: "test"/);
        expect(filterBadge).toBeInTheDocument();
      });
      
      // Click the X on the filter badge
      const filterBadge = screen.getByText(/Query: "test"/);
      await user.click(filterBadge);
      
      // Should clear the filter
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: ''
        })
      );
    });

    it('allows clearing all filters', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        const clearAllButton = screen.getByText('Clear all');
        expect(clearAllButton).toBeInTheDocument();
      });
      
      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          limit: 20,
          offset: 0,
          sort_by: 'created_at',
          sort_order: 'desc',
          include_archived: false
        })
      );
    });
  });

  describe('Date Range Filters', () => {
    it('handles date range inputs in advanced search', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      const createdAfterInput = screen.getByLabelText('Created After');
      await user.type(createdAfterInput, '2024-01-01');
      
      const createdBeforeInput = screen.getByLabelText('Created Before');
      await user.type(createdBeforeInput, '2024-12-31');
      
      const searchButton = screen.getByText('Search Documents');
      await user.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          created_after: expect.any(Date),
          created_before: expect.any(Date)
        })
      );
    });
  });

  describe('Tags Input', () => {
    it('handles comma-separated tags input', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      const tagsInput = screen.getByLabelText('Tags (comma-separated)');
      await user.type(tagsInput, 'contract, legal, important');
      
      const searchButton = screen.getByText('Search Documents');
      await user.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['contract', 'legal', 'important']
        })
      );
    });
  });

  describe('Include Archived Toggle', () => {
    it('handles include archived toggle', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      const includeArchivedToggle = screen.getByLabelText('Include archived documents');
      await user.click(includeArchivedToggle);
      
      const searchButton = screen.getByText('Search Documents');
      await user.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          include_archived: true
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DocumentSearch onSearch={mockOnSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search documents...');
      
      // Should be focusable
      await user.tab();
      expect(searchInput).toHaveFocus();
    });
  });
});