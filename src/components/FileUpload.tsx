import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readFileAsText, parseDepositFile, parseBonusFile, parseWithdrawalFile, parseExcelFile, isExcelFile } from '../utils/fileParser';

type FileType = 'deposits' | 'bonuses' | 'withdrawals';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (file: File, type: FileType) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if file is Excel/Pages format and parse accordingly
      const content = isExcelFile(file) ? await parseExcelFile(file) : await readFileAsText(file);

      if (type === 'deposits') {
        const deposits = parseDepositFile(content);
        console.log('Parsed deposits:', deposits);

        if (!deposits || deposits.length === 0) {
          throw new Error('Dosyadan yatırım kaydı okunamadı. Lütfen dosya formatını kontrol edin.');
        }

        // Must delete in order: withdrawals -> bonuses -> deposits (due to foreign keys)
        await supabase.from('withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('bonuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('deposits').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new deposits
        const { error: insertError } = await supabase
          .from('deposits')
          .insert(deposits.map(d => ({
            customer_id: d.customer_id,
            amount: d.amount,
            deposit_date: d.deposit_date
          })));

        if (insertError) throw insertError;

        await supabase.from('analysis_reports').delete().eq('report_type', 'bonus_analysis');

        setSuccess(`${deposits.length} yatırım kaydı yüklendi`);
      } else if (type === 'bonuses') {
        const bonuses = parseBonusFile(content);
        console.log('Parsed bonuses:', bonuses);

        if (!bonuses || bonuses.length === 0) {
          throw new Error('Dosyadan bonus kaydı okunamadı. Lütfen dosya formatını kontrol edin.');
        }

        // Must delete withdrawals first (foreign key dependency)
        await supabase.from('withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('bonuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new bonuses - sadece geçerli kayıtları ekle
        const validBonuses = bonuses.filter(b => {
          // acceptance_date zorunlu ve geçerli olmalı
          if (!b.acceptance_date || !/^\d{4}-\d{2}-\d{2}/.test(b.acceptance_date)) {
            console.warn('Skipping invalid bonus:', b);
            return false;
          }
          return true;
        });

        if (validBonuses.length === 0) {
          throw new Error('Geçerli bonus kaydı bulunamadı. Lütfen dosya formatını kontrol edin.');
        }

        const { error: insertError } = await supabase
          .from('bonuses')
          .insert(validBonuses.map(b => ({
            customer_id: b.customer_id,
            bonus_name: b.bonus_name,
            amount: b.amount,
            acceptance_date: b.acceptance_date,
            created_date: b.created_date || null,
            created_by: b.created_by || null,
            btag: b.btag || null,
          })));

        if (insertError) throw insertError;

        await supabase.from('analysis_reports').delete().eq('report_type', 'bonus_analysis');

        setSuccess(`${bonuses.length} bonus kaydı yüklendi`);
      } else if (type === 'withdrawals') {
        const withdrawals = parseWithdrawalFile(content);
        console.log('Parsed withdrawals:', withdrawals);
        console.log('Content preview:', content.substring(0, 500));

        if (!withdrawals || withdrawals.length === 0) {
          throw new Error('Dosyadan çekim kaydı okunamadı. Lütfen dosya formatını kontrol edin.');
        }

        // Clear existing withdrawals
        await supabase.from('withdrawals').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new withdrawals
        const { error: insertError } = await supabase
          .from('withdrawals')
          .insert(withdrawals.map(w => ({
            customer_id: w.customer_id,
            amount: w.amount,
            request_date: w.request_date,
            payment_date: w.approval_date,
            staff_name: w.staff_name,
            konum: w.konum,
            rejection_date: w.rejection_date,
            btag: w.btag,
          })));

        if (insertError) throw insertError;

        await supabase.from('analysis_reports').delete().eq('report_type', 'bonus_analysis');

        setSuccess(`${withdrawals.length} çekim kaydı yüklendi`);
      }

      onUploadComplete();
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const renderUploadButton = (type: FileType, label: string, description: string) => (
    <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 bg-gradient-to-br from-slate-800 to-slate-700 hover:border-amber-500 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white">{label}</h3>
        </div>
      </div>
      <p className="text-sm text-slate-300 mb-4">{description}</p>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 cursor-pointer transition-all duration-200 shadow-lg">
        <Upload className="w-4 h-4" />
        <span>Dosya Seç</span>
        <input
          type="file"
          accept=".txt,.csv,.tsv,.xlsx,.xls,.numbers,.pages,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, type);
            e.target.value = '';
          }}
          disabled={uploading}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-200">
            <p className="font-semibold mb-1 text-white">Dosya Yükleme Talimatları:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dosyaları sırasıyla yükleyin: Yatırımlar → Bonuslar → Çekimler</li>
              <li>Excel (.xlsx, .xls), Pages (.pages, .numbers), CSV veya TXT formatında dosya yükleyebilirsiniz</li>
              <li>Her yükleme önceki verileri silip yenilerini ekler</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      <div className="grid gap-4">
        {renderUploadButton(
          'deposits',
          '1. Yatırım Raporu',
          'Oyuncu Kimliği | Miktar | Yatırım Tarihi'
        )}
        {renderUploadButton(
          'bonuses',
          '2. Bonus Raporu',
          'Oyuncu Kimliği | Bonus Adı | Kabul Tarihi | Miktar'
        )}
        {renderUploadButton(
          'withdrawals',
          '3. Çekim Raporu',
          'Oyuncu Kimliği | Miktar | Konum | İstek Zamanı | Personel | Ödenen Zaman'
        )}
      </div>
    </div>
  );
}
