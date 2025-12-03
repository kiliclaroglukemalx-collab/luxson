import * as XLSX from 'xlsx';

export interface ParsedDeposit {
  customer_id: string;
  amount: number;
  deposit_date: string;
}

export interface ParsedBonus {
  customer_id: string;
  bonus_name: string;
  amount: number;
  acceptance_date: string;
  created_date?: string;
  created_by?: string;
  btag?: string;
}

export interface ParsedWithdrawal {
  customer_id: string;
  amount: number;
  request_date: string;
  approval_date: string;
  rejection_date?: string;
  staff_name: string;
  konum?: string;
  btag?: string;
}

// Sütun ismi eşleştirme haritaları
const COLUMN_MAPPINGS = {
  deposits: {
    'Oyuncu Kimliği': 'customer_id',
    'Miktar': 'amount',
    'Değiştirildi': 'deposit_date',
  },
  bonuses: {
    'Müşteri Kimliği': 'customer_id',
    'Customer ID': 'customer_id',
    'Oyuncu Kimliği': 'customer_id',
    'Partner Bonusu Harici Kimliği': 'customer_id', // Alternatif
    'Adı': 'bonus_name',
    'Bonus Adı': 'bonus_name',
    'Bonus Name': 'bonus_name',
    'Kabul Tarihi': 'acceptance_date',
    'Acceptance Date': 'acceptance_date',
    'Toplam Ödenen Miktar': 'amount',
    'Toplam Ödenen Miktar (TRY)': 'amount',
    'Miktar': 'amount',
    'Amount': 'amount',
    'Oluşturuldu': 'created_date',
    'Created Date': 'created_date',
    'tarafından oluşturuldu': 'created_by',
    'Created By': 'created_by',
    'BTag': 'btag',
    'B-Tag': 'btag',
  },
  withdrawals: {
    'Oyuncu Kimliği': 'customer_id',
    'Miktar': 'amount',
    'İstek Zamanı': 'request_date',
    'Zaman Ver': 'approval_date',
    'Kullanıcıyı Reddet': 'rejection_date',
    'Kullanıcıya İzin Ver': 'approval_date_alt', // Alternatif
    'Kullanıcı': 'staff_name', // Fallback
    'Personel': 'staff_name',
    'Konum': 'konum',
    'BTag': 'btag',
  }
};

