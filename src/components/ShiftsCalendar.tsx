import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DailyTasks from './DailyTasks';

interface Employee {
  id: string;
  name: string;
  active: boolean;
}

interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_date: string;
  shift_type: string;
  employees: {
    name: string;
  };
}

interface ShiftModalProps {
  date: Date;
  onClose: () => void;
  onAssign: (employeeId: string, shiftType: string) => void;
  employees: Employee[];
  existingAssignments: ShiftAssignment[];
}

const SHIFT_TYPES = [
  { value: '09-17', label: '09:00 - 17:00', color: 'bg-blue-500' },
  { value: '12-20', label: '12:00 - 20:00', color: 'bg-green-500' },
  { value: '18-02', label: '18:00 - 02:00', color: 'bg-orange-500' },
  { value: '17-01', label: '17:00 - 01:00', color: 'bg-purple-500' },
  { value: '01-09', label: '01:00 - 09:00', color: 'bg-red-500' },
];

function ShiftModal({ date, onClose, onAssign, employees, existingAssignments }: ShiftModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedShift, setSelectedShift] = useState('');

  const assignedEmployeeIds = existingAssignments.map(a => a.employee_id);
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.includes(e.id) && e.active);

  const handleAssign = () => {
    if (selectedEmployee && selectedShift) {
      onAssign(selectedEmployee, selectedShift);
      setSelectedEmployee('');
      setSelectedShift('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Vardiya Ata - {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personel Seçin
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Personel seçiniz...</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vardiya Seçin
            </label>
            <div className="space-y-2">
              {SHIFT_TYPES.map((shift) => (
                <button
                  key={shift.value}
                  onClick={() => setSelectedShift(shift.value)}
                  className={`w-full px-4 py-3 rounded-md text-white font-medium transition-all ${
                    shift.color
                  } ${
                    selectedShift === shift.value
                      ? 'ring-2 ring-offset-2 ring-gray-900 opacity-100'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {shift.label}
                </button>
              ))}
            </div>
          </div>

          {existingAssignments.length > 0 && (
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mevcut Atamalar
              </label>
              <div className="space-y-2">
                {existingAssignments.map((assignment) => {
                  const shiftInfo = SHIFT_TYPES.find(s => s.value === assignment.shift_type);
                  return (
                    <div
                      key={assignment.id}
                      className={`px-3 py-2 rounded ${shiftInfo?.color} bg-opacity-20 border border-gray-200 text-sm`}
                    >
                      <span className="font-medium">{assignment.employees.name}</span>
                      <span className="text-gray-600 ml-2">- {shiftInfo?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedEmployee || !selectedShift}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Ata
          </button>
        </div>
      </div>
    </div>
  );
}

interface ShiftsCalendarProps {
  isReadOnly?: boolean;
}

export default function ShiftsCalendar({ isReadOnly = false }: ShiftsCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayForTasks, setSelectedDayForTasks] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const employeesChannel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        loadData();
      })
      .subscribe();

    const assignmentsChannel = supabase
      .channel('shift-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [currentWeekStart]);

  async function loadData() {
    setLoading(true);
    try {
      const [employeesRes, assignmentsRes] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase
          .from('shift_assignments')
          .select('*, employees(name)')
          .gte('shift_date', formatDate(currentWeekStart))
          .lt('shift_date', formatDate(addDays(currentWeekStart, 7))),
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignShift(employeeId: string, shiftType: string) {
    if (!selectedDate) return;

    try {
      const { error } = await supabase.from('shift_assignments').insert({
        employee_id: employeeId,
        shift_date: formatDate(selectedDate),
        shift_type: shiftType,
      });

      if (error) throw error;

      await loadData();
      setSelectedDate(null);
    } catch (error) {
      console.error('Error assigning shift:', error);
      alert('Vardiya atanamadı. Lütfen tekrar deneyin.');
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!confirm('Bu vardiyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Vardiya silinemedi. Lütfen tekrar deneyin.');
    }
  }

  function getWeekDays(startDate: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }

  function getAssignmentsForDate(date: Date): ShiftAssignment[] {
    const dateStr = formatDate(date);
    return assignments.filter((a) => a.shift_date === dateStr);
  }

  const weekDays = getWeekDays(currentWeekStart);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Haftalık Vardiya Takvimi</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Bu Hafta
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
                    {currentWeekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} -{' '}
                    {addDays(currentWeekStart, 6).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {weekDays.map((day) => {
                    const isToday =
                      formatDate(day) === formatDate(new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                          isToday ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="text-xs text-gray-500 uppercase mb-1">
                          {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            isToday ? 'text-blue-600' : 'text-gray-900'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {day.toLocaleDateString('tr-TR', { month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-7">
                  {weekDays.map((day) => {
                    const dayAssignments = getAssignmentsForDate(day);
                    const isToday = formatDate(day) === formatDate(new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[400px] p-3 border-r border-b border-gray-200 last:border-r-0 ${
                          isToday ? 'bg-blue-50 bg-opacity-30' : 'bg-white'
                        }`}
                      >
                        {!isReadOnly && (
                          <button
                            onClick={() => setSelectedDate(day)}
                            className="w-full mb-3 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Vardiya Ekle
                          </button>
                        )}

                        <div className="space-y-2">
                          {dayAssignments.map((assignment) => {
                            const shiftInfo = SHIFT_TYPES.find(
                              (s) => s.value === assignment.shift_type
                            );
                            return (
                              <div
                                key={assignment.id}
                                className={`${shiftInfo?.color} bg-opacity-90 text-white rounded-md p-2 text-xs shadow-sm hover:shadow-md transition-shadow group relative`}
                              >
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                                <div className="font-medium mb-1">
                                  {assignment.employees.name}
                                </div>
                                <div className="text-white text-opacity-90">
                                  {shiftInfo?.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vardiya Tipleri</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SHIFT_TYPES.map((shift) => (
              <div
                key={shift.value}
                className={`${shift.color} text-white rounded-md px-4 py-3 text-sm font-medium text-center`}
              >
                {shift.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gün Seç</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = formatDate(day) === formatDate(selectedDayForTasks);
              const isToday = formatDate(day) === formatDate(new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDayForTasks(day)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isToday
                      ? 'border-gray-300 bg-blue-50 bg-opacity-30'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs text-gray-500 uppercase">
                    {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isSelected ? 'text-blue-600' : isToday ? 'text-blue-500' : 'text-gray-900'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.toLocaleDateString('tr-TR', { month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DailyTasks
        selectedDate={selectedDayForTasks}
        shiftsForDate={getAssignmentsForDate(selectedDayForTasks)}
      />

      {!isReadOnly && selectedDate && (
        <ShiftModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onAssign={handleAssignShift}
          employees={employees}
          existingAssignments={getAssignmentsForDate(selectedDate)}
        />
      )}
    </div>
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
