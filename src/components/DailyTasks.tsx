import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Circle, User, Calendar, Shuffle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TaskDefinition {
  id: string;
  name: string;
  frequency: 'hourly' | 'daily';
  description: string;
  active: boolean;
}

interface Employee {
  id: string;
  name: string;
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

interface TaskAssignment {
  id: string;
  task_definition_id: string;
  employee_id: string;
  assigned_date: string;
  assigned_hour: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
  notes: string | null;
  task_definitions: TaskDefinition;
  employees: {
    name: string;
  };
}

interface AssignTaskModalProps {
  task: TaskDefinition;
  hour: number | null;
  date: Date;
  employees: Employee[];
  onClose: () => void;
  onAssign: (employeeId: string) => void;
}

function AssignTaskModal({ task, hour, date, employees, onClose, onAssign }: AssignTaskModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const handleAssign = () => {
    if (selectedEmployee) {
      onAssign(selectedEmployee);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Görev Ata</h3>
          <p className="text-sm text-gray-600 mt-1">{task.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {hour !== null && ` - Saat: ${hour}:00`}
          </p>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personel Seçin
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Personel seçiniz...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
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
            disabled={!selectedEmployee}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Ata
          </button>
        </div>
      </div>
    </div>
  );
}

interface DailyTasksProps {
  selectedDate: Date;
  shiftsForDate: ShiftAssignment[];
}

export default function DailyTasks({ selectedDate, shiftsForDate }: DailyTasksProps) {
  const [taskDefinitions, setTaskDefinitions] = useState<TaskDefinition[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    task: TaskDefinition;
    hour: number | null;
  } | null>(null);

  useEffect(() => {
    loadData();

    const tasksChannel = supabase
      .channel('task-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => {
        loadData();
      })
      .subscribe();

    const defsChannel = supabase
      .channel('task-definitions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_definitions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(defsChannel);
    };
  }, [selectedDate]);

  async function loadData() {
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);

      const [defsRes, assignmentsRes, employeesRes] = await Promise.all([
        supabase.from('task_definitions').select('*').eq('active', true).order('name'),
        supabase
          .from('task_assignments')
          .select('*, task_definitions(*), employees(name)')
          .eq('assigned_date', dateStr),
        supabase.from('employees').select('*').eq('active', true).order('name'),
      ]);

      if (defsRes.data) setTaskDefinitions(defsRes.data);
      if (assignmentsRes.data) setTaskAssignments(assignmentsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  const employeesOnShift = shiftsForDate.map((shift) => ({
    id: shift.employee_id,
    name: shift.employees.name,
    shiftType: shift.shift_type,
  }));

  function parseShiftHours(shiftType: string): { start: number; end: number } {
    const [start, end] = shiftType.split('-').map(Number);
    return { start, end };
  }

  function getHoursInShift(shiftType: string): number[] {
    const { start, end } = parseShiftHours(shiftType);
    const hours: number[] = [];

    if (end > start) {
      for (let h = start; h < end; h++) {
        hours.push(h);
      }
    } else {
      for (let h = start; h < 24; h++) {
        hours.push(h);
      }
      for (let h = 0; h < end; h++) {
        hours.push(h);
      }
    }

    return hours;
  }

  async function handleAutoAssignHourlyTasks() {
    if (!confirm('Saatlik görevler otomatik olarak adil bir şekilde dağıtılacak. Devam etmek istiyor musunuz?')) {
      return;
    }

    setAutoAssigning(true);
    try {
      const hourlyTasks = taskDefinitions.filter(t => t.frequency === 'hourly');
      const dateStr = formatDate(selectedDate);

      const existingAssignments = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_date', dateStr)
        .in('task_definition_id', hourlyTasks.map(t => t.id));

      if (existingAssignments.data && existingAssignments.data.length > 0) {
        if (!confirm('Bu gün için saatlik görevler zaten atanmış. Mevcut atamaları silip yeniden atamak istiyor musunuz?')) {
          setAutoAssigning(false);
          return;
        }

        await supabase
          .from('task_assignments')
          .delete()
          .eq('assigned_date', dateStr)
          .in('task_definition_id', hourlyTasks.map(t => t.id));
      }

      const newAssignments: any[] = [];

      for (const task of hourlyTasks) {
        const employeeTaskCounts: Record<string, number> = {};
        shiftsForDate.forEach(shift => {
          employeeTaskCounts[shift.employee_id] = 0;
        });

        const allHours = new Set<number>();
        shiftsForDate.forEach(shift => {
          const shiftHours = getHoursInShift(shift.shift_type);
          shiftHours.forEach(h => allHours.add(h));
        });

        const sortedHours = Array.from(allHours).sort((a, b) => a - b);

        for (const hour of sortedHours) {
          const availableEmployees = shiftsForDate.filter(shift => {
            const shiftHours = getHoursInShift(shift.shift_type);
            return shiftHours.includes(hour);
          });

          if (availableEmployees.length === 0) continue;

          const eligibleEmployees = availableEmployees
            .map(emp => ({
              id: emp.employee_id,
              count: employeeTaskCounts[emp.employee_id] || 0
            }))
            .sort((a, b) => a.count - b.count);

          const minCount = eligibleEmployees[0].count;
          const leastAssigned = eligibleEmployees.filter(e => e.count === minCount);

          const selectedEmployee = leastAssigned[Math.floor(Math.random() * leastAssigned.length)];

          employeeTaskCounts[selectedEmployee.id]++;

          newAssignments.push({
            task_definition_id: task.id,
            employee_id: selectedEmployee.id,
            assigned_date: dateStr,
            assigned_hour: hour,
            status: 'pending'
          });
        }
      }

      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from('task_assignments')
          .insert(newAssignments);

        if (error) throw error;
      }

      await loadData();
      alert(`${newAssignments.length} görev başarıyla atandı!`);
    } catch (error) {
      console.error('Error auto-assigning tasks:', error);
      alert('Otomatik görev ataması sırasında hata oluştu.');
    } finally {
      setAutoAssigning(false);
    }
  }

  async function handleAssignTask(taskDefId: string, hour: number | null, employeeId: string) {
    try {
      const { error } = await supabase.from('task_assignments').insert({
        task_definition_id: taskDefId,
        employee_id: employeeId,
        assigned_date: formatDate(selectedDate),
        assigned_hour: hour,
        status: 'pending',
      });

      if (error) throw error;

      await loadData();
      setAssignModal(null);
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Görev atanamadı. Lütfen tekrar deneyin.');
    }
  }

  async function toggleTaskStatus(assignmentId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Görev durumu güncellenemedi.');
    }
  }

  async function deleteTaskAssignment(assignmentId: string) {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('task_assignments').delete().eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Görev silinemedi.');
    }
  }

