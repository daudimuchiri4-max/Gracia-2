import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { studentService } from '../../services/studentService';
import { LibraryBook, LibraryLoan, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { BookOpen, PlusCircle, Search, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const LibraryView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'LOANS'>('CATALOG');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'CBC Textbook' as LibraryBook['category'],
    totalCopies: 30,
    shelfLocation: 'Shelf A-1',
  });

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    bookId: '',
    studentId: '',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!school?.id) return;
    loadData();
  }, [school?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, lList, sList] = await Promise.all([
        operationsService.getBooks(school!.id),
        operationsService.getLoans(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setBooks(bList);
      setLoans(lList);
      setStudents(sList);

      if (bList.length > 0 && !issueForm.bookId) {
        setIssueForm((p) => ({ ...p, bookId: bList[0].id }));
      }
      if (sList.length > 0 && !issueForm.studentId) {
        setIssueForm((p) => ({ ...p, studentId: sList[0].id }));
      }
    } catch (e: any) {
      showToast('Error loading library data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsService.createBook(school!.id, {
        title: bookForm.title,
        author: bookForm.author,
        isbn: bookForm.isbn,
        category: bookForm.category,
        totalCopies: Number(bookForm.totalCopies),
        availableCopies: Number(bookForm.totalCopies),
        shelfLocation: bookForm.shelfLocation,
      });

      showToast(`Book '${bookForm.title}' added to catalog!`, 'success');
      setIsAddBookModalOpen(false);
      setBookForm({
        title: '',
        author: '',
        isbn: '',
        category: 'CBC Textbook',
        totalCopies: 30,
        shelfLocation: 'Shelf A-1',
      });
      await loadData();
    } catch (e: any) {
      showToast('Error adding book: ' + e.message, 'error');
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const book = books.find((b) => b.id === issueForm.bookId);
    const student = students.find((s) => s.id === issueForm.studentId);
    if (!book || !student) return;

    if (book.availableCopies <= 0) {
      showToast('No available copies left for this book!', 'warning');
      return;
    }

    try {
      await operationsService.issueBook(school!.id, {
        bookId: book.id,
        bookTitle: book.title,
        borrowerType: 'STUDENT',
        borrowerId: student.id,
        borrowerName: student.fullName,
        admissionOrStaffNumber: student.admissionNumber,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: issueForm.dueDate,
      });

      showToast(`Issued '${book.title}' to ${student.fullName}!`, 'success');
      setIsIssueModalOpen(false);
      await loadData();
    } catch (e: any) {
      showToast('Error issuing book: ' + e.message, 'error');
    }
  };

  const handleReturnBook = async (loan: LibraryLoan) => {
    try {
      await operationsService.returnBook(school!.id, loan.id, loan.bookId);
      showToast(`Book '${loan.bookTitle}' returned!`, 'success');
      await loadData();
    } catch (e: any) {
      showToast('Error returning book: ' + e.message, 'error');
    }
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Library Catalog & Reader Loans</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            CBC core textbooks, class readers, storytelling books, and borrower tracking.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => setIsIssueModalOpen(true)}
          >
            Issue Book
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsAddBookModalOpen(true)}
          >
            Add Book Title
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'CATALOG' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Books Catalog ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('LOANS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'LOANS' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Active Loans & Returns ({loans.length})
        </button>
      </div>

      {activeTab === 'CATALOG' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, author, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading catalog...</div>
            ) : filteredBooks.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">No books found</div>
                <p className="text-xs text-slate-400">Add titles to start cataloging.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Title & Author</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Shelf Location</th>
                      <th className="p-3.5 text-center">Total Copies</th>
                      <th className="p-3.5 text-center">Available</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.title}</div>
                          <div className="text-[10px] text-slate-400">by {b.author}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">{b.category}</td>
                        <td className="p-3.5 font-medium text-slate-700">{b.shelfLocation}</td>
                        <td className="p-3.5 text-center font-bold text-slate-800">{b.totalCopies}</td>
                        <td className="p-3.5 text-center font-bold text-blue-900">{b.availableCopies}</td>
                        <td className="p-3.5">
                          <Badge variant={b.availableCopies > 0 ? 'success' : 'danger'} size="sm">
                            {b.availableCopies > 0 ? 'Available' : 'All Borrowed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loans.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No active book loans recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Book Title</th>
                    <th className="p-3.5">Learner</th>
                    <th className="p-3.5">Issued Date</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{loan.bookTitle}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{loan.borrowerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{loan.admissionOrStaffNumber}</div>
                      </td>
                      <td className="p-3.5 text-slate-600">{loan.issueDate}</td>
                      <td className="p-3.5 font-medium text-slate-800">{loan.dueDate}</td>
                      <td className="p-3.5">
                        <Badge variant={loan.status === 'RETURNED' ? 'success' : 'warning'} size="sm">
                          {loan.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {loan.status !== 'RETURNED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={() => handleReturnBook(loan)}
                          >
                            Mark Returned
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Book Modal */}
      <Modal isOpen={isAddBookModalOpen} onClose={() => setIsAddBookModalOpen(false)} title="Add Book to Library" maxWidth="md">
        <form onSubmit={handleAddBook} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Book Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Spotlight CBC Integrated Science Grade 6"
              value={bookForm.title}
              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Author *</label>
              <input
                type="text"
                required
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Category</label>
              <select
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="CBC Textbook">CBC Textbook</option>
                <option value="Storybook">Storybook</option>
                <option value="Reference">Reference</option>
                <option value="Teacher Guide">Teacher Guide</option>
                <option value="Novel">Novel</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Total Copies</label>
              <input
                type="number"
                value={bookForm.totalCopies}
                onChange={(e) => setBookForm({ ...bookForm, totalCopies: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Shelf Location</label>
              <input
                type="text"
                value={bookForm.shelfLocation}
                onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddBookModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Book
            </Button>
          </div>
        </form>
      </Modal>

      {/* Issue Book Modal */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Issue Book to Learner" maxWidth="md">
        <form onSubmit={handleIssueBook} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Select Book *</label>
            <select
              value={issueForm.bookId}
              onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                  {b.title} (Available: {b.availableCopies}/{b.totalCopies})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Select Learner *</label>
            <select
              value={issueForm.studentId}
              onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.currentClass} • {s.admissionNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Due Date *</label>
            <input
              type="date"
              required
              value={issueForm.dueDate}
              onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Issue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
