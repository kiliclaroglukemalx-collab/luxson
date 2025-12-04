/**
 * AI Bonus Kural Motoru - Prompt Tabanlı
 * Her bonus için doğal dil prompt'u ile kural tanımlama ve hesaplama
 */

import { supabase } from '../lib/supabase';
import type { BonusRule, Deposit, Bonus, Withdrawal } from '../lib/supabase';

export interface AIRulePrompt {
  id: string;
  bonus_name: string;
  prompt: string; // Doğal dil kural açıklaması
  created_at?: string;
  updated_at?: string;
}

export interface AICalculationResult {
  maxAllowed: number;
  calculation: string;
  confidence: number;
  rule: AIRulePrompt | null;
  reasoning: string; // AI'ın mantığı
}

/**
 * Prompt'tan bonus kuralını çıkarır ve hesaplama yapar
 */
export function parseRuleFromPrompt(prompt: string): {
  calculationType: 'fixed' | 'multiplier' | 'unlimited';
  formula: string;
  multiplier?: number;
  fixedAmount?: number;
  confidence: number;
  reasoning: string;
} {
  const text = prompt.toLowerCase().trim();
  let confidence = 0.9;
  let reasoning = '';

  // Sınırsız bonuslar
  if (text.includes('sınırsız') || text.includes('unlimited') || 
      text.includes('freespin') || text.includes('free spin') ||
      text.includes('tam destek') || text.includes('kayıp bonusu') ||
      text.includes('limit yok') || text.includes('çekim limiti yok')) {
    reasoning = 'Prompt sınırsız çekim belirtiyor';
    return {
      calculationType: 'unlimited',
      formula: 'Infinity',
      confidence: 0.95,
      reasoning
    };
  }

  // Çarpan bazlı bonuslar
  const multiplierPatterns = [
    /(?:×|x|\*|çarp|çarpan|katı)\s*(\d+)/i,
    /(\d+)\s*(?:×|x|\*|kat|kez)/i,
    /(\d+)\s*(?:kadar|katına)/i
  ];

  for (const pattern of multiplierPatterns) {
    const match = text.match(pattern);
    if (match) {
      const multiplier = parseInt(match[1]);
      let base = 'deposit';
      
      if (text.includes('bonus')) {
        base = 'bonus';
        reasoning = `Bonus miktarının ${multiplier} katı çekilebilir`;
      } else if (text.includes('yatırım') || text.includes('deposit') || text.includes('anapara')) {
        base = 'deposit';
        reasoning = `Yatırım miktarının ${multiplier} katı çekilebilir`;
      } else if (text.includes('toplam') || text.includes('yatırım') && text.includes('bonus')) {
        base = 'deposit_bonus';
        reasoning = `Yatırım + Bonus toplamının ${multiplier} katı çekilebilir`;
      } else {
        reasoning = `Yatırım miktarının ${multiplier} katı çekilebilir (varsayılan)`;
        confidence = 0.8;
      }
      
      return {
        calculationType: 'multiplier',
        multiplier,
        formula: base === 'deposit_bonus' 
          ? `(deposit + bonus) * ${multiplier}`
          : `${base} * ${multiplier}`,
        confidence,
        reasoning
      };
    }
  }

  // Sabit tutar + yatırım
  const fixedPatterns = [
    /(?:artı|plus|\+)\s*(\d+)/i,
    /(\d+)\s*(?:tl|₺|lira)\s*(?:artı|plus|\+)/i,
    /yatırım\s*\+\s*(\d+)/i
  ];

  for (const pattern of fixedPatterns) {
    const match = text.match(pattern);
    if (match) {
      const fixedAmount = parseInt(match[1]);
      reasoning = `Yatırım miktarına ${fixedAmount}₺ eklenerek çekim yapılabilir`;
      return {
        calculationType: 'fixed',
        fixedAmount,
        formula: `deposit + ${fixedAmount}`,
        confidence: 0.85,
        reasoning
      };
    }
  }

  // Yüzde bazlı (örn: %25 kayıp bonusu)
  const percentMatch = text.match(/%\s*(\d+)/i);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    // Kayıp bonusları genelde sınırsız
    if (text.includes('kayıp') || text.includes('loss')) {
      reasoning = `%${percent} kayıp bonusu - sınırsız çekim`;
      return {
        calculationType: 'unlimited',
        formula: 'Infinity',
        confidence: 0.9,
        reasoning
      };
    }
  }

  // Varsayılan: Sınırsız (güven düşük)
  reasoning = 'Prompt belirsiz - varsayılan olarak sınırsız çekim';
  return {
    calculationType: 'unlimited',
    formula: 'Infinity',
    confidence: 0.6,
    reasoning
  };
}

