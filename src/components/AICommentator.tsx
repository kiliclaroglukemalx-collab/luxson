import { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertCircle, CheckCircle, Info, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateAIComments, type AIComment, type AnalysisData } from '../utils/aiCommentator';

export function AICommentator() {
  const [comments, setComments] = useState<AIComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    setLoading(true);
    try {
      // Verileri topla
      const analysisData = await collectAnalysisData();
      
      // AI yorumları üret
      const aiComments = await generateAIComments(analysisData);
      setComments(aiComments);
    } catch (error) {
      console.error('AI yorumları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectAnalysisData = async (): Promise<AnalysisData> => {
    const data: AnalysisData = {};

    try {
      // Bonus verileri
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

      // Çalışan verileri
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

        // Score hesaplama (basit bir örnek)
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
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
          <span>AI analiz yapıyor...</span>
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return null; // Gizli - yorum yoksa gösterilmez
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/30 shadow-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Sistem Yorumları
            </h3>
            <p className="text-sm text-slate-400">{comments.length} analiz tamamlandı</p>
          </div>
        </div>
        <TrendingUp className={`w-5 h-5 text-purple-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-purple-500/30">
          {comments.map((comment, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getBgColor(comment.type)}`}
            >
              <div className="flex items-start gap-3 mb-2">
                {getIcon(comment.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{comment.title}</h4>
                  <p className="text-sm text-slate-300 mb-3">{comment.message}</p>
                  
                  {comment.insights.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Bulgular:</p>
                      <ul className="space-y-1">
                        {comment.insights.map((insight, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comment.recommendations && comment.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-400 mb-2">Öneriler:</p>
                      <ul className="space-y-1">
                        {comment.recommendations.map((rec, i) => (
                          <li key={i} className="text-xs text-amber-300 flex items-start gap-2">
                            <span className="text-amber-500 mt-1">→</span>
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

          <button
            onClick={loadComments}
            className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-semibold"
          >
            Analizi Yenile
          </button>
        </div>
      )}
    </div>
  );
}

