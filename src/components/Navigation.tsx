import { Settings, Upload, BarChart3, CreditCard, Calendar, Tag, TrendingUp, Menu, X, Bug, Users, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface NavigationProps {
  currentPage: 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel' | 'withdrawal-errors';
  onPageChange: (page: 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel' | 'withdrawal-errors') => void;
  isUserMode?: boolean;
}

export function Navigation({ currentPage, onPageChange, isUserMode = false }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allNavItems = [
    { id: 'upload' as const, label: 'Dosya Yükleme', icon: Upload, adminOnly: true },
    { id: 'rules' as const, label: 'Bonus Kuralları', icon: Settings, adminOnly: true },
    { id: 'withdrawal-errors' as const, label: 'Çekim Hata Raporu', icon: AlertTriangle, adminOnly: true },
    { id: 'debug' as const, label: 'Hesaplama Test', icon: Bug, adminOnly: true },
    { id: 'performance' as const, label: 'Performans Raporları', icon: TrendingUp, adminOnly: false },
    { id: 'shifts' as const, label: 'Vardiya Yönetimi', icon: Calendar, adminOnly: false },
    { id: 'personel' as const, label: 'Call Takip Sistemi', icon: Users, adminOnly: false },
    { id: 'offers' as const, label: 'Özel Oran Teklifleri', icon: Tag, adminOnly: false },
  ];

  const navItems = isUserMode
    ? allNavItems.filter(item => !item.adminOnly)
    : allNavItems;

  return (
    <nav className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-bold text-amber-400">LuxeGel Panel</h1>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 font-medium text-sm
                    transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
                    ${isActive
                      ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 shadow-lg shadow-amber-500/20'
                      : 'border-slate-600/50 bg-slate-700/30 text-slate-300 hover:border-amber-500/50 hover:text-white hover:bg-slate-700/60'
                    }
                  `}
                >
                  <div className={`p-4 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-amber-500/20'
                      : 'bg-slate-600/30 group-hover:bg-amber-500/10'
                  }`}>
                    <Icon className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <span className="text-center leading-tight">{item.label}</span>

                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
