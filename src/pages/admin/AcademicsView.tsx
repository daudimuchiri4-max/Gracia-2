import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { academicService } from '../../services/academicService';
import { staffService } from '../../services/staffAndParentService';
import { ClassRoom, Subject, Staff, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { BookOpen, Layers, PlusCircle, UserCheck, Check, Sparkles } from 'lucide-react';

const GRADE_LEVELS: GradeLevel[] = [
  'Playgroup',
  'PP1',
  'PP2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
];

export const AcademicsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'CLASSES' | 'SUBJECTS'>('CLASSES');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: 'Grade 6',
    level: 'Grade 6' as GradeLevel,
    streams: 'East, West, North',
    classTeacherId: '',
    capacity: 35,
  });

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    code: 'ICT-ROB',
    name: 'Computer Science & Robotics',
    category: 'CBC Core' as Subject['category'],
    levels: ['Grade 7', 'Grade 8', 'Grade 9'] as GradeLevel[],
  });

  useEffect(() => {
    if (!school?.id) return;
    loadAcademics();
  }, [school?.id]);

  const loadAcademics = async () => {
    setLoading(true);
    try {
      const [cList, sList, stList] = await Promise.all([
        academicService.getClasses(school!.id),
        academicService.getSubjects(school!.id),
        staffService.getStaff(school!.id),
      ]);
      setClasses(cList);
      setSubjects(sList);
      setStaff(stList);
    } catch (e: any) {
      showToast('Error loading academics: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const streamsArr = classForm.streams
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const teacher = staff.find((st) => st.id === classForm.classTeacherId);

      await academicService.createClass(school!.id, {
        name: classForm.name,
        level: classForm.level,
        streams: streamsArr,
        classTeacherId: classForm.classTeacherId,
        classTeacherName: teacher?.fullName,
        capacity: Number(classForm.capacity),
      });

      showToast(`Class ${classForm.name} added successfully!`, 'success');
      setIsAddClassModalOpen(false);
      await loadAcademics();
    } catch (e: any) {
      showToast('Error creating class: ' + e.message, 'error');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicService.createSubject(school!.id, {
        code: subjectForm.code,
        name: subjectForm.name,
        category: subjectForm.category,
        levels: subjectForm.levels,
      });

      showToast(`Subject ${subjectForm.name} registered!`, 'success');
      setIsAddSubjectModalOpen(false);
      await loadAcademics();
    } catch (e: any) {
      showToast('Error creating subject: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Academic Curriculum & Structures</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable Kenyan CBC & CBE learning areas, grades, streams, and facilitators.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'CLASSES' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setIsAddClassModalOpen(true)}
            >
              Add Class
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setIsAddSubjectModalOpen(true)}
            >
              Add CBC Learning Area
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('CLASSES')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'CLASSES' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Classes & Streams ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('SUBJECTS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'SUBJECTS' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          CBC Learning Areas & Subjects ({subjects.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'CLASSES' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">No classes configured.</div>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{cls.name}</h3>
                  <Badge variant="primary" size="sm">
                    {cls.level}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Streams</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {cls.streams?.map((str, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg"
                      >
                        {str}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cls.classTeacherName || 'No Class Teacher Assigned'}</span>
                  </span>
                  <span className="text-slate-400">Cap: {cls.capacity || 35}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading subjects...</div>
          ) : (
            subjects.map((sb) => (
              <div key={sb.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                      {sb.code}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1.5">{sb.name}</h3>
                  </div>
                  <Badge variant="success" size="sm">
                    {sb.category}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Levels</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sb.levels?.map((lvl, i) => (
                      <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Class Modal */}
      <Modal isOpen={isAddClassModalOpen} onClose={() => setIsAddClassModalOpen(false)} title="Create New Class Level" maxWidth="md">
        <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Class Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 7"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Grade Level Category *</label>
            <select
              value={classForm.level}
              onChange={(e) => setClassForm({ ...classForm, level: e.target.value as GradeLevel })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              {GRADE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Streams (comma-separated) *</label>
            <input
              type="text"
              required
              placeholder="East, West, Central, North"
              value={classForm.streams}
              onChange={(e) => setClassForm({ ...classForm, streams: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Class Teacher</label>
            <select
              value={classForm.classTeacherId}
              onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">None Selected</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddClassModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Class
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal isOpen={isAddSubjectModalOpen} onClose={() => setIsAddSubjectModalOpen(false)} title="Add CBC Learning Area" maxWidth="md">
        <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Subject Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. AGR-NUT"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Category *</label>
              <select
                value={subjectForm.category}
                onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="CBC Core">CBC Core</option>
                <option value="CBC Optional">CBC Optional</option>
                <option value="Activity Area">Activity Area</option>
                <option value="Pre-Primary Area">Pre-Primary Area</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Learning Area Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Agriculture & Nutrition"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Learning Area
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
