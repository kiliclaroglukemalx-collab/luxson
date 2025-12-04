/**
 * Doğal dil formül parser'ı
 * Kullanıcının yazdığı yorumları matematiksel formüllere çevirir
 */

export interface ParsedFormula {
  formula: string;
  description: string;
  confidence: number; // 0-1 arası güven skoru
}

/**
 * Doğal dil yorumunu matematiksel formüle çevirir
 */
export function parseNaturalLanguageFormula(text: string): ParsedFormula | null {
  if (!text || text.trim() === '') return null;

  const lowerText = text.toLowerCase().trim();
  let formula = '';
  let description = '';
  let confidence = 0.5;

  // Maksimum tutar tespiti
  const maxMatch = lowerText.match(/maksimum\s+(\d+)\s*(?:tl|₺|lira)/i);
  if (maxMatch) {
    const maxAmount = parseInt(maxMatch[1]);
    formula = `Math.min(deposit + bonus, ${maxAmount})`;
    description = `Maksimum ${maxAmount}₺ çekim limiti`;
    confidence = 0.9;
    return { formula, description, confidence };
  }

  // Yatırım miktarı kontrolü
  const depositMatch = lowerText.match(/yatırım\s+miktarı\s+(\d+)\s*(?:tl|₺|lira)/i);
  if (depositMatch) {
    const depositAmount = parseInt(depositMatch[1]);
    
    // "altı ve üstü olursa inisiyatif" kontrolü
    if (lowerText.includes('altı') && lowerText.includes('üstü') && lowerText.includes('inisiyatif')) {
      // Esnek yatırım - belirli bir aralık
      const tolerance = depositAmount * 0.2; // %20 tolerans
      formula = `deposit >= ${depositAmount - tolerance} && deposit <= ${depositAmount + tolerance} ? deposit + bonus : deposit * 1.5`;
      description = `Yatırım ${depositAmount}₺ civarında ise deposit + bonus, değilse deposit * 1.5`;
      confidence = 0.7;
    } else {
      // Sabit yatırım miktarı
      formula = `deposit >= ${depositAmount} ? deposit + bonus : 0`;
      description = `Yatırım en az ${depositAmount}₺ olmalı`;
      confidence = 0.8;
    }
    return { formula, description, confidence };
  }

  // Çarpan tespiti
  const multiplierMatch = lowerText.match(/(?:çarp|kat|×|x)\s*(\d+)/i);
  if (multiplierMatch) {
    const multiplier = parseInt(multiplierMatch[1]);
    
    if (lowerText.includes('bonus')) {
      formula = `bonus * ${multiplier}`;
      description = `Bonus × ${multiplier}`;
      confidence = 0.9;
    } else if (lowerText.includes('yatırım') || lowerText.includes('deposit')) {
      formula = `deposit * ${multiplier}`;
      description = `Yatırım × ${multiplier}`;
      confidence = 0.9;
    } else if (lowerText.includes('toplam') || lowerText.includes('deposit + bonus')) {
      formula = `(deposit + bonus) * ${multiplier}`;
      description = `(Yatırım + Bonus) × ${multiplier}`;
      confidence = 0.9;
    }
    
    if (formula) return { formula, description, confidence };
  }

  // Toplam tespiti
  if (lowerText.includes('toplam') || (lowerText.includes('yatırım') && lowerText.includes('bonus'))) {
    formula = 'deposit + bonus';
    description = 'Yatırım + Bonus';
    confidence = 0.7;
    return { formula, description, confidence };
  }

  // Sadece bonus
  if (lowerText.includes('bonus') && !lowerText.includes('yatırım') && !lowerText.includes('deposit')) {
    const bonusMultiplier = multiplierMatch ? parseInt(multiplierMatch[1]) : 1;
    formula = `bonus * ${bonusMultiplier}`;
    description = `Bonus × ${bonusMultiplier}`;
    confidence = 0.8;
    return { formula, description, confidence };
  }

  // Sadece yatırım
  if ((lowerText.includes('yatırım') || lowerText.includes('deposit')) && !lowerText.includes('bonus')) {
    const depositMultiplier = multiplierMatch ? parseInt(multiplierMatch[1]) : 1;
    formula = `deposit * ${depositMultiplier}`;
    description = `Yatırım × ${depositMultiplier}`;
    confidence = 0.8;
    return { formula, description, confidence };
  }

  // Eğer hiçbir pattern eşleşmezse, orijinal metni döndür
  return {
    formula: text,
    description: 'Manuel formül (parse edilemedi)',
    confidence: 0.3
  };
}

/**
 * Formülü güvenli bir şekilde değerlendirir
 */
export function evaluateFormula(formula: string, variables: Record<string, number>): number {
  try {
    // Güvenlik: Sadece matematiksel ifadeler
    const safeFormula = formula
      .replace(/Math\.(min|max|abs|floor|ceil|round)\(/g, 'Math.$1(')
      .replace(/[^0-9+\-*/().\sdepositbonusmultiplierfixedMath,]/g, '');

    let expression = safeFormula;
    
    // Değişkenleri değiştir
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }

    // Math fonksiyonlarını koru
    expression = expression.replace(/Math\.min\(([^)]+)\)/g, (match, args) => {
      const values = args.split(',').map(v => parseFloat(v.trim()));
      return Math.min(...values).toString();
    });

    expression = expression.replace(/Math\.max\(([^)]+)\)/g, (match, args) => {
      const values = args.split(',').map(v => parseFloat(v.trim()));
      return Math.max(...values).toString();
    });

    // Koşullu ifadeleri işle (basit ternary)
    if (expression.includes('?')) {
      const parts = expression.split('?');
      if (parts.length === 2) {
        const condition = parts[0].trim();
        const thenElse = parts[1].split(':');
        if (thenElse.length === 2) {
          const conditionResult = evaluateSimpleCondition(condition);
          expression = conditionResult ? thenElse[0].trim() : thenElse[1].trim();
        }
      }
    }

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)();
    
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (error) {
    console.error('Formula evaluation error:', error, formula);
    return 0;
  }
}

function evaluateSimpleCondition(condition: string): boolean {
  try {
    // Basit karşılaştırmalar: >=, <=, >, <, ==
    if (condition.includes('>=')) {
      const [left, right] = condition.split('>=').map(s => parseFloat(s.trim()));
      return left >= right;
    }
    if (condition.includes('<=')) {
      const [left, right] = condition.split('<=').map(s => parseFloat(s.trim()));
      return left <= right;
    }
    if (condition.includes('>')) {
      const [left, right] = condition.split('>').map(s => parseFloat(s.trim()));
      return left > right;
    }
    if (condition.includes('<')) {
      const [left, right] = condition.split('<').map(s => parseFloat(s.trim()));
      return left < right;
    }
    if (condition.includes('==')) {
      const [left, right] = condition.split('==').map(s => parseFloat(s.trim()));
      return left === right;
    }
    return false;
  } catch {
    return false;
  }
}

