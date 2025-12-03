import { useEffect, useState } from 'react'
import { supabase, Employee } from '../lib/supabase'
import { getRandomColor } from '../utils/colors'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('personel_employees')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Personel yükleme hatası:', error)
      showMessage('error', 'Personeller yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      showMessage('error', 'Lütfen personel adı girin')
      return
    }

    try {
      const usedColors = employees.map(e => e.color)
      const color = getRandomColor(usedColors)

      const { error } = await supabase
        .from('personel_employees')
        .insert([{ name: newEmployeeName.trim(), color }])

      if (error) throw error

      showMessage('success', 'Personel başarıyla eklendi')
      setNewEmployeeName('')
      setShowModal(false)
      loadEmployees()
    } catch (error) {
      console.error('Personel ekleme hatası:', error)
      showMessage('error', 'Personel eklenirken bir hata oluştu')
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('personel_employees')
        .delete()
        .eq('id', id)

      if (error) throw error

      showMessage('success', 'Personel başarıyla silindi')
      loadEmployees()
    } catch (error) {
      console.error('Personel silme hatası:', error)
      showMessage('error', 'Personel silinirken bir hata oluştu')
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
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
          <h2 className="card-title">Personel Yönetimi</h2>
          <button className="btn" onClick={() => setShowModal(true)}>
            + Yeni Personel
          </button>
        </div>

        {message && (
          <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
            {message.text}
          </div>
        )}

        {employees.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '48px 0' }}>
            Henüz personel eklenmemiş. Başlamak için yeni personel ekleyin.
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
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '12px', width: '100%', fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => handleDeleteEmployee(employee.id)}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yeni Personel Ekle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Personel Adı</label>
              <input
                type="text"
                className="input"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmployee()}
              />
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={handleAddEmployee}>
              Personel Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
