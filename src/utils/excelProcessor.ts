import * as XLSX from 'xlsx'

export interface ExcelData {
  playerIds: string[]
  amounts: { [playerId: string]: number }
}

export const processMainWeeklyFile = (file: File): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        const playerIds: string[] = []
        const amounts: { [playerId: string]: number } = {}

        let playerIdColIndex = -1
        let amountColIndex = -1

        if (jsonData.length > 0) {
          const headers = jsonData[0]
          console.log('Excel başlıkları:', headers)
          for (let i = 0; i < headers.length; i++) {
            const header = String(headers[i]).toLowerCase().trim()
            console.log(`Sütun ${i}: "${headers[i]}" -> normalized: "${header}"`)

            if (playerIdColIndex === -1 && (header.includes('kimlik') || header.includes('oyuncu'))) {
              playerIdColIndex = i
            }

            if (amountColIndex === -1 && header.includes('miktar')) {
              amountColIndex = i
            }
          }
          console.log('Bulunan sütun indeksleri - Kimlik:', playerIdColIndex, 'Miktar:', amountColIndex)
        }

        if (playerIdColIndex === -1) {
          reject(new Error('Oyuncu Kimliği sütunu bulunamadı'))
          return
        }

        if (amountColIndex === -1) {
          reject(new Error('Miktar sütunu bulunamadı'))
          return
        }

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row[playerIdColIndex] && row[amountColIndex]) {
            const playerId = String(row[playerIdColIndex]).trim()
            const amount = parseFloat(String(row[amountColIndex]).replace(/[^0-9.-]/g, ''))

            if (playerId && !isNaN(amount)) {
              playerIds.push(playerId)
              amounts[playerId] = amount
            }
          }
        }

        resolve({ playerIds, amounts })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Dosya okuma hatası'))
    reader.readAsBinaryString(file)
  })
}

export const processEmployeeFile = (file: File, mainData: ExcelData): Promise<{ totalAmount: number, playerCount: number, totalMembers: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        const employeePlayerIds = new Set<string>()

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row[0]) {
            const playerId = String(row[0]).trim()
            if (playerId) {
              employeePlayerIds.add(playerId)
            }
          }
        }

        const totalMembers = employeePlayerIds.size

        let totalAmount = 0
        let playerCount = 0

        employeePlayerIds.forEach(playerId => {
          if (mainData.amounts[playerId]) {
            totalAmount += mainData.amounts[playerId]
            playerCount++
          }
        })

        resolve({ totalAmount, playerCount, totalMembers })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Dosya okuma hatası'))
    reader.readAsBinaryString(file)
  })
}

export const exportToExcel = (employees: any[], weeklyReports: any[], monthlyReports: any[], settings?: ExportSettings) => {
  const workbook = XLSX.utils.book_new()

  if (!settings) {
    const summaryData = employees.map((emp: any) => {
      const weeklyTotal = weeklyReports
        .filter((r: any) => r.employee_id === emp.id)
        .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

      const monthlyTotal = monthlyReports
        .filter((r: any) => r.employee_id === emp.id)
        .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

      return {
        'Personel': emp.name,
        'Renk': emp.color,
        'Haftalık Toplam': weeklyTotal.toFixed(2),
        'Aylık Toplam': monthlyTotal.toFixed(2),
        'Genel Toplam': (weeklyTotal + monthlyTotal).toFixed(2)
      }
    })

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet')

    XLSX.writeFile(workbook, `Personel_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`)
    return
  }

  const orderedEmployees = settings.employee_order
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean)

  const summaryData = orderedEmployees.map((emp: any) => {
    const weeklyTotal = weeklyReports
      .filter((r: any) => r.employee_id === emp.id)
      .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

    const monthlyTotal = monthlyReports
      .filter((r: any) => r.employee_id === emp.id)
      .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

    const row: any = {
      [settings.column_headers.employee]: emp.name,
      [settings.column_headers.color]: emp.color
    }

    if (settings.show_weekly) {
      row[settings.column_headers.weekly_total] = weeklyTotal.toFixed(2)
    }

    if (settings.show_monthly) {
      row[settings.column_headers.monthly_total] = monthlyTotal.toFixed(2)
    }

    row[settings.column_headers.grand_total] = (weeklyTotal + monthlyTotal).toFixed(2)

    return row
  })

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)

  const colWidths = Object.keys(summaryData[0] || {}).map(() => ({ wch: 20 }))
  summarySheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet')

  XLSX.writeFile(workbook, `Personel_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`)
}

interface ExportSettings {
  employee_order: string[]
  column_headers: {
    employee: string
    color: string
    weekly_total: string
    monthly_total: string
    grand_total: string
  }
  cell_colors: {
    header_bg: string
    header_text: string
    employee_bg: string
    weekly_bg: string
    monthly_bg: string
    total_bg: string
  }
  show_weekly: boolean
  show_monthly: boolean
}

