import { useEffect, useState } from 'react'
import { supabase, Employee } from '../lib/supabase'
import { exportToExcelWithSettings } from '../utils/excelProcessor'

interface ExportSettings {
  id?: string
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

export default function ExportSettingsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [settings, setSettings] = useState<ExportSettings>({
    employee_order: [],
    column_headers: {
      employee: 'Personel',
      color: 'Renk',
      weekly_total: 'Haftalık Toplam',
      monthly_total: 'Aylık Toplam',
      grand_total: 'Genel Toplam'
    },
    cell_colors: {
      header_bg: '#4A90E2',
      header_text: '#FFFFFF',
      employee_bg: '#F5F5F5',
      weekly_bg: '#E3F2FD',
      monthly_bg: '#FFF3E0',
      total_bg: '#C8E6C9'
    },
    show_weekly: true,
    show_monthly: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [employeesResult, settingsResult] = await Promise.all([
        supabase.from('personel_employees').select('*').order('created_at', { ascending: true }),
        supabase.from('personel_export_settings').select('*').limit(1).maybeSingle()
      ])

      if (employeesResult.error) throw employeesResult.error
      const loadedEmployees = employeesResult.data || []
      setEmployees(loadedEmployees)

      if (settingsResult.data) {
        setSettings(settingsResult.data as ExportSettings)
      } else {
        setSettings(prev => ({
          ...prev,
          employee_order: loadedEmployees.map(e => e.id)
        }))
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error)
      showMessage('error', 'Veriler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('personel_export_settings')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('personel_export_settings')
          .update({
            employee_order: settings.employee_order,
            column_headers: settings.column_headers,
            cell_colors: settings.cell_colors,
            show_weekly: settings.show_weekly,
            show_monthly: settings.show_monthly,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('personel_export_settings')
          .insert([settings])

        if (error) throw error
      }

      showMessage('success', 'Ayarlar kaydedildi')
    } catch (error) {
      console.error('Kaydetme hatası:', error)
      showMessage('error', 'Ayarlar kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPreview = async () => {
    try {
      const [weeklyResult, monthlyResult] = await Promise.all([
        supabase.from('personel_weekly_reports').select('*'),
        supabase.from('personel_monthly_reports').select('*')
      ])

      if (weeklyResult.error) throw weeklyResult.error
      if (monthlyResult.error) throw monthlyResult.error

      exportToExcelWithSettings(
        employees,
        weeklyResult.data || [],
        monthlyResult.data || [],
        settings
      )

      showMessage('success', 'Excel dosyası indirildi')
    } catch (error) {
      console.error('Dışa aktarma hatası:', error)
      showMessage('error', 'Dışa aktarma sırasında bir hata oluştu')
    }
  }

  const moveEmployee = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...settings.employee_order]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
      setSettings({ ...settings, employee_order: newOrder })
    }
  }

  const updateColumnHeader = (key: keyof typeof settings.column_headers, value: string) => {
    setSettings({
      ...settings,
      column_headers: { ...settings.column_headers, [key]: value }
    })
  }

  const updateCellColor = (key: keyof typeof settings.cell_colors, value: string) => {
    setSettings({
      ...settings,
      cell_colors: { ...settings.cell_colors, [key]: value }
    })
  }

  const orderedEmployees = settings.employee_order
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean) as Employee[]

