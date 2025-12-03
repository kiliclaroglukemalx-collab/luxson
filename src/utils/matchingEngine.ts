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

    // YENİ MANTIK: Yatırım → Bonus → Çekim kontrolü
    // 1. Bu müşterinin yatırımlarını bul (customer_id eşleştirmesi - trim ve normalize)
    const normalizeCustomerId = (id: string | number) => String(id).trim();
    const withdrawalCustomerId = normalizeCustomerId(withdrawal.customer_id);
    
    const customerDeposits = deposits.filter(d => 
      normalizeCustomerId(d.customer_id) === withdrawalCustomerId
    ).sort((a, b) => 
      new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
    );

    let linkedDeposit: Deposit | null = null;
    let linkedBonus: Bonus | null = null;

    console.log(`[DEBUG] Çekim analizi: Müşteri ${withdrawalCustomerId}, Yatırım sayısı: ${customerDeposits.length}, Bonus sayısı: ${bonuses.filter(b => normalizeCustomerId(b.customer_id) === withdrawalCustomerId).length}`);

    // 2. Her yatırım için, yatırımdan hemen sonra bonus var mı kontrol et
    for (const deposit of customerDeposits) {
      const depositDate = new Date(deposit.deposit_date);
      
      // Bu yatırımdan sonra gelen bonusları bul (created_date veya acceptance_date'e göre)
      const bonusesAfterDeposit = bonuses.filter(b => {
        if (normalizeCustomerId(b.customer_id) !== withdrawalCustomerId) return false;
        
        // Bonus tarihini kontrol et (created_date varsa onu kullan, yoksa acceptance_date)
        const bonusDate = b.created_date 
          ? new Date(b.created_date) 
          : new Date(b.acceptance_date);
        
        // Yatırımdan sonra gelen bonus (makul bir süre içinde, örn. 90 gün - daha esnek)
        const daysDiff = (bonusDate.getTime() - depositDate.getTime()) / (1000 * 60 * 60 * 24);
        return bonusDate > depositDate && daysDiff <= 90; // 30'dan 90'a çıkardık
      });

      if (bonusesAfterDeposit.length > 0) {
        // En yakın (ilk) bonusu seç
        const closestBonus = bonusesAfterDeposit.reduce((closest, current) => {
          const closestDate = current.created_date 
            ? new Date(current.created_date) 
            : new Date(current.acceptance_date);
          const currentDate = current.created_date 
            ? new Date(current.created_date) 
            : new Date(current.acceptance_date);
          return currentDate < closestDate ? current : closest;
        });

        // Bu bonus çekimden önce mi kontrol et
        const bonusDate = closestBonus.created_date 
          ? new Date(closestBonus.created_date) 
          : new Date(closestBonus.acceptance_date);
        
        if (bonusDate < requestDate) {
          linkedDeposit = deposit;
          linkedBonus = closestBonus;
          console.log(`[DEBUG] Eşleşme bulundu: Yatırım ${deposit.id} → Bonus ${closestBonus.id} (${closestBonus.bonus_name})`);
          break; // İlk eşleşen yatırım-bonus çiftini kullan
        }
      }
    }

    // Eğer yukarıdaki mantıkla bulunamadıysa, eski mantığı kullan (geriye dönük uyumluluk)
    if (!linkedBonus) {
      console.log(`[DEBUG] Yatırım-bonus eşleştirmesi bulunamadı, eski mantığa geçiliyor...`);
      
      // Find bonuses for this customer that were accepted before the withdrawal
      // Customer ID'yi normalize et
      const customerBonuses = bonuses.filter(b => {
        const bonusCustomerId = normalizeCustomerId(b.customer_id);
        const bonusDate = b.created_date 
          ? new Date(b.created_date) 
          : new Date(b.acceptance_date);
        return bonusCustomerId === withdrawalCustomerId && bonusDate < requestDate;
      });

      console.log(`[DEBUG] Müşteri ${withdrawalCustomerId} için çekimden önce ${customerBonuses.length} bonus bulundu`);

      // Get the most recent bonus before this withdrawal
      linkedBonus = customerBonuses.length > 0
        ? customerBonuses.reduce((latest, current) => {
            const latestDate = current.created_date 
              ? new Date(current.created_date) 
              : new Date(current.acceptance_date);
            const currentDate = current.created_date 
              ? new Date(current.created_date) 
              : new Date(current.acceptance_date);
            return currentDate > latestDate ? current : latest;
          })
        : null;

      // Find the deposit linked to this bonus
      linkedDeposit = linkedBonus && linkedBonus.deposit_id
        ? deposits.find(d => d.id === linkedBonus!.deposit_id) || null
        : null;
      
      if (linkedBonus) {
        console.log(`[DEBUG] Eski mantıkla eşleşme bulundu: Bonus ${linkedBonus.id} (${linkedBonus.bonus_name})`);
      } else {
        console.log(`[DEBUG] Hiçbir bonus bulunamadı! Müşteri: ${withdrawalCustomerId}, Çekim tarihi: ${requestDate.toISOString()}`);
        // Tüm bonusları logla (debug için)
        const allCustomerBonuses = bonuses.filter(b => 
          normalizeCustomerId(b.customer_id) === withdrawalCustomerId
        );
        if (allCustomerBonuses.length > 0) {
          console.log(`[DEBUG] Müşterinin tüm bonusları:`, allCustomerBonuses.map(b => ({
            id: b.id,
            bonus_name: b.bonus_name,
            acceptance_date: b.acceptance_date,
            created_date: b.created_date,
            customer_id: b.customer_id
          })));
        }
      }
    }

    // 3. Bonus kuralını bul
    const bonusRule = linkedBonus
      ? bonusRules.find(br => {
          // Esnek eşleştirme - tam eşleşme veya içerme kontrolü
          return br.bonus_name === linkedBonus.bonus_name ||
                 linkedBonus.bonus_name.includes(br.bonus_name) ||
                 br.bonus_name.includes(linkedBonus.bonus_name);
        })
      : null;

    // 4. Çekim limiti hesapla ve kontrol et
    let maxAllowed = 0;
    let isOverpayment = false;
    let overpaymentAmount = 0;
    let calculationLog = '';
    let status: 'DOĞRU' | 'HATA' | 'BONUS_YOK' | 'KURAL_YOK' = 'BONUS_YOK';

    if (linkedBonus && bonusRule) {
      calculationLog += `=== ÇEKİM HATA RAPORU ===\n`;
      calculationLog += `Müşteri: ${withdrawal.customer_id}\n`;
      calculationLog += `Çekim Miktarı: ${withdrawal.amount}₺\n`;
      calculationLog += `Çekim Tarihi: ${new Date(withdrawal.request_date).toLocaleString('tr-TR')}\n\n`;
      
      if (linkedDeposit) {
        calculationLog += `Yatırım: ${linkedDeposit.amount}₺ (${new Date(linkedDeposit.deposit_date).toLocaleString('tr-TR')})\n`;
      }
      
      calculationLog += `Bonus: ${linkedBonus.bonus_name}\n`;
      calculationLog += `Bonus Miktarı: ${linkedBonus.amount}₺\n`;
      const bonusDate = linkedBonus.created_date 
        ? new Date(linkedBonus.created_date) 
        : new Date(linkedBonus.acceptance_date);
      calculationLog += `Bonus Tarihi: ${bonusDate.toLocaleString('tr-TR')}\n\n`;
      
      // Özel bonus mantığını kontrol et
      const specialLogic = SPECIAL_BONUS_LOGICS.find(logic => 
        linkedBonus.bonus_name.includes(logic.name) || logic.name.includes(linkedBonus.bonus_name)
      );
      
      if (specialLogic?.calculationOverride) {
        // Özel hesaplama mantığı kullan
        const override = specialLogic.calculationOverride(withdrawal, linkedDeposit, linkedBonus, bonusRule);
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
            deposit: linkedDeposit?.amount || 0,
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
          if (linkedDeposit) {
            maxAllowed = linkedDeposit.amount + bonusRule.fixed_amount;
            calculationLog += `Hesaplama: Deposit + Sabit Miktar = ${linkedDeposit.amount} + ${bonusRule.fixed_amount} = ${maxAllowed}₺\n`;
          } else {
            maxAllowed = bonusRule.fixed_amount;
            calculationLog += `Hesaplama: Sabit Miktar = ${bonusRule.fixed_amount}₺\n`;
          }
        } else if (bonusRule.calculation_type === 'multiplier') {
          if (linkedDeposit) {
            // Önce deposit * multiplier dene
            maxAllowed = linkedDeposit.amount * bonusRule.multiplier;
            calculationLog += `Hesaplama: Deposit × Çarpan = ${linkedDeposit.amount} × ${bonusRule.multiplier} = ${maxAllowed}₺\n`;
          } else {
            // Deposit yoksa bonus * multiplier
            maxAllowed = linkedBonus.amount * bonusRule.multiplier;
            calculationLog += `Hesaplama: Bonus × Çarpan = ${linkedBonus.amount} × ${bonusRule.multiplier} = ${maxAllowed}₺\n`;
          }
        }
      }

      // 5. Fazla ödeme kontrolü - HATA veya DOĞRU not et
      if (maxAllowed !== Infinity) {
        isOverpayment = withdrawal.amount > maxAllowed;
        overpaymentAmount = isOverpayment ? withdrawal.amount - maxAllowed : 0;
        
        if (isOverpayment) {
          status = 'HATA';
          calculationLog += `\n❌ HATA: FAZLA ÖDEME TESPİT EDİLDİ!\n`;
          calculationLog += `Çekilen: ${withdrawal.amount}₺\n`;
          calculationLog += `Max İzin Verilen: ${maxAllowed}₺\n`;
          calculationLog += `Fazla Ödeme: ${overpaymentAmount}₺\n`;
        } else {
          status = 'DOĞRU';
          calculationLog += `\n✅ DOĞRU: Çekim limiti içinde\n`;
          calculationLog += `Çekilen: ${withdrawal.amount}₺\n`;
          calculationLog += `Max İzin Verilen: ${maxAllowed}₺\n`;
        }
      } else {
        // Sınırsız çekim
        status = 'DOĞRU';
        calculationLog += `\n✅ DOĞRU: Sınırsız çekim (limit kontrolü yok)\n`;
      }
    } else if (linkedBonus && !bonusRule) {
      // Bonus var ama kural bulunamadı
      status = 'KURAL_YOK';
      calculationLog += `\n⚠️ UYARI: "${linkedBonus.bonus_name}" için kural bulunamadı!\n`;
      calculationLog += `Lütfen bonus kurallarını kontrol edin.\n`;
      maxAllowed = 0;
      isOverpayment = false;
      overpaymentAmount = 0;
    } else {
      // Bonussuz normal çekim
      status = 'BONUS_YOK';
      calculationLog += `\nℹ️ BONUS YOK: Bu çekim için eşleşen bonus bulunamadı\n`;
      calculationLog += `Limit kontrolü yapılamadı.\n`;
      maxAllowed = 0;
      isOverpayment = false;
      overpaymentAmount = 0;
    }

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
      calculationLog: calculationLog + `\n📊 DURUM: ${status}\n`
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
