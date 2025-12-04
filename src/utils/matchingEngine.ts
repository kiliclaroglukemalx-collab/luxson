import { supabase } from '../lib/supabase';
import type { BonusRule, Deposit, Bonus, Withdrawal } from '../lib/supabase';
import { calculateWithdrawalWithAIPrompt } from './aiBonusRuleEngine';

export interface AnalysisResult {
  withdrawal: Withdrawal;
  deposit: Deposit | null;
  bonus: Bonus | null;
  bonusRule: BonusRule | null;
  maxAllowed: number;
  isOverpayment: boolean;
  overpaymentAmount: number;
  processingTimeMinutes: number;
  calculationLog?: string; // Hesaplama detayları için log
}

// Formül değerlendirme motoru
function evaluateFormula(formula: string, variables: Record<string, number>): number {
  try {
    // Güvenli formül değerlendirme
    let expression = formula;
    
    // Değişkenleri değiştir
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }
    
    // Matematiksel operatörleri değerlendir
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)();
    
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (error) {
    console.error('Formula evaluation error:', error, formula);
    return 0;
  }
}

// Bonus tipine özel özel mantıklar
interface SpecialBonusLogic {
  name: string;
  depositTiming: 'before' | 'after'; // Deposit bonustan önce mi sonra mı gelir?
  matchingStrategy?: (bonus: Bonus, deposits: Deposit[]) => Deposit | null;
  calculationOverride?: (
    withdrawal: Withdrawal,
    deposit: Deposit | null,
    bonus: Bonus,
    rule: BonusRule
  ) => { maxAllowed: number; log: string } | null;
}

const SPECIAL_BONUS_LOGICS: SpecialBonusLogic[] = [
  {
    name: 'Tg ve Mobil app 500 DENEME Bonusu',
    depositTiming: 'after',
    matchingStrategy: (bonus: Bonus, deposits: Deposit[]) => {
      const bonusDate = new Date(bonus.acceptance_date);
      const depositsAfterBonus = deposits.filter(
        d => d.customer_id === bonus.customer_id && new Date(d.deposit_date) > bonusDate
      );
      
      if (depositsAfterBonus.length === 0) return null;
      
      // İlk depozitten eşleştir
      return depositsAfterBonus.reduce((earliest, current) => {
        return new Date(current.deposit_date) < new Date(earliest.deposit_date) ? current : earliest;
      });
    }
  }
  // Buraya daha fazla özel bonus mantığı eklenebilir
];

export async function matchBonusesToDeposits(): Promise<void> {
  // Get all bonuses without a deposit_id
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('*')
    .is('deposit_id', null)
    .order('acceptance_date');

  if (!bonuses || bonuses.length === 0) return;

  // Get all deposits
  const { data: deposits } = await supabase
    .from('deposits')
    .select('*')
    .order('deposit_date');

  if (!deposits || deposits.length === 0) return;

  // Match each bonus to the closest deposit
  for (const bonus of bonuses) {
    const bonusDate = new Date(bonus.acceptance_date);
    
    // Özel bonus mantığını kontrol et
    const specialLogic = SPECIAL_BONUS_LOGICS.find(logic => 
      bonus.bonus_name.includes(logic.name) || logic.name.includes(bonus.bonus_name)
    );
    
    let matchedDeposit: Deposit | null = null;
    
    if (specialLogic?.matchingStrategy) {
      // Özel eşleştirme stratejisi kullan
      matchedDeposit = specialLogic.matchingStrategy(bonus, deposits);
    } else if (specialLogic?.depositTiming === 'after') {
      // Deposit bonustan SONRA gelir
      const depositsAfterBonus = deposits.filter(deposit =>
        deposit.customer_id === bonus.customer_id &&
        new Date(deposit.deposit_date) > bonusDate
      );

      if (depositsAfterBonus.length > 0) {
        matchedDeposit = depositsAfterBonus.reduce((earliest, current) => {
          const earliestDate = new Date(earliest.deposit_date);
          const currentDate = new Date(current.deposit_date);
          return currentDate < earliestDate ? current : earliest;
        });
      }
    } else {
      // Varsayılan: Deposit bonustan ÖNCE gelir
      const matchingDeposits = deposits.filter(deposit =>
        deposit.customer_id === bonus.customer_id &&
        new Date(deposit.deposit_date) < bonusDate
      );

      if (matchingDeposits.length > 0) {
        // En yakın (en son) depositi bul
        matchedDeposit = matchingDeposits.reduce((closest, current) => {
          const closestDate = new Date(closest.deposit_date);
          const currentDate = new Date(current.deposit_date);
          return currentDate > closestDate ? current : closest;
        });
      }
    }
    
    // Update bonus with deposit_id
    if (matchedDeposit) {
      await supabase
        .from('bonuses')
        .update({ deposit_id: matchedDeposit.id })
        .eq('id', bonus.id);
    }
  }
}

