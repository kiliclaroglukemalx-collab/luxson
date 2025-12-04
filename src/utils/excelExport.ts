import * as XLSX from 'xlsx-js-style';
import { supabase } from '../lib/supabase';

export interface ExcelExportSettings {
  // Renklendirme
  headerBgColor?: string;
  headerTextColor?: string;
  rowBgColor?: string;
  rowTextColor?: string;
  alternateRowBgColor?: string;
  borderColor?: string;
  
  // Tablo görünümü
  showBorders?: boolean;
  showAlternateRows?: boolean;
  columnWidths?: number[];
  freezeFirstRow?: boolean;
  freezeFirstColumn?: boolean;
  
  // Format
  dateFormat?: string;
  numberFormat?: string;
  currencySymbol?: string;
}

const DEFAULT_SETTINGS: ExcelExportSettings = {
  headerBgColor: 'FF4472C4', // Mavi
  headerTextColor: 'FFFFFFFF', // Beyaz
  rowBgColor: 'FFFFFFFF', // Beyaz
  rowTextColor: 'FF000000', // Siyah
  alternateRowBgColor: 'FFF2F2F2', // Açık gri
  borderColor: 'FFD0D0D0', // Gri
  showBorders: true,
  showAlternateRows: true,
  freezeFirstRow: true,
  freezeFirstColumn: false,
  dateFormat: 'DD/MM/YYYY',
  numberFormat: '#,##0.00',
  currencySymbol: '₺'
};

export async function exportToExcel(
  data: any[],
  columns: { key: string; label: string; width?: number }[],
  filename: string,
  settings?: ExcelExportSettings
) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  
  // Veriyi hazırla
  const worksheetData = [
    columns.map(col => col.label), // Header
    ...data.map(row => columns.map(col => row[col.key] || ''))
  ];

  // Worksheet oluştur
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Sütun genişlikleri
  ws['!cols'] = columns.map((col, idx) => ({
    wch: col.width || config.columnWidths?.[idx] || 15
  }));

  // Freeze panes
  if (config.freezeFirstRow || config.freezeFirstColumn) {
    ws['!freeze'] = {
      xSplit: config.freezeFirstColumn ? 1 : 0,
      ySplit: config.freezeFirstRow ? 1 : 0,
      topLeftCell: config.freezeFirstColumn && config.freezeFirstRow ? 'B2' : config.freezeFirstRow ? 'A2' : 'B1',
      activePane: 'bottomRight',
      state: 'frozen'
    };
  }

  // Stil uygula
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellAddress]) continue;

      const isHeader = R === range.s.r;
      const isAlternateRow = config.showAlternateRows && R > range.s.r && (R - range.s.r) % 2 === 0;

      ws[cellAddress].s = {
        fill: {
          fgColor: {
            rgb: isHeader 
              ? config.headerBgColor 
              : isAlternateRow 
                ? config.alternateRowBgColor 
                : config.rowBgColor
          }
        },
        font: {
          color: {
            rgb: isHeader ? config.headerTextColor : config.rowTextColor
          },
          bold: isHeader,
          sz: isHeader ? 12 : 11
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true
        },
        border: config.showBorders ? {
          top: { style: 'thin', color: { rgb: config.borderColor } },
          bottom: { style: 'thin', color: { rgb: config.borderColor } },
          left: { style: 'thin', color: { rgb: config.borderColor } },
          right: { style: 'thin', color: { rgb: config.borderColor } }
        } : undefined
      };

      // Sayı formatı
      if (typeof ws[cellAddress].v === 'number' && !isHeader) {
        ws[cellAddress].z = config.numberFormat;
      }
    }
  }

  // Workbook oluştur
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rapor');

  // Dosyayı indir
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Ayarları Supabase'den yükle
export async function loadExcelSettings(reportType: string): Promise<ExcelExportSettings | null> {
  try {
    const { data, error } = await supabase
      .from('excel_export_settings')
      .select('*')
      .eq('report_type', reportType)
      .maybeSingle();

    if (error) throw error;
    return data?.settings || null;
  } catch (error) {
    console.error('Excel ayarları yüklenirken hata:', error);
    return null;
  }
}

// Ayarları Supabase'e kaydet
export async function saveExcelSettings(
  reportType: string,
  settings: ExcelExportSettings
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('excel_export_settings')
      .upsert({
        report_type: reportType,
        settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'report_type'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Excel ayarları kaydedilirken hata:', error);
    return false;
  }
}

