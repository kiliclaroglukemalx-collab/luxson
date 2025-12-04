import { useState, useEffect } from 'react';
import { Hash, Download, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToExcel } from '../utils/excelExport';
import { ExcelSettingsModal } from './ExcelSettingsModal';
import type { ExcelExportSettings } from '../utils/excelExport';

interface BtagReportProps {
  refreshTrigger?: number;
}

interface BtagData {
  btag: string;
  bonus_count: number;
  bonus_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  deposit_count: number;
  deposit_total: number;
  unique_customers: number;
}

export function BtagReport({ refreshTrigger = 0 }: BtagReportProps) {
  const [loading, setLoading] = useState(false);
  const [btagData, setBtagData] = useState<BtagData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcelSettings, setShowExcelSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Bonus verilerini yükle
      const { data: bonuses, error: bonusError } = await supabase
        .from('bonuses')
        .select('btag, customer_id, amount');

      if (bonusError) throw bonusError;

      // Çekim verilerini yükle
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('btag, customer_id, amount');

      if (withdrawalError) throw withdrawalError;

      // Yatırım verilerini yükle
      const { data: deposits, error: depositError } = await supabase
        .from('deposits')
        .select('customer_id, amount');

      if (depositError) throw depositError;

      // Btag bazlı analiz yap
      const btagMap = new Map<string, BtagData>();

      // Bonus analizi
      bonuses?.forEach(bonus => {
        if (!bonus.btag) return;
        const existing = btagMap.get(bonus.btag) || {
          btag: bonus.btag,
          bonus_count: 0,
          bonus_total: 0,
          withdrawal_count: 0,
          withdrawal_total: 0,
          deposit_count: 0,
          deposit_total: 0,
          unique_customers: new Set<string>()
        };
        existing.bonus_count++;
        existing.bonus_total += bonus.amount;
        existing.unique_customers.add(bonus.customer_id);
        btagMap.set(bonus.btag, existing);
      });

      // Çekim analizi
      withdrawals?.forEach(withdrawal => {
        if (!withdrawal.btag) return;
        const existing = btagMap.get(withdrawal.btag) || {
          btag: withdrawal.btag,
          bonus_count: 0,
          bonus_total: 0,
          withdrawal_count: 0,
          withdrawal_total: 0,
          deposit_count: 0,
          deposit_total: 0,
          unique_customers: new Set<string>()
        };
        existing.withdrawal_count++;
        existing.withdrawal_total += withdrawal.amount;
        existing.unique_customers.add(withdrawal.customer_id);
        btagMap.set(withdrawal.btag, existing);
      });

      // Yatırım analizi (btag yok, customer_id bazlı)
      const customerBtagMap = new Map<string, Set<string>>();
      bonuses?.forEach(bonus => {
        if (bonus.btag && bonus.customer_id) {
          if (!customerBtagMap.has(bonus.customer_id)) {
            customerBtagMap.set(bonus.customer_id, new Set());
          }
          customerBtagMap.get(bonus.customer_id)!.add(bonus.btag);
        }
      });

      deposits?.forEach(deposit => {
        const btags = customerBtagMap.get(deposit.customer_id);
        if (btags) {
          btags.forEach(btag => {
            const existing = btagMap.get(btag);
            if (existing) {
              existing.deposit_count++;
              existing.deposit_total += deposit.amount;
            }
          });
        }
      });

      // Map'i array'e çevir ve unique_customers'ı sayıya çevir
      const result = Array.from(btagMap.values()).map(item => ({
        ...item,
        unique_customers: item.unique_customers.size
      }));

      result.sort((a, b) => b.bonus_total - a.bonus_total);
      setBtagData(result);
    } catch (error) {
      console.error('Btag raporu yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = btagData.filter(b =>
    b.btag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async (settings?: ExcelExportSettings) => {
    const columns = [
      { key: 'btag', label: 'Btag', width: 15 },
      { key: 'unique_customers', label: 'Benzersiz Müşteri', width: 18 },
      { key: 'bonus_count', label: 'Bonus Sayısı', width: 15 },
      { key: 'bonus_total', label: 'Bonus Toplam (₺)', width: 18 },
      { key: 'withdrawal_count', label: 'Çekim Sayısı', width: 15 },
      { key: 'withdrawal_total', label: 'Çekim Toplam (₺)', width: 18 },
      { key: 'deposit_count', label: 'Yatırım Sayısı', width: 15 },
      { key: 'deposit_total', label: 'Yatırım Toplam (₺)', width: 18 }
    ];

    const exportData = filteredData.map(b => ({
      btag: b.btag,
      unique_customers: b.unique_customers,
      bonus_count: b.bonus_count,
      bonus_total: b.bonus_total,
      withdrawal_count: b.withdrawal_count,
      withdrawal_total: b.withdrawal_total,
      deposit_count: b.deposit_count,
      deposit_total: b.deposit_total
    }));

    await exportToExcel(exportData, columns, 'Btag_Raporu', settings);
  };

  const stats = {
    total: btagData.length,
    totalBonus: btagData.reduce((sum, b) => sum + b.bonus_total, 0),
    totalWithdrawal: btagData.reduce((sum, b) => sum + b.withdrawal_total, 0),
    totalDeposit: btagData.reduce((sum, b) => sum + b.deposit_total, 0)
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
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Hash className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Btag Raporu</h2>
              <p className="text-sm text-slate-300 mt-1">
                Btag bazlı analiz ve istatistikler
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
          <p className="text-sm text-slate-400">Toplam Btag</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Toplam Bonus</p>
          <p className="text-2xl font-bold text-purple-400">{stats.totalBonus.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Toplam Çekim</p>
          <p className="text-2xl font-bold text-red-400">{stats.totalWithdrawal.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
          <p className="text-sm text-slate-400">Toplam Yatırım</p>
          <p className="text-2xl font-bold text-green-400">{stats.totalDeposit.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Btag ara..."
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Btag</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Benzersiz Müşteri</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Bonus Sayısı</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Bonus Toplam</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Çekim Sayısı</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Çekim Toplam</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Yatırım Sayısı</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Yatırım Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Btag kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.btag} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-blue-400">{item.btag}</td>
                    <td className="px-4 py-3 text-sm text-right text-white">{item.unique_customers}</td>
                    <td className="px-4 py-3 text-sm text-right text-purple-400">{item.bonus_count}</td>
                    <td className="px-4 py-3 text-sm text-right text-purple-400 font-semibold">
                      {item.bonus_total.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-400">{item.withdrawal_count}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-400 font-semibold">
                      {item.withdrawal_total.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-400">{item.deposit_count}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-400 font-semibold">
                      {item.deposit_total.toLocaleString('tr-TR')} ₺
                    </td>
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
        reportType="btag-report"
        onExport={handleExport}
      />
    </div>
  );
}