// Akıllı sütun bulma fonksiyonu
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim();
    for (const name of possibleNames) {
      if (header.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(header.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

// Sütun haritası oluşturma
function buildColumnMap(headers: string[], mappings: Record<string, string>): Record<string, number> {
  const columnMap: Record<string, number> = {};
  
  for (const [originalName, fieldName] of Object.entries(mappings)) {
    const index = findColumnIndex(headers, [originalName]);
    if (index !== -1) {
      columnMap[fieldName] = index;
    }
  }
  
  return columnMap;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Geçersiz değerleri kontrol et (sayı içermeyen veya çok kısa olan)
  if (trimmed.length < 5 || !/\d/.test(trimmed)) {
    console.warn(`Invalid date format: "${trimmed}"`);
    return null;
  }
  
  // ISO format zaten geçerliyse direkt döndür
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // DD-MM-YY HH:MM:SS veya DD/MM/YY HH:MM:SS format
  const parts = trimmed.split(' ');
  if (parts.length >= 1) {
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const dateComponents = datePart.split(/[-\/]/);
    if (dateComponents.length === 3) {
      let [day, month, year] = dateComponents;
      
      // Sayısal değerleri kontrol et
      if (!/^\d+$/.test(day) || !/^\d+$/.test(month) || !/^\d+$/.test(year)) {
        console.warn(`Invalid date components: "${trimmed}"`);
        return null;
      }
      
      // Convert 2-digit year to 4-digit (20XX)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        // 00-50 arası 2000-2050, 51-99 arası 1951-1999 olarak yorumla
        year = yearNum <= 50 ? `20${year.padStart(2, '0')}` : `19${year.padStart(2, '0')}`;
      }
      
      // Tarih formatını düzelt (DD-MM-YY -> YYYY-MM-DD)
      const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;
      const date = new Date(dateString);
      
      // Geçerli tarih kontrolü
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: "${trimmed}" -> "${dateString}"`);
        return null;
      }
      
      return date.toISOString();
    }
  }
  
  // Son çare: Date constructor ile dene
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  console.warn(`Could not parse date: "${trimmed}"`);
  return null;
}

export function parseDepositFile(content: string): ParsedDeposit[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const deposits: ParsedDeposit[] = [];
  const headers = lines[0].split('\t').map(h => h.trim());
  
  // Sütun haritası oluştur
  const columnMap = buildColumnMap(headers, COLUMN_MAPPINGS.deposits);
  
  console.log('Deposit Headers:', headers);
  console.log('Deposit Column Map:', columnMap);
  
  // Veri satırlarını işle
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t').map(col => col.trim());
    
    if (columns.length < 2) continue;
    
    const customer_id = columnMap.customer_id !== undefined ? columns[columnMap.customer_id] : columns[0];
    const amount = columnMap.amount !== undefined ? columns[columnMap.amount] : columns[1];
    const deposit_date = columnMap.deposit_date !== undefined ? columns[columnMap.deposit_date] : columns[2];
    
    if (customer_id && amount) {
      const parsedDate = parseDate(deposit_date || '');
      if (!parsedDate) {
        console.warn(`Skipping deposit record: invalid deposit_date "${deposit_date}"`);
        continue;
      }
      
      deposits.push({
        customer_id,
        amount: parseFloat(amount.replace(/[^\d.-]/g, '') || '0'),
        deposit_date: parsedDate
      });
    }
  }
  
  console.log('Parsed deposits:', deposits.length);
  return deposits;
}

export function parseBonusFile(content: string): ParsedBonus[] {
  if (!content || content.trim().length === 0) {
    console.error('Bonus file content is empty');
    return [];
  }

  // Hem \n hem de \r\n için split
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    console.error('Bonus file has less than 2 lines (header + data)');
    console.log('Content preview:', content.substring(0, 500));
    return [];
  }
  
  const bonuses: ParsedBonus[] = [];
  
  // Hem tab hem de virgül ile ayrılmış dosyaları destekle
  // Delimiter'ı daha esnek algıla - tab, virgül, pipe, slash
  const detectDelimiter = (line: string): string => {
    const tabCount = (line.match(/\t/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const pipeCount = (line.match(/\|/g) || []).length;
    
    if (tabCount > commaCount && tabCount > pipeCount) return '\t';
    if (pipeCount > commaCount) return '|';
    if (commaCount > 0) return ',';
    return '\t'; // Default
  };
  
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(new RegExp(`[${delimiter === '\t' ? '\\t' : delimiter}]`)).map(h => h.trim()).filter(h => h);
  
  // Sütun haritası oluştur
  const columnMap = buildColumnMap(headers, COLUMN_MAPPINGS.bonuses);
  
  console.log('Bonus Headers:', headers);
  console.log('Bonus Column Map:', columnMap);
  console.log('Delimiter detected:', delimiter === '\t' ? 'TAB' : delimiter);
  console.log('Total lines:', lines.length);
  
  // Veri satırlarını işle
  for (let i = 1; i < lines.length; i++) {
    // Her satır için delimiter'ı tekrar algıla (bazı satırlarda farklı olabilir)
    const lineDelimiter = detectDelimiter(lines[i]);
    const splitPattern = new RegExp(`[${lineDelimiter === '\t' ? '\\t' : lineDelimiter}]`);
    const columns = lines[i].split(splitPattern).map(col => col.trim()).filter(col => col);
    
    if (columns.length < 2) {
      console.warn(`Skipping line ${i}: insufficient columns (${columns.length})`);
      continue;
    }
    
    // Sütun mapping varsa kullan, yoksa sırayla al
    const customer_id = columnMap.customer_id !== undefined ? columns[columnMap.customer_id] : columns[0];
    
    // Bonus adını bul - genellikle 4. sütunda (index 3) veya "%", "FREESPIN", "BONUS" içeren sütunda
    let bonus_name: string | undefined;
    if (columnMap.bonus_name !== undefined) {
      bonus_name = columns[columnMap.bonus_name];
    } else {
      // Önce 4. sütunu kontrol et (index 3) - Excel formatında genellikle burada
      if (columns[3] && columns[3].trim()) {
        const col3 = columns[3].trim();
        // Eğer "%", "BONUS", "FREESPIN", "DENEME" içeriyorsa veya uzunsa bonus adıdır
        if (col3.includes('%') || col3.includes('BONUS') || col3.includes('FREESPIN') || 
            col3.includes('DENEME') || col3.includes('CASİNO') || col3.length > 15) {
          bonus_name = col3;
        }
      }
      
      // Hala bulunamadıysa, tüm sütunlarda ara
      if (!bonus_name) {
        for (let j = 1; j < Math.min(columns.length, 10); j++) {
          const col = columns[j]?.trim() || '';
          if (col && (col.includes('%') || col.includes('BONUS') || col.includes('FREESPIN') || 
                      col.includes('DENEME') || col.includes('CASİNO') || 
                      (col.length > 15 && !/^\d+$/.test(col) && !/\d{1,2}[-\/]\d{1,2}/.test(col)))) {
            bonus_name = col;
            break;
          }
        }
      }
      
      // Son çare: 4. sütunu kullan
      if (!bonus_name && columns[3]) {
        bonus_name = columns[3].trim();
      }
    }
    
    // Tarih alanlarını daha güvenli şekilde bul - "02-12-25 00:00:28" formatı
    let acceptance_date: string | undefined;
    if (columnMap.acceptance_date !== undefined) {
      acceptance_date = columns[columnMap.acceptance_date];
    } else {
      // Tarih formatını ara: DD-MM-YY HH:MM:SS veya benzeri
      // Genellikle 8. sütunda (index 7) veya sonraki sütunlarda
      for (let j = 7; j < columns.length; j++) {
        const col = columns[j]?.trim() || '';
        if (col && (/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}/.test(col) || 
                    /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(col) || 
                    /^\d{4}-\d{2}-\d{2}/.test(col))) {
          acceptance_date = col;
          break;
        }
      }
      // Eğer 7. sütundan sonra bulunamadıysa, tüm sütunlarda ara
      if (!acceptance_date) {
        for (let j = 0; j < columns.length; j++) {
          const col = columns[j]?.trim() || '';
          if (col && (/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}/.test(col) || 
                      /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(col) || 
                      /^\d{4}-\d{2}-\d{2}/.test(col))) {
            acceptance_date = col;
            break;
          }
        }
      }
    }
    
    // Amount'u bul - genellikle son sütunlarda veya "Toplam Ödenen Miktar" sütununda
    let amount: string | undefined;
    if (columnMap.amount !== undefined) {
      amount = columns[columnMap.amount];
    } else {
      // Amount'u sondan başlayarak ara (genellikle son 3 sütundan birinde)
      // Önce son sütunu kontrol et
      if (columns[columns.length - 1]) {
        const lastCol = columns[columns.length - 1].trim();
        const numValue = parseFloat(lastCol.replace(/[^\d.-]/g, ''));
        if (!isNaN(numValue) && numValue > 0 && !/\d{1,2}[-\/]\d{1,2}/.test(lastCol)) {
          amount = lastCol;
        }
      }
      
      // Son sütun amount değilse, sondan başlayarak ara
      if (!amount) {
        for (let j = columns.length - 1; j >= Math.max(0, columns.length - 5); j--) {
          const col = columns[j]?.trim() || '';
          // Sayısal değer içeriyorsa ve tarih değilse amount olabilir
          if (col && !/\d{1,2}[-\/]\d{1,2}/.test(col)) {
            const numValue = parseFloat(col.replace(/[^\d.-]/g, ''));
            if (!isNaN(numValue) && numValue > 0) {
              amount = col;
              break;
            }
          }
        }
      }
      
      // Hala bulunamadıysa, "Toplam Ödenen Miktar" sütununu ara
      if (!amount && headers.includes('Toplam Ödenen Miktar')) {
        const amountColIndex = headers.indexOf('Toplam Ödenen Miktar');
        if (amountColIndex >= 0 && columns[amountColIndex]) {
          amount = columns[amountColIndex].trim();
        }
      }
    }
    
    const created_date = columnMap.created_date !== undefined ? columns[columnMap.created_date] : undefined;
    const created_by = columnMap.created_by !== undefined ? columns[columnMap.created_by] : undefined;
    const btag = columnMap.btag !== undefined ? columns[columnMap.btag] : undefined;
    
    // Minimum gereksinimler: customer_id, bonus_name, amount
    if (!customer_id || !bonus_name || !amount) {
      console.warn(`Skipping line ${i}: missing required fields`, {
        customer_id: customer_id || 'MISSING',
        bonus_name: bonus_name || 'MISSING',
        amount: amount || 'MISSING',
        columnCount: columns.length,
        allColumns: columns.slice(0, 10),
        firstFewColumns: columns.slice(0, 5).map((c, idx) => `[${idx}]: "${c}"`).join(', ')
      });
      // İlk birkaç satırı detaylı göster
      if (i <= 3) {
        console.log(`Line ${i} detailed:`, {
          rawLine: lines[i].substring(0, 200),
          columns: columns,
          customer_id_index: columnMap.customer_id ?? 0,
          bonus_name_index: columnMap.bonus_name ?? 'auto-detect',
          amount_index: columnMap.amount ?? 'auto-detect'
        });
      }
      continue;
    }
    
    // Tarih validasyonu - sadece gerçek tarih formatlarını kabul et
    const parsedAcceptanceDate = acceptance_date ? parseDate(acceptance_date) : null;
    const parsedCreatedDate = created_date ? parseDate(created_date) : undefined;
    
    // acceptance_date zorunlu değil, yoksa bugünün tarihini kullan
    const finalAcceptanceDate = parsedAcceptanceDate || new Date().toISOString();
    
    // created_date geçersizse null yap (undefined olarak gönder)
    if (created_date && !parsedCreatedDate) {
      console.warn(`Bonus record ${i}: invalid created_date "${created_date}", setting to undefined`);
    }
    
    const parsedAmount = parseFloat(amount.replace(/[^\d.-]/g, '') || '0');
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      console.warn(`Skipping line ${i}: invalid amount "${amount}"`);
      continue;
    }
    
    bonuses.push({
      customer_id: customer_id.trim(),
      bonus_name: bonus_name.trim(),
      amount: parsedAmount,
      acceptance_date: finalAcceptanceDate,
      created_date: parsedCreatedDate || undefined,
      created_by: created_by?.trim() || undefined,
      btag: btag?.trim() || undefined,
    });
    
    // İlk birkaç başarılı parse'ı logla
    if (bonuses.length <= 3) {
      console.log(`Successfully parsed bonus ${bonuses.length}:`, {
        customer_id,
        bonus_name,
        amount: parsedAmount,
        acceptance_date: finalAcceptanceDate
      });
    }
  }
  
  console.log('Parsed bonuses:', bonuses.length);
  if (bonuses.length === 0) {
    console.error('No valid bonus records found.');
    console.log('First few lines:', lines.slice(0, 5));
    const firstDataLine = lines[1];
    if (firstDataLine) {
      const tabCount = (firstDataLine.match(/\t/g) || []).length;
      const commaCount = (firstDataLine.match(/,/g) || []).length;
      const pipeCount = (firstDataLine.match(/\|/g) || []).length;
      const firstDelimiter = tabCount > commaCount && tabCount > pipeCount ? '\t' : 
                            (pipeCount > commaCount ? '|' : (commaCount > 0 ? ',' : '\t'));
      const splitPattern = new RegExp(`[${firstDelimiter === '\t' ? '\\t' : firstDelimiter}]`);
      console.log('First line columns:', firstDataLine.split(splitPattern).slice(0, 10));
    }
  }
  return bonuses;
}

export function parseWithdrawalFile(content: string): ParsedWithdrawal[] {
  if (!content || content.trim().length === 0) {
    console.error('Withdrawal file content is empty');
    return [];
  }

  // Hem \n hem de \r\n için split
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    console.error('Withdrawal file has less than 2 lines (header + data)');
    console.log('Content preview:', content.substring(0, 500));
    return [];
  }
  
  const withdrawals: ParsedWithdrawal[] = [];
  
  // Hem tab hem de virgül ile ayrılmış dosyaları destekle
  // Delimiter'ı daha esnek algıla - tab, virgül, pipe, slash
  const detectDelimiter = (line: string): string => {
    const tabCount = (line.match(/\t/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const pipeCount = (line.match(/\|/g) || []).length;
    
    if (tabCount > commaCount && tabCount > pipeCount) return '\t';
    if (pipeCount > commaCount) return '|';
    if (commaCount > 0) return ',';
    return '\t'; // Default
  };
  
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(new RegExp(`[${delimiter === '\t' ? '\\t' : delimiter}]`)).map(h => h.trim()).filter(h => h);
  
  // Sütun haritası oluştur
  const columnMap = buildColumnMap(headers, COLUMN_MAPPINGS.withdrawals);
  
  console.log('Withdrawal Headers:', headers);
  console.log('Withdrawal Column Map:', columnMap);
  console.log('Delimiter detected:', delimiter === '\t' ? 'TAB' : delimiter);
  console.log('Total lines:', lines.length);
  
  // Veri satırlarını işle
  for (let i = 1; i < lines.length; i++) {
    // Her satır için delimiter'ı tekrar algıla (bazı satırlarda farklı olabilir)
    const lineDelimiter = detectDelimiter(lines[i]);
    const splitPattern = new RegExp(`[${lineDelimiter === '\t' ? '\\t' : lineDelimiter}]`);
    const columns = lines[i].split(splitPattern).map(col => col.trim()).filter(col => col);
    
    if (columns.length < 4) {
      console.warn(`Skipping line ${i}: insufficient columns (${columns.length})`);
      continue;
    }
    
    const customer_id = columnMap.customer_id !== undefined ? columns[columnMap.customer_id] : columns[0];
    const amount = columnMap.amount !== undefined ? columns[columnMap.amount] : columns[1];
    const konum = columnMap.konum !== undefined ? columns[columnMap.konum] : columns[2];
    const request_date = columnMap.request_date !== undefined ? columns[columnMap.request_date] : columns[3];
    const staff_name = columnMap.staff_name !== undefined ? columns[columnMap.staff_name] : columns[4];
    const approval_date = columnMap.approval_date !== undefined ? columns[columnMap.approval_date] : 
                         (columnMap.approval_date_alt !== undefined ? columns[columnMap.approval_date_alt] : columns[5]);
    const rejection_date = columnMap.rejection_date !== undefined ? columns[columnMap.rejection_date] : undefined;
    const btag = columnMap.btag !== undefined ? columns[columnMap.btag] : undefined;
    
    // Minimum gereksinimler: customer_id, amount, request_date
    if (!customer_id || !amount || !request_date) {
      console.warn(`Skipping line ${i}: missing required fields`, {
        customer_id: customer_id || 'MISSING',
        amount: amount || 'MISSING',
        request_date: request_date || 'MISSING',
        columnCount: columns.length,
        allColumns: columns.slice(0, 10),
        firstFewColumns: columns.slice(0, 5).map((c, idx) => `[${idx}]: "${c}"`).join(', ')
      });
      // İlk birkaç satırı detaylı göster
      if (i <= 3) {
        console.log(`Line ${i} detailed:`, {
          rawLine: lines[i].substring(0, 200),
          columns: columns,
          customer_id_index: columnMap.customer_id ?? 0,
          amount_index: columnMap.amount ?? 1,
          request_date_index: columnMap.request_date ?? 3
        });
      }
      continue;
    }
    
    const parsedRequestDate = parseDate(request_date);
    // approval_date yoksa request_date'i kullan
    const parsedApprovalDate = approval_date ? parseDate(approval_date) : parsedRequestDate;
    
    // request_date zorunlu, geçersizse kaydı atla
    if (!parsedRequestDate) {
      console.warn(`Skipping line ${i}: invalid request_date "${request_date}"`);
      continue;
    }
    
    // approval_date geçersizse request_date'i kullan
    const finalApprovalDate = parsedApprovalDate || parsedRequestDate;
    
    const parsedAmount = parseFloat(amount.replace(/[^\d.-]/g, '') || '0');
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      console.warn(`Skipping line ${i}: invalid amount "${amount}"`);
      continue;
    }
    
    withdrawals.push({
      customer_id: customer_id.trim(),
      amount: parsedAmount,
      request_date: parsedRequestDate,
      approval_date: finalApprovalDate,
      rejection_date: rejection_date ? parseDate(rejection_date) : undefined,
      staff_name: staff_name?.trim() || undefined,
      konum: konum?.trim() || undefined,
      btag: btag?.trim() || undefined,
    });
    
    // İlk birkaç başarılı parse'ı logla
    if (withdrawals.length <= 3) {
      console.log(`Successfully parsed withdrawal ${withdrawals.length}:`, {
        customer_id,
        amount: parsedAmount,
        request_date: parsedRequestDate,
        approval_date: finalApprovalDate
      });
    }
  }
  
  console.log('Parsed withdrawals:', withdrawals.length);
  if (withdrawals.length === 0) {
    console.error('No valid withdrawal records found.');
    console.log('First few lines:', lines.slice(0, 5));
    const firstDataLine = lines[1];
    if (firstDataLine) {
      const tabCount = (firstDataLine.match(/\t/g) || []).length;
      const commaCount = (firstDataLine.match(/,/g) || []).length;
      const pipeCount = (firstDataLine.match(/\|/g) || []).length;
      const firstDelimiter = tabCount > commaCount && tabCount > pipeCount ? '\t' : 
                            (pipeCount > commaCount ? '|' : (commaCount > 0 ? ',' : '\t'));
      const splitPattern = new RegExp(`[${firstDelimiter === '\t' ? '\\t' : firstDelimiter}]`);
      console.log('First line columns:', firstDataLine.split(splitPattern).slice(0, 10));
    }
  }
  return withdrawals;
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export async function parseExcelFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert to tab-separated text
        const csvText = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
        resolve(csvText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export function isExcelFile(file: File): boolean {
  const excelExtensions = ['.xlsx', '.xls', '.numbers', '.pages'];
  return excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}
