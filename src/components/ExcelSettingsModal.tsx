import { useState, useEffect } from 'react';
import { X, Save, Download } from 'lucide-react';
import { ExcelExportSettings, loadExcelSettings, saveExcelSettings } from '../utils/excelExport';

interface ExcelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  onExport: (settings: ExcelExportSettings) => void;
}

export function ExcelSettingsModal({ isOpen, onClose, reportType, onExport }: ExcelSettingsModalProps) {
  const [settings, setSettings] = useState<ExcelExportSettings>({
    headerBgColor: 'FF4472C4',
    headerTextColor: 'FFFFFFFF',
    rowBgColor: 'FFFFFFFF',
    rowTextColor: 'FF000000',
    alternateRowBgColor: 'FFF2F2F2',
    borderColor: 'FFD0D0D0',
    showBorders: true,
    showAlternateRows: true,
    freezeFirstRow: true,
    freezeFirstColumn: false,
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '#,##0.00',
    currencySymbol: '₺'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, reportType]);

  const loadSettings = async () => {
    setLoading(true);
    const saved = await loadExcelSettings(reportType);
    if (saved) {
      setSettings({ ...settings, ...saved });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const success = await saveExcelSettings(reportType, settings);
    if (success) {
      alert('Ayarlar kaydedildi!');
    } else {
      alert('Ayarlar kaydedilirken hata oluştu!');
    }
    setLoading(false);
  };

  const handleExport = () => {
    onExport(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Excel Export Ayarları</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Renklendirme */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Renklendirme</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Başlık Arka Plan</label>
                <input
                  type="color"
                  value={`#${settings.headerBgColor?.replace('FF', '') || '4472C4'}`}
                  onChange={(e) => setSettings({ ...settings, headerBgColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Başlık Metin</label>
                <input
                  type="color"
                  value={`#${settings.headerTextColor?.replace('FF', '') || 'FFFFFF'}`}
                  onChange={(e) => setSettings({ ...settings, headerTextColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Satır Arka Plan</label>
                <input
                  type="color"
                  value={`#${settings.rowBgColor?.replace('FF', '') || 'FFFFFF'}`}
                  onChange={(e) => setSettings({ ...settings, rowBgColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Satır Metin</label>
                <input
                  type="color"
                  value={`#${settings.rowTextColor?.replace('FF', '') || '000000'}`}
                  onChange={(e) => setSettings({ ...settings, rowTextColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Alternatif Satır</label>
                <input
                  type="color"
                  value={`#${settings.alternateRowBgColor?.replace('FF', '') || 'F2F2F2'}`}
                  onChange={(e) => setSettings({ ...settings, alternateRowBgColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Kenarlık Rengi</label>
                <input
                  type="color"
                  value={`#${settings.borderColor?.replace('FF', '') || 'D0D0D0'}`}
                  onChange={(e) => setSettings({ ...settings, borderColor: `FF${e.target.value.replace('#', '')}` })}
                  className="w-full h-10 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Tablo Görünümü */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Tablo Görünümü</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showBorders ?? true}
                  onChange={(e) => setSettings({ ...settings, showBorders: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Kenarlıkları Göster</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showAlternateRows ?? true}
                  onChange={(e) => setSettings({ ...settings, showAlternateRows: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Alternatif Satır Renklendirmesi</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.freezeFirstRow ?? true}
                  onChange={(e) => setSettings({ ...settings, freezeFirstRow: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">İlk Satırı Dondur</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.freezeFirstColumn ?? false}
                  onChange={(e) => setSettings({ ...settings, freezeFirstColumn: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">İlk Sütunu Dondur</span>
              </label>
            </div>
          </div>

          {/* Format */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Tarih Formatı</label>
                <input
                  type="text"
                  value={settings.dateFormat || 'DD/MM/YYYY'}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Sayı Formatı</label>
                <input
                  type="text"
                  value={settings.numberFormat || '#,##0.00'}
                  onChange={(e) => setSettings({ ...settings, numberFormat: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="#,##0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Para Birimi Sembolü</label>
                <input
                  type="text"
                  value={settings.currencySymbol || '₺'}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="₺"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex items-center justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Ayarları Kaydet
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Excel İndir
          </button>
        </div>
      </div>
    </div>
  );
}

