import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AnalysisResult } from '../utils/matchingEngine';
import { matchBonusesToDeposits, analyzeWithdrawals } from '../utils/matchingEngine';

interface DashboardProps {
  refreshTrigger: number;
}

export function Dashboard({ refreshTrigger }: DashboardProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [stats, setStats] = useState({
    totalWithdrawals: 0,
    overpayments: 0,
    totalOverpaid: 0,
    avgProcessingTime: 0,
    staffErrors: {} as Record<string, { count: number; amount: number }>
  });

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      // First match bonuses to deposits
      await matchBonusesToDeposits();

      // Then analyze withdrawals
      const analysisResults = await analyzeWithdrawals();
      setResults(analysisResults);

      // Calculate statistics
      const overpayments = analysisResults.filter(r => r.isOverpayment);
      const totalOverpaid = overpayments.reduce((sum, r) => sum + r.overpaymentAmount, 0);
      const avgTime = analysisResults.reduce((sum, r) => sum + r.processingTimeMinutes, 0) / analysisResults.length;

      // Group errors by staff
      const staffErrors: Record<string, { count: number; amount: number }> = {};
      overpayments.forEach(r => {
        const staff = r.withdrawal.staff_name;
        if (!staffErrors[staff]) {
          staffErrors[staff] = { count: 0, amount: 0 };
        }
        staffErrors[staff].count++;
        staffErrors[staff].amount += r.overpaymentAmount;
      });

      setStats({
        totalWithdrawals: analysisResults.length,
        overpayments: overpayments.length,
        totalOverpaid,
        avgProcessingTime: avgTime || 0,
        staffErrors
      });
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}s ${mins}dk`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Çekim</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalWithdrawals}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hatalı Ödeme</p>
              <p className="text-2xl font-bold text-red-600">{stats.overpayments}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Fazla Ödeme</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverpaid)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ort. İşlem Süresi</p>
              <p className="text-2xl font-bold text-gray-800">{formatTime(stats.avgProcessingTime)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Staff Errors */}
      {Object.keys(stats.staffErrors).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Personel Bazlı Hatalar</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(stats.staffErrors)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([staff, data]) => (
                  <div key={staff} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{staff}</p>
                      <p className="text-sm text-gray-600">{data.count} hatalı işlem</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{formatCurrency(data.amount)}</p>
                      <p className="text-sm text-gray-600">fazla ödeme</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Detaylı Çekim Analizi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Müşteri ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Personel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Bonus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Yatırım
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Max İzin
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Ödenen
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Fark
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Süre
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr
                  key={index}
                  className={result.isOverpayment ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {result.withdrawal.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {result.withdrawal.staff_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {result.bonus?.bonus_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-800">
                    {result.deposit ? formatCurrency(result.deposit.amount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-800">
                    {result.maxAllowed === Infinity ? '∞' : formatCurrency(result.maxAllowed)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-800">
                    {formatCurrency(result.withdrawal.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {result.isOverpayment ? (
                      <span className="text-red-600 font-bold">
                        +{formatCurrency(result.overpaymentAmount)}
                      </span>
                    ) : (
                      <span className="text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
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
