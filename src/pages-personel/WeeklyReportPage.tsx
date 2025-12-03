import { useEffect, useState } from 'react'
import { supabase, Employee } from '../lib/supabase'
import { processMainWeeklyFile, processEmployeeFile, ExcelData } from '../utils/excelProcessor'
import { extractSpreadsheetId, fetchGoogleSheetData, parseSheetDataToExcelFormat } from '../utils/googleSheets'

export default function WeeklyReportPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [mainData, setMainData] = useState<ExcelData | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [weekDate, setWeekDate] = useState('')
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [sheetRange, setSheetRange] = useState('Sheet1!A:Z')

  useEffect(() => {
    loadEmployees()
    const today = new Date()
    setWeekDate(today.toISOString().split('T')[0])
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('personel_employees')
        .select('*')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Personel yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMainFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const data = await processMainWeeklyFile(file)
      setMainData(data)
      showMessage('success', `Ana haftalık dosya yüklendi: ${data.playerIds.length} oyuncu`)
    } catch (error) {
      console.error('Dosya işleme hatası:', error)
      showMessage('error', `Dosya işlenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleGoogleSheetsFetch = async () => {
    if (!googleSheetsUrl) {
      showMessage('error', 'Lütfen Google Sheets URL giriniz')
      return
    }

    const spreadsheetId = extractSpreadsheetId(googleSheetsUrl)
    if (!spreadsheetId) {
      showMessage('error', 'Geçersiz Google Sheets URL')
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
    if (!apiKey) {
      showMessage('error', 'Google API Key yapılandırılmamış')
      return
    }

    setUploading(true)
    try {
      const sheetData = await fetchGoogleSheetData(apiKey, spreadsheetId, sheetRange)
      const data = parseSheetDataToExcelFormat(sheetData)
      setMainData(data)
      showMessage('success', `E-tablo verisi yüklendi: ${data.playerIds.length} oyuncu`)
    } catch (error) {
      console.error('E-tablo okuma hatası:', error)
      showMessage('error', `E-tablo okunamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleEmployeeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, employee: Employee) => {
    const file = e.target.files?.[0]
    if (!file || !mainData) return

    setUploading(true)
    setSelectedEmployee(employee)
    try {
      const result = await processEmployeeFile(file, mainData)

      const { error } = await supabase
        .from('personel_weekly_reports')
        .insert([{
          employee_id: employee.id,
          week_start_date: weekDate,
          total_amount: result.totalAmount,
          player_count: result.playerCount,
          total_members: result.totalMembers
        }])

      if (error) throw error

      showMessage('success', `${employee.name}: ${result.totalAmount.toFixed(2)}₺ - ${result.playerCount}/${result.totalMembers} üye yatırım yaptı`)
    } catch (error) {
      console.error('Rapor kaydetme hatası:', error)
      showMessage('error', 'Rapor kaydedilirken hata oluştu')
    } finally {
      setUploading(false)
      setSelectedEmployee(null)
      e.target.value = ''
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Haftalık Rapor</h2>
        </div>

        {message && (
          <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
            {message.text}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Hafta Başlangıç Tarihi</label>
          <input
            type="date"
            className="input"
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
          />
        </div>

        <div className="card" style={{ background: '#fafafa', border: '2px dashed #dbdbdb' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>1. Ana Haftalık Veriyi Yükleyin</h3>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>Seçenek A: Google E-Tablolardan Çek</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Google Sheets URL</label>
              <input
                type="text"
                className="input"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Veri Aralığı</label>
              <input
                type="text"
                className="input"
                placeholder="Sheet1!A:Z"
                value={sheetRange}
                onChange={(e) => setSheetRange(e.target.value)}
                disabled={uploading}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleGoogleSheetsFetch}
              disabled={uploading}
              style={{ width: '100%' }}
            >
              {uploading ? 'Yükleniyor...' : mainData ? '✓ E-Tabloda Güncelle' : 'E-Tablodan Çek'}
            </button>
          </div>

          <div style={{ borderTop: '1px solid #dbdbdb', paddingTop: '16px', marginTop: '16px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>Seçenek B: Excel Dosyası Yükle</h4>
            <p style={{ color: '#8e8e8e', fontSize: '14px', marginBottom: '16px' }}>
              Oyuncu Kimliği ve Miktar sütunlarını içeren Excel dosyasını seçin.
            </p>
            <label className="file-label">
              <input
                type="file"
                className="file-input"
                accept=".xlsx,.xls"
                onChange={handleMainFileUpload}
                disabled={uploading}
              />
              {mainData ? '✓ Ana Dosya Yüklendi' : 'Excel Dosyası Seç'}
            </label>
          </div>
        </div>

        {mainData && (
          <>
            <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>2. Personel Dosyalarını Yükleyin</h3>
            {employees.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '48px 0' }}>
                Henüz personel eklenmemiş. Önce personel ekleyin.
              </p>
            ) : (
              <div className="employee-list">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="employee-card"
                    style={{ borderColor: employee.color }}
                  >
                    <div
                      className="employee-avatar"
                      style={{ backgroundColor: employee.color }}
                    >
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="employee-name">{employee.name}</h3>
                    <label className="file-label" style={{ marginTop: '12px', width: '100%' }}>
                      <input
                        type="file"
                        className="file-input"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleEmployeeFileUpload(e, employee)}
                        disabled={uploading}
                      />
                      {uploading && selectedEmployee?.id === employee.id ? 'İşleniyor...' : 'Dosya Seç'}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
