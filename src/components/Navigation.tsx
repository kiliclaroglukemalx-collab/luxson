import { Settings, Upload, Calendar, Tag, TrendingUp, Bug, Users, AlertTriangle, Gift, Hash } from 'lucide-react';

interface NavigationProps {
  currentPage: 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel' | 'withdrawal-errors' | 'bonus-report' | 'btag-report';
  onPageChange: (page: 'upload' | 'rules' | 'performance' | 'shifts' | 'offers' | 'debug' | 'personel' | 'withdrawal-errors' | 'bonus-report' | 'btag-report') => void;
  isUserMode?: boolean;
}

export function Navigation({ currentPage, onPageChange, isUserMode = false }: NavigationProps) {
  const allNavItems = [
    { id: 'upload' as const, label: 'Dosya Yükleme', icon: Upload, adminOnly: true, description: 'Yatırım, bonus ve çekim raporlarını yükleyin' },
    { id: 'rules' as const, label: 'Bonus Kuralları', icon: Settings, adminOnly: true, description: 'Bonus hesaplama kurallarını yönetin' },
    { id: 'withdrawal-errors' as const, label: 'Çekim Hata Raporu', icon: AlertTriangle, adminOnly: false, description: 'Fazla ödeme ve hata analizleri' },
    { id: 'bonus-report' as const, label: 'Bonus Raporu', icon: Gift, adminOnly: false, description: 'Bonus kullanım ve analiz raporları' },
    { id: 'btag-report' as const, label: 'Btag Raporu', icon: Hash, adminOnly: false, description: 'Btag bazlı analiz raporları' },
    { id: 'debug' as const, label: 'Hesaplama Test', icon: Bug, adminOnly: true, description: 'Hesaplama motorunu test edin' },
    { id: 'performance' as const, label: 'Performans Raporları', icon: TrendingUp, adminOnly: false, description: 'Personel ve ödeme sistemi performansı' },
    { id: 'shifts' as const, label: 'Vardiya Yönetimi', icon: Calendar, adminOnly: false, description: 'Aylık vardiya planlaması' },
    { id: 'personel' as const, label: 'Call Takip Sistemi', icon: Users, adminOnly: false, description: 'Personel performans takibi' },
    { id: 'offers' as const, label: 'Özel Oran Teklifleri', icon: Tag, adminOnly: false, description: 'Özel oran tekliflerini yönetin' },
  ];

  const navItems = isUserMode
    ? allNavItems.filter(item => !item.adminOnly)
    : allNavItems;

  return (
    <nav className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-md border-b border-slate-700/50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-amber-400">LuxeGel Panel</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`
                  group relative flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-medium text-sm
                  transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:z-10
                  ${isActive
                    ? 'border-amber-500 bg-gradient-to-br from-amber-500/30 to-amber-600/20 text-amber-300 shadow-lg shadow-amber-500/30 scale-105'
                    : 'border-slate-600/50 bg-slate-700/40 text-slate-300 hover:border-amber-500/70 hover:text-white hover:bg-slate-700/70'
                  }
                `}
              >
                <div className={`p-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-amber-500/30'
                    : 'bg-slate-600/40 group-hover:bg-amber-500/20'
                }`}>
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-125'
                  }`} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold leading-tight">{item.label}</span>
                  <span className={`text-xs leading-tight ${
                    isActive ? 'text-amber-200/80' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {item.description}
                  </span>
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-amber-500 rounded-full" />
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