  const getPreviewData = () => {
    return orderedEmployees.slice(0, 3).map(emp => ({
      [settings.column_headers.employee]: emp.name,
      [settings.column_headers.color]: emp.color,
      ...(settings.show_weekly && { [settings.column_headers.weekly_total]: '1,234.56' }),
      ...(settings.show_monthly && { [settings.column_headers.monthly_total]: '5,678.90' }),
      [settings.column_headers.grand_total]: '6,913.46'
    }))
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Excel Rapor Ayarları</h1>
        <p style={{ color: '#8e8e8e', fontSize: '14px', marginTop: '8px' }}>
          Bu ayarlar tüm Excel raporları için geçerlidir (Anasayfa, Kümülatif Total, Excel Ayarları)
        </p>
      </div>

      {message && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-section">
          <h2 className="section-title">Personel Sıralaması</h2>
          <div className="employee-order-list">
            {orderedEmployees.map((emp, index) => (
              <div key={emp.id} className="order-item">
                <div className="order-info">
                  <span className="order-number">#{index + 1}</span>
                  <div className="order-color" style={{ backgroundColor: emp.color }}></div>
                  <span className="order-name">{emp.name}</span>
                </div>
                <div className="order-actions">
                  <button
                    className="order-btn"
                    onClick={() => moveEmployee(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="order-btn"
                    onClick={() => moveEmployee(index, 'down')}
                    disabled={index === orderedEmployees.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h2 className="section-title">Sütun Başlıkları</h2>
          <div className="form-group">
            <label className="form-label">Personel Sütunu</label>
            <input
              type="text"
              className="form-input"
              value={settings.column_headers.employee}
              onChange={(e) => updateColumnHeader('employee', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Renk Sütunu</label>
            <input
              type="text"
              className="form-input"
              value={settings.column_headers.color}
              onChange={(e) => updateColumnHeader('color', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Haftalık Toplam Sütunu</label>
            <input
              type="text"
              className="form-input"
              value={settings.column_headers.weekly_total}
              onChange={(e) => updateColumnHeader('weekly_total', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Aylık Toplam Sütunu</label>
            <input
              type="text"
              className="form-input"
              value={settings.column_headers.monthly_total}
              onChange={(e) => updateColumnHeader('monthly_total', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Genel Toplam Sütunu</label>
            <input
              type="text"
              className="form-input"
              value={settings.column_headers.grand_total}
              onChange={(e) => updateColumnHeader('grand_total', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.show_weekly}
                onChange={(e) => setSettings({ ...settings, show_weekly: e.target.checked })}
              />
              <span>Haftalık raporları göster</span>
            </label>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.show_monthly}
                onChange={(e) => setSettings({ ...settings, show_monthly: e.target.checked })}
              />
              <span>Aylık raporları göster</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="section-title">Hücre Renkleri</h2>
          <div className="color-grid">
            <div className="color-item">
              <label className="form-label">Başlık Arka Plan</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.header_bg}
                onChange={(e) => updateCellColor('header_bg', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.header_bg}</span>
            </div>
            <div className="color-item">
              <label className="form-label">Başlık Yazı</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.header_text}
                onChange={(e) => updateCellColor('header_text', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.header_text}</span>
            </div>
            <div className="color-item">
              <label className="form-label">Personel Hücresi</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.employee_bg}
                onChange={(e) => updateCellColor('employee_bg', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.employee_bg}</span>
            </div>
            <div className="color-item">
              <label className="form-label">Haftalık Hücre</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.weekly_bg}
                onChange={(e) => updateCellColor('weekly_bg', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.weekly_bg}</span>
            </div>
            <div className="color-item">
              <label className="form-label">Aylık Hücre</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.monthly_bg}
                onChange={(e) => updateCellColor('monthly_bg', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.monthly_bg}</span>
            </div>
            <div className="color-item">
              <label className="form-label">Toplam Hücre</label>
              <input
                type="color"
                className="color-input"
                value={settings.cell_colors.total_bg}
                onChange={(e) => updateCellColor('total_bg', e.target.value)}
              />
              <span className="color-value">{settings.cell_colors.total_bg}</span>
            </div>
          </div>
        </div>

        <div className="settings-section full-width">
          <h2 className="section-title">Rapor Önizleme</h2>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr style={{
                  backgroundColor: settings.cell_colors.header_bg,
                  color: settings.cell_colors.header_text
                }}>
                  <th>{settings.column_headers.employee}</th>
                  <th>{settings.column_headers.color}</th>
                  {settings.show_weekly && <th>{settings.column_headers.weekly_total}</th>}
                  {settings.show_monthly && <th>{settings.column_headers.monthly_total}</th>}
                  <th>{settings.column_headers.grand_total}</th>
                </tr>
              </thead>
              <tbody>
                {getPreviewData().map((row, index) => (
                  <tr key={index}>
                    <td style={{ backgroundColor: settings.cell_colors.employee_bg }}>
                      {row[settings.column_headers.employee]}
                    </td>
                    <td style={{ backgroundColor: settings.cell_colors.employee_bg }}>
                      {row[settings.column_headers.color]}
                    </td>
                    {settings.show_weekly && (
                      <td style={{ backgroundColor: settings.cell_colors.weekly_bg }}>
                        {row[settings.column_headers.weekly_total]}
                      </td>
                    )}
                    {settings.show_monthly && (
                      <td style={{ backgroundColor: settings.cell_colors.monthly_bg }}>
                        {row[settings.column_headers.monthly_total]}
                      </td>
                    )}
                    <td style={{ backgroundColor: settings.cell_colors.total_bg }}>
                      {row[settings.column_headers.grand_total]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="preview-note">
            * Bu önizleme örnek verilerle gösterilmektedir. Gerçek veriler dışa aktarıldığında kullanılacaktır.
          </p>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>
        <button className="btn btn-secondary" onClick={handleExportPreview}>
          Excel Olarak İndir
        </button>
      </div>
    </div>
  )
}
