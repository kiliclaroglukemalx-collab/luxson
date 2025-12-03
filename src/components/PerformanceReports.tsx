import { useState, useEffect } from 'react';
import { TrendingUp, Users, CreditCard, RefreshCw, Award, Clock, Activity, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PaymentSystemTransaction } from '../lib/supabase';
import { PaymentSystemUpload } from './PaymentSystemUpload';
import ExcelExportPanel from './ExcelExportPanel';

interface EmployeeStats {
  id: string;
  employee_id: string;
  week_start_date: string;
  total_withdrawals: number;
  total_amount: number;
  avg_processing_time: number;
  rejection_count: number;
  rejection_rate: number;
  performance_score: number;
  employee_name?: string;
}

interface PaymentSystemStats {
  systemName: string;
  transactionCount: number;
  avgProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalProcessingTime: number;
}

type ReportTab = 'personnel' | 'payment-systems';

export default function PerformanceReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('personnel');
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentSystemTransaction[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentSystemStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showExcelPanel, setShowExcelPanel] = useState(false);
  const [overallPaymentStats, setOverallPaymentStats] = useState({
    totalTransactions: 0,
    avgTime: 0,
    fastestSystem: '',
    slowestSystem: ''
  });

  useEffect(() => {
    loadAllData();

    const employeeStatsChannel = supabase
      .channel('weekly-employee-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_employee_stats' }, () => {
        loadEmployeeStats();
      })
      .subscribe();

    const paymentStatsChannel = supabase
      .channel('payment-system-transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_system_transactions' }, () => {
        loadPaymentSystemData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(employeeStatsChannel);
      supabase.removeChannel(paymentStatsChannel);
    };
  }, []);

  function getWeekStartDate(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadEmployeeStats(), loadPaymentSystemData()]);
    setLoading(false);
  }

  async function loadEmployeeStats() {
    try {
      const weekStart = getWeekStartDate();

      const { data: employeeRes } = await supabase
        .from('weekly_employee_stats')
        .select('*')
        .eq('week_start_date', weekStart)
        .order('performance_score', { ascending: false });

      if (employeeRes) {
        const employeeIds = employeeRes.map(s => s.employee_id);
        if (employeeIds.length > 0) {
          const { data: employees } = await supabase
            .from('employees')
            .select('id, name')
            .in('id', employeeIds);

          const enriched = employeeRes.map(stat => ({
            ...stat,
            employee_name: employees?.find(e => e.id === stat.employee_id)?.name || 'Bilinmeyen',
          }));

          setEmployeeStats(enriched);
        } else {
          setEmployeeStats([]);
        }
      }
    } catch (err) {
      console.error('Error loading employee stats:', err);
    }
  }

  async function loadPaymentSystemData() {
    try {
      const { data: cachedReport } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('report_type', 'payment_system_analysis')
        .maybeSingle();

      if (cachedReport) {
        const reportData = cachedReport.report_data;
        setPaymentTransactions(reportData.transactions);
        calculatePaymentStats(reportData.transactions);
      } else {
        const { data, error } = await supabase
          .from('payment_system_transactions')
          .select('*')
          .order('processing_started_at', { ascending: false });

        if (error) throw error;

        setPaymentTransactions(data || []);
        calculatePaymentStats(data || []);

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
      }
    } catch (err) {
      console.error('Error loading payment system data:', err);
    }
  }

  const calculatePaymentStats = (data: PaymentSystemTransaction[]) => {
    if (data.length === 0) {
      setPaymentStats([]);
      setOverallPaymentStats({ totalTransactions: 0, avgTime: 0, fastestSystem: '', slowestSystem: '' });
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
        totalProcessingTime: totalTime,
      };
    });

    systemStats.sort((a, b) => a.avgProcessingTime - b.avgProcessingTime);
    setPaymentStats(systemStats);

    const totalTransactions = data.length;
    const avgTime = systemStats.reduce((sum, s) => sum + s.avgProcessingTime, 0) / systemStats.length;
    const fastestSystem = systemStats[0]?.systemName || '';
    const slowestSystem = systemStats[systemStats.length - 1]?.systemName || '';

    setOverallPaymentStats({ totalTransactions, avgTime, fastestSystem, slowestSystem });
  };

  async function calculateWeeklyStats() {
    setCalculating(true);
    try {
      const weekStart = getWeekStartDate();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .gte('payment_date', weekStart)
        .lt('payment_date', weekEnd.toISOString().split('T')[0]);

      if (!withdrawals || withdrawals.length === 0) {
        alert('Bu hafta için veri bulunamadı!');
        setCalculating(false);
        return;
      }

      const employeeMap = new Map<string, any>();

      withdrawals.forEach(w => {
        if (!w.staff_name) return;

        const current = employeeMap.get(w.staff_name) || {
          employee_name: w.staff_name,
          total_withdrawals: 0,
          total_amount: 0,
          total_processing_time: 0,
          rejection_count: 0,
        };

        current.total_withdrawals += 1;
        current.total_amount += w.amount;
        current.total_processing_time += w.processing_time_minutes || 0;
        if (w.rejection_reason) current.rejection_count += 1;

        employeeMap.set(w.staff_name, current);
      });

      for (const [employeeName, stats] of employeeMap.entries()) {
        const avgProcessingTime = stats.total_processing_time / stats.total_withdrawals;
        const rejectionRate = (stats.rejection_count / stats.total_withdrawals) * 100;
        const performanceScore = Math.max(0, 100 - (avgProcessingTime * 0.1) - (rejectionRate * 2));

        let { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('name', employeeName)
          .maybeSingle();

        if (!employee) {
          const { data: newEmployee } = await supabase
            .from('employees')
            .insert({ name: employeeName })
            .select()
            .single();
          employee = newEmployee;
        }

        if (employee) {
          await supabase
            .from('weekly_employee_stats')
            .upsert({
              employee_id: employee.id,
              week_start_date: weekStart,
              total_withdrawals: stats.total_withdrawals,
              total_amount: stats.total_amount,
              avg_processing_time: avgProcessingTime,
              rejection_count: stats.rejection_count,
              rejection_rate: rejectionRate,
              performance_score: performanceScore,
            }, {
              onConflict: 'employee_id,week_start_date'
            });
        }
      }

      await loadEmployeeStats();
      alert('Haftalık istatistikler başarıyla hesaplandı!');
    } catch (err) {
      console.error('Error calculating weekly stats:', err);
      alert('İstatistik hesaplanırken hata oluştu!');
    } finally {
      setCalculating(false);
    }
  }

  const getLeagueInfo = (index: number, total: number) => {
    const percentage = (index / total) * 100;
    
    if (percentage <= 20) {
      return { name: 'Altın Lig', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' };
    } else if (percentage <= 40) {
      return { name: 'Gümüş Lig', color: 'text-slate-300', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' };
    } else if (percentage <= 60) {
      return { name: 'Bronz Lig', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' };
    } else if (percentage <= 80) {
      return { name: 'Yeşil Lig', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' };
    } else {
      return { name: 'Mavi Lig', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' };
    }
  };

  const getTimeBgColor = (avgTime: number, overallAvg: number) => {
    if (avgTime < overallAvg * 0.7) return 'bg-green-500/10 border-green-500/30';
    if (avgTime < overallAvg * 1.3) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getTimeColor = (avgTime: number, overallAvg: number) => {
    if (avgTime < overallAvg * 0.7) return 'text-green-400';
    if (avgTime < overallAvg * 1.3) return 'text-amber-400';
    return 'text-red-400';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return `${Math.round(minutes * 60)}sn`;
    if (minutes < 60) return `${Math.round(minutes)}dk`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
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
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Performans Raporları</h2>
              <p className="text-sm text-slate-300 mt-1">
                Personel ve ödeme sistemi performans analizleri
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExcelPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('personnel')}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
              activeTab === 'personnel'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Personel Performansı</span>
          </button>
          <button
            onClick={() => setActiveTab('payment-systems')}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
              activeTab === 'payment-systems'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Ödeme Sistemleri</span>
          </button>
        </div>
      </div>

      {/* Personnel Performance Tab */}
      {activeTab === 'personnel' && (
        <div className="space-y-6">
          {/* Calculate Button */}
          <div className="flex justify-end">
            <button
              onClick={calculateWeeklyStats}
              disabled={calculating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
              <span>{calculating ? 'Hesaplanıyor...' : 'Haftalık İstatistikleri Hesapla'}</span>
            </button>
          </div>

          {/* Personnel League System */}
          {employeeStats.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-12 border border-slate-600 text-center">
              <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Henüz Veri Yok</h3>
              <p className="text-slate-400">Haftalık istatistikleri hesaplamak için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
              <div className="p-6 border-b border-slate-600">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Personel Performans Ligi</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {employeeStats.map((stat, index) => {
                    const league = getLeagueInfo(index, employeeStats.length);
                    return (
                      <div
                        key={stat.id}
                        className={`p-6 border rounded-lg ${league.bgColor} ${league.borderColor}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/50 text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-white">{stat.employee_name}</h4>
                              <p className={`text-sm font-medium ${league.color}`}>{league.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-amber-400">{stat.performance_score.toFixed(1)}</div>
                            <div className="text-xs text-slate-400">Puan</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Toplam İşlem</div>
                            <div className="text-lg font-semibold text-white">{stat.total_withdrawals}</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Toplam Tutar</div>
                            <div className="text-lg font-semibold text-white">{stat.total_amount.toLocaleString('tr-TR')} ₺</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Ort. Süre</div>
                            <div className="text-lg font-semibold text-white">{formatTime(stat.avg_processing_time)}</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Red Oranı</div>
                            <div className="text-lg font-semibold text-white">{stat.rejection_rate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Systems Tab */}
      {activeTab === 'payment-systems' && (
        <div className="space-y-6">
          <PaymentSystemUpload onUploadComplete={loadPaymentSystemData} />

          {paymentTransactions.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-12 border border-slate-600 text-center">
              <Activity className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Henüz Veri Yok</h3>
              <p className="text-slate-400">Ödeme sistemi verilerini yüklemek için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Toplam İşlem</p>
                      <p className="text-2xl font-bold text-white">{overallPaymentStats.totalTransactions}</p>
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
                      <p className="text-2xl font-bold text-white">{formatTime(overallPaymentStats.avgTime)}</p>
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
                      <p className="text-lg font-bold text-green-400 truncate">{overallPaymentStats.fastestSystem}</p>
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
                      <p className="text-lg font-bold text-red-400 truncate">{overallPaymentStats.slowestSystem}</p>
                    </div>
                    <div className="p-3 bg-red-500/20 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-red-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Systems League */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
                <div className="p-6 border-b border-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Ödeme Sistemleri Performans Ligi</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4">
                    {paymentStats.map((stat, index) => (
                      <div
                        key={stat.systemName}
                        className={`p-6 border rounded-lg ${getTimeBgColor(stat.avgProcessingTime, overallPaymentStats.avgTime)}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/50 text-white font-bold">
                              {index + 1}
                            </div>
                            <h4 className="text-lg font-semibold text-white">{stat.systemName}</h4>
                          </div>
                          <div className={`text-2xl font-bold ${getTimeColor(stat.avgProcessingTime, overallPaymentStats.avgTime)}`}>
                            {formatTime(stat.avgProcessingTime)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">İşlem Sayısı</div>
                            <div className="text-lg font-semibold text-white">{stat.transactionCount}</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">En Hızlı</div>
                            <div className="text-lg font-semibold text-green-400">{formatTime(stat.minProcessingTime)}</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">En Yavaş</div>
                            <div className="text-lg font-semibold text-red-400">{formatTime(stat.maxProcessingTime)}</div>
                          </div>
                          <div className="bg-slate-900/30 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">Toplam Süre</div>
                            <div className="text-lg font-semibold text-white">{formatTime(stat.totalProcessingTime)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Excel Export Panel */}
      {showExcelPanel && (
        <ExcelExportPanel onClose={() => setShowExcelPanel(false)} />
      )}
    </div>
  );
}
