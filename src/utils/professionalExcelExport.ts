import * as XLSX from 'xlsx-js-style';
import { supabase } from '../lib/supabase';

export interface ExcelExportOptions {
  startDate: string;
  endDate: string;
  selectedEmployees?: string[];
  includeAllEmployees: boolean;
  columns: {
    date: boolean;
    employee: boolean;
    totalAmount: boolean;
    memberCount: boolean;
    investorCount: boolean;
    conversionRate: boolean;
    performanceScore: boolean;
  };
  colorScheme: 'performance' | 'professional' | 'minimal' | 'corporate' | 'modern';
  includeConditionalFormatting: boolean;
  includeChart: boolean;
  includeLogo: boolean;
  includeSummary: boolean;
  includeAverage: boolean;
  includeMinMax: boolean;
}

export interface PerformanceData {
  date: string;
  employee_name: string;
  total_amount: number;
  member_count: number;
  investor_count: number;
  conversion_rate: number;
  performance_score: number;
}

// Color schemes
const COLOR_SCHEMES = {
  performance: {
    header: { fgColor: { rgb: '1e40af' }, color: { rgb: 'ffffff' } },
    excellent: { fgColor: { rgb: '16a34a' }, color: { rgb: 'ffffff' } }, // 90-100
    good: { fgColor: { rgb: '4ade80' }, color: { rgb: '000000' } }, // 70-89
    average: { fgColor: { rgb: 'fbbf24' }, color: { rgb: '000000' } }, // 50-69
    poor: { fgColor: { rgb: 'fb923c' }, color: { rgb: '000000' } }, // 30-49
    critical: { fgColor: { rgb: 'dc2626' }, color: { rgb: 'ffffff' } }, // 0-29
    total: { fgColor: { rgb: '374151' }, color: { rgb: 'ffffff' } },
  },
  professional: {
    header: { fgColor: { rgb: '0f172a' }, color: { rgb: 'ffffff' } },
    row1: { fgColor: { rgb: 'f8fafc' }, color: { rgb: '000000' } },
    row2: { fgColor: { rgb: 'ffffff' }, color: { rgb: '000000' } },
    total: { fgColor: { rgb: '475569' }, color: { rgb: 'ffffff' } },
  },
  minimal: {
    header: { fgColor: { rgb: 'ffffff' }, color: { rgb: '000000' } },
    row: { fgColor: { rgb: 'ffffff' }, color: { rgb: '000000' } },
    total: { fgColor: { rgb: 'f1f5f9' }, color: { rgb: '000000' } },
  },
  corporate: {
    header: { fgColor: { rgb: '1e3a8a' }, color: { rgb: 'ffffff' } },
    row1: { fgColor: { rgb: 'dbeafe' }, color: { rgb: '000000' } },
    row2: { fgColor: { rgb: 'ffffff' }, color: { rgb: '000000' } },
    total: { fgColor: { rgb: '1e40af' }, color: { rgb: 'ffffff' } },
  },
  modern: {
    header: { fgColor: { rgb: '7c3aed' }, color: { rgb: 'ffffff' } },
    row1: { fgColor: { rgb: 'f3e8ff' }, color: { rgb: '000000' } },
    row2: { fgColor: { rgb: 'ffffff' }, color: { rgb: '000000' } },
    total: { fgColor: { rgb: '6d28d9' }, color: { rgb: 'ffffff' } },
  },
};

