import { useState, useEffect } from 'react';
import { X, Download, Save, Folder } from 'lucide-react';
import {
  exportToExcel,
  ExcelExportOptions,
  saveTemplate,
  getTemplates,
  deleteTemplate,
  loadTemplate,
  ExcelTemplate,
} from '../utils/professionalExcelExport';

interface ExcelExportPanelProps {
  onClose: () => void;
}

export default function ExcelExportPanel({ onClose }: ExcelExportPanelProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ExcelTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [options, setOptions] = useState<ExcelExportOptions>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
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
  });

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportToExcel(options);
      alert('Excel dosyası başarıyla indirildi!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Hata: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Lütfen şablon adı girin');
      return;
    }

    const template = saveTemplate(templateName, options);
    setTemplates(getTemplates());
    setTemplateName('');
    alert('Şablon kaydedildi!');
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = loadTemplate(templateId);
    if (template) {
      setOptions({ ...options, ...template.options });
      setShowTemplates(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
      deleteTemplate(templateId);
      setTemplates(getTemplates());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6" />
            <h2 className="text-xl font-bold">Profesyonel Excel Export</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Range */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📅 Tarih Aralığı
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Başlangıç</label>
                <input
                  type="date"
                  value={options.startDate}
                  onChange={(e) => setOptions({ ...options, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bitiş</label>
                <input
                  type="date"
                  value={options.endDate}
                  onChange={(e) => setOptions({ ...options, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📊 Dahil Edilecek Sütunlar
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries({
                date: 'Tarih',
                employee: 'Personel',
                totalAmount: 'Toplam Tutar',
                memberCount: 'Üye Sayısı',
                investorCount: 'Yatırımcı Sayısı',
                conversionRate: 'Dönüşüm Oranı',
                performanceScore: 'Performans Skoru',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.columns[key as keyof typeof options.columns]}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        columns: { ...options.columns, [key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Visual Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🎨 Görsel Ayarlar
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Renk Şeması</label>
                <select
                  value={options.colorScheme}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      colorScheme: e.target.value as ExcelExportOptions['colorScheme'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="performance">🎯 Performans (Yeşil-Sarı-Kırmızı)</option>
                  <option value="professional">💼 Profesyonel (Mavi Tonları)</option>
                  <option value="corporate">🏢 Kurumsal (Lacivert)</option>
                  <option value="modern">✨ Modern (Mor Tonları)</option>
                  <option value="minimal">⚪ Minimal (Siyah-Beyaz)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.includeConditionalFormatting}
                    onChange={(e) =>
                      setOptions({ ...options, includeConditionalFormatting: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                    Koşullu Formatlama
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.includeChart}
                    onChange={(e) => setOptions({ ...options, includeChart: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                    Grafik Ekle
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.includeLogo}
                    onChange={(e) => setOptions({ ...options, includeLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                    Logo Ekle
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Summary Options */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📈 Özet Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeSummary}
                  onChange={(e) => setOptions({ ...options, includeSummary: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                  Toplam Satırı
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeAverage}
                  onChange={(e) => setOptions({ ...options, includeAverage: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                  Ortalama Satırı
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeMinMax}
                  onChange={(e) => setOptions({ ...options, includeMinMax: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                  Min/Max Değerler
                </span>
              </label>
            </div>
          </div>

          {/* Template Management */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              💾 Şablon Yönetimi
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Şablon adı..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Kaydet
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Folder className="w-4 h-4" />
                  Şablonlar ({templates.length})
                </button>
              </div>

              {showTemplates && templates.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 bg-white rounded hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">{template.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadTemplate(template.id)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Yükle
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleExport}
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
              }`}
            >
              <Download className="w-5 h-5" />
              {loading ? 'İndiriliyor...' : 'Excel İndir'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
