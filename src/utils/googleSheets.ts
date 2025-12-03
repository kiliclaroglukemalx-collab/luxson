export interface GoogleSheetsConfig {
  apiKey: string
  spreadsheetId: string
  range: string
}

export const extractSpreadsheetId = (url: string): string | null => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export const fetchGoogleSheetData = async (
  apiKey: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData?.error?.message || response.statusText
      throw new Error(`Google Sheets API hatası: ${errorMessage}`)
    }

    const data = await response.json()
    return data.values || []
  } catch (error) {
    console.error('Google Sheets fetch error:', error)
    throw error
  }
}

export const parseSheetDataToExcelFormat = (sheetData: any[][]): { playerIds: string[], amounts: { [playerId: string]: number } } => {
  const playerIds: string[] = []
  const amounts: { [playerId: string]: number } = {}

  if (sheetData.length === 0) {
    throw new Error('E-tablo boş')
  }

  let playerIdColIndex = -1
  let amountColIndex = -1

  const headers = sheetData[0]
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase().trim()

    if (playerIdColIndex === -1 && (header.includes('kimlik') || header.includes('oyuncu'))) {
      playerIdColIndex = i
    }

    if (amountColIndex === -1 && header.includes('miktar')) {
      amountColIndex = i
    }
  }

  if (playerIdColIndex === -1) {
    throw new Error('Oyuncu Kimliği sütunu bulunamadı')
  }

  if (amountColIndex === -1) {
    throw new Error('Miktar sütunu bulunamadı')
  }

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (row && row[playerIdColIndex] && row[amountColIndex]) {
      const playerId = String(row[playerIdColIndex]).trim()
      const amount = parseFloat(String(row[amountColIndex]).replace(/[^0-9.-]/g, ''))

      if (playerId && !isNaN(amount)) {
        playerIds.push(playerId)
        amounts[playerId] = amount
      }
    }
  }

  return { playerIds, amounts }
}
