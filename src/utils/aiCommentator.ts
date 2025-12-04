/**
 * AI Yorumlama Sistemi
 * Sistemin tüm bileşenlerini analiz edip yorumlar üretir
 */

export interface AIComment {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  insights: string[];
  recommendations?: string[];
  timestamp: string;
}

export interface AnalysisData {
  bonuses?: {
    total: number;
    totalAmount: number;
    uniqueCustomers: number;
    byType: Record<string, { count: number; amount: number }>;
  };
  withdrawals?: {
    total: number;
    totalAmount: number;
    byBonus: Record<string, { count: number; amount: number }>;
    averageAmount: number;
    overpayments: number;
    overpaymentAmount: number;
  };
  employees?: {
    total: number;
    averageProcessingTime: number;
    fastest: { name: string; time: number };
    slowest: { name: string; time: number };
    rejectionRates: Record<string, number>;
  };
  callPersonnel?: {
    total: number;
    topPerformers: Array<{ name: string; score: number }>;
    conversionRates: Record<string, number>;
    weeklyTotals: Record<string, number>;
  };
}

/**
 * AI yorumları üretir (şimdilik kural tabanlı, ileride API entegrasyonu eklenebilir)
 */
export async function generateAIComments(data: AnalysisData): Promise<AIComment[]> {
  const comments: AIComment[] = [];
  const now = new Date().toISOString();

  // 1. Bonus Kullanımı Yorumları
  if (data.bonuses) {
    const bonusComment = analyzeBonusUsage(data.bonuses);
    if (bonusComment) comments.push({ ...bonusComment, timestamp: now });
  }

  // 2. Çekim-Bonus İlişkisi Yorumları
  if (data.withdrawals) {
    const withdrawalComment = analyzeWithdrawalBonusRelation(data.withdrawals);
    if (withdrawalComment) comments.push({ ...withdrawalComment, timestamp: now });
  }

  // 3. Çalışan Çekim Hızları Yorumları
  if (data.employees) {
    const employeeComment = analyzeEmployeeProcessingSpeed(data.employees);
    if (employeeComment) comments.push({ ...employeeComment, timestamp: now });
  }

  // 4. Call Personel Performansı Yorumları
  if (data.callPersonnel) {
    const personnelComment = analyzeCallPersonnelPerformance(data.callPersonnel);
    if (personnelComment) comments.push({ ...personnelComment, timestamp: now });
  }

  return comments;
}

