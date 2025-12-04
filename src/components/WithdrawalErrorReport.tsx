import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, RefreshCw, Download, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { matchBonusesToDeposits, analyzeWithdrawals } from '../utils/matchingEngine';
import type { AnalysisResult } from '../utils/matchingEngine';
import { exportToExcel, type ExcelExportSettings } from '../utils/excelExport';
import { ExcelSettingsModal } from './ExcelSettingsModal';

interface WithdrawalErrorReportProps {
  refreshTrigger?: number;
}

type FilterType = 'all' | 'hata' | 'dogru' | 'bonus_yok' | 'kural_yok';

export function WithdrawalErrorReport({ refreshTrigger = 0 }: WithdrawalErrorReportProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcelSettings, setShowExcelSettings] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    hata: 0,
    dogru: 0,
    bonusYok: 0,
    kuralYok: 0,
    totalOverpaid: 0
  });

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadData();
    } else {
      loadCachedOrFreshData();
    }
  }, [refreshTrigger]);

  const loadCachedOrFreshData = async () => {
    setLoading(true);
    try {
      const { data: cachedReport } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('report_type', 'bonus_analysis')
        .maybeSingle();

      if (cachedReport) {
        const reportData = cachedReport.report_data;
        setResults(reportData.results || []);
        calculateStats(reportData.results || []);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Önce bonus-deposit eşleştirmesi
      await matchBonusesToDeposits();
      
      // Sonra çekim analizi
      const analysisResults = await analyzeWithdrawals();
      setResults(analysisResults);
      calculateStats(analysisResults);

      // Cache'e kaydet
      await supabase
        .from('analysis_reports')
        .upsert({
          report_type: 'bonus_analysis',
          report_data: { results: analysisResults },
          last_data_upload: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'report_type'
        });
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AnalysisResult[]) => {
    const hata = data.filter(r => r.calculationLog?.includes('❌ HATA') || r.isOverpayment);
    const dogru = data.filter(r => r.calculationLog?.includes('✅ DOĞRU') && !r.isOverpayment);
    const bonusYok = data.filter(r => r.calculationLog?.includes('BONUS YOK'));
    const kuralYok = data.filter(r => r.calculationLog?.includes('kural bulunamadı'));
    const totalOverpaid = hata.reduce((sum, r) => sum + r.overpaymentAmount, 0);

    setStats({
      total: data.length,
      hata: hata.length,
      dogru: dogru.length,
      bonusYok: bonusYok.length,
      kuralYok: kuralYok.length,
      totalOverpaid
    });
  };

  const getStatus = (result: AnalysisResult): 'hata' | 'dogru' | 'bonus_yok' | 'kural_yok' => {
    if (result.calculationLog?.includes('❌ HATA') || result.isOverpayment) return 'hata';
    if (result.calculationLog?.includes('✅ DOĞRU')) return 'dogru';
    if (result.calculationLog?.includes('BONUS YOK')) return 'bonus_yok';
    if (result.calculationLog?.includes('kural bulunamadı')) return 'kural_yok';
    return 'dogru';
  };

  const filteredResults = results.filter(result => {
    // Filter by status
    const status = getStatus(result);
    if (filter !== 'all' && status !== filter) return false;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        result.withdrawal.customer_id.toLowerCase().includes(term) ||
        result.bonus?.bonus_name.toLowerCase().includes(term) ||
        result.bonusRule?.bonus_name.toLowerCase().includes(term) ||
        result.deposit?.customer_id.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR');
  };

  const handleExport = async (settings: ExcelExportSettings) => {
    try {
      const dataToExport = filteredResults.map(r => ({
        'Müşteri ID': r.withdrawal.customer_id,
        'Çekim Miktarı': r.withdrawal.amount,
        'Çekim Tarihi': formatDate(r.withdrawal.request_date),
        'Durum': getStatus(r) === 'hata' ? 'HATA' : 
                 getStatus(r) === 'dogru' ? 'DOĞRU' : 
                 getStatus(r) === 'bonus_yok' ? 'BONUS YOK' : 'KURAL YOK',
        'Max İzin Verilen': r.maxAllowed === Infinity ? 'Sınırsız' : r.maxAllowed,
        'Fazla Ödeme': r.isOverpayment ? r.overpaymentAmount : 0,
        'Yatırım Miktarı': r.deposit?.amount || 0,
        'Yatırım Tarihi': r.deposit?.deposit_date ? formatDate(r.deposit.deposit_date) : '',
        'Bonus Adı': r.bonus?.bonus_name || 'Yok',
        'Bonus Miktarı': r.bonus?.amount || 0,
        'Bonus Kuralı': r.bonusRule?.bonus_name || 'Yok',
        'Hesaplama Log': r.calculationLog || '',
      }));

      const columns = [
        { key: 'Müşteri ID', label: 'Müşteri ID', width: 15 },
        { key: 'Çekim Miktarı', label: 'Çekim Miktarı', width: 15 },
        { key: 'Çekim Tarihi', label: 'Çekim Tarihi', width: 20 },
        { key: 'Durum', label: 'Durum', width: 12 },
        { key: 'Max İzin Verilen', label: 'Max İzin Verilen', width: 15 },
        { key: 'Fazla Ödeme', label: 'Fazla Ödeme', width: 15 },
        { key: 'Yatırım Miktarı', label: 'Yatırım Miktarı', width: 15 },
        { key: 'Yatırım Tarihi', label: 'Yatırım Tarihi', width: 20 },
        { key: 'Bonus Adı', label: 'Bonus Adı', width: 25 },
        { key: 'Bonus Miktarı', label: 'Bonus Miktarı', width: 15 },
        { key: 'Bonus Kuralı', label: 'Bonus Kuralı', width: 25 },
        { key: 'Hesaplama Log', label: 'Hesaplama Log', width: 50 },
      ];

      await exportToExcel(dataToExport, columns, 'Çekim Hata Raporu', settings);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dışa aktarma sırasında bir hata oluştu.');
    }
  };

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Çekim Hata Raporu</h2>
              <p className="text-sm text-slate-300 mt-1">
                Yatırım → Bonus → Çekim kontrolü ve fazla ödeme tespiti
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExcelSettings(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Excel</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Toplam Çekim</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center gap-2 text-sm text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span>HATA</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.hata}</div>
          <div className="text-xs text-slate-400 mt-1">
            {formatCurrency(stats.totalOverpaid)} fazla
          </div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>DOĞRU</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.dogru}</div>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
            <Info className="w-4 h-4" />
            <span>BONUS YOK</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.bonusYok}</div>
        </div>
        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 text-sm text-orange-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>KURAL YOK</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{stats.kuralYok}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Müşteri ID, Bonus adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'hata', 'dogru', 'bonus_yok', 'kural_yok'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {f === 'all' ? 'Tümü' : 
                 f === 'hata' ? 'HATA' :
                 f === 'dogru' ? 'DOĞRU' :
                 f === 'bonus_yok' ? 'Bonus Yok' :
                 'Kural Yok'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredResults.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
            <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">Sonuç bulunamadı</p>
          </div>
        ) : (
          filteredResults.map((result) => {
            const status = getStatus(result);
            const statusColors = {
              hata: 'border-red-500/30 bg-red-500/5',
              dogru: 'border-green-500/30 bg-green-500/5',
              bonus_yok: 'border-yellow-500/30 bg-yellow-500/5',
              kural_yok: 'border-orange-500/30 bg-orange-500/5'
            };

            return (
              <div
                key={result.withdrawal.id}
                className={`border rounded-xl p-6 ${statusColors[status]}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {status === 'hata' && <XCircle className="w-6 h-6 text-red-400" />}
                      {status === 'dogru' && <CheckCircle className="w-6 h-6 text-green-400" />}
                      {(status === 'bonus_yok' || status === 'kural_yok') && (
                        <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      )}
                      <div>
                        <div className="font-bold text-white text-lg">
                          Müşteri: {result.withdrawal.customer_id}
                        </div>
                        <div className="text-sm text-slate-400">
                          Çekim: {formatCurrency(result.withdrawal.amount)} • {formatDate(result.withdrawal.request_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      status === 'hata' ? 'bg-red-500/20 text-red-400' :
                      status === 'dogru' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {status === 'hata' ? 'HATA' :
                       status === 'dogru' ? 'DOĞRU' :
                       status === 'bonus_yok' ? 'BONUS YOK' :
                       'KURAL YOK'}
                    </div>
                    {result.isOverpayment && (
                      <div className="text-red-400 text-sm mt-1">
                        Fazla: {formatCurrency(result.overpaymentAmount)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {result.deposit && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Yatırım</div>
                      <div className="text-white font-semibold">{formatCurrency(result.deposit.amount)}</div>
                      <div className="text-xs text-slate-400">{formatDate(result.deposit.deposit_date)}</div>
                    </div>
                  )}
                  {result.bonus && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Bonus</div>
                      <div className="text-white font-semibold">{result.bonus.bonus_name}</div>
                      <div className="text-xs text-slate-400">{formatCurrency(result.bonus.amount)}</div>
                    </div>
                  )}
                  {result.bonusRule && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Kural</div>
                      <div className="text-white font-semibold">{result.bonusRule.bonus_name}</div>
                      <div className="text-xs text-slate-400">
                        Max: {result.maxAllowed === Infinity ? '∞' : formatCurrency(result.maxAllowed)}
                      </div>
                    </div>
                  )}
                </div>

                {result.calculationLog && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-amber-400 hover:text-amber-300 font-semibold">
                      Hesaplama Detayları
                    </summary>
                    <pre className="mt-2 text-xs text-slate-300 bg-slate-900/50 p-4 rounded-lg whitespace-pre-wrap font-mono overflow-x-auto">
                      {result.calculationLog}
                    </pre>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>

      <ExcelSettingsModal
        isOpen={showExcelSettings}
        onClose={() => setShowExcelSettings(false)}
        reportType="withdrawal-errors"
        onExport={handleExport}
      />
    </div>
  );
}


