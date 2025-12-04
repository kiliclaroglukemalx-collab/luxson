import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generatePageSpecificComments, type AIComment, type AnalysisData } from '../utils/aiCommentator';

interface AICommentatorProps {
  pageType?: 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel' | 'withdrawal-errors' | 'bonus-report' | 'btag-report';
}

export function AICommentator({ pageType }: AICommentatorProps) {
  const [comments, setComments] = useState<AIComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pageType) {
      loadComments();
    }
  }, [pageType]);

  const loadComments = async () => {
    if (!pageType) return;
    
    setLoading(true);
    try {
      // Sayfa tipine göre verileri topla
      const analysisData = await collectAnalysisDataForPage(pageType);
      
      // Sayfa tipine özel yorumlar üret
      const aiComments = await generatePageSpecificComments(pageType, analysisData);
      setComments(aiComments);
    } catch (error) {
      console.error('Sistem yorumları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectAnalysisDataForPage = async (page: string): Promise<AnalysisData> => {
    const data: AnalysisData = {};

    try {
      // Sayfa tipine göre sadece gerekli verileri topla
      if (page === 'bonus-report') {
        // Sadece bonus verileri
        const { data: bonuses } = await supabase
          .from('bonuses')
          .select('*');

        if (bonuses) {
          const byType: Record<string, { count: number; amount: number }> = {};
          bonuses.forEach(b => {
            if (!byType[b.bonus_name]) {
              byType[b.bonus_name] = { count: 0, amount: 0 };
            }
            byType[b.bonus_name].count++;
            byType[b.bonus_name].amount += b.amount;
          });

          data.bonuses = {
            total: bonuses.length,
            totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
            uniqueCustomers: new Set(bonuses.map(b => b.customer_id)).size,
            byType
          };
        }
        return data;
      }

      if (page === 'withdrawal-errors' || page === 'btag-report') {
        // Bonus ve çekim verileri
        const { data: bonuses } = await supabase
          .from('bonuses')
          .select('*');

        if (bonuses) {
          const byType: Record<string, { count: number; amount: number }> = {};
          bonuses.forEach(b => {
            if (!byType[b.bonus_name]) {
              byType[b.bonus_name] = { count: 0, amount: 0 };
            }
            byType[b.bonus_name].count++;
            byType[b.bonus_name].amount += b.amount;
          });

          data.bonuses = {
            total: bonuses.length,
            totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
            uniqueCustomers: new Set(bonuses.map(b => b.customer_id)).size,
            byType
          };
        }

        // Çekim verileri
        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('*, bonuses(bonus_name)');

        if (withdrawals) {
          const byBonus: Record<string, { count: number; amount: number }> = {};
          let overpayments = 0;
          let overpaymentAmount = 0;

          withdrawals.forEach(w => {
            const bonusName = (w.bonuses as any)?.bonus_name || 'Bonussuz';
            if (!byBonus[bonusName]) {
              byBonus[bonusName] = { count: 0, amount: 0 };
            }
            byBonus[bonusName].count++;
            byBonus[bonusName].amount += w.amount;

            if (w.is_overpayment) {
              overpayments++;
              overpaymentAmount += w.overpayment_amount || 0;
            }
          });

          data.withdrawals = {
            total: withdrawals.length,
            totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
            byBonus,
            averageAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0) / withdrawals.length,
            overpayments,
            overpaymentAmount
          };
        }
        return data;
      }

      if (page === 'performance') {
        // Çalışan ve call personel verileri
        const { data: employeeStats } = await supabase
          .from('weekly_employee_stats')
          .select('*, employees(name)')
          .order('avg_processing_time');

        if (employeeStats && employeeStats.length > 0) {
          const rejectionRates: Record<string, number> = {};
          const processingTimes: Array<{ name: string; time: number }> = [];

          employeeStats.forEach(stat => {
            const employeeName = (stat.employees as any)?.name || 'Bilinmeyen';
            rejectionRates[employeeName] = stat.rejection_rate || 0;
            processingTimes.push({
              name: employeeName,
              time: stat.avg_processing_time || 0
            });
          });

          const sortedByTime = [...processingTimes].sort((a, b) => a.time - b.time);
          const avgTime = processingTimes.reduce((sum, p) => sum + p.time, 0) / processingTimes.length;

          data.employees = {
            total: employeeStats.length,
            averageProcessingTime: avgTime,
            fastest: sortedByTime[0] || { name: 'N/A', time: 0 },
            slowest: sortedByTime[sortedByTime.length - 1] || { name: 'N/A', time: 0 },
            rejectionRates
          };
        }

        // Call personel verileri
        const { data: weeklyReports } = await supabase
          .from('personel_weekly_reports')
          .select('*, personel_employees(name)');

        if (weeklyReports) {
          const conversionRates: Record<string, number> = {};
          const weeklyTotals: Record<string, number> = {};
          const scores: Array<{ name: string; score: number }> = [];

          weeklyReports.forEach(report => {
            const employeeName = (report.personel_employees as any)?.name || 'Bilinmeyen';
            const conversion = report.player_count && report.total_members 
              ? (report.player_count / report.total_members) * 100 
              : 0;
            
            conversionRates[employeeName] = conversion;
            
            const weekKey = new Date(report.week_start_date).toISOString().split('T')[0];
            weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + (report.total_amount || 0);
          });

          Object.entries(conversionRates).forEach(([name, rate]) => {
            scores.push({ name, score: rate });
          });

          data.callPersonnel = {
            total: Object.keys(conversionRates).length,
            topPerformers: scores.sort((a, b) => b.score - a.score).slice(0, 5),
            conversionRates,
            weeklyTotals
          };
        }
        return data;
      }

      if (page === 'rules') {
        // Bonus kuralları için veri gerekmez
        return {};
      }

      // Diğer sayfalar için genel analiz
      const { data: bonuses } = await supabase
        .from('bonuses')
        .select('*');

      if (bonuses) {
        const byType: Record<string, { count: number; amount: number }> = {};
        bonuses.forEach(b => {
          if (!byType[b.bonus_name]) {
            byType[b.bonus_name] = { count: 0, amount: 0 };
          }
          byType[b.bonus_name].count++;
          byType[b.bonus_name].amount += b.amount;
        });

        data.bonuses = {
          total: bonuses.length,
          totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
          uniqueCustomers: new Set(bonuses.map(b => b.customer_id)).size,
          byType
        };
      }
    } catch (error) {
      console.error('Veri toplama hatası:', error);
    }

    return data;
  };

  const getIcon = (type: AIComment['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: AIComment['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
          <span>Sistem analiz ediliyor...</span>
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return null; // Yorum yoksa gösterilmez
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 rounded-lg border border-slate-600 shadow-md mb-6">
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700/50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Sistem Yorumları</h3>
            <p className="text-xs text-slate-400">{comments.length} analiz</p>
          </div>
        </div>
        <button
          onClick={loadComments}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {comments.map((comment, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getBgColor(comment.type)}`}
          >
            <div className="flex items-start gap-2 mb-2">
              {getIcon(comment.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-white text-sm mb-1">{comment.title}</h4>
                <p className="text-xs text-slate-300 mb-2">{comment.message}</p>
                
                {comment.insights.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Bulgular:</p>
                    <ul className="space-y-1">
                      {comment.insights.map((insight, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-slate-500 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {comment.recommendations && comment.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">Öneriler:</p>
                    <ul className="space-y-1">
                      {comment.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-amber-300 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

