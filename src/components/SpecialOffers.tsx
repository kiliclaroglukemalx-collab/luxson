import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, User, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Employee {
  id: string;
  name: string;
  active: boolean;
}

interface SpecialOffer {
  id: string;
  employee_id: string;
  offer_date: string;
  image_url: string;
  image_name: string | null;
  notes: string | null;
  created_at: string;
  employees: {
    name: string;
  };
}

interface UploadModalProps {
  employees: Employee[];
  selectedDate: Date;
  onClose: () => void;
  onUpload: (employeeId: string, imageData: string, imageName: string, notes: string) => void;
}

function UploadModal({ employees, selectedDate, onClose, onUpload }: UploadModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    setImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedEmployee || !imagePreview) {
      alert('Lütfen personel seçin ve resim yükleyin.');
      return;
    }

    setUploading(true);
    try {
      await onUpload(selectedEmployee, imagePreview, imageName, notes);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Özel Oran Teklifi Yükle</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kim Yüklüyor? <span className="text-red-500">*</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teklif Görseli <span className="text-red-500">*</span>
            </label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageName('');
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Tıklayın</span> veya sürükleyin
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG (Max 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Teklif hakkında notlar..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedEmployee || !imagePreview || uploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SpecialOffersProps {
  selectedDate?: Date;
}

export default function SpecialOffers({ selectedDate: initialDate }: SpecialOffersProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadData();

    const offersChannel = supabase
      .channel('special-offers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_offers' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
    };
  }, [selectedDate]);

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }

  async function loadData() {
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);

      const [employeesRes, offersRes] = await Promise.all([
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase
          .from('special_offers')
          .select('*, employees(name)')
          .eq('offer_date', dateStr)
          .order('created_at', { ascending: false }),
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (offersRes.data) setOffers(offersRes.data);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(
    employeeId: string,
    imageData: string,
    imageName: string,
    notes: string
  ) {
    try {
      const { error } = await supabase.from('special_offers').insert({
        employee_id: employeeId,
        offer_date: formatDate(selectedDate),
        image_url: imageData,
        image_name: imageName,
        notes: notes || null,
      });

      if (error) throw error;

      await loadData();
      alert('Özel oran teklifi başarıyla yüklendi!');
    } catch (error) {
      console.error('Error uploading offer:', error);
      alert('Teklif yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  async function handleDelete(offerId: string) {
    if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('special_offers').delete().eq('id', offerId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting offer:', error);
      alert('Teklif silinemedi.');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Özel Oran Teklifleri</h2>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Teklif Yükle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-600" />
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {selectedDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              {isToday && (
                <span className="text-xs text-blue-600 font-medium">Bugün</span>
              )}
            </div>
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">

        <div className="p-6">
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Bugün için henüz teklif yüklenmemiş</p>
            <p className="text-sm text-gray-500">Yeni bir teklif yüklemek için yukarıdaki butona tıklayın</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{offer.employees.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  <img
                    src={offer.image_url}
                    alt={`Teklif - ${offer.employees.name}`}
                    className="w-full h-auto rounded-md"
                  />
                  {offer.notes && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {offer.notes}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(offer.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {showUploadModal && (
        <UploadModal
          employees={employees}
          selectedDate={selectedDate}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
