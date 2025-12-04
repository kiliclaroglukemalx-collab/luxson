import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelExportPanel from '../../components/ExcelExportPanel';

// Mock the professionalExcelExport module
vi.mock('../../utils/professionalExcelExport', () => ({
  exportToExcel: vi.fn(() => Promise.resolve()),
  getTemplates: vi.fn(() => []),
  saveTemplate: vi.fn(() => ({
    id: '1',
    name: 'Test Template',
    options: {},
    createdAt: new Date().toISOString(),
  })),
  deleteTemplate: vi.fn(),
  loadTemplate: vi.fn(() => null),
}));

describe('ExcelExportPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the export panel', () => {
    render(<ExcelExportPanel onClose={mockOnClose} />);

    expect(screen.getByText('Profesyonel Excel Export')).toBeInTheDocument();
    expect(screen.getByText('Tarih Aralığı')).toBeInTheDocument();
    expect(screen.getByText('Dahil Edilecek Sütunlar')).toBeInTheDocument();
  });

  it('should close when X button is clicked', () => {
    render(<ExcelExportPanel onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should update date range when dates are changed', async () => {
    const user = userEvent.setup();
    render(<ExcelExportPanel onClose={mockOnClose} />);

    const startDateInput = screen.getByLabelText(/başlangıç/i);
    const endDateInput = screen.getByLabelText(/bitiş/i);

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-01');

    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-01-31');

    expect(startDateInput).toHaveValue('2024-01-01');
    expect(endDateInput).toHaveValue('2024-01-31');
  });

  it('should toggle column checkboxes', async () => {
    const user = userEvent.setup();
    render(<ExcelExportPanel onClose={mockOnClose} />);

    const dateCheckbox = screen.getByLabelText(/tarih/i);
    expect(dateCheckbox).toBeChecked();

    await user.click(dateCheckbox);
    expect(dateCheckbox).not.toBeChecked();

    await user.click(dateCheckbox);
    expect(dateCheckbox).toBeChecked();
  });

  it('should change color scheme', async () => {
    const user = userEvent.setup();
    render(<ExcelExportPanel onClose={mockOnClose} />);

    const colorSchemeSelect = screen.getByLabelText(/renk şeması/i);
    await user.selectOptions(colorSchemeSelect, 'professional');

    expect(colorSchemeSelect).toHaveValue('professional');
  });

  it('should show template management section', () => {
    render(<ExcelExportPanel onClose={mockOnClose} />);

    expect(screen.getByText('Şablon Yönetimi')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Şablon adı...')).toBeInTheDocument();
  });
});