export const exportToExcelWithSettings = (
  employees: any[],
  weeklyReports: any[],
  monthlyReports: any[],
  settings: ExportSettings
) => {
  const workbook = XLSX.utils.book_new()

  const orderedEmployees = settings.employee_order
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean)

  const summaryData = orderedEmployees.map((emp: any) => {
    const weeklyTotal = weeklyReports
      .filter((r: any) => r.employee_id === emp.id)
      .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

    const monthlyTotal = monthlyReports
      .filter((r: any) => r.employee_id === emp.id)
      .reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0)

    const row: any = {
      [settings.column_headers.employee]: emp.name,
      [settings.column_headers.color]: emp.color
    }

    if (settings.show_weekly) {
      row[settings.column_headers.weekly_total] = weeklyTotal.toFixed(2)
    }

    if (settings.show_monthly) {
      row[settings.column_headers.monthly_total] = monthlyTotal.toFixed(2)
    }

    row[settings.column_headers.grand_total] = (weeklyTotal + monthlyTotal).toFixed(2)

    return row
  })

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)

  const colWidths = Object.keys(summaryData[0] || {}).map(() => ({ wch: 20 }))
  summarySheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet')

  XLSX.writeFile(workbook, `Personel_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const exportCumulativeTotalToExcel = (employeeTotals: any[], settings?: ExportSettings) => {
  const workbook = XLSX.utils.book_new()

  if (!settings) {
    const summaryData = employeeTotals.map((item: any) => ({
      'Personel': item.employee.name,
      'Renk': item.employee.color,
      'Toplam Tutar': item.totalAmount.toFixed(2),
      'Toplam Yatırımcı': item.totalPlayerCount,
      'Toplam Üye': item.totalMembers,
      'Dönüşüm Oranı': `${((item.totalPlayerCount / item.totalMembers) * 100).toFixed(1)}%`,
      'Hafta Sayısı': item.weekCount
    }))

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)

    const colWidths = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 }
    ]
    summarySheet['!cols'] = colWidths

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Kümülatif Total')

    const detailsData: any[] = []
    employeeTotals.forEach((item: any) => {
      item.reports.forEach((report: any) => {
        detailsData.push({
          'Personel': item.employee.name,
          'Hafta Tarihi': new Date(report.week_start_date).toLocaleDateString('tr-TR'),
          'Tutar': report.total_amount.toFixed(2),
          'Yatırımcı Sayısı': report.player_count,
          'Toplam Üye': report.total_members
        })
      })
    })

    if (detailsData.length > 0) {
      const detailsSheet = XLSX.utils.json_to_sheet(detailsData)
      const detailColWidths = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 }
      ]
      detailsSheet['!cols'] = detailColWidths
      XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Haftalık Detaylar')
    }

    XLSX.writeFile(workbook, `Kumulatif_Total_${new Date().toISOString().split('T')[0]}.xlsx`)
    return
  }

  const orderedTotals = settings.employee_order
    .map(id => employeeTotals.find(t => t.employee.id === id))
    .filter(Boolean)

  const summaryData = orderedTotals.map((item: any) => ({
    [settings.column_headers.employee]: item.employee.name,
    [settings.column_headers.color]: item.employee.color,
    [settings.column_headers.grand_total]: item.totalAmount.toFixed(2),
    'Toplam Yatırımcı': item.totalPlayerCount,
    'Toplam Üye': item.totalMembers,
    'Dönüşüm Oranı': `${((item.totalPlayerCount / item.totalMembers) * 100).toFixed(1)}%`,
    'Hafta Sayısı': item.weekCount
  }))

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)

  const colWidths = Object.keys(summaryData[0] || {}).map(() => ({ wch: 20 }))
  summarySheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Kümülatif Total')

  const detailsData: any[] = []
  orderedTotals.forEach((item: any) => {
    item.reports.forEach((report: any) => {
      detailsData.push({
        [settings.column_headers.employee]: item.employee.name,
        'Hafta Tarihi': new Date(report.week_start_date).toLocaleDateString('tr-TR'),
        'Tutar': report.total_amount.toFixed(2),
        'Yatırımcı Sayısı': report.player_count,
        'Toplam Üye': report.total_members
      })
    })
  })

  if (detailsData.length > 0) {
    const detailsSheet = XLSX.utils.json_to_sheet(detailsData)
    const detailColWidths = Object.keys(detailsData[0] || {}).map(() => ({ wch: 20 }))
    detailsSheet['!cols'] = detailColWidths
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Haftalık Detaylar')
  }

  XLSX.writeFile(workbook, `Kumulatif_Total_${new Date().toISOString().split('T')[0]}.xlsx`)
}