export async function analyzeWithdrawals(): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  // Get all withdrawals
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*')
    .order('request_date');

  if (!withdrawals || withdrawals.length === 0) return results;

  // Get all deposits
  const { data: deposits } = await supabase
    .from('deposits')
    .select('*')
    .order('deposit_date');

  // Get all bonuses
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('*')
    .order('acceptance_date');

  // Get all bonus rules
  const { data: bonusRules } = await supabase
    .from('bonus_rules')
    .select('*');

  if (!deposits || !bonuses || !bonusRules) return results;

  for (const withdrawal of withdrawals) {
    const requestDate = new Date(withdrawal.request_date);
    const paymentDate = withdrawal.payment_date ? new Date(withdrawal.payment_date) : requestDate;

    // Calculate processing time
    const processingTimeMs = paymentDate.getTime() - requestDate.getTime();
    const processingTimeMinutes = Math.round(processingTimeMs / 1000 / 60);

    // SABİT MANTIK: Üye ID'lerini karşılaştır, yatırım tarihinden sonraki ilk bonusu bul
    const normalizeCustomerId = (id: string | number) => String(id).trim();
    const withdrawalCustomerId = normalizeCustomerId(withdrawal.customer_id);

    // 1. Üye ID'ye göre yatırımları bul
    const customerDeposits = deposits.filter(d => 
      normalizeCustomerId(d.customer_id) === withdrawalCustomerId
    ).sort((a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime());

    // 2. Üye ID'ye göre bonusları bul
    const customerBonuses = bonuses.filter(b => 
      normalizeCustomerId(b.customer_id) === withdrawalCustomerId
    ).sort((a, b) => {
      const dateA = a.created_date ? new Date(a.created_date) : new Date(a.acceptance_date);
      const dateB = b.created_date ? new Date(b.created_date) : new Date(b.acceptance_date);
      return dateA.getTime() - dateB.getTime();
    });

    // 3. SABİT MANTIK: Her yatırım için, o yatırım tarihinden sonraki ilk bonusu bul
    let linkedDeposit: Deposit | null = null;
    let linkedBonus: Bonus | null = null;

    for (const deposit of customerDeposits) {
      const depositDate = new Date(deposit.deposit_date);
      
      // Bu yatırımdan sonraki ilk bonusu bul
      const bonusAfterDeposit = customerBonuses.find(b => {
        const bonusDate = b.created_date 
          ? new Date(b.created_date) 
          : new Date(b.acceptance_date);
        return bonusDate >= depositDate;
      });

      if (bonusAfterDeposit) {
        linkedDeposit = deposit;
        linkedBonus = bonusAfterDeposit;
        break; // İlk eşleşmeyi al
      }
    }

    // DEBUG: Eğer bonus bulunamadıysa logla
    if (!linkedBonus) {
      const allCustomerBonuses = bonuses.filter(b => 
        normalizeCustomerId(b.customer_id) === withdrawalCustomerId
      );
      console.log(`[DEBUG] Bonus bulunamadı!`, {
        customer_id: withdrawalCustomerId,
        withdrawal_date: requestDate.toISOString(),
        total_bonuses_for_customer: allCustomerBonuses.length,
        bonuses: allCustomerBonuses.map(b => ({
          bonus_name: b.bonus_name,
          acceptance_date: b.acceptance_date,
          created_date: b.created_date,
          bonus_date_used: b.created_date || b.acceptance_date
        }))
      });
    }

    // 4. AI Prompt ile hesaplama yap (TÜM HESAPLAMA AI İLE)
    let maxAllowed = 0;
    let isOverpayment = false;
    let overpaymentAmount = 0;
    let calculationLog = '';

    calculationLog += `=== ÇEKİM HATA RAPORU (AI HESAPLAMA) ===\n`;
    calculationLog += `Müşteri ID: ${withdrawal.customer_id}\n`;
    calculationLog += `Çekim Miktarı: ${withdrawal.amount}₺\n`;
    calculationLog += `Çekim Tarihi: ${new Date(withdrawal.request_date).toLocaleString('tr-TR')}\n\n`;

    if (linkedDeposit && linkedBonus) {
      calculationLog += `✅ SABİT MANTIK: Üye ID eşleşti\n`;
      calculationLog += `Yatırım: ${linkedDeposit.amount}₺ (${new Date(linkedDeposit.deposit_date).toLocaleString('tr-TR')})\n`;
      calculationLog += `Bonus: ${linkedBonus.bonus_name} - ${linkedBonus.amount}₺\n`;
      const bonusDate = linkedBonus.created_date 
        ? new Date(linkedBonus.created_date) 
        : new Date(linkedBonus.acceptance_date);
      calculationLog += `Bonus Tarihi: ${bonusDate.toLocaleString('tr-TR')}\n`;
      calculationLog += `✅ Yatırım tarihinden sonraki ilk bonus bulundu\n\n`;

      // AI Prompt ile hesaplama
      try {
        const aiResult = await calculateWithdrawalWithAIPrompt(withdrawal);
        
        maxAllowed = aiResult.maxAllowed;
        calculationLog += `🤖 AI Hesaplama:\n`;
        calculationLog += `${aiResult.calculation}\n`;
        calculationLog += `AI Güven: ${(aiResult.confidence * 100).toFixed(0)}%\n`;
        calculationLog += `AI Mantık: ${aiResult.reasoning}\n\n`;

        // Overpayment kontrolü
        if (maxAllowed !== Infinity) {
          isOverpayment = withdrawal.amount > maxAllowed;
          overpaymentAmount = isOverpayment ? withdrawal.amount - maxAllowed : 0;
          
          if (isOverpayment) {
            calculationLog += `❌ HATA: FAZLA ÖDEME TESPİT EDİLDİ!\n`;
            calculationLog += `Çekilen: ${withdrawal.amount}₺\n`;
            calculationLog += `Max İzin Verilen: ${maxAllowed}₺\n`;
            calculationLog += `Fazla Ödeme: ${overpaymentAmount}₺\n`;
          } else {
            calculationLog += `✅ DOĞRU: Çekim limiti içinde\n`;
            calculationLog += `Çekilen: ${withdrawal.amount}₺\n`;
            calculationLog += `Max İzin Verilen: ${maxAllowed}₺\n`;
          }
        } else {
          calculationLog += `✅ DOĞRU: Sınırsız çekim (limit kontrolü yok)\n`;
        }
      } catch (error) {
        calculationLog += `⚠️ AI Hesaplama Hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n`;
        maxAllowed = 0;
      }
    } else if (!linkedDeposit) {
      calculationLog += `❌ HATA: Üye ID ${withdrawal.customer_id} için yatırım bulunamadı\n`;
      maxAllowed = 0;
    } else if (!linkedBonus) {
      calculationLog += `❌ HATA: Üye ID ${withdrawal.customer_id} için yatırım tarihinden sonraki bonus bulunamadı\n`;
      maxAllowed = 0;
    } else {
      // Bonussuz normal çekim
      calculationLog += `\nℹ️ BONUS YOK: Üye ID ${withdrawal.customer_id} için yatırım-bonus eşleşmesi bulunamadı\n`;
      calculationLog += `Limit kontrolü yapılamadı.\n`;
      maxAllowed = 0;
      isOverpayment = false;
      overpaymentAmount = 0;
    }

    // Bonus rule referansı (sadece log için)
    const bonusRule = linkedBonus
      ? bonusRules.find(br => {
          return br.bonus_name === linkedBonus.bonus_name ||
                 linkedBonus.bonus_name.includes(br.bonus_name) ||
                 br.bonus_name.includes(linkedBonus.bonus_name);
        })
      : null;

    // Update withdrawal record in database
    await supabase
      .from('withdrawals')
      .update({
        deposit_id: linkedDeposit?.id || null,
        bonus_id: linkedBonus?.id || null,
        max_allowed_withdrawal: maxAllowed === Infinity ? null : (maxAllowed || null),
        is_overpayment: isOverpayment,
        overpayment_amount: overpaymentAmount,
        processing_time_minutes: processingTimeMinutes
      })
      .eq('id', withdrawal.id);

    results.push({
      withdrawal: {
        ...withdrawal,
        deposit_id: linkedDeposit?.id || null,
        bonus_id: linkedBonus?.id || null,
        max_allowed_withdrawal: maxAllowed === Infinity ? null : maxAllowed,
        is_overpayment: isOverpayment,
        overpayment_amount: overpaymentAmount,
        processing_time_minutes: processingTimeMinutes
      },
      deposit: linkedDeposit || null,
      bonus: linkedBonus || null,
      bonusRule: bonusRule || null,
      maxAllowed,
      isOverpayment,
      overpaymentAmount,
      processingTimeMinutes,
      calculationLog
    });
  }

  return results;
}

// Fallback hesaplama fonksiyonu
function calculateFallbackMax(
  withdrawal: Withdrawal,
  deposit: Deposit | null,
  bonus: Bonus,
  rule: BonusRule
): number {
  if (rule.calculation_type === 'unlimited') {
    return Infinity;
  } else if (rule.calculation_type === 'fixed') {
    return (deposit?.amount || 0) + rule.fixed_amount;
  } else if (rule.calculation_type === 'multiplier') {
    if (deposit) {
      return deposit.amount * rule.multiplier;
    } else {
      return bonus.amount * rule.multiplier;
    }
  }
  return 0;
}
