import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { parentService } from '../../services/staffAndParentService';
import { studentService } from '../../services/studentService';
import { Parent, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, UserPlus, Phone, Mail, MapPin, Users } from 'lucide-react';

export const ParentsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    occupation: '',
    address: '',
  });

  useEffect(() => {
    if (!school?.id) return;
    loadParents();
  }, [school?.id]);

  const loadParents = async () => {
    setLoading(true);
    try {
      const [pList, sList] = await Promise.all([
        parentService.getParents(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setParents(pList);
      setStudents(sList);
    } catch (e: any) {
      showToast('Error loading parents: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      showToast('Name and phone are required', 'error');
      return;
    }
    try {
      await parentService.createParent(school!.id, {
        ...formData,
        childrenIds: [],
      });
      showToast('Parent profile registered successfully!', 'success');
      setIsAddModalOpen(false);
      setFormData({ fullName: '', email: '', phone: '', idNumber: '', occupation: '', address: '' });
      await loadParents();
    } catch (e: any) {
      showToast('Error saving parent: ' + e.message, 'error');
    }
  };

  const filtered = parents.filter((p) => {
    const q = search.toLowerCase();
    return !search || p.fullName.toLowerCase().includes(q) || p.phone.includes(q) || p.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Parents & Guardians Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage parent contact channels, linked siblings, and communication portal records.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Parent Profile
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by parent name, phone number, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs focus:outline-none bg-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No parents registered</div>
            <p className="text-xs text-slate-400">Add parents manually or load demo data.</p>
          </div>
        ) : (
          filtered.map((parent) => {
            const linkedChildren = students.filter(
              (s) => parent.childrenIds?.includes(s.id) || s.parentPhone === parent.phone
            );
            return (
              <div
                key={parent.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{parent.fullName}</h3>
                    {parent.occupation && <p className="text-[11px] text-slate-500">{parent.occupation}</p>}
                  </div>
                  <Badge variant="neutral" size="sm">
                    {linkedChildren.length} {linkedChildren.length === 1 ? 'Child' : 'Children'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parent.phone}</span>
                  </div>
                  {parent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{parent.email}</span>
                    </div>
                  )}
                  {parent.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{parent.address}</span>
                    </div>
                  )}
                </div>

                {linkedChildren.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Linked Learners
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedChildren.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-md text-[11px] font-semibold"
                        >
                          {c.fullName} ({c.currentClass})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Parent Profile" maxWidth="md">
        <form onSubmit={handleCreateParent} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mary Wanjiku"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+254 722 000 000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">National ID Number</label>
              <input
                type="text"
                placeholder="e.g. 24892019"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              placeholder="parent@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Occupation</label>
            <input
              type="text"
              placeholder="e.g. Pharmacist"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Home Residential Address</label>
            <input
              type="text"
              placeholder="e.g. Kasarani Mwiki, Nairobi"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Parent
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