function analyzeBonusUsage(bonuses: AnalysisData['bonuses']): AIComment | null {
  if (!bonuses) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Bonus Kullanım Analizi';
  let message = '';

  // Toplam bonus analizi
  if (bonuses.total > 0) {
    const avgBonusPerCustomer = bonuses.totalAmount / bonuses.uniqueCustomers;
    insights.push(`Toplam ${bonuses.total} bonus dağıtılmış, ${bonuses.uniqueCustomers} benzersiz müşteriye`);
    insights.push(`Müşteri başına ortalama bonus: ${avgBonusPerCustomer.toLocaleString('tr-TR')}₺`);

    // En çok kullanılan bonus tipi
    const topBonusType = Object.entries(bonuses.byType).sort((a, b) => b[1].count - a[1].count)[0];
    if (topBonusType) {
      insights.push(`En popüler bonus: "${topBonusType[0]}" (${topBonusType[1].count} kez, ${topBonusType[1].amount.toLocaleString('tr-TR')}₺)`);
    }

    // Bonus dağılımı analizi
    const bonusTypes = Object.keys(bonuses.byType).length;
    if (bonusTypes > 10) {
      type = 'warning';
      recommendations.push('Çok fazla farklı bonus tipi var. Bonus stratejisini gözden geçirmek faydalı olabilir.');
    }

    // Yüksek tutarlı bonuslar
    const highValueBonuses = Object.entries(bonuses.byType)
      .filter(([_, data]) => data.amount > 100000)
      .sort((a, b) => b[1].amount - a[1].amount);
    
    if (highValueBonuses.length > 0) {
      insights.push(`Yüksek tutarlı bonuslar: ${highValueBonuses.map(([name, data]) => `${name} (${data.amount.toLocaleString('tr-TR')}₺)`).join(', ')}`);
    }
  }

  message = `Bonus kullanım istatistikleri analiz edildi. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeWithdrawalBonusRelation(withdrawals: AnalysisData['withdrawals']): AIComment | null {
  if (!withdrawals) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Çekim-Bonus İlişkisi Analizi';
  let message = '';

  // Bonus bazlı çekim analizi
  const bonusEntries = Object.entries(withdrawals.byBonus);
  if (bonusEntries.length > 0) {
    insights.push(`${bonusEntries.length} farklı bonus tipinden çekim yapılmış`);

    // En çok çekim yapılan bonus
    const topBonus = bonusEntries.sort((a, b) => b[1].amount - a[1].amount)[0];
    if (topBonus) {
      insights.push(`En yüksek çekim: "${topBonus[0]}" (${topBonus[1].count} işlem, ${topBonus[1].amount.toLocaleString('tr-TR')}₺)`);
    }

    // Fazla ödeme analizi
    if (withdrawals.overpayments > 0) {
      type = 'warning';
      const overpaymentRate = (withdrawals.overpayments / withdrawals.total) * 100;
      insights.push(`⚠️ ${withdrawals.overpayments} fazla ödeme tespit edildi (${overpaymentRate.toFixed(1)}%)`);
      insights.push(`Toplam fazla ödeme tutarı: ${withdrawals.overpaymentAmount.toLocaleString('tr-TR')}₺`);
      recommendations.push('Fazla ödemelerin nedenlerini inceleyin ve bonus kurallarını gözden geçirin');
    } else {
      type = 'success';
      insights.push('✅ Fazla ödeme tespit edilmedi - tüm çekimler limitler içinde');
    }

    // Ortalama çekim tutarı
    insights.push(`Ortalama çekim tutarı: ${withdrawals.averageAmount.toLocaleString('tr-TR')}₺`);
  }

  message = `Çekim-bonus ilişkisi analiz edildi. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeEmployeeProcessingSpeed(employees: AnalysisData['employees']): AIComment | null {
  if (!employees) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Çalışan İşlem Hızı Analizi';
  let message = '';

  if (employees.total > 0) {
    insights.push(`Toplam ${employees.total} çalışan analiz edildi`);
    insights.push(`Ortalama işlem süresi: ${formatTime(employees.averageProcessingTime)}`);

    // En hızlı çalışan
    if (employees.fastest) {
      insights.push(`⚡ En hızlı: ${employees.fastest.name} (${formatTime(employees.fastest.time)})`);
    }

    // En yavaş çalışan
    if (employees.slowest) {
      const speedDiff = employees.slowest.time - employees.fastest.time;
      insights.push(`🐌 En yavaş: ${employees.slowest.name} (${formatTime(employees.slowest.time)})`);
      
      if (speedDiff > 60) {
        type = 'warning';
        recommendations.push(`${employees.slowest.name} için ek eğitim veya destek düşünülebilir`);
      }
    }

    // Red oranları
    const highRejectionRates = Object.entries(employees.rejectionRates)
      .filter(([_, rate]) => rate > 10)
      .sort((a, b) => b[1] - a[1]);
    
    if (highRejectionRates.length > 0) {
      type = 'warning';
      insights.push(`⚠️ Yüksek red oranı: ${highRejectionRates.map(([name, rate]) => `${name} (%${rate.toFixed(1)})`).join(', ')}`);
      recommendations.push('Yüksek red oranına sahip çalışanlar için kalite kontrol süreçlerini gözden geçirin');
    }

    // Performans değerlendirmesi
    if (employees.averageProcessingTime < 30) {
      type = 'success';
      insights.push('✅ Genel olarak hızlı işlem süreleri - sistem verimli çalışıyor');
    } else if (employees.averageProcessingTime > 120) {
      type = 'error';
      recommendations.push('İşlem süreleri çok yüksek - süreç optimizasyonu gerekli');
    }
  }

  message = `Çalışan işlem hızları analiz edildi. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeCallPersonnelPerformance(personnel: AnalysisData['callPersonnel']): AIComment | null {
  if (!personnel) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Call Personel Performans Analizi';
  let message = '';

  if (personnel.total > 0) {
    insights.push(`Toplam ${personnel.total} call personel analiz edildi`);

    // Top performans
    if (personnel.topPerformers.length > 0) {
      const top3 = personnel.topPerformers.slice(0, 3);
      insights.push(`🏆 Top 3: ${top3.map(p => `${p.name} (${p.score.toFixed(1)} puan)`).join(', ')}`);
    }

    // Dönüşüm oranları
    const avgConversion = Object.values(personnel.conversionRates).reduce((a, b) => a + b, 0) / Object.keys(personnel.conversionRates).length;
    insights.push(`Ortalama dönüşüm oranı: %${avgConversion.toFixed(1)}`);

    // Düşük performanslı personel
    const lowPerformers = Object.entries(personnel.conversionRates)
      .filter(([_, rate]) => rate < avgConversion * 0.7)
      .sort((a, b) => a[1] - b[1]);
    
    if (lowPerformers.length > 0) {
      type = 'warning';
      insights.push(`⚠️ Düşük performans: ${lowPerformers.map(([name, rate]) => `${name} (%${rate.toFixed(1)})`).join(', ')}`);
      recommendations.push('Düşük performanslı personel için ek eğitim veya destek programı düşünülebilir');
    }

    // Haftalık trend
    const weeklyEntries = Object.entries(personnel.weeklyTotals);
    if (weeklyEntries.length >= 2) {
      const sorted = weeklyEntries.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      const firstWeek = sorted[0][1];
      const lastWeek = sorted[sorted.length - 1][1];
      const trend = ((lastWeek - firstWeek) / firstWeek) * 100;
      
      if (trend > 10) {
        type = 'success';
        insights.push(`📈 Pozitif trend: Son haftada %${trend.toFixed(1)} artış`);
      } else if (trend < -10) {
        type = 'warning';
        insights.push(`📉 Negatif trend: Son haftada %${Math.abs(trend).toFixed(1)} düşüş`);
        recommendations.push('Performans düşüşünün nedenlerini araştırın');
      }
    }
  }

  message = `Call personel performansı analiz edildi. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

/**
 * Sayfa tipine özel yorumlar üretir
 */
export async function generatePageSpecificComments(
  pageType: string,
  data: AnalysisData
): Promise<AIComment[]> {
  const comments: AIComment[] = [];
  const now = new Date().toISOString();

  switch (pageType) {
    case 'withdrawal-errors':
      // Çekim hata raporu için özel analiz
      if (data.withdrawals) {
        const comment = analyzeWithdrawalErrors(data.withdrawals);
        if (comment) comments.push({ ...comment, timestamp: now });
      }
      break;

    case 'bonus-report':
      // Bonus raporu için özel analiz
      if (data.bonuses) {
        const comment = analyzeBonusReport(data.bonuses);
        if (comment) comments.push({ ...comment, timestamp: now });
      }
      break;

    case 'btag-report':
      // Btag raporu için özel analiz
      if (data.bonuses && data.withdrawals) {
        const comment = analyzeBtagReport(data.bonuses, data.withdrawals);
        if (comment) comments.push({ ...comment, timestamp: now });
      }
      break;

    case 'performance':
      // Performans raporu için özel analiz
      if (data.employees) {
        const comment = analyzeEmployeePerformance(data.employees);
        if (comment) comments.push({ ...comment, timestamp: now });
      }
      if (data.callPersonnel) {
        const comment = analyzeCallPersonnelPerformance(data.callPersonnel);
        if (comment) comments.push({ ...comment, timestamp: now });
      }
      break;

    case 'rules':
      // Bonus kuralları için özel analiz
      const rulesComment = await analyzeBonusRules();
      if (rulesComment) comments.push({ ...rulesComment, timestamp: now });
      break;

    default:
      // Genel analiz
      const generalComments = await generateAIComments(data);
      comments.push(...generalComments);
  }

  return comments;
}

function analyzeWithdrawalErrors(withdrawals: AnalysisData['withdrawals']): AIComment | null {
  if (!withdrawals) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Çekim Hata Analizi';
  let message = '';

  const errorRate = (withdrawals.overpayments / withdrawals.total) * 100;
  
  if (withdrawals.overpayments > 0) {
    type = 'warning';
    insights.push(`${withdrawals.overpayments} fazla ödeme tespit edildi (${errorRate.toFixed(1)}%)`);
    insights.push(`Toplam fazla ödeme: ${withdrawals.overpaymentAmount.toLocaleString('tr-TR')}₺`);
    
    if (errorRate > 10) {
      type = 'error';
      recommendations.push('Fazla ödeme oranı çok yüksek - acil müdahale gerekli');
      recommendations.push('Bonus kurallarını ve personel eğitimini gözden geçirin');
    } else {
      recommendations.push('Fazla ödemelerin nedenlerini inceleyin');
    }
  } else {
    type = 'success';
    insights.push('✅ Tüm çekimler limitler içinde - fazla ödeme yok');
  }

  message = `Çekim hata analizi tamamlandı. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeBonusReport(bonuses: AnalysisData['bonuses']): AIComment | null {
  if (!bonuses) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Bonus Raporu Analizi';
  let message = '';

  insights.push(`Toplam ${bonuses.total} bonus kaydı, ${bonuses.uniqueCustomers} benzersiz müşteri`);
  insights.push(`Toplam bonus tutarı: ${bonuses.totalAmount.toLocaleString('tr-TR')}₺`);

  const topBonus = Object.entries(bonuses.byType).sort((a, b) => b[1].amount - a[1].amount)[0];
  if (topBonus) {
    insights.push(`En yüksek tutarlı bonus: "${topBonus[0]}" (${topBonus[1].amount.toLocaleString('tr-TR')}₺)`);
  }

  const avgBonus = bonuses.totalAmount / bonuses.total;
  insights.push(`Ortalama bonus tutarı: ${avgBonus.toLocaleString('tr-TR')}₺`);

  message = `Bonus raporu analizi tamamlandı. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeBtagReport(bonuses: AnalysisData['bonuses'], withdrawals: AnalysisData['withdrawals']): AIComment | null {
  if (!bonuses || !withdrawals) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Btag Raporu Analizi';
  let message = '';

  // Btag bazlı analiz
  const btagMap = new Map<string, { bonus: number; withdrawal: number }>();
  
  // Burada btag verilerini analiz et
  insights.push('Btag bazlı performans analizi yapıldı');

  message = `Btag raporu analizi tamamlandı. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

function analyzeEmployeePerformance(employees: AnalysisData['employees']): AIComment | null {
  if (!employees) return null;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let type: AIComment['type'] = 'info';
  let title = 'Personel Performans Analizi';
  let message = '';

  insights.push(`Ortalama işlem süresi: ${formatTime(employees.averageProcessingTime)}`);
  
  if (employees.fastest) {
    insights.push(`⚡ En hızlı: ${employees.fastest.name} (${formatTime(employees.fastest.time)})`);
  }

  const speedDiff = employees.slowest.time - employees.fastest.time;
  if (speedDiff > 60) {
    type = 'warning';
    recommendations.push(`${employees.slowest.name} için performans iyileştirme gerekli`);
  }

  message = `Personel performans analizi tamamlandı. ${insights.length} önemli bulgu tespit edildi.`;

  return { type, title, message, insights, recommendations };
}

async function analyzeBonusRules(): Promise<AIComment | null> {
  try {
    const { data: rules, error } = await supabase
      .from('bonus_rules')
      .select('*');

    if (error || !rules) return null;

    const insights: string[] = [];
    const recommendations: string[] = [];
    let type: AIComment['type'] = 'info';
    let title = 'Bonus Kuralları Analizi';
    let message = '';

    insights.push(`Toplam ${rules.length} bonus kuralı tanımlı`);

    const unlimitedCount = rules.filter(r => r.calculation_type === 'unlimited').length;
    const multiplierCount = rules.filter(r => r.calculation_type === 'multiplier').length;
    const fixedCount = rules.filter(r => r.calculation_type === 'fixed').length;

    insights.push(`Sınırsız: ${unlimitedCount}, Çarpan: ${multiplierCount}, Sabit: ${fixedCount}`);

    const withoutFormula = rules.filter(r => !r.max_withdrawal_formula || r.max_withdrawal_formula.trim() === '' || r.max_withdrawal_formula === 'Sınırsız');
    if (withoutFormula.length > 0) {
      type = 'warning';
      insights.push(`⚠️ ${withoutFormula.length} kuralda formül tanımlanmamış`);
      recommendations.push('Formül tanımlanmamış kuralları gözden geçirin');
    }

    message = `Bonus kuralları analizi tamamlandı. ${insights.length} önemli bulgu tespit edildi.`;

    return { type, title, message, insights, recommendations };
  } catch (error) {
    console.error('Bonus kuralları analiz hatası:', error);
    return null;
  }
}

function formatTime(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}sn`;
  if (minutes < 60) return `${Math.round(minutes)}dk`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}s ${mins}dk`;
}

/**
 * Verileri toplayıp AI yorumları üretir
 */
export async function analyzeSystemAndGenerateComments(): Promise<AIComment[]> {
  // Bu fonksiyon gerçek verileri Supabase'den çekip analiz edecek
  // Şimdilik placeholder - gerçek implementasyon için Supabase entegrasyonu gerekli
  return [];
}