  function getAssignmentsForTask(taskId: string, hour: number | null): TaskAssignment[] {
    return taskAssignments.filter(
      (a) => a.task_definition_id === taskId && a.assigned_hour === hour
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Görevler yükleniyor...</div>
      </div>
    );
  }

  if (employeesOnShift.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Bu gün için vardiya ataması yapılmamış.</p>
        <p className="text-sm text-gray-500 mt-1">Görev atayabilmek için önce vardiya ataması yapın.</p>
      </div>
    );
  }

  const hourlyTasks = taskDefinitions.filter((t) => t.frequency === 'hourly');
  const dailyTasks = taskDefinitions.filter((t) => t.frequency === 'daily');
  const workingHours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Günlük Görev Dağılımı</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAutoAssignHourlyTasks}
                disabled={autoAssigning || employeesOnShift.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                <span>{autoAssigning ? 'Atanıyor...' : 'Saatlik Görevleri Otomatik Ata'}</span>
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{employeesOnShift.length} personel vardiyada</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Günlük Görevler
            </h4>
            <div className="space-y-2">
              {dailyTasks.map((task) => {
                const assignments = getAssignmentsForTask(task.id, null);
                return (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{task.name}</h5>
                        <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                      </div>
                      <button
                        onClick={() => setAssignModal({ task, hour: null })}
                        className="ml-4 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Görev Ata
                      </button>
                    </div>
                    {assignments.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between bg-white rounded-md p-2 border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleTaskStatus(assignment.id, assignment.status)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                {assignment.status === 'completed' ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>
                              <span className={`text-sm ${assignment.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {assignment.employees.name}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteTaskAssignment(assignment.id)}
                              className="text-xs text-red-600 hover:text-red-700 transition-colors"
                            >
                              Sil
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Saatlik Görevler
            </h4>
            <div className="space-y-4">
              {hourlyTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <h5 className="font-medium text-gray-900 text-sm">{task.name}</h5>
                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {workingHours.map((hour) => {
                        const assignments = getAssignmentsForTask(task.id, hour);
                        const hasAssignment = assignments.length > 0;
                        const allCompleted = assignments.length > 0 && assignments.every(a => a.status === 'completed');

                        return (
                          <button
                            key={hour}
                            onClick={() => setAssignModal({ task, hour })}
                            className={`relative p-2 rounded-md text-xs font-medium transition-all ${
                              allCompleted
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : hasAssignment
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="font-semibold">{hour}:00</div>
                            {hasAssignment && (
                              <div className="text-[10px] mt-1 truncate">
                                {assignments.map(a => a.employees.name).join(', ')}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {getAssignmentsForTask(task.id, null).length === 0 &&
                      workingHours.every(h => getAssignmentsForTask(task.id, h).length === 0) && (
                        <p className="text-xs text-gray-500 text-center mt-3">
                          Henüz görev ataması yapılmamış
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {assignModal && (
        <AssignTaskModal
          task={assignModal.task}
          hour={assignModal.hour}
          date={selectedDate}
          employees={employeesOnShift}
          onClose={() => setAssignModal(null)}
          onAssign={(empId) => handleAssignTask(assignModal.task.id, assignModal.hour, empId)}
        />
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
