import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Brain, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BonusRule } from '../lib/supabase';
import { analyzeAndUpdateBonusRules, parseBonusRuleFromText, calculateMaxWithdrawal } from '../utils/aiBonusRuleEngine';
import type { AICalculatedRule } from '../utils/aiBonusRuleEngine';

export function AIBonusRuleManager() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AICalculatedRule>>({});

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bonus_rules')
        .select('*')
        .order('bonus_name');

      if (error) throw error;
      setRules(data || []);

      // Her kural için AI analizi yap
      const analysis: Record<string, AICalculatedRule> = {};
      (data || []).forEach(rule => {
        const aiRule = parseBonusRuleFromText(rule.bonus_name);
        if (aiRule) {
          analysis[rule.id] = aiRule;
        }
      });
      setAiAnalysis(analysis);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Kurallar yüklenirken hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    setMessage(null);
    try {
      const result = await analyzeAndUpdateBonusRules();
      
      if (result.errors.length > 0) {
        setMessage({
          type: 'error',
          text: `${result.updated} kural güncellendi, ${result.errors.length} hata oluştu`
        });
      } else {
        setMessage({
          type: 'success',
          text: `${result.updated} bonus kuralı başarıyla AI ile analiz edildi ve güncellendi!`
        });
      }

      await loadRules();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Analiz sırasında hata oluştu'
      });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-amber-400';
    return 'text-red-400';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (confidence >= 0.7) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
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
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Bonus Kural Yönetimi</h2>
              <p className="text-sm text-slate-300 mt-1">
                Bonus kurallarını otomatik analiz eder ve hesaplar
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyzeAll}
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Zap className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analiz Ediliyor...' : 'Tüm Kuralları AI ile Analiz Et'}</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
          'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
             message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             <RefreshCw className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => {
          const aiRule = aiAnalysis[rule.id];
          const hasFormula = rule.max_withdrawal_formula && 
                            rule.max_withdrawal_formula !== 'Sınırsız' &&
                            rule.max_withdrawal_formula.trim() !== '';

          return (
            <div
              key={rule.id}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{rule.bonus_name}</h3>
                    {aiRule && (
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getConfidenceBadge(aiRule.confidence)}`}>
                        AI Güven: {(aiRule.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Hesaplama Tipi</div>
                      <div className="text-white font-semibold">
                        {rule.calculation_type === 'unlimited' ? 'Sınırsız' :
                         rule.calculation_type === 'multiplier' ? 'Çarpan' :
                         'Sabit'}
                      </div>
                    </div>
                    
                    {rule.calculation_type === 'multiplier' && (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Çarpan</div>
                        <div className="text-white font-semibold">{rule.multiplier}</div>
                      </div>
                    )}
                    
                    {rule.calculation_type === 'fixed' && (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">Sabit Tutar</div>
                        <div className="text-white font-semibold">{rule.fixed_amount}₺</div>
                      </div>
                    )}
                  </div>

                  {hasFormula ? (
                    <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-400">Formül Tanımlı</span>
                      </div>
                      <code className="text-xs text-green-300 font-mono">{rule.max_withdrawal_formula}</code>
                    </div>
                  ) : (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-400">Formül Tanımlanmamış</span>
                      </div>
                      {aiRule && (
                        <div className="mt-2">
                          <div className="text-xs text-amber-300 mb-1">AI Önerisi:</div>
                          <code className="text-xs text-amber-200 font-mono">{aiRule.formula}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {aiRule && (
                    <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2">AI Analizi</div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <div>Tip: <span className="text-white font-semibold">{aiRule.calculationType}</span></div>
                        {aiRule.multiplier && (
                          <div>Çarpan: <span className="text-white font-semibold">{aiRule.multiplier}</span></div>
                        )}
                        {aiRule.fixedAmount && (
                          <div>Sabit: <span className="text-white font-semibold">{aiRule.fixedAmount}₺</span></div>
                        )}
                        <div>Formül: <code className="text-purple-300">{aiRule.formula}</code></div>
                        <div className={`mt-2 ${getConfidenceColor(aiRule.confidence)}`}>
                          Güven: {(aiRule.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700">
          <Sparkles className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Henüz Bonus Kuralı Yok</h3>
          <p className="text-slate-400">AI analiz edilecek bonus kuralı bulunamadı.</p>
        </div>
      )}
    </div>
  );
}

