import { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface PaymentSystemUploadProps {
  onUploadComplete: () => void;
}

export function PaymentSystemUpload({ onUploadComplete }: PaymentSystemUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Dosya boş');
      }

      const firstRow = jsonData[0];
      const columnNames = Object.keys(firstRow);
      console.log('Bulunan kolonlar:', columnNames);

      const normalizeColumnName = (name: string) => {
        return name.trim().toLowerCase().replace(/\s+/g, ' ');
      };

      const transactions = jsonData.map((row: any, index: number) => {
        let paymentSystemName: string;
        let processingStarted: any;
        let completed: any;

        const rowKeys = Object.keys(row);
        const normalizedRow: Record<string, any> = {};
        rowKeys.forEach(key => {
          normalizedRow[normalizeColumnName(key)] = row[key];
        });

        const possibleNameColumns = ['ödeme sistemi adı', 'ödeme sistemi', 'payment system'];
        const possibleStartColumns = ['zaman ver', 'işlem başlangıç', 'başlangıç tarihi', 'start time'];
        const possibleEndColumns = ['ödenen zaman', 'tamamlanma', 'bitiş tarihi', 'end time', 'completed'];

        const nameColumn = possibleNameColumns.find(col => col in normalizedRow);
        const startColumn = possibleStartColumns.find(col => col in normalizedRow);
        const endColumn = possibleEndColumns.find(col => col in normalizedRow);

        if (!nameColumn || !startColumn || !endColumn) {
          const keys = Object.keys(row);
          if (keys.length >= 3) {
            paymentSystemName = String(row[keys[0]] || '').trim();
            processingStarted = row[keys[1]];
            completed = row[keys[2]];
          } else {
            throw new Error(`Satır ${index + 2}: Gerekli kolonlar bulunamadı (Ödeme Sistemi Adı, Zaman ver, Ödenen zaman). Mevcut kolonlar: ${keys.join(', ')}`);
          }
        } else {
          paymentSystemName = String(normalizedRow[nameColumn] || '').trim();
          processingStarted = normalizedRow[startColumn];
          completed = normalizedRow[endColumn];
        }

        if (!paymentSystemName || !processingStarted || !completed) {
          throw new Error(`Satır ${index + 2}: Tüm alanlar doldurulmalıdır`);
        }

        const parseExcelDate = (value: any, rowIndex: number, columnName: string): Date => {
          console.log(`Satır ${rowIndex + 2}, ${columnName}: type=${typeof value}, value=`, value);

          if (typeof value === 'number') {
            try {
              const parsed = XLSX.SSF.parse_date_code(value);
              return new Date(
                parsed.y,
                parsed.m - 1,
                parsed.d,
                parsed.H || 0,
                parsed.M || 0,
                parsed.S || 0
              );
            } catch (err) {
              throw new Error(`Excel tarih kodu çözümlenemedi: ${value}`);
            }
          }

          if (typeof value === 'string') {
            const trimmed = value.trim();
            console.log(`String tarih parse ediliyor: "${trimmed}"`);

            // DD-MM-YY HH:MM:SS formatı (28-10-25 23:38:33)
            const match1 = trimmed.match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
            if (match1) {
              const [, day, month, year, hour, minute, second] = match1;
              return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            }

            // DD-MM-YYYY HH:MM:SS formatı
            const match2 = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
            if (match2) {
              const [, day, month, year, hour, minute, second] = match2;
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            }

            // DD.MM.YYYY HH:MM:SS formatı
            const match3 = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
            if (match3) {
              const [, day, month, year, hour, minute, second] = match3;
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            }

            // DD.MM.YY HH:MM:SS formatı
            const match4 = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
            if (match4) {
              const [, day, month, year, hour, minute, second] = match4;
              return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            }

            // Diğer standart formatlar için
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
              return date;
            }

            throw new Error(`Tarih formatı tanınmadı: "${trimmed}". Desteklenen formatlar: DD-MM-YY HH:MM:SS, DD-MM-YYYY HH:MM:SS, DD.MM.YYYY HH:MM:SS`);
          }

          if (value instanceof Date) {
            return value;
          }

          throw new Error(`Bilinmeyen tarih tipi: ${typeof value}`);
        };

        let processingStartedDate: Date;
        let completedDate: Date;

        try {
          processingStartedDate = parseExcelDate(processingStarted, index, 'Başlangıç');
          completedDate = parseExcelDate(completed, index, 'Tamamlanma');
        } catch (err) {
          throw new Error(`Satır ${index + 2}: ${err instanceof Error ? err.message : 'Tarih formatı okunamadı'}`);
        }

        if (isNaN(processingStartedDate.getTime()) || isNaN(completedDate.getTime())) {
          throw new Error(`Satır ${index + 2}: Geçersiz tarih değeri`);
        }

        return {
          payment_system_name: paymentSystemName,
          processing_started_at: processingStartedDate.toISOString(),
          completed_at: completedDate.toISOString()
        };
      });

      const { error: insertError } = await supabase
        .from('payment_system_transactions')
        .insert(transactions);

      if (insertError) throw insertError;

      await supabase.from('analysis_reports').delete().eq('report_type', 'payment_system_analysis');

      onUploadComplete();
      event.target.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu';
      console.log('Detaylı hata:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Tüm ödeme sistemi verilerini silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('payment_system_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      await supabase.from('analysis_reports').delete().eq('report_type', 'payment_system_analysis');

      onUploadComplete();
    } catch (err) {
      console.error('Clear error:', err);
      setError(err instanceof Error ? err.message : 'Veriler silinirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
      <h2 className="text-xl font-semibold mb-4 text-white">Ödeme Sistemi Verileri Yükle</h2>

      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Upload className="w-5 h-5" />
            <span>{loading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.numbers,.pages"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />
          </label>

          <button
            onClick={handleClearData}
            disabled={loading}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tüm Verileri Sil
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="text-sm text-slate-400">
          <p className="font-medium mb-2">Dosya Formatı:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>1. Kolon: <strong className="text-slate-300">Ödeme Sistemi Adı</strong></li>
            <li>2. Kolon: <strong className="text-slate-300">Zaman ver</strong> (İşlem başlangıç tarihi ve saati)</li>
            <li>3. Kolon: <strong className="text-slate-300">Ödenen zaman</strong> (Tamamlanma tarihi ve saati)</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Not: Sistem bu kolon isimlerini otomatik tanır. Farklı isimler kullanıyorsanız, ilk 3 kolonu sırayla kullanır.
          </p>
        </div>
      </div>
    </div>
  );
}
