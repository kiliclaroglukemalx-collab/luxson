import { useState } from 'react';
import { Play, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { analyzeWithdrawals, matchBonusesToDeposits } from '../utils/matchingEngine';
import type { AnalysisResult } from '../utils/matchingEngine';

export function CalculationDebugger() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [matchingComplete, setMatchingComplete] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // Önce bonus-deposit eşleştirmesi
      await matchBonusesToDeposits();
      setMatchingComplete(true);
      
      // Sonra çekim analizi
      const analysisResults = await analyzeWithdrawals();
      setResults(analysisResults);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analiz sırasında hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const overpaymentResults = results.filter(r => r.isOverpayment);
  const normalResults = results.filter(r => !r.isOverpayment && r.bonus);
  const noBonusResults = results.filter(r => !r.bonus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Hesaplama Motoru Test Merkezi</h2>
              <p className="text-sm text-slate-300 mt-1">
                Bonus kurallarını test et ve hesaplama detaylarını incele
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Play className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analiz Ediliyor...' : 'Analizi Çalıştır'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/30">
            <div className="text-sm text-blue-300 mb-1">Toplam Çekim</div>
            <div className="text-3xl font-bold text-blue-400">{results.length}</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-xl p-6 border border-red-500/30">
            <div className="text-sm text-red-300 mb-1">⚠️ Fazla Ödeme</div>
            <div className="text-3xl font-bold text-red-400">{overpaymentResults.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
            <div className="text-sm text-green-300 mb-1">✓ Normal</div>
            <div className="text-3xl font-bold text-green-400">{normalResults.length}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-xl p-6 border border-slate-500/30">
            <div className="text-sm text-slate-300 mb-1">Bonussuz</div>
            <div className="text-3xl font-bold text-slate-400">{noBonusResults.length}</div>
          </div>
        </div>
      )}

      {/* Matching Status */}
      {matchingComplete && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Bonus-Deposit eşleştirmesi tamamlandı</span>
          </div>
        </div>
      )}

      {/* Overpayment Results */}
      {overpaymentResults.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-red-500/50">
          <div className="p-6 border-b border-slate-600 bg-red-500/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">
                ⚠️ Fazla Ödeme Tespit Edilen Çekimler ({overpaymentResults.length})
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {overpaymentResults.map((result, index) => (
              <div
                key={result.withdrawal.id}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">
                      #{index + 1} - Müşteri: {result.withdrawal.customer_id}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(result.withdrawal.request_date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-400">
                      +{result.overpaymentAmount.toFixed(2)}₺
                    </div>
                    <div className="text-xs text-slate-400">Fazla Ödeme</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-slate-400 text-xs mb-1">Çekilen</div>
                    <div className="text-white font-semibold">{result.withdrawal.amount}₺</div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-slate-400 text-xs mb-1">Max İzin</div>
                    <div className="text-amber-400 font-semibold">
                      {result.maxAllowed === Infinity ? '∞' : `${result.maxAllowed.toFixed(2)}₺`}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-slate-400 text-xs mb-1">Fark</div>
                    <div className="text-red-400 font-semibold">{result.overpaymentAmount.toFixed(2)}₺</div>
                  </div>
                </div>

                {result.bonus && (
                  <div className="bg-slate-900/50 rounded p-3">
                    <div className="text-amber-400 text-xs font-semibold mb-1">BONUS BİLGİSİ</div>
                    <div className="text-white text-sm">{result.bonus.bonus_name}</div>
                    <div className="text-slate-400 text-xs mt-1">Bonus: {result.bonus.amount}₺</div>
                  </div>
                )}

                {result.deposit && (
                  <div className="bg-slate-900/50 rounded p-3">
                    <div className="text-blue-400 text-xs font-semibold mb-1">DEPOSIT BİLGİSİ</div>
                    <div className="text-white text-sm">Yatırım: {result.deposit.amount}₺</div>
                    <div className="text-slate-400 text-xs mt-1">
                      {new Date(result.deposit.deposit_date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}

                {result.calculationLog && (
                  <details className="bg-slate-900/30 rounded p-3">
                    <summary className="text-purple-400 text-sm font-semibold cursor-pointer hover:text-purple-300">
                      📊 Hesaplama Detayları
                    </summary>
                    <pre className="text-xs text-slate-300 mt-3 whitespace-pre-wrap font-mono">
                      {result.calculationLog}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal Results */}
      {normalResults.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-green-500/30">
          <div className="p-6 border-b border-slate-600 bg-green-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                ✓ Normal Çekimler ({normalResults.length})
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {normalResults.slice(0, 5).map((result, index) => (
              <details
                key={result.withdrawal.id}
                className="bg-green-500/5 border border-green-500/20 rounded-lg p-4"
              >
                <summary className="cursor-pointer hover:text-green-400 transition-colors">
                  <span className="text-white font-semibold">
                    #{index + 1} - Müşteri: {result.withdrawal.customer_id}
                  </span>
                  <span className="text-green-400 ml-4">
                    {result.withdrawal.amount}₺ / {result.maxAllowed === Infinity ? '∞' : `${result.maxAllowed.toFixed(2)}₺`}
                  </span>
                </summary>
                
                <div className="mt-4 space-y-3">
                  {result.bonus && (
                    <div className="bg-slate-900/50 rounded p-3">
                      <div className="text-amber-400 text-xs font-semibold mb-1">BONUS</div>
                      <div className="text-white text-sm">{result.bonus.bonus_name}</div>
                      <div className="text-slate-400 text-xs">Bonus: {result.bonus.amount}₺</div>
                    </div>
                  )}
                  
                  {result.calculationLog && (
                    <pre className="text-xs text-slate-300 bg-slate-900/30 p-3 rounded whitespace-pre-wrap font-mono">
                      {result.calculationLog}
                    </pre>
                  )}
                </div>
              </details>
            ))}
            {normalResults.length > 5 && (
              <div className="text-center text-slate-400 text-sm pt-2">
                ... ve {normalResults.length - 5} çekim daha
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Bonus Results */}
      {noBonusResults.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600">
          <div className="p-6 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">
                Bonussuz Çekimler ({noBonusResults.length})
              </h3>
            </div>
          </div>
          <div className="p-6">
            <div className="text-sm text-slate-400">
              Bu çekimler için bonus bulunamadı. Normal çekim olarak işlendi.
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-12 border border-slate-600 text-center">
          <Play className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Analiz Henüz Çalıştırılmadı</h3>
          <p className="text-slate-400">Hesaplama motorunu test etmek için "Analizi Çalıştır" butonuna tıklayın.</p>
        </div>
      )}
    </div>
  );
}
