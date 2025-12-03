import { useState, useEffect } from 'react';
import { TrendingUp, Users, CreditCard, RefreshCw, Award, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  id: string;
  payment_system: string;
  week_start_date: string;
  total_transactions: number;
  total_amount: number;
  avg_amount: number;
  success_count: number;
  success_rate: number;
  avg_processing_time: number;
  performance_score: number;
}

export default function WeeklyDashboard() {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentSystemStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadStats();

    const employeeStatsChannel = supabase
      .channel('weekly-employee-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_employee_stats' }, () => {
        loadStats();
      })
      .subscribe();

    const paymentStatsChannel = supabase
      .channel('weekly-payment-system-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_payment_system_stats' }, () => {
        loadStats();
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

  async function loadStats() {
    setLoading(true);
    try {
      const weekStart = getWeekStartDate();

      const [employeeRes, paymentRes] = await Promise.all([
        supabase
          .from('weekly_employee_stats')
          .select('*')
          .eq('week_start_date', weekStart)
          .order('performance_score', { ascending: false }),
        supabase
          .from('weekly_payment_system_stats')
          .select('*')
          .eq('week_start_date', weekStart)
          .order('performance_score', { ascending: false }),
      ]);

      if (employeeRes.data) {
        const employeeIds = employeeRes.data.map(s => s.employee_id);
        if (employeeIds.length > 0) {
          const { data: employees } = await supabase
            .from('employees')
            .select('id, name')
            .in('id', employeeIds);

          const enriched = employeeRes.data.map(stat => ({
            ...stat,
            employee_name: employees?.find(e => e.id === stat.employee_id)?.name || 'Bilinmeyen',
          }));

          setEmployeeStats(enriched);
        }
      }

      if (paymentRes.data) {
        setPaymentStats(paymentRes.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function calculateStats() {
    setCalculating(true);
    try {
      const weekStart = getWeekStartDate();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .gte('created_at', weekStart)
        .lt('created_at', weekEndStr);

      const { data: paymentTransactions } = await supabase
        .from('payment_system_transactions')
        .select('*')
        .gte('transaction_date', weekStart)
        .lt('transaction_date', weekEndStr);

      if (withdrawals && withdrawals.length > 0) {
        await calculateEmployeeStats(withdrawals, weekStart);
      }

      if (paymentTransactions && paymentTransactions.length > 0) {
        await calculatePaymentSystemStats(paymentTransactions, weekStart);
      }

      await loadStats();
      alert('İstatistikler başarıyla güncellendi!');
    } catch (error) {
      console.error('Error calculating stats:', error);
      alert('İstatistik hesaplama sırasında hata oluştu.');
    } finally {
      setCalculating(false);
    }
  }

  async function calculateEmployeeStats(withdrawals: any[], weekStart: string) {
    const employeeMap = new Map<string, any>();

    for (const w of withdrawals) {
      if (!w.personel || !w.personel.trim()) continue;

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .ilike('name', w.personel.trim())
        .maybeSingle();

      if (!employee) continue;

      if (!employeeMap.has(employee.id)) {
        employeeMap.set(employee.id, {
          total_withdrawals: 0,
          total_amount: 0,
          rejection_count: 0,
          processing_times: [],
        });
      }

      const stats = employeeMap.get(employee.id);
      stats.total_withdrawals++;
      stats.total_amount += parseFloat(w.tutar || 0);

      if (w.red_nedeni && w.red_nedeni.trim()) {
        stats.rejection_count++;
      }

      if (w.completed_at && w.created_at) {
        const created = new Date(w.created_at);
        const completed = new Date(w.completed_at);
        const timeInMinutes = (completed.getTime() - created.getTime()) / (1000 * 60);
        if (timeInMinutes > 0) {
          stats.processing_times.push(timeInMinutes);
        }
      }
    }

    for (const [employeeId, stats] of employeeMap) {
      const avgProcessingTime =
        stats.processing_times.length > 0
          ? stats.processing_times.reduce((a: number, b: number) => a + b, 0) / stats.processing_times.length
          : 0;

      const rejectionRate =
        stats.total_withdrawals > 0 ? (stats.rejection_count / stats.total_withdrawals) * 100 : 0;

      const performanceScore = calculateEmployeeScore({
        total_withdrawals: stats.total_withdrawals,
        rejection_rate: rejectionRate,
        avg_processing_time: avgProcessingTime,
      });

      await supabase.from('weekly_employee_stats').upsert(
        {
          employee_id: employeeId,
          week_start_date: weekStart,
          total_withdrawals: stats.total_withdrawals,
          total_amount: stats.total_amount,
          avg_processing_time: avgProcessingTime,
          rejection_count: stats.rejection_count,
          rejection_rate: rejectionRate,
          performance_score: performanceScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,week_start_date' }
      );
    }
  }

  async function calculatePaymentSystemStats(transactions: any[], weekStart: string) {
    const systemMap = new Map<string, any>();

    for (const t of transactions) {
      const system = t.payment_system || 'Bilinmeyen';

      if (!systemMap.has(system)) {
        systemMap.set(system, {
          total_transactions: 0,
          total_amount: 0,
          success_count: 0,
          processing_times: [],
        });
      }

      const stats = systemMap.get(system);
      stats.total_transactions++;
      stats.total_amount += parseFloat(t.amount || 0);

      if (t.status === 'completed' || t.status === 'success') {
        stats.success_count++;
      }

      if (t.processing_time_minutes) {
        stats.processing_times.push(parseFloat(t.processing_time_minutes));
      }
    }

    for (const [system, stats] of systemMap) {
      const avgAmount = stats.total_transactions > 0 ? stats.total_amount / stats.total_transactions : 0;

      const successRate =
        stats.total_transactions > 0 ? (stats.success_count / stats.total_transactions) * 100 : 0;

      const avgProcessingTime =
        stats.processing_times.length > 0
          ? stats.processing_times.reduce((a: number, b: number) => a + b, 0) / stats.processing_times.length
          : 0;

      const performanceScore = calculatePaymentSystemScore({
        success_rate: successRate,
        avg_processing_time: avgProcessingTime,
        total_transactions: stats.total_transactions,
      });

      await supabase.from('weekly_payment_system_stats').upsert(
        {
          payment_system: system,
          week_start_date: weekStart,
          total_transactions: stats.total_transactions,
          total_amount: stats.total_amount,
          avg_amount: avgAmount,
          success_count: stats.success_count,
          success_rate: successRate,
          avg_processing_time: avgProcessingTime,
          performance_score: performanceScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'payment_system,week_start_date' }
      );
    }
  }

  function calculateEmployeeScore(data: {
    total_withdrawals: number;
    rejection_rate: number;
    avg_processing_time: number;
  }): number {
    let score = 5.0;

    if (data.total_withdrawals > 100) score += 2.0;
    else if (data.total_withdrawals > 50) score += 1.5;
    else if (data.total_withdrawals > 20) score += 1.0;
    else if (data.total_withdrawals > 10) score += 0.5;

    if (data.rejection_rate < 2) score += 2.0;
    else if (data.rejection_rate < 5) score += 1.5;
    else if (data.rejection_rate < 10) score += 0.5;
    else if (data.rejection_rate > 20) score -= 2.0;
    else if (data.rejection_rate > 15) score -= 1.0;

    if (data.avg_processing_time > 0) {
      if (data.avg_processing_time < 5) score += 1.0;
      else if (data.avg_processing_time < 10) score += 0.5;
      else if (data.avg_processing_time > 30) score -= 1.0;
      else if (data.avg_processing_time > 60) score -= 2.0;
    }

    return Math.max(1, Math.min(10, score));
  }

  function calculatePaymentSystemScore(data: {
    success_rate: number;
    avg_processing_time: number;
    total_transactions: number;
  }): number {
    let score = 5.0;

    if (data.success_rate > 98) score += 2.5;
    else if (data.success_rate > 95) score += 2.0;
    else if (data.success_rate > 90) score += 1.0;
    else if (data.success_rate < 70) score -= 2.0;
    else if (data.success_rate < 80) score -= 1.0;

    if (data.avg_processing_time > 0) {
      if (data.avg_processing_time < 2) score += 1.5;
      else if (data.avg_processing_time < 5) score += 1.0;
      else if (data.avg_processing_time < 10) score += 0.5;
      else if (data.avg_processing_time > 20) score -= 1.0;
      else if (data.avg_processing_time > 30) score -= 2.0;
    }

    if (data.total_transactions > 500) score += 1.0;
    else if (data.total_transactions > 200) score += 0.5;

    return Math.max(1, Math.min(10, score));
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  }

  function getScoreLabel(score: number): string {
    if (score >= 9) return 'Mükemmel';
    if (score >= 8) return 'Çok İyi';
    if (score >= 7) return 'İyi';
    if (score >= 6) return 'Orta';
    if (score >= 5) return 'Vasat';
    return 'Zayıf';
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Haftalık Performans Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(getWeekStartDate()).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
              })}{' '}
              -{' '}
              {new Date(
                new Date(getWeekStartDate()).getTime() + 6 * 24 * 60 * 60 * 1000
              ).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={calculateStats}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Hesaplanıyor...' : 'İstatistikleri Güncelle'}
          </button>
        </div>
      </div>

      {employeeStats.length === 0 && paymentStats.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Henüz İstatistik Yok</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Bu hafta için henüz istatistik hesaplanmamış. Yukarıdaki "İstatistikleri Güncelle" butonuna
                tıklayarak haftalık verileri hesaplayabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {employeeStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personel Performansı</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Personel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Toplam İşlem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Toplam Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Red Oranı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ort. İşlem Süresi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeeStats.map((stat, index) => (
                  <tr key={stat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                        <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{stat.employee_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{stat.total_withdrawals}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {stat.total_amount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm ${
                          stat.rejection_rate < 5
                            ? 'text-green-600'
                            : stat.rejection_rate < 10
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        %{stat.rejection_rate.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {stat.avg_processing_time > 0
                          ? `${stat.avg_processing_time.toFixed(1)} dk`
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(
                            stat.performance_score
                          )}`}
                        >
                          {stat.performance_score.toFixed(1)}/10
                        </span>
                        <span className="text-xs text-gray-500">{getScoreLabel(stat.performance_score)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paymentStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Ödeme Sistemleri Performansı</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sistem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Toplam İşlem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Toplam Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Başarı Oranı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ort. İşlem Süresi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentStats.map((stat, index) => (
                  <tr key={stat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                        <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{stat.payment_system}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{stat.total_transactions}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {stat.total_amount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm ${
                          stat.success_rate >= 95
                            ? 'text-green-600'
                            : stat.success_rate >= 85
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        %{stat.success_rate.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {stat.avg_processing_time > 0
                          ? `${stat.avg_processing_time.toFixed(1)} dk`
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(
                            stat.performance_score
                          )}`}
                        >
                          {stat.performance_score.toFixed(1)}/10
                        </span>
                        <span className="text-xs text-gray-500">
                          {getScoreLabel(stat.performance_score)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Puanlama Sistemi Hakkında</h3>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Personel Puanları:</strong> İşlem sayısı, red oranı ve ortalama işlem süresine göre 1-10
              arasında hesaplanır. Yüksek işlem hacmi (+), düşük red oranı (+) ve hızlı işlem süresi (+) puanı
              artırır.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Ödeme Sistemi Puanları:</strong> Başarı oranı, işlem süresi ve işlem hacmine göre
              hesaplanır. %95+ başarı oranı (+), hızlı işlem süresi (+) ve yüksek işlem hacmi (+) puanı
              artırır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
