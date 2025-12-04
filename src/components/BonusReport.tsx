import { useState, useEffect } from 'react';
import { Gift, Download, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToExcel } from '../utils/excelExport';
import { ExcelSettingsModal } from './ExcelSettingsModal';
import type { ExcelExportSettings } from '../utils/excelExport';

interface BonusReportProps {
  refreshTrigger?: number;
}

interface BonusData {
  id: string;
  customer_id: string;
  bonus_name: string;
  amount: number;
  acceptance_date: string;
  created_date?: string;
  created_by?: string;
  btag?: string;
  deposit_id?: string;
}

export function BonusReport({ refreshTrigger = 0 }: BonusReportProps) {
  const [loading, setLoading] = useState(false);
  const [bonuses, setBonuses] = useState<BonusData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcelSettings, setShowExcelSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .order('acceptance_date', { ascending: false });

      if (error) throw error;
      setBonuses(data || []);
    } catch (error) {
      console.error('Bonus raporu yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBonuses = bonuses.filter(b =>
    b.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.bonus_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.btag?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async (settings?: ExcelExportSettings) => {
    const columns = [
      { key: 'customer_id', label: 'Müşteri ID', width: 15 },
      { key: 'bonus_name', label: 'Bonus Adı', width: 25 },
      { key: 'amount', label: 'Miktar (₺)', width: 15 },
      { key: 'acceptance_date', label: 'Kabul Tarihi', width: 18 },
      { key: 'created_date', label: 'Oluşturulma Tarihi', width: 18 },
      { key: 'created_by', label: 'Oluşturan', width: 15 },
      { key: 'btag', label: 'Btag', width: 15 }
    ];

    const exportData = filteredBonuses.map(b => ({
      customer_id: b.customer_id,
      bonus_name: b.bonus_name,
      amount: b.amount,
      acceptance_date: new Date(b.acceptance_date).toLocaleDateString('tr-TR'),
      created_date: b.created_date ? new Date(b.created_date).toLocaleDateString('tr-TR') : '',
      created_by: b.created_by || '',
      btag: b.btag || ''
    }));

    await exportToExcel(exportData, columns, 'Bonus_Raporu', settings);
  };

  const stats = {
    total: bonuses.length,
    totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
    uniqueCustomers: new Set(bonuses.map(b => b.customer_id)).size,
    uniqueBonuses: new Set(bonuses.map(b => b.bonus_name)).size
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Bonus Raporu</h2>
              <p className="text-sm text-slate-300 mt-1">
                Tüm bonus kayıtları ve analizleri
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExcelSettings(true)}
            className="group flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Excel</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Toplam Bonus</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Toplam Tutar</p>
          <p className="text-2xl font-bold text-green-400">{stats.totalAmount.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Benzersiz Müşteri</p>
          <p className="text-2xl font-bold text-blue-400">{stats.uniqueCustomers}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Bonus Tipi</p>
          <p className="text-2xl font-bold text-purple-400">{stats.uniqueBonuses}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Müşteri ID, Bonus Adı veya Btag ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Müşteri ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Bonus Adı</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Miktar</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kabul Tarihi</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Oluşturulma</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Btag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredBonuses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Bonus kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredBonuses.map((bonus) => (
                  <tr key={bonus.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-white">{bonus.customer_id}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{bonus.bonus_name}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-400 font-semibold">
                      {bonus.amount.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {new Date(bonus.acceptance_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {bonus.created_date ? new Date(bonus.created_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{bonus.btag || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExcelSettingsModal
        isOpen={showExcelSettings}
        onClose={() => setShowExcelSettings(false)}
        reportType="bonus-report"
        onExport={handleExport}
      />
    </div>
  );
}

