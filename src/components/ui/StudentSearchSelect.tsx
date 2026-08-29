import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Check, X, Filter, ChevronDown, Phone, AlertCircle, Sparkles } from 'lucide-react';
import { Student, GradeLevel } from '../../types';

interface StudentSearchSelectProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (student: Student) => void;
  label?: string;
  required?: boolean;
  currencySymbol?: string;
  placeholder?: string;
  helperText?: string;
  defaultClassFilter?: string;
}

export const StudentSearchSelect: React.FC<StudentSearchSelectProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  label = 'Search & Select Student',
  required = false,
  currencySymbol = 'KSh',
  placeholder = 'Type student name, admission number, or parent contact...',
  helperText,
  defaultClassFilter = 'ALL',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassFilter);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Extract unique classes present in the students dataset
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach((s) => {
      if (s.currentClass) classSet.add(s.currentClass);
    });
    // Standard ordering if possible
    const standardOrder = [
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
    return Array.from(classSet).sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  // Filter students based on class and search term
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Class filter
      if (selectedClass !== 'ALL' && s.currentClass !== selectedClass) {
        return false;
      }
      // 2. Search query filter
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const nameMatch = s.fullName?.toLowerCase().includes(q);
      const firstMatch = s.firstName?.toLowerCase().includes(q);
      const lastMatch = s.lastName?.toLowerCase().includes(q);
      const admMatch = s.admissionNumber?.toLowerCase().includes(q);
      const kemisMatch = s.kemisNumber?.toLowerCase().includes(q) || s.nemisNumber?.toLowerCase().includes(q);
      const parentNameMatch = s.parentName?.toLowerCase().includes(q);
      const parentPhoneMatch = s.parentPhone?.toLowerCase().includes(q);

      return (
        nameMatch ||
        firstMatch ||
        lastMatch ||
        admMatch ||
        kemisMatch ||
        parentNameMatch ||
        parentPhoneMatch
      );
    });
  }, [students, selectedClass, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-700 text-xs flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
          {selectedStudent && (
            <span className="text-[11px] text-blue-900 font-semibold cursor-pointer hover:underline" onClick={handleClearSelection}>
              Change Student
            </span>
          )}
        </div>
      )}

      {/* Selected Student Highlight Card */}
      {selectedStudent && !isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/90 rounded-2xl cursor-pointer hover:border-blue-300 transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {selectedStudent.photoUrl ? (
                <img
                  src={selectedStudent.photoUrl}
                  alt={selectedStudent.fullName}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>
                  {selectedStudent.firstName?.[0]}
                  {selectedStudent.lastName?.[0]}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-xs truncate">
                  {selectedStudent.fullName}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-950 font-semibold text-[10px] rounded-md">
                  {selectedStudent.admissionNumber}
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-medium text-[10px] rounded-md">
                  {selectedStudent.currentClass} {selectedStudent.stream ? `• ${selectedStudent.stream}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1 flex-wrap">
                {selectedStudent.parentPhone && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-medium font-mono">{selectedStudent.parentPhone}</span>
                    {selectedStudent.parentName ? ` (${selectedStudent.parentName})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pl-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block font-medium">Fee Balance</span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                  (selectedStudent.totalBalance || 0) > 0
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {currencySymbol} {(selectedStudent.totalBalance || 0).toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
              title="Change student selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Search & Filter Interface */
        <div className="space-y-2">
          {/* Controls Bar: Class Filter & Search Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Class Filter Selector */}
            <div className="relative sm:w-44 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setIsOpen(true);
                }}
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 appearance-none cursor-pointer"
              >
                <option value="ALL">All Classes ({students.length})</option>
                {availableClasses.map((c) => {
                  const count = students.filter((s) => s.currentClass === c).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Live Name / Admission Search Box */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                placeholder={placeholder}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Helper Filter Pills when a class is selected */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Filter:</span>
              <span className="font-bold text-slate-700">
                {selectedClass === 'ALL' ? 'All Classes' : selectedClass}
              </span>
              <span>•</span>
              <span>
                Found <strong className="text-blue-900 font-bold">{filteredStudents.length}</strong> matching{' '}
                {filteredStudents.length === 1 ? 'student' : 'students'}
              </span>
            </div>
            {selectedClass !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedClass('ALL')}
                className="text-blue-900 hover:underline font-semibold cursor-pointer"
              >
                Reset Class
              </button>
            )}
          </div>

          {/* Dropdown Results List */}
          {(isOpen || !selectedStudent) && (
            <div className="max-h-56 overflow-y-auto border border-slate-200 bg-white rounded-2xl shadow-lg divide-y divide-slate-100 mt-1">
              {filteredStudents.length === 0 ? (
                <div className="p-5 text-center text-slate-400 text-xs space-y-1">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No students found</p>
                  <p className="text-[11px]">
                    No learner matches "{searchTerm}" in {selectedClass === 'ALL' ? 'any class' : selectedClass}.
                  </p>
                  {selectedClass !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedClass('ALL')}
                      className="mt-2 text-xs font-bold text-blue-900 hover:underline"
                    >
                      Search across all classes
                    </button>
                  )}
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isCurrent = s.id === selectedStudentId;
                  const balance = s.totalBalance || 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/80 hover:bg-blue-100/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCurrent
                              ? 'bg-blue-900 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.fullName}
                              className="w-full h-full object-cover rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span>
                              {s.firstName?.[0]}
                              {s.lastName?.[0]}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {s.fullName}
                            </span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded font-mono">
                              {s.admissionNumber}
                            </span>
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[10px] font-bold rounded">
                              {s.currentClass}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {s.parentPhone ? (
                              <span>Parent: {s.parentPhone}</span>
                            ) : (
                              <span>Stream: {s.stream || 'A'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            balance > 0
                              ? 'text-rose-700 bg-rose-50 border border-rose-200'
                              : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {balance > 0
                            ? `Bal: ${currencySymbol} ${balance.toLocaleString()}`
                            : 'Cleared'}
                        </span>
                        {isCurrent && <Check className="w-4 h-4 text-blue-900" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