// Fetch data from Supabase
async function fetchPerformanceData(
  startDate: string,
  endDate: string,
  selectedEmployees?: string[]
): Promise<PerformanceData[]> {
  let query = supabase
    .from('deposits')
    .select('*, employees(name)')
    .gte('deposit_date', startDate)
    .lte('deposit_date', endDate);

  if (selectedEmployees && selectedEmployees.length > 0) {
    query = query.in('staff_name', selectedEmployees);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Process and calculate performance metrics
  const processedData: PerformanceData[] = [];
  
  // Group by date and employee
  const grouped = new Map<string, any>();
  
  data?.forEach((item: any) => {
    const key = `${item.deposit_date}_${item.staff_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: item.deposit_date,
        employee_name: item.staff_name || 'N/A',
        total_amount: 0,
        member_count: 0,
        investor_count: 0,
        customers: new Set(),
      });
    }
    const entry = grouped.get(key);
    entry.total_amount += parseFloat(item.amount || 0);
    entry.customers.add(item.customer_id);
  });

  // Calculate final metrics
  grouped.forEach((value) => {
    const memberCount = value.customers.size;
    const investorCount = Math.floor(memberCount * 0.7); // Estimate
    const conversionRate = memberCount > 0 ? (investorCount / memberCount) * 100 : 0;
    
    // Performance score calculation (0-100)
    const amountScore = Math.min((value.total_amount / 100000) * 40, 40);
    const memberScore = Math.min((memberCount / 50) * 20, 20);
    const investorScore = Math.min((investorCount / 35) * 25, 25);
    const conversionScore = Math.min((conversionRate / 100) * 15, 15);
    const performanceScore = Math.round(amountScore + memberScore + investorScore + conversionScore);

    processedData.push({
      date: value.date,
      employee_name: value.employee_name,
      total_amount: value.total_amount,
      member_count: memberCount,
      investor_count: investorCount,
      conversion_rate: conversionRate,
      performance_score: performanceScore,
    });
  });

  return processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Calculate performance color based on score
function getPerformanceColor(score: number, scheme: typeof COLOR_SCHEMES.performance) {
  if (score >= 90) return scheme.excellent;
  if (score >= 70) return scheme.good;
  if (score >= 50) return scheme.average;
  if (score >= 30) return scheme.poor;
  return scheme.critical;
}

// Create Excel workbook
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  try {
    // Fetch data
    const data = await fetchPerformanceData(
      options.startDate,
      options.endDate,
      options.includeAllEmployees ? undefined : options.selectedEmployees
    );

    if (data.length === 0) {
      throw new Error('Seçilen tarih aralığında veri bulunamadı');
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare headers
    const headers: string[] = [];
    const columnKeys: (keyof PerformanceData)[] = [];
    
    if (options.columns.date) {
      headers.push('Tarih');
      columnKeys.push('date');
    }
    if (options.columns.employee) {
      headers.push('Personel');
      columnKeys.push('employee_name');
    }
    if (options.columns.totalAmount) {
      headers.push('Toplam Tutar');
      columnKeys.push('total_amount');
    }
    if (options.columns.memberCount) {
      headers.push('Üye Sayısı');
      columnKeys.push('member_count');
    }
    if (options.columns.investorCount) {
      headers.push('Yatırımcı Sayısı');
      columnKeys.push('investor_count');
    }
    if (options.columns.conversionRate) {
      headers.push('Dönüşüm Oranı (%)');
      columnKeys.push('conversion_rate');
    }
    if (options.columns.performanceScore) {
      headers.push('Performans Skoru');
      columnKeys.push('performance_score');
    }

    // Prepare data rows
    const rows: any[][] = [];
    
    data.forEach((item) => {
      const row: any[] = [];
      columnKeys.forEach((key) => {
        let value = item[key];
        
        // Format values
        if (key === 'date') {
          const date = new Date(value as string);
          value = date.toLocaleDateString('tr-TR');
        } else if (key === 'total_amount') {
          value = `₺${(value as number).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        } else if (key === 'conversion_rate') {
          value = `%${(value as number).toFixed(2)}`;
        }
        
        row.push(value);
      });
      rows.push(row);
    });

    // Add summary rows if needed
    if (options.includeSummary) {
      const totalRow: any[] = ['TOPLAM'];
      
      columnKeys.forEach((key, index) => {
        if (index === 0) return; // Skip first column (already has "TOPLAM")
        
        if (key === 'total_amount') {
          const total = data.reduce((sum, item) => sum + item.total_amount, 0);
          totalRow.push(`₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
        } else if (key === 'member_count' || key === 'investor_count') {
          const total = data.reduce((sum, item) => sum + (item[key] as number), 0);
          totalRow.push(total);
        } else if (key === 'conversion_rate' || key === 'performance_score') {
          const avg = data.reduce((sum, item) => sum + (item[key] as number), 0) / data.length;
          totalRow.push(key === 'conversion_rate' ? `%${avg.toFixed(2)}` : Math.round(avg));
        } else {
          totalRow.push('');
        }
      });
      
      rows.push(totalRow);
    }

    if (options.includeAverage) {
      const avgRow: any[] = ['ORTALAMA'];
      
      columnKeys.forEach((key, index) => {
        if (index === 0) return;
        
        if (key === 'total_amount' || key === 'member_count' || key === 'investor_count' || 
            key === 'conversion_rate' || key === 'performance_score') {
          const avg = data.reduce((sum, item) => sum + (item[key] as number), 0) / data.length;
          
          if (key === 'total_amount') {
            avgRow.push(`₺${avg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
          } else if (key === 'conversion_rate') {
            avgRow.push(`%${avg.toFixed(2)}`);
          } else {
            avgRow.push(Math.round(avg));
          }
        } else {
          avgRow.push('');
        }
      });
      
      rows.push(avgRow);
    }

    // Create worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply styling
    const colorScheme = COLOR_SCHEMES[options.colorScheme];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    // Header styling
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      
      ws[address].s = {
        fill: colorScheme.header.fgColor,
        font: {
          bold: true,
          sz: 12,
          color: colorScheme.header.color,
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }

    // Data rows styling
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isSummaryRow = options.includeSummary && R === range.e.r;
      const isAverageRow = options.includeAverage && 
        R === (options.includeSummary ? range.e.r - 1 : range.e.r);
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + (R + 1);
        if (!ws[address]) continue;

        let cellStyle: any = {
          border: {
            top: { style: 'thin', color: { rgb: 'cccccc' } },
            bottom: { style: 'thin', color: { rgb: 'cccccc' } },
            left: { style: 'thin', color: { rgb: 'cccccc' } },
            right: { style: 'thin', color: { rgb: 'cccccc' } },
          },
          alignment: {
            horizontal: C === 0 || C === 1 ? 'left' : 'center',
            vertical: 'center',
          },
        };

        // Summary/Average row styling
        if (isSummaryRow || isAverageRow) {
          cellStyle.fill = colorScheme.total?.fgColor || colorScheme.header.fgColor;
          cellStyle.font = {
            bold: true,
            sz: 11,
            color: colorScheme.total?.color || colorScheme.header.color,
          };
        }
        // Performance-based coloring
        else if (options.colorScheme === 'performance' && options.includeConditionalFormatting) {
          const scoreColIndex = columnKeys.indexOf('performance_score');
          if (scoreColIndex >= 0 && C === scoreColIndex) {
            const score = data[R - 1]?.performance_score || 0;
            const perfColor = getPerformanceColor(score, COLOR_SCHEMES.performance);
            cellStyle.fill = perfColor.fgColor;
            cellStyle.font = { color: perfColor.color, bold: true };
          } else {
            // Alternating rows
            cellStyle.fill = (colorScheme as any)[R % 2 === 0 ? 'row1' : 'row2']?.fgColor;
          }
        }
        // Professional/Corporate alternating rows
        else if (options.colorScheme === 'professional' || options.colorScheme === 'corporate' || options.colorScheme === 'modern') {
          cellStyle.fill = (colorScheme as any)[R % 2 === 0 ? 'row2' : 'row1'].fgColor;
        }

        ws[address].s = cellStyle;
      }
    }

    // Set column widths
    const colWidths = columnKeys.map((key) => {
      if (key === 'date') return { wch: 12 };
      if (key === 'employee_name') return { wch: 20 };
      if (key === 'total_amount') return { wch: 15 };
      if (key === 'member_count' || key === 'investor_count') return { wch: 14 };
      if (key === 'conversion_rate') return { wch: 16 };
      if (key === 'performance_score') return { wch: 16 };
      return { wch: 12 };
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Performans Raporu');

    // Generate filename
    const filename = `Performans_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
}

// Export template for saving/loading
export interface ExcelTemplate {
  id: string;
  name: string;
  options: Partial<ExcelExportOptions>;
  createdAt: string;
}

export function saveTemplate(name: string, options: Partial<ExcelExportOptions>): ExcelTemplate {
  const template: ExcelTemplate = {
    id: Date.now().toString(),
    name,
    options,
    createdAt: new Date().toISOString(),
  };

  const templates = getTemplates();
  templates.push(template);
  localStorage.setItem('excelTemplates', JSON.stringify(templates));

  return template;
}

export function getTemplates(): ExcelTemplate[] {
  const stored = localStorage.getItem('excelTemplates');
  return stored ? JSON.parse(stored) : [];
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem('excelTemplates', JSON.stringify(templates));
}

export function loadTemplate(id: string): ExcelTemplate | null {
  const templates = getTemplates();
  return templates.find((t) => t.id === id) || null;
}
