import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, CheckCircle, School as SchoolIcon, Zap, FileText, Edit2, Trash2 } from 'lucide-react';
import { Payment, School } from '../../types';
import { printerService } from '../../services/printerService';
import { PrinterManagerModal } from './PrinterManagerModal';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  school: School | null;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  school,
  onEdit,
  onDelete,
}) => {
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  if (!payment) return null;

  const handlePrintA4 = () => {
    printerService.printFeeReceipt(payment, school, 'A4');
  };

  const handlePrintThermal = () => {
    printerService.printFeeReceipt(payment, school, '80mm');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Payment Receipt" maxWidth="lg">
      <div id="printable-receipt" className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800">
        {/* School Header */}
        <div className="text-center border-b border-slate-200 pb-4">
          <div className="flex justify-center mb-3">
            <img
              src={(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}
              alt={school?.name || 'Gracia Learning Centre'}
              className="w-24 h-24 object-contain drop-shadow-sm"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/gracia_logo.svg';
              }}
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
            {school?.name || 'Gracia Learning Centre'}
          </h2>
          <p className="text-xs text-orange-600 font-bold tracking-wider italic mt-0.5">
            {school?.motto || '— I can! I will! —'}
          </p>
          <p className="text-xs text-slate-600 mt-1">{school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi'} • Tel: {school?.phone || '+254 722 000 123'}</p>
          <div className="mt-2.5 inline-block px-3 py-0.5 bg-blue-900 text-white text-[11px] font-bold tracking-wider rounded-md uppercase">
            Official Fee Payment Receipt
          </div>
        </div>

        {/* Receipt Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Receipt No:</span>
            <p className="font-bold text-slate-900">{payment.receiptNumber}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Date & Time:</span>
            <p className="font-medium text-slate-900">{new Date(payment.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Student Name:</span>
            <p className="font-semibold text-slate-900">{payment.studentName}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Admission No:</span>
            <p className="font-semibold text-slate-900">{payment.admissionNumber}</p>
          </div>
          {payment.parentName && (
            <div>
              <span className="text-xs text-slate-400 font-medium">Received From:</span>
              <p className="font-medium text-slate-800">{payment.parentName} ({payment.parentPhone || 'N/A'})</p>
            </div>
          )}
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Payment Mode:</span>
            <p className="font-bold text-emerald-800 uppercase">{payment.paymentMethod} {payment.transactionReference ? `(${payment.transactionReference})` : ''}</p>
          </div>
        </div>

        {/* Financial Summary & Balance Reconciliation Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Amount Paid */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Amount Paid (Credited)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Received
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
                {school?.currencySymbol || 'KSh'} {payment.amount.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                {payment.notes || 'School Fee Installment & CBC Learning Materials'}
              </p>
            </div>

            {/* Remaining Balance */}
            <div
              className={`rounded-xl p-3.5 border ${
                (payment.remainingBalance ?? 0) === 0
                  ? 'bg-blue-50/70 border-blue-200'
                  : 'bg-amber-50/80 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    (payment.remainingBalance ?? 0) === 0 ? 'text-blue-900' : 'text-amber-900'
                  }`}
                >
                  Outstanding Fee Balance
                </span>
                {(payment.remainingBalance ?? 0) === 0 ? (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Fully Cleared
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Balance Due
                  </span>
                )}
              </div>
              <div
                className={`text-2xl font-black mt-1 font-mono ${
                  (payment.remainingBalance ?? 0) === 0 ? 'text-slate-900' : 'text-amber-950'
                }`}
              >
                {school?.currencySymbol || 'KSh'}{' '}
                {(
                  payment.remainingBalance !== undefined
                    ? payment.remainingBalance
                    : payment.previousBalance !== undefined
                    ? Math.max(0, payment.previousBalance - payment.amount)
                    : 0
                ).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {payment.previousBalance !== undefined
                  ? `Previous Balance: ${school?.currencySymbol || 'KSh'} ${payment.previousBalance.toLocaleString()}`
                  : 'Current Ledger Balance'}
              </p>
            </div>
          </div>

          {/* Quick Ledger Breakdown Strip */}
          <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Previous Balance</span>
              <span className="font-bold text-slate-800">
                {school?.currencySymbol || 'KSh'}{' '}
                {(
                  payment.previousBalance !== undefined
                    ? payment.previousBalance
                    : (payment.remainingBalance ?? 0) + payment.amount
                ).toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase">Amount Paid</span>
              <span className="font-extrabold text-emerald-800">
                - {school?.currencySymbol || 'KSh'} {payment.amount.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">New Balance Due</span>
              <span
                className={`font-black ${
                  (payment.remainingBalance ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-900'
                }`}
              >
                {school?.currencySymbol || 'KSh'}{' '}
                {(
                  payment.remainingBalance !== undefined
                    ? payment.remainingBalance
                    : payment.previousBalance !== undefined
                    ? Math.max(0, payment.previousBalance - payment.amount)
                    : 0
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>Served By: <span className="font-semibold text-slate-700">{payment.cashierName}</span></p>
            <p className="italic text-[11px] text-slate-400 mt-1">Thank you for your timely payment.</p>
          </div>
          <div className="text-center">
            <div className="w-28 border-b border-slate-400 mb-1"></div>
            <span className="text-[10px] uppercase font-semibold text-slate-500">Authorized Bursar Stamp</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPrinterModalOpen(true)}
            className="text-xs text-blue-900 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printer Setup</span>
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(payment);
              }}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Receipt</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                onClose();
                onDelete(payment);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Receipt</span>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            icon={<Zap className="w-4 h-4" />}
            onClick={handlePrintThermal}
            title="Send to 80mm / 58mm Thermal Slip Printer"
          >
            Thermal Slip (80mm)
          </Button>
          <Button
            variant="primary"
            icon={<FileText className="w-4 h-4" />}
            onClick={handlePrintA4}
            title="Print Official A4 Document"
          >
            Print Official A4
          </Button>
        </div>
      </div>

      <PrinterManagerModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />
    </Modal>
  );
};
