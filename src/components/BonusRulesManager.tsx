import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BonusRule } from '../lib/supabase';

export function BonusRulesManager() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BonusRule>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setEditForm({});
  };

  const saveRule = async () => {
    try {
      if (addingNew) {
        const { error } = await supabase
          .from('bonus_rules')
          .insert([editForm]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Yeni bonus kuralı eklendi' });
      } else if (editingId) {
        const { error } = await supabase
          .from('bonus_rules')
          .update(editForm)
          .eq('id', editingId);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Bonus kuralı güncellendi' });
      }

      await loadRules();
      cancelEdit();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
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
        <input
          type="text"
          value={editForm.max_withdrawal_formula || ''}
          onChange={(e) => setEditForm({ ...editForm, max_withdrawal_formula: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
          placeholder="deposit * 3 + bonus * 20"
        />
        <div className="text-xs text-slate-400 space-y-1 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
          <p className="font-semibold text-amber-400 mb-2">📝 Kullanılabilir Değişkenler:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><code className="text-green-400">deposit</code> - Yatırım miktarı</li>
            <li><code className="text-green-400">bonus</code> - Bonus miktarı</li>
            <li><code className="text-green-400">multiplier</code> - Yukarıda tanımlanan çarpan</li>
            <li><code className="text-green-400">fixed</code> - Yukarıda tanımlanan sabit tutar</li>
          </ul>
          <p className="font-semibold text-amber-400 mt-3 mb-2">💡 Örnek Formüller:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><code className="text-blue-400">bonus * 20</code> - Bonus × 20</li>
            <li><code className="text-blue-400">deposit * 3</code> - Yatırım × 3</li>
            <li><code className="text-blue-400">deposit + bonus * 10</code> - Yatırım + (Bonus × 10)</li>
            <li><code className="text-blue-400">(deposit + bonus) * 2</code> - (Yatırım + Bonus) × 2</li>
            <li><code className="text-blue-400">Math.min(deposit * 5, 10000)</code> - En fazla 10.000₺</li>
          </ul>
          <p className="text-amber-300 mt-2">⚠️ Formül varsa, yukarıdaki hesaplama tipini geçersiz kılar.</p>
        </div>
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
