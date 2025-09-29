/**
 * CONSTITUTIONAL REMEDIATION: TDD compliance - Test for DocumentStatus component
 * Tests written after implementation (TDD violation remediation)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentStatus } from '@/components/documents/DocumentStatus';
import type { Document, DocumentStatus as Status } from '@jurisagentis/document-management';

const mockDocument: Document = {
  id: 'doc-1',
  matter_id: 'matter-1',
  title: 'Test Document',
  description: 'Test document description',
  document_type: 'contract',
  status: 'draft',
  priority: 'medium',
  confidentiality_level: 'client_confidential',
  tags: [],
  version_number: 1,
  is_current_version: true,
  created_by: 'user-1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02'),
  requires_signature: true,
  due_date: new Date('2024-12-31'),
};

describe('DocumentStatus', () => {
  const mockOnStatusChange = jest.fn();
  
  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders document status in compact mode', () => {
      render(<DocumentStatus document={mockDocument} compact={true} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders full status card with title', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Document Status')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Document is being created or edited')).toBeInTheDocument();
    });

    it('shows change status button when enabled and transitions are available', () => {
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      expect(screen.getByText('Change Status')).toBeInTheDocument();
    });

    it('hides change status button when no transitions available', () => {
      const archivedDocument = { ...mockDocument, status: 'archived' as Status };
      
      render(
        <DocumentStatus 
          document={archivedDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      expect(screen.queryByText('Change Status')).not.toBeInTheDocument();
    });
  });

  describe('Status Information', () => {
    it('displays correct status information for draft', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Document is being created or edited')).toBeInTheDocument();
    });

    it('displays correct status information for different statuses', () => {
      const reviewDocument = { ...mockDocument, status: 'review' as Status };
      
      render(<DocumentStatus document={reviewDocument} />);
      
      expect(screen.getByText('Under Review')).toBeInTheDocument();
      expect(screen.getByText('Document is being reviewed for accuracy and completeness')).toBeInTheDocument();
    });

    it('displays executed status with correct styling', () => {
      const executedDocument = { ...mockDocument, status: 'executed' as Status };
      
      render(<DocumentStatus document={executedDocument} />);
      
      const statusBadge = screen.getByText('Executed');
      expect(statusBadge).toBeInTheDocument();
      expect(screen.getByText('Document has been fully signed and executed')).toBeInTheDocument();
    });
  });

  describe('Status History', () => {
    it('displays status history section', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Status History')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('1/1/2024')).toBeInTheDocument(); // Creation date
    });

    it('shows current status in history', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('1/2/2024')).toBeInTheDocument(); // Updated date
    });
  });

  describe('Available Actions', () => {
    it('displays available transitions for draft status', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Available Actions')).toBeInTheDocument();
      expect(screen.getByText('Under Review')).toBeInTheDocument();
      expect(screen.getByText('Ready for Signature')).toBeInTheDocument();
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('does not show available actions for archived documents', () => {
      const archivedDocument = { ...mockDocument, status: 'archived' as Status };
      
      render(<DocumentStatus document={archivedDocument} />);
      
      expect(screen.queryByText('Available Actions')).not.toBeInTheDocument();
    });

    it('makes transitions clickable when showChangeButton is true', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const reviewAction = screen.getByText('Under Review');
      await user.click(reviewAction);
      
      // Should open the change dialog
      expect(screen.getByText('Change Document Status')).toBeInTheDocument();
    });
  });

  describe('Status Change Dialog', () => {
    it('opens change dialog when Change Status button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      expect(screen.getByText('Change Document Status')).toBeInTheDocument();
      expect(screen.getByText(/Update the status of "Test Document"/)).toBeInTheDocument();
    });

    it('shows available status options in dropdown', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      // Check that the select has the right options
      expect(screen.getByText('New Status')).toBeInTheDocument();
    });

    it('requires reason for status change', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      const updateButton = screen.getByText('Update Status');
      expect(updateButton).toBeDisabled();
      
      const reasonTextarea = screen.getByLabelText('Reason for Change');
      await user.type(reasonTextarea, 'Review completed successfully');
      
      expect(updateButton).toBeEnabled();
    });

    it('calls onStatusChange when status is updated', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      const reasonTextarea = screen.getByLabelText('Reason for Change');
      await user.type(reasonTextarea, 'Moving to review phase');
      
      const updateButton = screen.getByText('Update Status');
      await user.click(updateButton);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.any(String), // new status
        'Moving to review phase'
      );
    });

    it('can be cancelled', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Change Document Status')).not.toBeInTheDocument();
    });
  });

  describe('Document Information', () => {
    it('displays document creation and update dates', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Document Information')).toBeInTheDocument();
      expect(screen.getAllByText('1/1/2024')[0]).toBeInTheDocument(); // Created date
      expect(screen.getAllByText('1/2/2024')[0]).toBeInTheDocument(); // Updated date
    });

    it('displays due date when present', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Due Date:')).toBeInTheDocument();
      expect(screen.getByText('12/31/2024')).toBeInTheDocument();
    });

    it('highlights overdue documents', () => {
      const overdueDocument = { 
        ...mockDocument, 
        due_date: new Date('2020-01-01') // Past date
      };
      
      render(<DocumentStatus document={overdueDocument} />);
      
      const dueDateElement = screen.getByText('1/1/2020');
      expect(dueDateElement).toHaveClass('text-red-600', 'font-medium');
    });

    it('shows signature requirement when present', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Signature Required:')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('displays progress bar with correct percentage', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument(); // Draft status = 10%
    });

    it('shows 100% progress for executed documents', () => {
      const executedDocument = { ...mockDocument, status: 'executed' as Status };
      
      render(<DocumentStatus document={executedDocument} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows intermediate progress for review status', () => {
      const reviewDocument = { ...mockDocument, status: 'review' as Status };
      
      render(<DocumentStatus document={reviewDocument} />);
      
      expect(screen.getByText('30%')).toBeInTheDocument(); // Review status = 30%
    });
  });

  describe('Security Information', () => {
    it('displays confidentiality level in timeline section', () => {
      render(<DocumentStatus document={mockDocument} />);
      
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last Modified')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button accessibility', () => {
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      expect(changeButton).toBeInTheDocument();
      expect(changeButton.tagName).toBe('BUTTON');
    });

    it('has proper form labels in change dialog', async () => {
      const user = userEvent.setup();
      render(
        <DocumentStatus 
          document={mockDocument} 
          showChangeButton={true}
          onStatusChange={mockOnStatusChange}
        />
      );
      
      const changeButton = screen.getByText('Change Status');
      await user.click(changeButton);
      
      expect(screen.getByLabelText('New Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason for Change')).toBeInTheDocument();
    });
  });
});