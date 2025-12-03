import { useEffect, useState, useRef } from 'react'
import { supabase, Employee, WeeklyReport } from '../lib/supabase'
import { exportToExcel } from '../utils/excelProcessor'

interface EmployeeScore {
  employee: Employee
  weeklyTotal: number
  grandTotal: number
  totalMembers: number
  totalInvestors: number
  conversionRate: number
  score: number
}

export default function HomePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [scores, setScores] = useState<EmployeeScore[]>([])
  const [loading, setLoading] = useState(true)
  const [exportSettings, setExportSettings] = useState<any>(null)
  const rankingRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [empRes, weekRes, settingsRes] = await Promise.all([
        supabase.from('personel_employees').select('*').order('name'),
        supabase.from('personel_weekly_reports').select('*'),
        supabase.from('personel_export_settings').select('*').limit(1).maybeSingle()
      ])

      if (empRes.data) setEmployees(empRes.data)
      if (weekRes.data) setWeeklyReports(weekRes.data)
      if (settingsRes.data) setExportSettings(settingsRes.data)

      calculateScores(empRes.data || [], weekRes.data || [])
    } catch (error) {
      console.error('Veri yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateScores = (emps: Employee[], weekly: WeeklyReport[]) => {
    const employeeScores: EmployeeScore[] = emps.map(emp => {
      const weeklyReports = weekly.filter(r => r.employee_id === emp.id)

      const weeklyTotal = weeklyReports.reduce((sum, r) => sum + parseFloat(String(r.total_amount || 0)), 0)
      const grandTotal = weeklyTotal

      const totalMembers = weeklyReports.length > 0 ? weeklyReports[0].total_members : 0

      const totalInvestors = weeklyReports.reduce((sum, r) => sum + (r.player_count || 0), 0)

      const conversionRate = totalMembers > 0 ? (totalInvestors / totalMembers) : 0

      return {
        employee: emp,
        weeklyTotal,
        grandTotal,
        totalMembers,
        totalInvestors,
        conversionRate,
        score: 0
      }
    })

    const maxAmount = Math.max(...employeeScores.map(e => e.grandTotal), 1)
    const maxMembers = Math.max(...employeeScores.map(e => e.totalMembers), 1)
    const maxInvestors = Math.max(...employeeScores.map(e => e.totalInvestors), 1)
    const maxConversion = Math.max(...employeeScores.map(e => e.conversionRate), 0.01)

    employeeScores.forEach(emp => {
      const amountScore = (emp.grandTotal / maxAmount) * 40
      const membersScore = (emp.totalMembers / maxMembers) * 20
      const investorsScore = (emp.totalInvestors / maxInvestors) * 25
      const conversionScore = (emp.conversionRate / maxConversion) * 15

      emp.score = parseFloat((amountScore + membersScore + investorsScore + conversionScore).toFixed(2))
    })

    employeeScores.sort((a, b) => b.score - a.score)

    setScores(employeeScores)
  }

  const handleExport = () => {
    exportToExcel(employees, weeklyReports, [], exportSettings)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rankingRef.current) return
    isDragging.current = true
    startX.current = e.pageX - rankingRef.current.offsetLeft
    scrollLeft.current = rankingRef.current.scrollLeft
    rankingRef.current.style.cursor = 'grabbing'
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !rankingRef.current) return
    e.preventDefault()
    const x = e.pageX - rankingRef.current.offsetLeft
    const walk = (x - startX.current) * 2
    rankingRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseUp = () => {
    isDragging.current = false
    if (rankingRef.current) {
      rankingRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseLeave = () => {
    isDragging.current = false
    if (rankingRef.current) {
      rankingRef.current.style.cursor = 'grab'
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="league-header">
          <h1 className="league-title">🏆 Personel Ligi</h1>
          <button className="btn export-btn" onClick={handleExport}>
            📥 Excel Raporu İndir
          </button>
        </div>

        {scores.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#fff', padding: '48px 0' }}>
            Henüz personel ve rapor verisi bulunmamaktadır.
          </p>
        ) : (
          <div className="home-content">
            <div
              className="league-ranking-horizontal"
              ref={rankingRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {scores.map((item, index) => (
                <div key={item.employee.id} className="ranking-item">
                  <div className="ranking-position">#{index + 1}</div>
                  <div
                    className="ranking-color"
                    style={{ backgroundColor: item.employee.color }}
                  />
                  <div className="ranking-name">{item.employee.name}</div>
                  <div className="ranking-score">{item.score}</div>
                </div>
              ))}
            </div>

            <div className="league-grid">
              {scores.map((item, index) => (
                <div
                  key={item.employee.id}
                  className="league-card"
                  style={{
                    '--card-color': item.employee.color,
                    backgroundColor: item.employee.color,
                    animationDelay: `${index * 0.1}s`
                  } as React.CSSProperties}
                >
                  <div className="league-card-header">
                    <div className="league-rank">#{index + 1}</div>
                    <div className="league-avatar">
                      {item.employee.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="league-name">{item.employee.name}</h3>
                    <div className="league-score">
                      {item.score}
                    </div>
                    <div className="league-label">PUAN</div>
                  </div>
                  <div className="league-stats-compact">
                    <div className="stat-compact">
                      <div className="stat-compact-label">Toplam</div>
                      <div className="stat-compact-value">{item.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}₺</div>
                    </div>
                    <div className="stat-compact">
                      <div className="stat-compact-label">Yatırımcı</div>
                      <div className="stat-compact-value">{item.totalInvestors}/{item.totalMembers}</div>
                    </div>
                    <div className="stat-compact">
                      <div className="stat-compact-label">Dönüşüm</div>
                      <div className="stat-compact-value">{(item.conversionRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
