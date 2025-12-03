import { useState } from 'react';
import { Users, TrendingUp, Calendar, FileText, Settings as SettingsIcon } from 'lucide-react';
import EmployeesPage from './pages-personel/EmployeesPage';
import HomePage from './pages-personel/HomePage';
import WeeklyReportPage from './pages-personel/WeeklyReportPage';
import TotalReportPage from './pages-personel/TotalReportPage';
import ExportSettingsPage from './pages-personel/ExportSettingsPage';

type PersonelPage = 'home' | 'employees' | 'weekly' | 'total' | 'settings';

export default function PersonelPerformanceSystem() {
  const [activePage, setActivePage] = useState<PersonelPage>('home');

  const pages = [
    { id: 'home' as const, label: 'Anasayfa', icon: TrendingUp },
    { id: 'employees' as const, label: 'Personeller', icon: Users },
    { id: 'weekly' as const, label: 'Haftalık Rapor', icon: Calendar },
    { id: 'total' as const, label: 'Kümülatif Total', icon: FileText },
    { id: 'settings' as const, label: 'Excel Ayarları', icon: SettingsIcon },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage />;
      case 'employees':
        return <EmployeesPage />;
      case 'weekly':
        return <WeeklyReportPage />;
      case 'total':
        return <TotalReportPage />;
      case 'settings':
        return <ExportSettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Call Takip Sistemi</h2>
            <p className="text-sm text-slate-300 mt-1">
              Call center performans takibi ve raporlama
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600 p-2">
        <div className="grid grid-cols-5 gap-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg font-semibold transition-all ${
                activePage === page.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <page.icon className="w-5 h-5" />
              <span className="hidden md:inline">{page.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>{renderPage()}</div>
    </div>
  );
}