/**
 * Bonus kuralını kullanarak maksimum çekim miktarını hesaplar
 * SABİT MANTIK: Üye ID'lerini karşılaştır, yatırım tarihinden sonraki ilk bonusu bul
 */
export function calculateMaxWithdrawalFromPrompt(
  prompt: string,
  deposit: Deposit | null,
  bonus: Bonus | null,
  withdrawal: Withdrawal
): AICalculationResult {
  const parsed = parseRuleFromPrompt(prompt);
  let maxAllowed = 0;
  let calculation = '';
  let reasoning = parsed.reasoning;

  // SABİT MANTIK: Üye ID kontrolü
  if (deposit && bonus && withdrawal) {
    const depositCustomerId = String(deposit.customer_id).trim();
    const bonusCustomerId = String(bonus.customer_id).trim();
    const withdrawalCustomerId = String(withdrawal.customer_id).trim();

    if (depositCustomerId !== bonusCustomerId || depositCustomerId !== withdrawalCustomerId) {
      return {
        maxAllowed: 0,
        calculation: 'Üye ID eşleşmiyor',
        confidence: 0,
        rule: null,
        reasoning: 'Üye ID\'leri eşleşmediği için hesaplama yapılamadı'
      };
    }

    // Yatırım tarihinden sonraki ilk bonus kontrolü
    const depositDate = new Date(deposit.deposit_date);
    const bonusDate = bonus.created_date 
      ? new Date(bonus.created_date) 
      : new Date(bonus.acceptance_date);

    if (bonusDate < depositDate) {
      return {
        maxAllowed: 0,
        calculation: 'Bonus yatırımdan önce',
        confidence: 0,
        rule: null,
        reasoning: 'Bonus yatırım tarihinden önce oluşturulmuş - bu yatırıma ait değil'
      };
    }
  }

  if (parsed.calculationType === 'unlimited') {
    maxAllowed = Infinity;
    calculation = 'Sınırsız çekim';
    reasoning += ' - Limit kontrolü yok';
  } else if (parsed.calculationType === 'multiplier') {
    if (parsed.formula.includes('deposit') && !parsed.formula.includes('bonus')) {
      if (deposit) {
        maxAllowed = deposit.amount * (parsed.multiplier || 1);
        calculation = `${deposit.amount} × ${parsed.multiplier} = ${maxAllowed}₺`;
        reasoning += ` - Yatırım: ${deposit.amount}₺, Çarpan: ${parsed.multiplier}`;
      } else {
        maxAllowed = 0;
        calculation = 'Yatırım bulunamadı';
        reasoning += ' - Yatırım kaydı yok';
        parsed.confidence *= 0.5;
      }
    } else if (parsed.formula.includes('bonus') && !parsed.formula.includes('deposit')) {
      if (bonus) {
        maxAllowed = bonus.amount * (parsed.multiplier || 1);
        calculation = `${bonus.amount} × ${parsed.multiplier} = ${maxAllowed}₺`;
        reasoning += ` - Bonus: ${bonus.amount}₺, Çarpan: ${parsed.multiplier}`;
      } else {
        maxAllowed = 0;
        calculation = 'Bonus bulunamadı';
        reasoning += ' - Bonus kaydı yok';
        parsed.confidence *= 0.5;
      }
    } else if (parsed.formula.includes('deposit + bonus')) {
      if (deposit && bonus) {
        maxAllowed = (deposit.amount + bonus.amount) * (parsed.multiplier || 1);
        calculation = `(${deposit.amount} + ${bonus.amount}) × ${parsed.multiplier} = ${maxAllowed}₺`;
        reasoning += ` - Yatırım: ${deposit.amount}₺, Bonus: ${bonus.amount}₺, Çarpan: ${parsed.multiplier}`;
      } else {
        maxAllowed = 0;
        calculation = 'Yatırım veya bonus bulunamadı';
        reasoning += ' - Eksik veri';
        parsed.confidence *= 0.5;
      }
    }
  } else if (parsed.calculationType === 'fixed') {
    if (deposit) {
      maxAllowed = deposit.amount + (parsed.fixedAmount || 0);
      calculation = `${deposit.amount} + ${parsed.fixedAmount} = ${maxAllowed}₺`;
      reasoning += ` - Yatırım: ${deposit.amount}₺, Sabit: ${parsed.fixedAmount}₺`;
    } else {
      maxAllowed = parsed.fixedAmount || 0;
      calculation = `Sabit tutar: ${maxAllowed}₺`;
      reasoning += ` - Yatırım yok, sadece sabit tutar: ${parsed.fixedAmount}₺`;
    }
  }

  return {
    maxAllowed,
    calculation,
    confidence: parsed.confidence,
    rule: null,
    reasoning
  };
}

