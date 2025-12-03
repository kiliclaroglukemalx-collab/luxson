import { supabase } from '../lib/supabase';
import type { BonusRule, Deposit, Bonus, Withdrawal } from '../lib/supabase';

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
    .select('*');

  // Get all bonuses
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('*');

  // Get all bonus rules
  const { data: bonusRules } = await supabase
    .from('bonus_rules')
    .select('*');

  if (!deposits || !bonuses || !bonusRules) return results;

  for (const withdrawal of withdrawals) {
    const requestDate = new Date(withdrawal.request_date);
    const paymentDate = new Date(withdrawal.payment_date);

    // Calculate processing time
    const processingTimeMs = paymentDate.getTime() - requestDate.getTime();
    const processingTimeMinutes = Math.round(processingTimeMs / 1000 / 60);

    // Find bonuses for this customer that were accepted before the withdrawal
    const customerBonuses = bonuses.filter(b =>
      b.customer_id === withdrawal.customer_id &&
      new Date(b.acceptance_date) < requestDate
    );

    // Get the most recent bonus before this withdrawal
    const linkedBonus = customerBonuses.length > 0
      ? customerBonuses.reduce((latest, current) => {
          const latestDate = new Date(latest.acceptance_date);
          const currentDate = new Date(current.acceptance_date);
          return currentDate > latestDate ? current : latest;
        })
      : null;

    // Find the deposit linked to this bonus
    const closestDeposit = linkedBonus && linkedBonus.deposit_id
      ? deposits.find(d => d.id === linkedBonus.deposit_id)
      : null;

    // Find the bonus rule
    const bonusRule = linkedBonus
      ? bonusRules.find(br => {
          // Esnek eşleştirme - tam eşleşme veya içerme kontrolü
          return br.bonus_name === linkedBonus.bonus_name ||
                 linkedBonus.bonus_name.includes(br.bonus_name) ||
                 br.bonus_name.includes(linkedBonus.bonus_name);
        })
      : null;

    // Calculate max allowed withdrawal with advanced logic
    let maxAllowed = 0;
    let isOverpayment = false;
    let overpaymentAmount = 0;
    let calculationLog = '';

    if (linkedBonus && bonusRule) {
      calculationLog += `Bonus: ${linkedBonus.bonus_name}\n`;
      calculationLog += `Bonus Miktarı: ${linkedBonus.amount}₺\n`;
      
      if (closestDeposit) {
        calculationLog += `Deposit: ${closestDeposit.amount}₺\n`;
      }
      
      // Özel bonus mantığını kontrol et
      const specialLogic = SPECIAL_BONUS_LOGICS.find(logic => 
        linkedBonus.bonus_name.includes(logic.name) || logic.name.includes(linkedBonus.bonus_name)
      );
      
      if (specialLogic?.calculationOverride) {
        // Özel hesaplama mantığı kullan
        const override = specialLogic.calculationOverride(withdrawal, closestDeposit, linkedBonus, bonusRule);
        if (override) {
          maxAllowed = override.maxAllowed;
          calculationLog += override.log;
        }
      } else if (bonusRule.calculation_type === 'unlimited') {
        // Sınırsız çekim
        maxAllowed = Infinity;
        calculationLog += 'Hesaplama: Sınırsız çekim\n';
      } else if (bonusRule.max_withdrawal_formula && bonusRule.max_withdrawal_formula.trim()) {
        // Formül bazlı hesaplama - EN GELİŞMİŞ YÖNTEM
        try {
          const variables: Record<string, number> = {
            deposit: closestDeposit?.amount || 0,
            bonus: linkedBonus.amount,
            withdrawal: withdrawal.amount,
            multiplier: bonusRule.multiplier || 0,
            fixed: bonusRule.fixed_amount || 0,
          };
          
          maxAllowed = evaluateFormula(bonusRule.max_withdrawal_formula, variables);
          calculationLog += `Formül: ${bonusRule.max_withdrawal_formula}\n`;
          calculationLog += `Değişkenler: deposit=${variables.deposit}, bonus=${variables.bonus}, multiplier=${variables.multiplier}, fixed=${variables.fixed}\n`;
          calculationLog += `Hesaplanan Max: ${maxAllowed}₺\n`;
        } catch (error) {
          calculationLog += `Formül hatası! Fallback hesaplamaya geçiliyor.\n`;
          // Formül başarısız olursa fallback kullan
          maxAllowed = calculateFallbackMax(withdrawal, closestDeposit, linkedBonus, bonusRule);
          calculationLog += `Fallback Max: ${maxAllowed}₺\n`;
        }
      } else {
        // Klasik hesaplama tipleri
        if (bonusRule.calculation_type === 'fixed') {
          if (closestDeposit) {
            maxAllowed = closestDeposit.amount + bonusRule.fixed_amount;
            calculationLog += `Hesaplama: Deposit + Sabit Miktar = ${closestDeposit.amount} + ${bonusRule.fixed_amount} = ${maxAllowed}₺\n`;
          } else {
            maxAllowed = bonusRule.fixed_amount;
            calculationLog += `Hesaplama: Sabit Miktar = ${bonusRule.fixed_amount}₺\n`;
          }
        } else if (bonusRule.calculation_type === 'multiplier') {
          if (closestDeposit) {
            // Önce deposit * multiplier dene
            maxAllowed = closestDeposit.amount * bonusRule.multiplier;
            calculationLog += `Hesaplama: Deposit × Çarpan = ${closestDeposit.amount} × ${bonusRule.multiplier} = ${maxAllowed}₺\n`;
          } else {
            // Deposit yoksa bonus * multiplier
            maxAllowed = linkedBonus.amount * bonusRule.multiplier;
            calculationLog += `Hesaplama: Bonus × Çarpan = ${linkedBonus.amount} × ${bonusRule.multiplier} = ${maxAllowed}₺\n`;
          }
        }
      }

      // Overpayment kontrolü
      if (maxAllowed !== Infinity) {
        isOverpayment = withdrawal.amount > maxAllowed;
        overpaymentAmount = isOverpayment ? withdrawal.amount - maxAllowed : 0;
        
        if (isOverpayment) {
          calculationLog += `⚠️ FAZLA ÖDEME TESPİT EDİLDİ!\n`;
          calculationLog += `Çekilen: ${withdrawal.amount}₺ | Max İzin: ${maxAllowed}₺ | Fazla: ${overpaymentAmount}₺\n`;
        } else {
          calculationLog += `✓ Çekim limiti içinde: ${withdrawal.amount}₺ / ${maxAllowed}₺\n`;
        }
      }
    } else if (linkedBonus && !bonusRule) {
      // Bonus var ama kural bulunamadı - UYARI!
      calculationLog += `⚠️ UYARI: "${linkedBonus.bonus_name}" için kural bulunamadı!\n`;
      calculationLog += `Lütfen bonus kurallarını kontrol edin.\n`;
      maxAllowed = 0;
      isOverpayment = false;
      overpaymentAmount = 0;
    } else {
      // Bonussuz normal çekim
      calculationLog += 'Bonussuz çekim - Limit kontrolü yok\n';
      maxAllowed = 0;
      isOverpayment = false;
      overpaymentAmount = 0;
    }

    // Update withdrawal record in database
    await supabase
      .from('withdrawals')
      .update({
        deposit_id: closestDeposit?.id || null,
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
        deposit_id: closestDeposit?.id || null,
        bonus_id: linkedBonus?.id || null,
        max_allowed_withdrawal: maxAllowed === Infinity ? null : maxAllowed,
        is_overpayment: isOverpayment,
        overpayment_amount: overpaymentAmount,
        processing_time_minutes: processingTimeMinutes
      },
      deposit: closestDeposit || null,
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
