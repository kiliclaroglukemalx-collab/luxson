import { useState, useEffect } from 'react';
import { Calendar, Users, RefreshCw, Save, ChevronLeft, ChevronRight, Settings, AlertCircle, CheckCircle, Edit2, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ShiftsCalendar from './ShiftsCalendar';

interface Employee {
  id: string;
  name: string;
  active: boolean;
  shift_rotation_order?: number;
}

interface ShiftAssignment {
  id?: string;
  employee_id: string;
  shift_date: string;
  shift_type: string;
  is_off_day: boolean;
  employees?: {
    name: string;
  };
}

interface EditModalProps {
  assignment: ShiftAssignment | null;
  date: Date;
  employees: Employee[];
  onClose: () => void;
  onSave: (employeeId: string, shiftType: string) => void;
  onDelete?: () => void;
}

const SHIFT_TYPES = [
  { value: '09-17', label: '09:00 - 17:00', color: 'bg-blue-500', order: 1, isNight: false },
  { value: '12-20', label: '12:00 - 20:00', color: 'bg-green-500', order: 2, isNight: false },
  { value: '18-02', label: '18:00 - 02:00', color: 'bg-orange-500', order: 3, isNight: false },
  { value: '17-01', label: '17:00 - 01:00', color: 'bg-purple-500', order: 4, isNight: false },
  { value: '01-09', label: '01:00 - 09:00 (Gece)', color: 'bg-red-500', order: 5, isNight: true },
];

const OFF_DAY_TYPE = { value: 'off', label: 'İzinli', color: 'bg-gray-400', isOff: true };

function EditShiftModal({ assignment, date, employees, onClose, onSave, onDelete }: EditModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState(assignment?.employee_id || '');
  const [selectedShift, setSelectedShift] = useState(assignment?.shift_type || '');

  const handleSave = () => {
    if (selectedEmployee && selectedShift) {
      onSave(selectedEmployee, selectedShift);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl w-full max-w-md border border-slate-600">
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div>
            <h3 className="text-xl font-bold text-white">
              {assignment ? 'Vardiya Düzenle' : 'Vardiya Ekle'}
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Personel Seçin
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Personel seçiniz...</option>
              {employees.filter(e => e.active).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Vardiya Seçin
            </label>
            <div className="space-y-2">
              {/* İzinli seçeneği */}
              <button
                onClick={() => setSelectedShift(OFF_DAY_TYPE.value)}
                className={`w-full px-4 py-3 rounded-lg text-white font-medium transition-all ${
                  OFF_DAY_TYPE.color
                } ${
                  selectedShift === OFF_DAY_TYPE.value
                    ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-amber-500 scale-105'
                    : 'opacity-80 hover:opacity-100 hover:scale-102'
                }`}
              >
                {OFF_DAY_TYPE.label}
              </button>
              
              {/* Vardiya seçenekleri */}
              {SHIFT_TYPES.map((shift) => (
                <button
                  key={shift.value}
                  onClick={() => setSelectedShift(shift.value)}
                  className={`w-full px-4 py-3 rounded-lg text-white font-medium transition-all ${
                    shift.color
                  } ${
                    selectedShift === shift.value
                      ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-amber-500 scale-105'
                      : 'opacity-80 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  {shift.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={!selectedEmployee || !selectedShift}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Save className="w-5 h-5" />
              Kaydet
            </button>
            {assignment && onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonthlyShiftPlanner() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('monthly');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [editModal, setEditModal] = useState<{ assignment: ShiftAssignment | null; date: Date } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('shift_rotation_order');

      if (employeesData) {
        setEmployees(employeesData);
      }

      // Load assignments for the month
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const { data: assignmentsData } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          employees (name)
        `)
        .gte('shift_date', startDate.toISOString().split('T')[0])
        .lte('shift_date', endDate.toISOString().split('T')[0])
        .order('shift_date');

      if (assignmentsData) {
        setAssignments(assignmentsData as ShiftAssignment[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  const generateMonthlySchedule = async () => {
    if (employees.filter(e => e.active).length === 0) {
      showMessage('error', 'Aktif personel bulunamadı!');
      return;
    }

    setGenerating(true);
    try {
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      const daysInMonth = endDate.getDate();

      // Active employees in rotation order
      const activeEmployees = employees
        .filter(e => e.active)
        .sort((a, b) => (a.shift_rotation_order || 999) - (b.shift_rotation_order || 999));

      if (activeEmployees.length === 0) {
        showMessage('error', 'Aktif personel bulunamadı!');
        return;
      }

      const newAssignments: ShiftAssignment[] = [];
      const shiftsPerDay = SHIFT_TYPES.length; // 5 vardiya
      
      // Vardiya rotasyonu için state
      let currentEmployeeIndex = 0;
      const employeeLastNightShift: Record<string, Date | null> = {};
      
      // Her personel için son gece vardiyasını takip et
      activeEmployees.forEach(emp => {
        employeeLastNightShift[emp.id] = null;
      });

      // Her gün için vardiya atamaları
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay(); // 0 = Pazar, 1 = Pazartesi, ...

        // Her vardiya için personel ata
        for (let shiftIndex = 0; shiftIndex < shiftsPerDay; shiftIndex++) {
          const shift = SHIFT_TYPES[shiftIndex];
          let assignedEmployee = activeEmployees[currentEmployeeIndex % activeEmployees.length];
          
          // Gece vardiyası kontrolü
          if (shift.isNight) {
            // Gece vardiyası bitince Pazartesi-Salı izin kontrolü
            const lastNight = employeeLastNightShift[assignedEmployee.id];
            
            if (lastNight) {
              const daysSinceLastNight = Math.floor((currentDate.getTime() - lastNight.getTime()) / (1000 * 60 * 60 * 24));
              
              // Eğer son gece vardiyasından 1-2 gün geçtiyse (Pazartesi veya Salı) ve o gün Pazartesi veya Salı ise
              if (daysSinceLastNight >= 1 && daysSinceLastNight <= 2 && (dayOfWeek === 1 || dayOfWeek === 2)) {
                // Bu personel izinli olmalı - atamayı yapma, bir sonraki gün için işaretle
                newAssignments.push({
                  employee_id: assignedEmployee.id,
                  shift_date: dateStr,
                  shift_type: 'off',
                  is_off_day: true,
                });
                currentEmployeeIndex++;
                continue;
              }
            }
            
            // Gece vardiyası atandı, kaydet
            employeeLastNightShift[assignedEmployee.id] = currentDate;
          }

          // Normal atama
          newAssignments.push({
            employee_id: assignedEmployee.id,
            shift_date: dateStr,
            shift_type: shift.value,
            is_off_day: false,
          });

          currentEmployeeIndex++;
        }
      }

      // Eski atamaları sil (bu ay için)
      await supabase
        .from('shift_assignments')
        .delete()
        .gte('shift_date', startDate.toISOString().split('T')[0])
        .lte('shift_date', endDate.toISOString().split('T')[0]);

      // Yeni atamaları ekle
      const { error } = await supabase
        .from('shift_assignments')
        .insert(newAssignments);

      if (error) throw error;

      showMessage('success', `${daysInMonth} günlük vardiya planı oluşturuldu!`);
      await loadData();
    } catch (error) {
      console.error('Error generating schedule:', error);
      showMessage('error', 'Vardiya planı oluşturulurken hata oluştu!');
    } finally {
      setGenerating(false);
    }
  };

  const updateAssignment = async (assignmentId: string, newShiftType: string) => {
    try {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ 
          shift_type: newShiftType,
          is_off_day: newShiftType === 'off'
        })
        .eq('id', assignmentId);

      if (error) throw error;

      showMessage('success', 'Vardiya güncellendi');
      await loadData();
    } catch (error) {
      console.error('Error updating assignment:', error);
      showMessage('error', 'Güncelleme hatası!');
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showMessage('success', 'Atama silindi');
      await loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showMessage('error', 'Silme hatası!');
    }
  };

  const addOrUpdateAssignment = async (employeeId: string, shiftType: string) => {
    if (!editModal) return;

    try {
      if (editModal.assignment?.id) {
        // Update existing
        await updateAssignment(editModal.assignment.id, shiftType);
      } else {
        // Add new
        const dateStr = editModal.date.toISOString().split('T')[0];
        const { error } = await supabase
          .from('shift_assignments')
          .insert({
            employee_id: employeeId,
            shift_date: dateStr,
            shift_type: shiftType,
            is_off_day: shiftType === 'off',
          });

        if (error) throw error;
        showMessage('success', 'Vardiya eklendi');
        await loadData();
      }
      setEditModal(null);
    } catch (error) {
      console.error('Error saving assignment:', error);
      showMessage('error', 'Kaydetme hatası!');
    }
  };

  const handleEditClick = (assignment: ShiftAssignment, date: Date) => {
    setEditModal({ assignment, date });
  };

  const handleAddClick = (date: Date) => {
    setEditModal({ assignment: null, date });
  };

  const handleDeleteFromModal = async () => {
    if (editModal?.assignment?.id) {
      await deleteAssignment(editModal.assignment.id);
      setEditModal(null);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Group assignments by week
  const getWeeklyAssignments = () => {
    const weeks: { startDate: Date; endDate: Date; assignments: ShiftAssignment[] }[] = [];
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    let currentWeekStart = new Date(startDate);
    // Haftanın başını Pazartesi yap
    const dayOfWeek = currentWeekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diff);

    while (currentWeekStart <= endDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekAssignments = assignments.filter(a => {
        const aDate = new Date(a.shift_date);
        return aDate >= currentWeekStart && aDate <= weekEnd;
      });

      weeks.push({
        startDate: new Date(currentWeekStart),
        endDate: new Date(weekEnd),
        assignments: weekAssignments,
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  };

  const getDayAssignments = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => a.shift_date === dateStr);
  };

  const getShiftColor = (shiftType: string) => {
    if (shiftType === 'off') return OFF_DAY_TYPE.color;
    return SHIFT_TYPES.find(s => s.value === shiftType)?.color || 'bg-gray-500';
  };

  const getShiftLabel = (shiftType: string) => {
    if (shiftType === 'off') return OFF_DAY_TYPE.label;
    return SHIFT_TYPES.find(s => s.value === shiftType)?.label || shiftType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Aylık Vardiya Planlama</h2>
              <p className="text-sm text-slate-300 mt-1">
                Otomatik vardiya ataması ve yönetimi
              </p>
            </div>
          </div>
          <button
            onClick={generateMonthlySchedule}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Oluşturuluyor...' : 'Otomatik Oluştur'}</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl backdrop-blur-sm flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
            : message.type === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Aylık Plan</span>
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
              activeTab === 'weekly'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Haftalık Detay</span>
          </button>
        </div>
      </div>

      {/* Monthly View */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 border border-slate-600">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h3 className="text-2xl font-bold text-white">
                {selectedMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Weekly View */}
          {getWeeklyAssignments().map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg border border-slate-600"
            >
              <div className="p-6 border-b border-slate-600">
                <h4 className="text-lg font-semibold text-white">
                  Hafta {weekIndex + 1}: {week.startDate.toLocaleDateString('tr-TR')} - {week.endDate.toLocaleDateString('tr-TR')}
                </h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 gap-3">
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayDate = new Date(week.startDate);
                    dayDate.setDate(dayDate.getDate() + i);
                    const dayAssignments = getDayAssignments(dayDate);
                    const isCurrentMonth = dayDate.getMonth() === selectedMonth.getMonth();

                    return (
                      <div
                        key={i}
                        className={`rounded-lg p-3 min-h-[200px] ${
                          isCurrentMonth ? 'bg-slate-900/50 border border-slate-700' : 'bg-slate-900/20 opacity-50'
                        }`}
                      >
                        <div className="text-center mb-3">
                          <div className="text-xs text-slate-400">
                            {dayDate.toLocaleDateString('tr-TR', { weekday: 'short' })}
                          </div>
                          <div className="text-lg font-bold text-white">
                            {dayDate.getDate()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              onClick={() => isCurrentMonth && handleEditClick(assignment, dayDate)}
                              className={`p-2 rounded ${getShiftColor(assignment.shift_type)} text-white text-xs cursor-pointer hover:ring-2 hover:ring-amber-500 hover:ring-offset-2 hover:ring-offset-slate-900 transition-all group`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold truncate">
                                    {assignment.employees?.name}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    {getShiftLabel(assignment.shift_type)}
                                  </div>
                                </div>
                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
                              </div>
                            </div>
                          ))}
                          {isCurrentMonth && (
                            <button
                              onClick={() => handleAddClick(dayDate)}
                              className="w-full p-2 border-2 border-dashed border-slate-600 rounded text-slate-400 hover:text-white hover:border-amber-500 transition-all flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-xs">Ekle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weekly Detail View */}
      {activeTab === 'weekly' && (
        <div>
          <ShiftsCalendar isReadOnly={false} />
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditShiftModal
          assignment={editModal.assignment}
          date={editModal.date}
          employees={employees}
          onClose={() => setEditModal(null)}
          onSave={addOrUpdateAssignment}
          onDelete={editModal.assignment ? handleDeleteFromModal : undefined}
        />
      )}
    </div>
  );
}
