import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { BonusRulesManager } from './components/BonusRulesManager';
import { Navigation } from './components/Navigation';
import MonthlyShiftPlanner from './components/MonthlyShiftPlanner';
import SpecialOffers from './components/SpecialOffers';
import PerformanceReports from './components/PerformanceReports';
import { CalculationDebugger } from './components/CalculationDebugger';
import PersonelPerformanceSystem from './components/PersonelPerformanceSystem';
import { BarChart3, User, Shield } from 'lucide-react';

type Page = 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUserMode, setIsUserMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('performance');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'user') {
      setIsUserMode(true);
      setCurrentPage('performance');
    } else {
      setIsUserMode(false);
      setCurrentPage('upload');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Bonus ve Çekim Kontrol Sistemi</h1>
                <p className="text-sm text-slate-300 mt-1">
                  {isUserMode ? 'Kullanıcı Paneli' : 'Yönetim Paneli'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newMode = !isUserMode;
                  setIsUserMode(newMode);
                  const url = new URL(window.location.href);
                  if (newMode) {
                    url.searchParams.set('mode', 'user');
                    setCurrentPage('performance');
                  } else {
                    url.searchParams.delete('mode');
                    setCurrentPage('upload');
                  }
                  window.history.pushState({}, '', url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600/50"
              >
                {isUserMode ? (
                  <>
                    <User className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Kullanıcı Modu</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Yönetim Modu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} isUserMode={isUserMode} />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isUserMode && currentPage === 'upload' && (
          <FileUpload onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
        )}

        {!isUserMode && currentPage === 'rules' && (
          <BonusRulesManager />
        )}

        {!isUserMode && currentPage === 'debug' && (
          <CalculationDebugger />
        )}

        {currentPage === 'performance' && (
          <PerformanceReports refreshTrigger={refreshTrigger} />
        )}

        {currentPage === 'shifts' && (
          <MonthlyShiftPlanner />
        )}

        {currentPage === 'offers' && (
          <SpecialOffers selectedDate={new Date()} />
        )}

        {currentPage === 'personel' && (
          <PersonelPerformanceSystem />
        )}
      </main>
    </div>
  );
}

export default App;
