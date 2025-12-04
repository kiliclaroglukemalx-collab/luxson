/**
 * AI Bonus Kural Motoru
 * Bonus kurallarını doğal dilden okuyup otomatik hesaplama yapar
 */

import { supabase } from '../lib/supabase';
import type { BonusRule, Deposit, Bonus, Withdrawal } from '../lib/supabase';

export interface AICalculatedRule {
  bonusName: string;
  calculationType: 'fixed' | 'multiplier' | 'unlimited';
  multiplier?: number;
  fixedAmount?: number;
  formula: string;
  description: string;
  confidence: number;
}

export interface AICalculationResult {
  maxAllowed: number;
  calculation: string;
  confidence: number;
  rule: AICalculatedRule | null;
}

/**
 * Doğal dil açıklamasından bonus kuralını çıkarır
 */
export function parseBonusRuleFromText(description: string): AICalculatedRule | null {
  const text = description.toLowerCase().trim();
  
  // Sınırsız bonuslar
  if (text.includes('sınırsız') || text.includes('unlimited') || 
      text.includes('freespin') || text.includes('free spin') ||
      text.includes('tam destek') || text.includes('kayıp bonusu')) {
    return {
      bonusName: description,
      calculationType: 'unlimited',
      formula: 'Infinity',
      description,
      confidence: 0.95
    };
  }

  // Çarpan bazlı bonuslar
  const multiplierMatch = text.match(/(?:×|x|\*|çarp|çarpan)\s*(\d+)/i);
  if (multiplierMatch) {
    const multiplier = parseInt(multiplierMatch[1]);
    let base = 'deposit';
    
    if (text.includes('bonus')) {
      base = 'bonus';
    } else if (text.includes('yatırım') || text.includes('deposit')) {
      base = 'deposit';
    }
    
    return {
      bonusName: description,
      calculationType: 'multiplier',
      multiplier,
      formula: `${base} * ${multiplier}`,
      description,
      confidence: 0.9
    };
  }

  // Sabit tutar + yatırım
  const fixedMatch = text.match(/(?:artı|plus|\+)\s*(\d+)/i);
  if (fixedMatch) {
    const fixedAmount = parseInt(fixedMatch[1]);
    return {
      bonusName: description,
      calculationType: 'fixed',
      fixedAmount,
      formula: `deposit + ${fixedAmount}`,
      description,
      confidence: 0.85
    };
  }

  // Yüzde bazlı (örn: %25 kayıp bonusu)
  const percentMatch = text.match(/%\s*(\d+)/i);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    // Kayıp bonusları genelde sınırsız
    if (text.includes('kayıp') || text.includes('loss')) {
      return {
        bonusName: description,
        calculationType: 'unlimited',
        formula: 'Infinity',
        description,
        confidence: 0.9
      };
    }
  }

  // Varsayılan: Sınırsız
  return {
    bonusName: description,
    calculationType: 'unlimited',
    formula: 'Infinity',
    description,
    confidence: 0.7
  };
}

/**
 * Bonus kuralını kullanarak maksimum çekim miktarını hesaplar
 */
export function calculateMaxWithdrawal(
  rule: AICalculatedRule,
  deposit: Deposit | null,
  bonus: Bonus | null
): AICalculationResult {
  let maxAllowed = 0;
  let calculation = '';
  let confidence = rule.confidence;

  if (rule.calculationType === 'unlimited') {
    maxAllowed = Infinity;
    calculation = 'Sınırsız çekim';
  } else if (rule.calculationType === 'multiplier') {
    if (rule.formula.includes('deposit')) {
      if (deposit) {
        maxAllowed = deposit.amount * (rule.multiplier || 1);
        calculation = `${deposit.amount} × ${rule.multiplier} = ${maxAllowed}`;
      } else {
        maxAllowed = 0;
        calculation = 'Yatırım bulunamadı';
        confidence *= 0.5;
      }
    } else if (rule.formula.includes('bonus')) {
      if (bonus) {
        maxAllowed = bonus.amount * (rule.multiplier || 1);
        calculation = `${bonus.amount} × ${rule.multiplier} = ${maxAllowed}`;
      } else {
        maxAllowed = 0;
        calculation = 'Bonus bulunamadı';
        confidence *= 0.5;
      }
    }
  } else if (rule.calculationType === 'fixed') {
    if (deposit) {
      maxAllowed = deposit.amount + (rule.fixedAmount || 0);
      calculation = `${deposit.amount} + ${rule.fixedAmount} = ${maxAllowed}`;
    } else {
      maxAllowed = rule.fixedAmount || 0;
      calculation = `Sabit tutar: ${maxAllowed}`;
    }
  }

  return {
    maxAllowed,
    calculation,
    confidence,
    rule
  };
}

