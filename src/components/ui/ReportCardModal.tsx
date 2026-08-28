import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { Printer, Download, Award, School as SchoolIcon } from 'lucide-react';
import { ReportCard, School } from '../../types';
import { printerService } from '../../services/printerService';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportCard: ReportCard | null;
  school: School | null;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  reportCard,
  school,
}) => {
  if (!reportCard) return null;

  const handlePrint = () => {
    printerService.printReportCard(reportCard, school);
  };

  const getCBCRatingLabel = (rating: string) => {
    switch (rating) {
      case 'EE':
        return { label: 'Exceeding Expectations (EE)', variant: 'success' as const };
      case 'ME':
        return { label: 'Meeting Expectations (ME)', variant: 'primary' as const };
      case 'AE':
        return { label: 'Approaching Expectations (AE)', variant: 'warning' as const };
      case 'BE':
        return { label: 'Below Expectations (BE)', variant: 'danger' as const };
      default:
        return { label: rating, variant: 'neutral' as const };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CBC Learner Progress & Assessment Report" maxWidth="4xl">
      <div id="printable-reportcard" className="p-8 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900 text-white rounded-2xl">
              <SchoolIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {school?.name || 'Gracia Learning Centre'}
              </h1>
              <p className="text-xs text-slate-500 font-semibold italic">{school?.motto}</p>
              <p className="text-xs text-slate-600 mt-0.5">{school?.address} • Tel: {school?.phone} • Email: {school?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg tracking-wider">
              KENYA CBC REPORT
            </span>
            <p className="text-xs font-semibold text-slate-700 mt-1">{reportCard.academicYear} • {reportCard.term}</p>
          </div>
        </div>

        {/* Student Meta Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Learner Name:</span>
            <p className="text-sm font-bold text-slate-900">{reportCard.studentName}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Admission No:</span>
            <p className="text-sm font-bold text-slate-900">{reportCard.admissionNumber}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Class & Stream:</span>
            <p className="text-sm font-bold text-slate-900">{reportCard.classLevel} - {reportCard.stream}</p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Attendance Record:</span>
            <p className="text-sm font-bold text-emerald-800">
              {reportCard.attendanceDaysPresent} / {reportCard.attendanceTotalDays} Days ({Math.round((reportCard.attendanceDaysPresent / (reportCard.attendanceTotalDays || 1)) * 100)}%)
            </p>
          </div>
        </div>

        {/* Academic Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3">Learning Area / Subject</th>
                <th className="p-3 text-center">Score (Max 100)</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3 text-center">CBC Rubric Rating</th>
                <th className="p-3">Facilitator / Teacher Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportCard.results.map((res, idx) => {
                const badge = getCBCRatingLabel(res.cbcRating);
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-3 font-semibold text-slate-900">{res.subjectName}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{res.score}%</td>
                    <td className="p-3 text-center font-bold text-blue-900">{res.grade}</td>
                    <td className="p-3 text-center">
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </td>
                    <td className="p-3 text-slate-600 italic">{res.teacherComment || 'Satisfactory achievement.'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="p-3">Average & Overall Performance</td>
                <td className="p-3 text-center text-sm font-black text-blue-900">{reportCard.averagePercentage}%</td>
                <td className="p-3 text-center">-</td>
                <td className="p-3 text-center">
                  <Badge variant={getCBCRatingLabel(reportCard.overallCBCRating).variant}>
                    {getCBCRatingLabel(reportCard.overallCBCRating).label}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-slate-600">Total Marks: {reportCard.totalScore}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* CBC Rating Legend */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kenyan CBC Evaluation Scale</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> <strong>EE (80-100%):</strong> Exceeding Expectations</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> <strong>ME (60-79%):</strong> Meeting Expectations</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> <strong>AE (40-59%):</strong> Approaching Expectations</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> <strong>BE (0-39%):</strong> Below Expectations</div>
          </div>
        </div>

        {/* Teacher & Principal Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="font-semibold text-slate-900">Class Teacher Remark:</span>
            <p className="text-slate-600 mt-1 italic leading-relaxed">
              "{reportCard.classTeacherComment || 'Brian is an enthusiastic, well-behaved learner who grasps concepts rapidly.'}"
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
              <span>Class Facilitator Signature</span>
              <span>Date: {new Date(reportCard.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="font-semibold text-slate-900">Headteacher Remark & Stamp:</span>
            <p className="text-slate-600 mt-1 italic leading-relaxed">
              "{reportCard.headTeacherComment || 'Commendable effort. Encourage regular reading over the holiday.'}"
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
              <span>Official School Stamp / Signature</span>
              <span>Next Term Reopening: {reportCard.openingDateNextTerm || '05/05/2026'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Print / Save PDF
        </Button>
      </div>
    </Modal>
  );
};