/**
 * Tüm bonus kurallarını AI prompt'ları ile günceller
 */
export async function loadAIRulePrompts(): Promise<AIRulePrompt[]> {
  try {
    const { data, error } = await supabase
      .from('ai_bonus_rule_prompts')
      .select('*')
      .order('bonus_name');

    if (error) {
      console.error('Error loading AI prompts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error loading AI prompts:', err);
    return [];
  }
}

/**
 * AI prompt'u kaydeder
 */
export async function saveAIRulePrompt(prompt: AIRulePrompt): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_bonus_rule_prompts')
      .upsert({
        ...prompt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'bonus_name'
      });

    if (error) {
      console.error('Error saving AI prompt:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving AI prompt:', err);
    return false;
  }
}

/**
 * Çekim analizi için AI hesaplama yapar
 * SABİT MANTIK: Üye ID eşleştirme + yatırım tarihinden sonraki ilk bonus
 */
export async function calculateWithdrawalWithAIPrompt(
  withdrawal: Withdrawal
): Promise<AICalculationResult> {
  // 1. Üye ID'ye göre yatırımları bul
  const { data: deposits } = await supabase
    .from('deposits')
    .select('*')
    .eq('customer_id', String(withdrawal.customer_id).trim())
    .order('deposit_date', { ascending: true });

  if (!deposits || deposits.length === 0) {
    return {
      maxAllowed: 0,
      calculation: 'Yatırım bulunamadı',
      confidence: 0,
      rule: null,
      reasoning: `Üye ID ${withdrawal.customer_id} için yatırım kaydı bulunamadı`
    };
  }

  // 2. Üye ID'ye göre bonusları bul
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('*')
    .eq('customer_id', String(withdrawal.customer_id).trim())
    .order('acceptance_date', { ascending: true });

  if (!bonuses || bonuses.length === 0) {
    return {
      maxAllowed: 0,
      calculation: 'Bonus bulunamadı',
      confidence: 0,
      rule: null,
      reasoning: `Üye ID ${withdrawal.customer_id} için bonus kaydı bulunamadı`
    };
  }

  // 3. SABİT MANTIK: Her yatırım için, o yatırım tarihinden sonraki ilk bonusu bul
  let matchedDeposit: Deposit | null = null;
  let matchedBonus: Bonus | null = null;

  for (const deposit of deposits) {
    const depositDate = new Date(deposit.deposit_date);
    
    // Bu yatırımdan sonraki ilk bonusu bul
    const bonusAfterDeposit = bonuses.find(b => {
      const bonusDate = b.created_date 
        ? new Date(b.created_date) 
        : new Date(b.acceptance_date);
      return bonusDate >= depositDate;
    });

    if (bonusAfterDeposit) {
      matchedDeposit = deposit;
      matchedBonus = bonusAfterDeposit;
      break; // İlk eşleşmeyi al
    }
  }

  if (!matchedDeposit || !matchedBonus) {
    return {
      maxAllowed: 0,
      calculation: 'Eşleşme bulunamadı',
      confidence: 0,
      rule: null,
      reasoning: `Üye ID ${withdrawal.customer_id} için yatırım-bonus eşleşmesi bulunamadı`
    };
  }

  // 4. AI prompt'unu bul
  const { data: aiPrompt } = await supabase
    .from('ai_bonus_rule_prompts')
    .select('*')
    .or(`bonus_name.ilike.%${matchedBonus.bonus_name}%,bonus_name.ilike.%${matchedBonus.bonus_name.split(' ')[0]}%`)
    .limit(1)
    .maybeSingle();

  if (!aiPrompt) {
    return {
      maxAllowed: Infinity,
      calculation: 'AI prompt bulunamadı - varsayılan: sınırsız',
      confidence: 0.5,
      rule: null,
      reasoning: `"${matchedBonus.bonus_name}" için AI prompt tanımlanmamış`
    };
  }

  // 5. AI ile hesaplama yap
  const result = calculateMaxWithdrawalFromPrompt(
    aiPrompt.prompt,
    matchedDeposit,
    matchedBonus,
    withdrawal
  );

  result.rule = aiPrompt;
  result.reasoning = `Üye ID: ${withdrawal.customer_id}, Yatırım: ${matchedDeposit.amount}₺ (${matchedDeposit.deposit_date}), Bonus: ${matchedBonus.bonus_name} (${matchedBonus.amount}₺). ${result.reasoning}`;

  return result;
}
