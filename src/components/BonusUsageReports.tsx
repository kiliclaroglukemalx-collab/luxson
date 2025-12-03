import { useState, useEffect } from 'react';
import { TrendingUp, Award, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BonusUsageStats {
  bonus_name: string;
  total_usage_count: number;
  total_amount: number;
  avg_amount: number;
  rank: number;
}

export function BonusUsageReports() {
  const [stats, setStats] = useState<BonusUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadBonusStats();
    }
  }, [dateRange]);

  const loadBonusStats = async () => {
    setLoading(true);
    try {
      const { data: bonuses } = await supabase
        .from('bonuses')
        .select('bonus_name, amount, acceptance_date')
        .gte('acceptance_date', dateRange.start)
        .lte('acceptance_date', dateRange.end);

      if (!bonuses) {
        setStats([]);
        return;
      }

      // Bonusları gruplama ve istatistik hesaplama
      const bonusMap = new Map<string, { count: number; total: number }>();

      bonuses.forEach(bonus => {
        const existing = bonusMap.get(bonus.bonus_name) || { count: 0, total: 0 };
        bonusMap.set(bonus.bonus_name, {
          count: existing.count + 1,
          total: existing.total + bonus.amount,
        });
      });

      // İstatistikleri oluştur ve sırala
      const statsArray: BonusUsageStats[] = Array.from(bonusMap.entries()).map(([name, data]) => ({
        bonus_name: name,
        total_usage_count: data.count,
        total_amount: data.total,
        avg_amount: data.total / data.count,
        rank: 0,
      }));

      // Kullanım sayısına göre sırala ve rank ata
      statsArray.sort((a, b) => b.total_usage_count - a.total_usage_count);
      statsArray.forEach((stat, index) => {
        stat.rank = index + 1;
      });

      setStats(statsArray);
    } catch (error) {
      console.error('Error loading bonus stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeagueInfo = (rank: number, total: number) => {
    const percentage = (rank / total) * 100;
    
    if (percentage <= 20) {
      return { name: 'Altın Lig', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: '🏆' };
    } else if (percentage <= 40) {
      return { name: 'Gümüş Lig', color: 'text-slate-300', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', icon: '🥈' };
    } else if (percentage <= 60) {
      return { name: 'Bronz Lig', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: '🥉' };
    } else if (percentage <= 80) {
      return { name: 'Yeşil Lig', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: '🎖️' };
    } else {
      return { name: 'Mavi Lig', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: '🎗️' };
    }
  };

  const totalUsageCount = stats.reduce((sum, s) => sum + s.total_usage_count, 0);
  const totalAmount = stats.reduce((sum, s) => sum + s.total_amount, 0);

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Bonus Kullanım Raporları</h2>
              <p className="text-sm text-slate-300 mt-1">
                En çok tercih edilen bonuslar
              </p>
            </div>
          </div>
          <button
            onClick={loadBonusStats}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Yenile
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/30">
            <div className="text-sm text-blue-300 mb-1">Toplam Bonus Çeşidi</div>
            <div className="text-3xl font-bold text-blue-400">{stats.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
            <div className="text-sm text-green-300 mb-1">Toplam Kullanım</div>
            <div className="text-3xl font-bold text-green-400">{totalUsageCount}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-xl p-6 border border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Toplam Tutar</div>
            <div className="text-3xl font-bold text-amber-400">{totalAmount.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>
      )}

      {/* Bonus League Table */}
      {stats.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-12 border border-slate-600 text-center">
          <Award className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Henüz Veri Yok</h3>
          <p className="text-slate-400">Seçili tarih aralığında bonus kullanımı bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
          <div className="p-6 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Bonus Kullanım Ligi</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {stats.map((stat) => {
                const league = getLeagueInfo(stat.rank, stats.length);
                return (
                  <div
                    key={stat.bonus_name}
                    className={`p-6 border rounded-lg ${league.bgColor} ${league.borderColor}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/50 text-white font-bold text-lg">
                          {stat.rank}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">{stat.bonus_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm font-medium ${league.color}`}>
                              {league.icon} {league.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">{stat.total_usage_count}</div>
                        <div className="text-xs text-slate-400">Kullanım</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-slate-900/30 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Toplam Tutar</div>
                        <div className="text-lg font-semibold text-white">
                          {stat.total_amount.toLocaleString('tr-TR')} ₺
                        </div>
                      </div>
                      <div className="bg-slate-900/30 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Ortalama Tutar</div>
                        <div className="text-lg font-semibold text-white">
                          {stat.avg_amount.toFixed(2)} ₺
                        </div>
                      </div>
                      <div className="bg-slate-900/30 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Kullanım Oranı</div>
                        <div className="text-lg font-semibold text-white">
                          {((stat.total_usage_count / totalUsageCount) * 100).toFixed(1)}%
                        </div>
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
  );
}
