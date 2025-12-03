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
    'Adı': 'bonus_name',
    'Kabul Tarihi': 'acceptance_date',
    'Miktar': 'amount',
    'Oluşturuldu': 'created_date',
    'tarafından oluşturuldu': 'created_by',
    'BTag': 'btag',
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
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        year = `20${year}`;
      }
      
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
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const bonuses: ParsedBonus[] = [];
  const headers = lines[0].split('\t').map(h => h.trim());
  
  // Sütun haritası oluştur
  const columnMap = buildColumnMap(headers, COLUMN_MAPPINGS.bonuses);
  
  console.log('Bonus Headers:', headers);
  console.log('Bonus Column Map:', columnMap);
  
  // Veri satırlarını işle
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t').map(col => col.trim());
    
    if (columns.length < 3) continue;
    
    const customer_id = columnMap.customer_id !== undefined ? columns[columnMap.customer_id] : columns[0];
    const bonus_name = columnMap.bonus_name !== undefined ? columns[columnMap.bonus_name] : columns[1];
    const acceptance_date = columnMap.acceptance_date !== undefined ? columns[columnMap.acceptance_date] : columns[2];
    const amount = columnMap.amount !== undefined ? columns[columnMap.amount] : columns[3];
    const created_date = columnMap.created_date !== undefined ? columns[columnMap.created_date] : undefined;
    const created_by = columnMap.created_by !== undefined ? columns[columnMap.created_by] : undefined;
    const btag = columnMap.btag !== undefined ? columns[columnMap.btag] : undefined;
    
    if (customer_id && bonus_name && amount) {
      const parsedAcceptanceDate = parseDate(acceptance_date || '');
      const parsedCreatedDate = created_date ? parseDate(created_date) : undefined;
      
      // acceptance_date zorunlu, geçersizse kaydı atla
      if (!parsedAcceptanceDate) {
        console.warn(`Skipping bonus record: invalid acceptance_date "${acceptance_date}"`);
        continue;
      }
      
      bonuses.push({
        customer_id,
        bonus_name,
        amount: parseFloat(amount.replace(/[^\d.-]/g, '') || '0'),
        acceptance_date: parsedAcceptanceDate,
        created_date: parsedCreatedDate || undefined,
        created_by: created_by || undefined,
        btag: btag || undefined,
      });
    }
  }
  
  console.log('Parsed bonuses:', bonuses.length);
  return bonuses;
}

export function parseWithdrawalFile(content: string): ParsedWithdrawal[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const withdrawals: ParsedWithdrawal[] = [];
  const headers = lines[0].split('\t').map(h => h.trim());
  
  // Sütun haritası oluştur
  const columnMap = buildColumnMap(headers, COLUMN_MAPPINGS.withdrawals);
  
  console.log('Withdrawal Headers:', headers);
  console.log('Withdrawal Column Map:', columnMap);
  
  // Veri satırlarını işle
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t').map(col => col.trim());
    
    if (columns.length < 4) continue;
    
    const customer_id = columnMap.customer_id !== undefined ? columns[columnMap.customer_id] : columns[0];
    const amount = columnMap.amount !== undefined ? columns[columnMap.amount] : columns[1];
    const konum = columnMap.konum !== undefined ? columns[columnMap.konum] : columns[2];
    const request_date = columnMap.request_date !== undefined ? columns[columnMap.request_date] : columns[3];
    const staff_name = columnMap.staff_name !== undefined ? columns[columnMap.staff_name] : columns[4];
    const approval_date = columnMap.approval_date !== undefined ? columns[columnMap.approval_date] : 
                         (columnMap.approval_date_alt !== undefined ? columns[columnMap.approval_date_alt] : columns[5]);
    const rejection_date = columnMap.rejection_date !== undefined ? columns[columnMap.rejection_date] : undefined;
    const btag = columnMap.btag !== undefined ? columns[columnMap.btag] : undefined;
    
    if (customer_id && amount && request_date && staff_name) {
      const parsedRequestDate = parseDate(request_date);
      const parsedApprovalDate = parseDate(approval_date || request_date);
      
      // request_date zorunlu, geçersizse kaydı atla
      if (!parsedRequestDate || !parsedApprovalDate) {
        console.warn(`Skipping withdrawal record: invalid dates`);
        continue;
      }
      
      withdrawals.push({
        customer_id,
        amount: parseFloat(amount.replace(/[^\d.-]/g, '') || '0'),
        request_date: parsedRequestDate,
        approval_date: parsedApprovalDate,
        rejection_date: rejection_date ? parseDate(rejection_date) : undefined,
        staff_name,
        konum: konum || undefined,
        btag: btag || undefined,
      });
    }
  }
  
  console.log('Parsed withdrawals:', withdrawals.length);
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