/**
 * Tüm bonus kurallarını AI ile analiz eder ve günceller
 */
export async function analyzeAndUpdateBonusRules(): Promise<{
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Mevcut bonus kurallarını al
    const { data: rules, error: rulesError } = await supabase
      .from('bonus_rules')
      .select('*');

    if (rulesError) throw rulesError;

    // Her kural için AI analizi yap
    for (const rule of rules || []) {
      try {
        // Eğer formül zaten varsa ve geçerliyse atla
        if (rule.max_withdrawal_formula && 
            rule.max_withdrawal_formula !== 'Sınırsız' &&
            rule.max_withdrawal_formula.trim() !== '') {
          continue;
        }

        // AI ile kuralı parse et
        const aiRule = parseBonusRuleFromText(rule.bonus_name);
        
        if (aiRule && aiRule.confidence > 0.7) {
          // Formülü oluştur
          let formula = '';
          if (aiRule.calculationType === 'unlimited') {
            formula = 'Sınırsız';
          } else if (aiRule.calculationType === 'multiplier') {
            if (aiRule.formula.includes('deposit')) {
              formula = `deposit * ${aiRule.multiplier}`;
            } else {
              formula = `bonus * ${aiRule.multiplier}`;
            }
          } else if (aiRule.calculationType === 'fixed') {
            formula = `deposit + ${aiRule.fixedAmount}`;
          }

          // Güncelle
          const { error: updateError } = await supabase
            .from('bonus_rules')
            .update({
              max_withdrawal_formula: formula,
              calculation_type: aiRule.calculationType,
              multiplier: aiRule.multiplier || 0,
              fixed_amount: aiRule.fixedAmount || 0
            })
            .eq('id', rule.id);

          if (updateError) {
            errors.push(`${rule.bonus_name}: ${updateError.message}`);
          } else {
            updated++;
          }
        }
      } catch (err) {
        errors.push(`${rule.bonus_name}: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      }
    }
  } catch (err) {
    errors.push(`Genel hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
  }

  return { updated, errors };
}

/**
 * Çekim analizi için AI hesaplama yapar
 */
export async function calculateWithdrawalWithAI(
  withdrawal: Withdrawal
): Promise<AICalculationResult> {
  // İlgili bonus ve yatırımı bul
  const { data: bonus } = await supabase
    .from('bonuses')
    .select('*')
    .eq('id', withdrawal.bonus_id || '')
    .maybeSingle();

  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', withdrawal.deposit_id || bonus?.deposit_id || '')
    .maybeSingle();

  // Bonus kuralını bul
  if (bonus) {
    const { data: rule } = await supabase
      .from('bonus_rules')
      .select('*')
      .or(`bonus_name.ilike.%${bonus.bonus_name}%,bonus_name.ilike.%${bonus.bonus_name.split(' ')[0]}%`)
      .limit(1)
      .maybeSingle();

    if (rule) {
      // AI ile parse et
      const aiRule = parseBonusRuleFromText(rule.bonus_name);
      if (aiRule) {
        return calculateMaxWithdrawal(aiRule, deposit || null, bonus || null);
      }
    }
  }

  // Varsayılan: Sınırsız
  return {
    maxAllowed: Infinity,
    calculation: 'Bonus kuralı bulunamadı - varsayılan: sınırsız',
    confidence: 0.5,
    rule: null
  };
}

