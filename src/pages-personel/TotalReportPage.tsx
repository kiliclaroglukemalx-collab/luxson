import { useEffect, useState } from 'react'
import { supabase, Employee } from '../lib/supabase'
import { exportCumulativeTotalToExcel } from '../utils/excelProcessor'

interface WeeklyReport {
  id: string
  employee_id: string
  week_start_date: string
  total_amount: number
  player_count: number
  total_members: number
  created_at: string
}

interface EmployeeTotals {
  employee: Employee
  totalAmount: number
  totalPlayerCount: number
  totalMembers: number
  weekCount: number
  reports: WeeklyReport[]
}

export default function TotalReportPage() {
  const [employeeTotals, setEmployeeTotals] = useState<EmployeeTotals[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null)
  const [exportSettings, setExportSettings] = useState<any>(null)

  useEffect(() => {
    loadTotalReports()
  }, [])

  const loadTotalReports = async () => {
    setLoading(true)
    try {
      const [employeesResult, reportsResult, settingsResult] = await Promise.all([
        supabase.from('personel_employees').select('*').order('name'),
        supabase.from('personel_weekly_reports').select('*').order('week_start_date', { ascending: false }),
        supabase.from('personel_export_settings').select('*').limit(1).maybeSingle()
      ])

      if (employeesResult.error) throw employeesResult.error
      if (reportsResult.error) throw reportsResult.error

      const employees = employeesResult.data
      const reports = reportsResult.data
      if (settingsResult.data) setExportSettings(settingsResult.data)

      const totals: EmployeeTotals[] = (employees || []).map(employee => {
        const employeeReports = (reports || []).filter(
          (r: WeeklyReport) => r.employee_id === employee.id
        )

        const totalAmount = employeeReports.reduce((sum, r) => sum + r.total_amount, 0)
        const totalPlayerCount = employeeReports.reduce((sum, r) => sum + r.player_count, 0)
        const totalMembers = employeeReports.length > 0
          ? employeeReports[0].total_members
          : 0

        return {
          employee,
          totalAmount,
          totalPlayerCount,
          totalMembers,
          weekCount: employeeReports.length,
          reports: employeeReports
        }
      })

      totals.sort((a, b) => b.totalAmount - a.totalAmount)

      setEmployeeTotals(totals)
    } catch (error) {
      console.error('Toplam rapor yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const toggleEmployeeDetails = (employeeId: string) => {
    setExpandedEmployeeId(expandedEmployeeId === employeeId ? null : employeeId)
  }

  const handleExport = () => {
    exportCumulativeTotalToExcel(employeeTotals, exportSettings)
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Kümülatif Total</h2>
            <p style={{ color: '#8e8e8e', fontSize: '14px', marginTop: '8px' }}>
              Tüm haftalık raporların toplamı
            </p>
          </div>
          {employeeTotals.length > 0 && (
            <button className="btn btn-primary" onClick={handleExport}>
              Excel Raporu İndir
            </button>
          )}
        </div>

        {employeeTotals.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '48px 0' }}>
            Henüz rapor eklenmemiş. Önce haftalık rapor ekleyin.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {employeeTotals.map(({ employee, totalAmount, totalPlayerCount, totalMembers, weekCount, reports }) => (
              <div
                key={employee.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${employee.color}`,
                  background: '#fafafa',
                  cursor: 'pointer'
                }}
                onClick={() => toggleEmployeeDetails(employee.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      className="employee-avatar"
                      style={{ backgroundColor: employee.color }}
                    >
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                        {employee.name}
                      </h3>
                      <p style={{ color: '#8e8e8e', fontSize: '14px' }}>
                        {weekCount} hafta toplam
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: employee.color }}>
                      {totalAmount.toFixed(2)}₺
                    </div>
                    <div style={{ fontSize: '14px', color: '#8e8e8e', marginTop: '4px' }}>
                      {totalPlayerCount} / {totalMembers} üye
                    </div>
                  </div>
                </div>

                {expandedEmployeeId === employee.id && reports.length > 0 && (
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #dbdbdb'
                  }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                      Haftalık Detaylar
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reports.map(report => (
                        <div
                          key={report.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        >
                          <span style={{ color: '#555' }}>
                            {formatDate(report.week_start_date)}
                          </span>
                          <div style={{ display: 'flex', gap: '24px' }}>
                            <span style={{ fontWeight: '600' }}>
                              {report.total_amount.toFixed(2)}₺
                            </span>
                            <span style={{ color: '#8e8e8e' }}>
                              {report.player_count} / {report.total_members} üye
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
