import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Edit2, X, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BonusRule } from '../lib/supabase';
import { parseNaturalLanguageFormula } from '../utils/formulaParser';

export function BonusRulesManager() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BonusRule>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formulaType, setFormulaType] = useState<'none' | 'bonus' | 'deposit' | 'deposit_bonus'>('none');
  const [formulaMultiplier, setFormulaMultiplier] = useState<number>(5);

  useEffect(() => {
    loadRules();

    const rulesChannel = supabase
      .channel('bonus-rules-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_rules' }, () => {
        loadRules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rulesChannel);
    };
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
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (rule: BonusRule) => {
    setEditingId(rule.id);
    setEditForm(rule);
    setAddingNew(false);
    
    // Mevcut formülü parse et
    const formula = rule.max_withdrawal_formula || '';
    if (formula.includes('bonus *') && !formula.includes('deposit')) {
      const match = formula.match(/bonus \* (\d+)/);
      if (match) {
        setFormulaType('bonus');
        setFormulaMultiplier(parseInt(match[1]));
      }
    } else if (formula.includes('deposit *') && !formula.includes('bonus')) {
      const match = formula.match(/deposit \* (\d+)/);
      if (match) {
        setFormulaType('deposit');
        setFormulaMultiplier(parseInt(match[1]));
      }
    } else if (formula.includes('(deposit + bonus) *')) {
      const match = formula.match(/\(deposit \+ bonus\) \* (\d+)/);
      if (match) {
        setFormulaType('deposit_bonus');
        setFormulaMultiplier(parseInt(match[1]));
      }
    } else {
      setFormulaType('none');
      setFormulaMultiplier(5);
    }
  };

  const startAdd = () => {
    setAddingNew(true);
    setEditingId(null);
    setEditForm({
      bonus_name: '',
      calculation_type: 'unlimited',
      multiplier: 0,
      fixed_amount: 0,
      max_withdrawal_formula: ''
    });
    setFormulaType('none');
    setFormulaMultiplier(5);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setEditForm({});
    setFormulaType('none');
    setFormulaMultiplier(5);
  };

  const saveRule = async () => {
    try {
      // Validasyon
      if (!editForm.bonus_name || editForm.bonus_name.trim() === '') {
        setMessage({ type: 'error', text: 'Bonus adı gereklidir!' });
        return;
      }

      // Formül oluştur
      let finalFormula = '';
      
      // Önce seçimli formülü kontrol et
      if (formulaType !== 'none' && formulaMultiplier > 0) {
        switch (formulaType) {
          case 'bonus':
            finalFormula = `bonus * ${formulaMultiplier}`;
            break;
          case 'deposit':
            finalFormula = `deposit * ${formulaMultiplier}`;
            break;
          case 'deposit_bonus':
            finalFormula = `(deposit + bonus) * ${formulaMultiplier}`;
            break;
        }
      }
      
      // Eğer manuel formül varsa ve doğal dil içeriyorsa parse et
      const manualFormula = editForm.max_withdrawal_formula?.trim() || '';
      if (manualFormula && !finalFormula) {
        // Doğal dil mi kontrol et
        const parsed = parseNaturalLanguageFormula(manualFormula);
        if (parsed && parsed.confidence > 0.5) {
          finalFormula = parsed.formula;
          console.log('Doğal dil formülü parse edildi:', parsed);
        } else {
          // Zaten matematiksel formül ise direkt kullan
          finalFormula = manualFormula;
        }
      }

      // Database'de max_withdrawal_formula NOT NULL olduğu için boş string yerine 'Sınırsız' gönderiyoruz
      const ruleToSave: any = {
        bonus_name: editForm.bonus_name?.trim(),
        calculation_type: editForm.calculation_type || 'unlimited',
        multiplier: editForm.multiplier || 0,
        fixed_amount: editForm.fixed_amount || 0,
        max_withdrawal_formula: finalFormula || 'Sınırsız'
      };

      // Undefined değerleri temizle
      Object.keys(ruleToSave).forEach(key => {
        if (ruleToSave[key] === undefined) {
          delete ruleToSave[key];
        }
      });

      console.log('Kaydedilecek kural:', ruleToSave);
      console.log('Adding new:', addingNew);
      console.log('Editing ID:', editingId);

      if (addingNew) {
        const { data, error } = await supabase
          .from('bonus_rules')
          .insert([ruleToSave])
          .select();

        if (error) {
          console.error('Insert error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          console.error('Rule data:', ruleToSave);
          setMessage({ 
            type: 'error', 
            text: `Kaydetme hatası: ${error.message}. Console'u kontrol edin.` 
          });
          return;
        }
        setMessage({ type: 'success', text: 'Yeni bonus kuralı eklendi' });
      } else if (editingId) {
        const { data, error } = await supabase
          .from('bonus_rules')
          .update(ruleToSave)
          .eq('id', editingId)
          .select();

        if (error) {
          console.error('Update error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          console.error('Rule data:', ruleToSave);
          console.error('Editing ID:', editingId);
          setMessage({ 
            type: 'error', 
            text: `Güncelleme hatası: ${error.message}. Console'u kontrol edin.` 
          });
          return;
        }
        setMessage({ type: 'success', text: 'Bonus kuralı güncellendi' });
      } else {
        setMessage({ type: 'error', text: 'Kaydetme durumu belirlenemedi!' });
        return;
      }

      await loadRules();
      cancelEdit();
      setFormulaType('none');
      setFormulaMultiplier(5);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Kaydetme hatası'
      });
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Bu bonus kuralını silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('bonus_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Bonus kuralı silindi' });
      await loadRules();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Silme hatası'
      });
    }
  };

  const renderEditForm = () => (
    <div className="bg-gradient-to-br from-slate-700 to-slate-600 p-4 rounded-xl space-y-4 border-2 border-amber-500/50">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Bonus Adı
        </label>
        <input
          type="text"
          value={editForm.bonus_name || ''}
          onChange={(e) => setEditForm({ ...editForm, bonus_name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="Örn: %25 Spor Kayıp Bonusu"
        />
        <div className="text-xs text-slate-400 bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
          <p className="font-semibold text-blue-400 mb-1">💡 Esnek Eşleştirme</p>
          <p>Dosyalardaki bonus isimleri bu ismi <span className="text-blue-300 font-semibold">içeriyorsa</span> otomatik eşleşir.</p>
          <p className="mt-2">
            <span className="text-green-400">Örnek:</span> "Hoş Geldin" kuralı → "Hoş Geldin Bonusu", "Yeni Hoş Geldin" ile eşleşir
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Hesaplama Tipi
        </label>
        <select
          value={editForm.calculation_type || 'unlimited'}
          onChange={(e) => setEditForm({
            ...editForm,
            calculation_type: e.target.value as 'fixed' | 'multiplier' | 'unlimited'
          })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="unlimited">Sınırsız</option>
          <option value="multiplier">Çarpan</option>
          <option value="fixed">Sabit Tutar</option>
        </select>
      </div>

      {editForm.calculation_type === 'multiplier' && (
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Çarpan (örn: 20 = Bonus × 20)
          </label>
          <input
            type="number"
            value={editForm.multiplier || 0}
            onChange={(e) => setEditForm({ ...editForm, multiplier: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      )}

      {editForm.calculation_type === 'fixed' && (
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Sabit Tutar (₺)
          </label>
          <input
            type="number"
            value={editForm.fixed_amount || 0}
            onChange={(e) => setEditForm({ ...editForm, fixed_amount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Gelişmiş Formül (Opsiyonel)
        </label>
        
        {/* Formül Tipi Seçimi */}
        <div className="space-y-3">
          <select
            value={formulaType}
            onChange={(e) => {
              setFormulaType(e.target.value as typeof formulaType);
              if (e.target.value === 'none') {
                setEditForm({ ...editForm, max_withdrawal_formula: '' });
              }
            }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="none">Formül Kullanma</option>
            <option value="bonus">Bonus Kaç Katı</option>
            <option value="deposit">Yatırımın Kaç Katı</option>
            <option value="deposit_bonus">Bonus + Anapara Kaç Katı</option>
          </select>

          {/* Çarpan Seçimi */}
          {formulaType !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Çarpan Seçimi
              </label>
              <div className="grid grid-cols-8 gap-2">
                {[2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 120, 150, 200].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setFormulaMultiplier(mult)}
                    className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                      formulaMultiplier === mult
                        ? 'bg-amber-500 text-white shadow-lg scale-105'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={formulaMultiplier}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setFormulaMultiplier(val);
                  }}
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="text-sm text-slate-400">(Manuel değer girebilirsiniz)</span>
              </div>
            </div>
          )}

          {/* Önizleme */}
          {formulaType !== 'none' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-300 mb-1">Formül Önizleme:</p>
              <code className="text-amber-400 font-mono text-sm">
                {formulaType === 'bonus' && `bonus * ${formulaMultiplier}`}
                {formulaType === 'deposit' && `deposit * ${formulaMultiplier}`}
                {formulaType === 'deposit_bonus' && `(deposit + bonus) * ${formulaMultiplier}`}
              </code>
              <p className="text-xs text-slate-400 mt-2">
                {formulaType === 'bonus' && `Maksimum çekim: Bonus miktarının ${formulaMultiplier} katı`}
                {formulaType === 'deposit' && `Maksimum çekim: Yatırım miktarının ${formulaMultiplier} katı`}
                {formulaType === 'deposit_bonus' && `Maksimum çekim: (Yatırım + Bonus) miktarının ${formulaMultiplier} katı`}
              </p>
            </div>
          )}

          {/* Manuel Formül Girişi (Gelişmiş) */}
          <details className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <summary className="cursor-pointer text-sm text-amber-400 hover:text-amber-300 font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gelişmiş: Manuel Formül veya Doğal Dil Yorumu
            </summary>
            <textarea
              value={editForm.max_withdrawal_formula || ''}
              onChange={(e) => {
                setEditForm({ ...editForm, max_withdrawal_formula: e.target.value });
                if (e.target.value) {
                  setFormulaType('none');
                }
              }}
              className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm min-h-[100px]"
              placeholder="Matematiksel formül: deposit * 3 + bonus * 20&#10;veya doğal dil: maksimum 1500 TL çekim yapabilir. yatırım miktarı 1000 TL olmalıdır..."
            />
            
            {/* Parse önizleme */}
            {editForm.max_withdrawal_formula && (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 mb-1 font-semibold">AI Parse Önizleme:</p>
                {(() => {
                  const parsed = parseNaturalLanguageFormula(editForm.max_withdrawal_formula);
                  if (parsed && parsed.confidence > 0.3) {
                    return (
                      <div className="text-xs">
                        <code className="text-green-400 font-mono">{parsed.formula}</code>
                        <p className="text-slate-400 mt-1">{parsed.description}</p>
                        <p className="text-slate-500 mt-1">Güven: %{(parsed.confidence * 100).toFixed(0)}</p>
                      </div>
                    );
                  }
                  return (
                    <p className="text-xs text-slate-400">Matematiksel formül olarak kullanılacak</p>
                  );
                })()}
              </div>
            )}

            <div className="text-xs text-slate-400 mt-2 space-y-1">
              <p className="font-semibold text-amber-400 mb-1">📝 Kullanılabilir Değişkenler:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><code className="text-green-400">deposit</code> - Yatırım miktarı</li>
                <li><code className="text-green-400">bonus</code> - Bonus miktarı</li>
                <li><code className="text-green-400">multiplier</code> - Yukarıda tanımlanan çarpan</li>
                <li><code className="text-green-400">fixed</code> - Yukarıda tanımlanan sabit tutar</li>
              </ul>
              <p className="font-semibold text-purple-400 mt-2 mb-1">💬 Doğal Dil Örnekleri:</p>
              <ul className="space-y-1 list-disc list-inside text-slate-500">
                <li>"maksimum 1500 TL çekim yapabilir"</li>
                <li>"yatırım miktarı 1000 TL olmalıdır"</li>
                <li>"bonus 3 katı" veya "yatırım 5 katı"</li>
              </ul>
            </div>
          </details>
        </div>

        <p className="text-amber-300 text-xs mt-2">⚠️ Formül varsa, yukarıdaki hesaplama tipini geçersiz kılar.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={saveRule}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg"
        >
          <Save className="w-4 h-4" />
          Kaydet
        </button>
        <button
          onClick={cancelEdit}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
          İptal
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-300 mb-1">🎯 Bonus Kuralları Nasıl Çalışır?</h4>
            <ul className="text-sm text-blue-200/80 space-y-1 list-disc list-inside">
              <li>Eklediğiniz her kural <span className="font-semibold text-blue-300">otomatik olarak</span> hesaplama motoruna entegre olur</li>
              <li>Bonus isimleri <span className="font-semibold text-blue-300">esnek eşleşir</span> - tam isim gerekmez</li>
              <li>Formül tanımlarsanız, hesaplama tipi yerine <span className="font-semibold text-blue-300">formül kullanılır</span></li>
              <li>Değişiklikler hemen aktif olur - <span className="font-semibold text-blue-300">yeniden yükleme gerekmez</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Bonus Kuralları Yönetimi</h3>
        </div>
        <button
          onClick={startAdd}
          disabled={addingNew || editingId !== null}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Yeni Kural Ekle
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl backdrop-blur-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {addingNew && renderEditForm()}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id}>
            {editingId === rule.id ? (
              renderEditForm()
            ) : (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-4 border border-slate-600 hover:border-amber-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-white text-lg">{rule.bonus_name}</h4>
                      <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400 font-semibold">
                        Aktif
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-400">Tip:</span>
                        <span className="text-slate-300">
                          {rule.calculation_type === 'unlimited' && '♾️ Sınırsız'}
                          {rule.calculation_type === 'multiplier' && `✖️ Çarpan (${rule.multiplier}x)`}
                          {rule.calculation_type === 'fixed' && `💰 Sabit (${rule.fixed_amount}₺)`}
                        </span>
                      </div>
                      {rule.max_withdrawal_formula && rule.max_withdrawal_formula.trim() && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-purple-400">Formül:</span>
                          <code className="text-purple-300 bg-purple-500/10 px-2 py-1 rounded font-mono text-xs">
                            {rule.max_withdrawal_formula}
                          </code>
                        </div>
                      )}
                      {(!rule.max_withdrawal_formula || !rule.max_withdrawal_formula.trim()) && (
                        <div className="text-slate-500 text-xs italic">
                          * Formül tanımlanmamış, hesaplama tipine göre çalışacak
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
