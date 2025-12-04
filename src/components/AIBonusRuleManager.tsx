import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Brain, Zap, Save, Edit2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BonusRule } from '../lib/supabase';
import { loadAIRulePrompts, saveAIRulePrompt, parseRuleFromPrompt } from '../utils/aiBonusRuleEngine';
import type { AIRulePrompt } from '../utils/aiBonusRuleEngine';

export function AIBonusRuleManager() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [aiPrompts, setAiPrompts] = useState<AIRulePrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AIRulePrompt | null>(null);
  const [newPrompt, setNewPrompt] = useState({ bonus_name: '', prompt: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Bonus kurallarını yükle
      const { data: rulesData, error: rulesError } = await supabase
        .from('bonus_rules')
        .select('*')
        .order('bonus_name');

      if (rulesError) throw rulesError;
      setRules(rulesData || []);

      // AI prompt'larını yükle
      const prompts = await loadAIRulePrompts();
      setAiPrompts(prompts);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!newPrompt.bonus_name.trim() || !newPrompt.prompt.trim()) {
      setMessage({ type: 'error', text: 'Bonus adı ve prompt gereklidir!' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      console.log('🔄 Saving prompt...', { bonus_name: newPrompt.bonus_name });
      
      const result = await saveAIRulePrompt({
        id: editingPrompt?.id || crypto.randomUUID(),
        bonus_name: newPrompt.bonus_name.trim(),
        prompt: newPrompt.prompt.trim()
      });

      console.log('📊 Save result:', result);

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: '✅ AI prompt başarıyla kaydedildi!' 
        });
        setNewPrompt({ bonus_name: '', prompt: '' });
        setEditingPrompt(null);
        // Kısa bir gecikme sonra verileri yenile
        setTimeout(async () => {
          await loadData();
        }, 500);
      } else {
        const errorMsg = result.error || 'Bilinmeyen hata';
        console.error('❌ Save failed:', errorMsg);
        setMessage({ 
          type: 'error', 
          text: `❌ Kaydetme hatası: ${errorMsg}. Console'u kontrol edin.` 
        });
      }
    } catch (err) {
      console.error('💥 Exception in handleSavePrompt:', err);
      setMessage({
        type: 'error',
        text: `❌ Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}. Console'u kontrol edin.`
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 8000);
    }
  };

  const handleEditPrompt = (prompt: AIRulePrompt) => {
    setEditingPrompt(prompt);
    setNewPrompt({ bonus_name: prompt.bonus_name, prompt: prompt.prompt });
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setNewPrompt({ bonus_name: '', prompt: '' });
  };

  const getPromptForRule = (ruleName: string): AIRulePrompt | undefined => {
    return aiPrompts.find(p => 
      p.bonus_name === ruleName ||
      ruleName.includes(p.bonus_name) ||
      p.bonus_name.includes(ruleName)
    );
  };

  if (loading && rules.length === 0) {
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
                Her bonus için doğal dil prompt'u ile kural tanımlayın
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
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

      {/* New/Edit Prompt Form */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          {editingPrompt ? 'AI Prompt Düzenle' : 'Yeni AI Prompt Ekle'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Bonus Adı
            </label>
            <input
              type="text"
              value={newPrompt.bonus_name}
              onChange={(e) => setNewPrompt({ ...newPrompt, bonus_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Örn: %25 Spor Kayıp Bonusu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              AI Prompt (Doğal Dil Kural Açıklaması)
            </label>
            <textarea
              value={newPrompt.prompt}
              onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[120px]"
              placeholder="Örn: Bu bonus sınırsız çekim sağlar. Herhangi bir limit yoktur."
            />
            <div className="mt-2 text-xs text-slate-400 bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
              <p className="font-semibold text-blue-400 mb-1">💡 Prompt Örnekleri:</p>
              <ul className="space-y-1 text-blue-300">
                <li>• "Sınırsız çekim - limit yok"</li>
                <li>• "Yatırım miktarının 50 katı çekilebilir"</li>
                <li>• "Bonus miktarının 20 katı çekilebilir"</li>
                <li>• "Yatırım + 500₺ çekilebilir"</li>
                <li>• "Yatırım ve bonus toplamının 10 katı çekilebilir"</li>
              </ul>
            </div>
          </div>

          {newPrompt.prompt && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">AI Analiz Önizleme:</div>
              {(() => {
                const parsed = parseRuleFromPrompt(newPrompt.prompt);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="text-white">
                      <span className="text-slate-400">Tip:</span> {parsed.calculationType}
                    </div>
                    {parsed.multiplier && (
                      <div className="text-white">
                        <span className="text-slate-400">Çarpan:</span> {parsed.multiplier}
                      </div>
                    )}
                    {parsed.fixedAmount && (
                      <div className="text-white">
                        <span className="text-slate-400">Sabit Tutar:</span> {parsed.fixedAmount}₺
                      </div>
                    )}
                    <div className="text-white">
                      <span className="text-slate-400">Formül:</span> <code className="text-purple-300">{parsed.formula}</code>
                    </div>
                    <div className="text-white">
                      <span className="text-slate-400">Güven:</span> <span className={parsed.confidence > 0.8 ? 'text-green-400' : 'text-amber-400'}>{(parsed.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-slate-300 text-xs mt-2">
                      <span className="text-slate-400">Mantık:</span> {parsed.reasoning}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSavePrompt}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Kaydediliyor...' : (editingPrompt ? 'Güncelle' : 'Kaydet')}</span>
            </button>
            {editingPrompt && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>İptal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules List with AI Prompts */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Bonus Kuralları ve AI Prompt'ları
        </h3>

        {rules.map((rule) => {
          const aiPrompt = getPromptForRule(rule.bonus_name);
          const parsed = aiPrompt ? parseRuleFromPrompt(aiPrompt.prompt) : null;

          return (
            <div
              key={rule.id}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-bold text-white">{rule.bonus_name}</h4>
                    {aiPrompt ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        AI Prompt Tanımlı
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        AI Prompt Yok
                      </span>
                    )}
                  </div>

                  {aiPrompt ? (
                    <div className="space-y-3">
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="text-xs text-slate-400 mb-2">AI Prompt:</div>
                        <div className="text-white text-sm mb-3">{aiPrompt.prompt}</div>
                        {parsed && (
                          <div className="space-y-1 text-xs">
                            <div className="text-slate-300">
                              <span className="text-slate-400">Formül:</span> <code className="text-purple-300">{parsed.formula}</code>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Güven:</span> <span className={parsed.confidence > 0.8 ? 'text-green-400' : 'text-amber-400'}>{(parsed.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Mantık:</span> {parsed.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditPrompt(aiPrompt)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Düzenle</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="text-sm text-amber-400 mb-2">
                        Bu bonus için AI prompt tanımlanmamış. Yukarıdaki formdan ekleyebilirsiniz.
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
          <p className="text-slate-400">AI prompt tanımlanacak bonus kuralı bulunamadı.</p>
        </div>
      )}
    </div>
  );
}
