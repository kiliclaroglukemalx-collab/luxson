import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AnalysisResult } from '../utils/matchingEngine';
import { matchBonusesToDeposits, analyzeWithdrawals } from '../utils/matchingEngine';

interface AnalysisPageProps {
  refreshTrigger: number;
}

export function AnalysisPage({ refreshTrigger }: AnalysisPageProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [stats, setStats] = useState({
    totalWithdrawals: 0,
    overpayments: 0,
    totalOverpaid: 0,
    avgProcessingTime: 0,
    staffErrors: {} as Record<string, { count: number; amount: number }>,
    staffProcessingTimes: {} as Record<string, { totalTime: number; count: number; avgTime: number }>
  });

  useEffect(() => {
    loadCachedOrFreshData();
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
        setResults(reportData.results);
        setStats(reportData.stats);
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
    try {
      await matchBonusesToDeposits();
      const analysisResults = await analyzeWithdrawals();

      const overpayments = analysisResults.filter(r => r.isOverpayment);
      const totalOverpaid = overpayments.reduce((sum, r) => sum + r.overpaymentAmount, 0);
      const avgTime = analysisResults.reduce((sum, r) => sum + r.processingTimeMinutes, 0) / analysisResults.length;

      const staffErrors: Record<string, { count: number; amount: number }> = {};
      overpayments.forEach(r => {
        const staff = r.withdrawal.staff_name;
        if (!staffErrors[staff]) {
          staffErrors[staff] = { count: 0, amount: 0 };
        }
        staffErrors[staff].count++;
        staffErrors[staff].amount += r.overpaymentAmount;
      });

      const staffProcessingTimes: Record<string, { totalTime: number; count: number; avgTime: number }> = {};
      analysisResults.forEach(r => {
        const staff = r.withdrawal.staff_name;
        if (!staffProcessingTimes[staff]) {
          staffProcessingTimes[staff] = { totalTime: 0, count: 0, avgTime: 0 };
        }
        staffProcessingTimes[staff].totalTime += r.processingTimeMinutes;
        staffProcessingTimes[staff].count++;
      });

      Object.keys(staffProcessingTimes).forEach(staff => {
        staffProcessingTimes[staff].avgTime = staffProcessingTimes[staff].totalTime / staffProcessingTimes[staff].count;
      });

      const calculatedStats = {
        totalWithdrawals: analysisResults.length,
        overpayments: overpayments.length,
        totalOverpaid,
        avgProcessingTime: avgTime || 0,
        staffErrors,
        staffProcessingTimes
      };

      setResults(analysisResults);
      setStats(calculatedStats);

      await supabase
        .from('analysis_reports')
        .upsert({
          report_type: 'bonus_analysis',
          report_data: { results: analysisResults, stats: calculatedStats },
          last_data_upload: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'report_type'
        });
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes.toFixed(2)} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = (minutes % 60).toFixed(2);
    return `${hours}s ${mins}dk`;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Toplam Çekim</p>
              <p className="text-2xl font-bold text-white">{stats.totalWithdrawals}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Hatalı Ödeme</p>
              <p className="text-2xl font-bold text-red-400">{stats.overpayments}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Toplam Fazla Ödeme</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalOverpaid)}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Ort. İşlem Süresi</p>
              <p className="text-2xl font-bold text-white">{formatTime(stats.avgProcessingTime)}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {Object.keys(stats.staffProcessingTimes).length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
          <div className="p-6 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Personel İşlem Süreleri</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.staffProcessingTimes)
                .sort((a, b) => a[1].avgTime - b[1].avgTime)
                .map(([staff, data]) => (
                  <div key={staff} className="p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-white">{staff}</p>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        data.avgTime < 10 ? 'bg-green-500/20 text-green-400' :
                        data.avgTime < 30 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {formatTime(data.avgTime)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{data.count} işlem</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(stats.staffErrors).length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
          <div className="p-6 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Personel Bazlı Hatalar</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(stats.staffErrors)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([staff, data]) => (
                  <div key={staff} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{staff}</p>
                      <p className="text-sm text-slate-400">{data.count} hatalı işlem</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-400">{formatCurrency(data.amount)}</p>
                      <p className="text-sm text-slate-400">fazla ödeme</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-white">Detaylı Çekim Analizi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Müşteri ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Personel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Konum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Bonus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Yatırım
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Max İzin
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Ödenen
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Fark
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Süre
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {results.map((result, index) => (
                <tr
                  key={index}
                  className={result.isOverpayment ? 'bg-red-500/10' : 'hover:bg-slate-700/50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {result.withdrawal.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {result.withdrawal.staff_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.withdrawal.konum ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.withdrawal.konum.toLowerCase().includes('red')
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {result.withdrawal.konum}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {result.bonus?.bonus_name || 'Bonussuz'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                    {result.deposit ? formatCurrency(result.deposit.amount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                    {result.maxAllowed === Infinity ? '∞' : result.maxAllowed > 0 ? formatCurrency(result.maxAllowed) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-white">
                    {formatCurrency(result.withdrawal.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {result.isOverpayment ? (
                      <span className="text-red-400 font-bold">
                        +{formatCurrency(result.overpaymentAmount)}
                      </span>
                    ) : (
                      <span className="text-green-400">✓</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">
                    {formatTime(result.processingTimeMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
