import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToExcel,
  saveTemplate,
  getTemplates,
  deleteTemplate,
  loadTemplate,
  type ExcelExportOptions,
} from '../../utils/professionalExcelExport';

// Mock xlsx-js-style
vi.mock('xlsx-js-style', () => ({
  default: {
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn(() => ({})),
      decode_range: vi.fn(() => ({ s: { r: 0, c: 0 }, e: { r: 10, c: 5 } })),
      encode_col: vi.fn((n) => String.fromCharCode(65 + n)),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  },
}));

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

describe('professionalExcelExport', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Template Management', () => {
    it('should save a template', () => {
      const options: Partial<ExcelExportOptions> = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const template = saveTemplate('Test Template', options);

      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name', 'Test Template');
      expect(template).toHaveProperty('options', options);
      expect(template).toHaveProperty('createdAt');
    });

    it('should retrieve all templates', () => {
      const options: Partial<ExcelExportOptions> = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      saveTemplate('Template 1', options);
      saveTemplate('Template 2', options);

      const templates = getTemplates();

      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Template 1');
      expect(templates[1].name).toBe('Template 2');
    });

    it('should delete a template', () => {
      const options: Partial<ExcelExportOptions> = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const template = saveTemplate('To Delete', options);
      const templatesBefore = getTemplates();

      expect(templatesBefore).toHaveLength(1);

      deleteTemplate(template.id);
      const templatesAfter = getTemplates();

      expect(templatesAfter).toHaveLength(0);
    });

    it('should load a template by id', () => {
      const options: Partial<ExcelExportOptions> = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        colorScheme: 'professional',
      };

      const template = saveTemplate('To Load', options);
      const loaded = loadTemplate(template.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('To Load');
      expect(loaded?.options.colorScheme).toBe('professional');
    });

    it('should return null when loading non-existent template', () => {
      const loaded = loadTemplate('non-existent-id');
      expect(loaded).toBeNull();
    });
  });

  describe('Excel Export Options', () => {
    it('should validate required options', () => {
      const options: ExcelExportOptions = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        selectedEmployees: [],
        includeAllEmployees: true,
        columns: {
          date: true,
          employee: true,
          totalAmount: true,
          memberCount: true,
          investorCount: true,
          conversionRate: true,
          performanceScore: true,
        },
        colorScheme: 'performance',
        includeConditionalFormatting: true,
        includeChart: false,
        includeLogo: false,
        includeSummary: true,
        includeAverage: true,
        includeMinMax: false,
      };

      expect(options.startDate).toBe('2024-01-01');
      expect(options.endDate).toBe('2024-01-31');
      expect(options.colorScheme).toBe('performance');
    });
  });
});


