import { useState, useEffect } from 'react';
import { Clock, TrendingUp, Award, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PaymentSystemTransaction } from '../lib/supabase';
import { PaymentSystemUpload } from './PaymentSystemUpload';

interface PaymentSystemStats {
  systemName: string;
  transactionCount: number;
  avgProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalProcessingTime: number;
}

export function PaymentSystemAnalysis() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PaymentSystemTransaction[]>([]);
  const [stats, setStats] = useState<PaymentSystemStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTransactions: 0,
    avgTime: 0,
    fastestSystem: '',
    slowestSystem: ''
  });

  useEffect(() => {
    loadCachedOrFreshData();
  }, []);

  const loadCachedOrFreshData = async () => {
    setLoading(true);
    try {
      const { data: cachedReport } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('report_type', 'payment_system_analysis')
        .maybeSingle();

      if (cachedReport) {
        const reportData = cachedReport.report_data;
        setTransactions(reportData.transactions);
        calculateStats(reportData.transactions);
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
      const { data, error } = await supabase
        .from('payment_system_transactions')
        .select('*')
        .order('processing_started_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      calculateStats(data || []);

      await supabase
        .from('analysis_reports')
        .upsert({
          report_type: 'payment_system_analysis',
          report_data: { transactions: data || [] },
          last_data_upload: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'report_type'
        });
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const calculateStats = (data: PaymentSystemTransaction[]) => {
    if (data.length === 0) {
      setStats([]);
      setOverallStats({ totalTransactions: 0, avgTime: 0, fastestSystem: '', slowestSystem: '' });
      return;
    }

    const systemMap = new Map<string, PaymentSystemTransaction[]>();

    data.forEach(transaction => {
      const existing = systemMap.get(transaction.payment_system_name) || [];
      systemMap.set(transaction.payment_system_name, [...existing, transaction]);
    });

    const systemStats: PaymentSystemStats[] = Array.from(systemMap.entries()).map(([systemName, transactions]) => {
      const times = transactions.map(t => t.processing_time_minutes);
      const totalTime = times.reduce((sum, time) => sum + time, 0);
      const avgTime = totalTime / times.length;

      return {
        systemName,
        transactionCount: transactions.length,
        avgProcessingTime: avgTime,
        minProcessingTime: Math.min(...times),
        maxProcessingTime: Math.max(...times),
        totalProcessingTime: totalTime
      };
    });

    systemStats.sort((a, b) => a.avgProcessingTime - b.avgProcessingTime);

    const totalTime = data.reduce((sum, t) => sum + t.processing_time_minutes, 0);
    const overallAvg = totalTime / data.length;

    setStats(systemStats);
    setOverallStats({
      totalTransactions: data.length,
      avgTime: overallAvg,
      fastestSystem: systemStats[0]?.systemName || '',
      slowestSystem: systemStats[systemStats.length - 1]?.systemName || ''
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return `${(minutes * 60).toFixed(0)} sn`;
    if (minutes < 60) return `${minutes.toFixed(2)} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = (minutes % 60).toFixed(0);
    return `${hours}s ${mins}dk`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  const getTimeColor = (avgTime: number, overallAvg: number) => {
    if (avgTime < overallAvg * 0.7) return 'text-green-400';
    if (avgTime < overallAvg * 1.3) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTimeBgColor = (avgTime: number, overallAvg: number) => {
    if (avgTime < overallAvg * 0.7) return 'bg-green-500/10 border-green-500/30';
    if (avgTime < overallAvg * 1.3) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
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
      <PaymentSystemUpload onUploadComplete={loadData} />

      {transactions.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-12 border border-slate-600 text-center">
          <Activity className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Henüz Veri Yok</h3>
          <p className="text-slate-400">Ödeme sistemi verilerini yüklemek için yukarıdaki butonu kullanın.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Toplam İşlem</p>
                  <p className="text-2xl font-bold text-white">{overallStats.totalTransactions}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Ortalama Süre</p>
                  <p className="text-2xl font-bold text-white">{formatTime(overallStats.avgTime)}</p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">En Hızlı Sistem</p>
                  <p className="text-lg font-bold text-green-400 truncate">{overallStats.fastestSystem}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Award className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">En Yavaş Sistem</p>
                  <p className="text-lg font-bold text-red-400 truncate">{overallStats.slowestSystem}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
            <div className="p-6 border-b border-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Ödeme Sistemleri Performans Raporu</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {stats.map((stat, index) => (
                  <div
                    key={stat.systemName}
                    className={`p-6 border rounded-lg ${getTimeBgColor(stat.avgProcessingTime, overallStats.avgTime)}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/50 text-white font-bold">
                          {index + 1}
                        </div>
                        <h4 className="text-lg font-semibold text-white">{stat.systemName}</h4>
                      </div>
                      <div className={`text-2xl font-bold ${getTimeColor(stat.avgProcessingTime, overallStats.avgTime)}`}>
                        {formatTime(stat.avgProcessingTime)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Toplam İşlem</p>
                        <p className="text-lg font-semibold text-white">{stat.transactionCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">En Hızlı</p>
                        <p className="text-lg font-semibold text-green-400">{formatTime(stat.minProcessingTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">En Yavaş</p>
                        <p className="text-lg font-semibold text-red-400">{formatTime(stat.maxProcessingTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Toplam Süre</p>
                        <p className="text-lg font-semibold text-white">{formatTime(stat.totalProcessingTime)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600 overflow-hidden">
            <div className="p-6 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-white">Tüm İşlemler</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Ödeme Sistemi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Başlangıç
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Tamamlanma
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      İşlem Süresi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {transaction.payment_system_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDateTime(transaction.processing_started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDateTime(transaction.completed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-amber-400">
                        {formatTime(transaction.processing_time_minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
