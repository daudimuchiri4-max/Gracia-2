import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_WEBSITE_CONTENT, DEFAULT_SCHOOL_ID } from './schoolService';
import {
  LibraryBook,
  LibraryLoan,
  TimetableSlot,
  TransportRoute,
  HealthRecord,
  DisciplineIncident,
  SchoolEvent,
  Announcement,
  AdmissionApplication,
  WebsiteContent,
} from '../types';

// Deep cleaner to prevent Firestore undefined errors
function cleanForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export const operationsService = {
  // Library
  async getBooks(schoolId: string): Promise<LibraryBook[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'libraryBooks'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as LibraryBook));
    } catch (err) {
      console.error('Error fetching library books:', err);
      return [];
    }
  },

  async createBook(schoolId: string, data: Omit<LibraryBook, 'id' | 'schoolId' | 'createdAt'>): Promise<LibraryBook> {
    const colRef = collection(db, 'schools', schoolId, 'libraryBooks');
    const newDoc = doc(colRef);
    const book: LibraryBook = {
      ...data,
      id: newDoc.id,
      schoolId,
      totalCopies: Number(data.totalCopies),
      availableCopies: Number(data.availableCopies || data.totalCopies),
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, book);
    return book;
  },

  async getLoans(schoolId: string): Promise<LibraryLoan[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'libraryLoans'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as LibraryLoan));
    } catch (err) {
      console.error('Error fetching library loans:', err);
      return [];
    }
  },

  async issueBook(schoolId: string, data: Omit<LibraryLoan, 'id' | 'schoolId' | 'status'>): Promise<LibraryLoan> {
    const colRef = collection(db, 'schools', schoolId, 'libraryLoans');
    const newDoc = doc(colRef);
    const loan: LibraryLoan = {
      ...data,
      id: newDoc.id,
      schoolId,
      status: 'ISSUED',
    };
    await setDoc(newDoc, loan);

    // Decrement available copies
    const bookRef = doc(db, 'schools', schoolId, 'libraryBooks', data.bookId);
    const snap = await getDoc(bookRef);
    if (snap.exists()) {
      const b = snap.data() as LibraryBook;
      await updateDoc(bookRef, { availableCopies: Math.max(0, (b.availableCopies || 1) - 1) });
    }

    return loan;
  },

  async returnBook(schoolId: string, loanId: string, bookId: string): Promise<void> {
    const loanRef = doc(db, 'schools', schoolId, 'libraryLoans', loanId);
    await updateDoc(loanRef, {
      status: 'RETURNED',
      returnDate: new Date().toISOString().split('T')[0],
    });

    const bookRef = doc(db, 'schools', schoolId, 'libraryBooks', bookId);
    const snap = await getDoc(bookRef);
    if (snap.exists()) {
      const b = snap.data() as LibraryBook;
      await updateDoc(bookRef, { availableCopies: (b.availableCopies || 0) + 1 });
    }
  },

  // Timetable
  async getTimetable(schoolId: string, classLevel?: string, stream?: string): Promise<TimetableSlot[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'timetables'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as TimetableSlot));
      if (classLevel) list = list.filter((t) => t.classLevel === classLevel);
      if (stream) list = list.filter((t) => t.stream.toLowerCase() === stream.toLowerCase());
      return list;
    } catch (err) {
      console.error('Error fetching timetable:', err);
      return [];
    }
  },

  async saveTimetableSlot(schoolId: string, slot: Omit<TimetableSlot, 'id' | 'schoolId'>): Promise<TimetableSlot> {
    const colRef = collection(db, 'schools', schoolId, 'timetables');
    const newDoc = doc(colRef);
    const fullSlot: TimetableSlot = { ...slot, id: newDoc.id, schoolId };
    await setDoc(newDoc, fullSlot);
    return fullSlot;
  },

  async deleteTimetableSlot(schoolId: string, slotId: string): Promise<void> {
    await deleteDoc(doc(db, 'schools', schoolId, 'timetables', slotId));
  },

  // Transport
  async getTransportRoutes(schoolId: string): Promise<TransportRoute[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'routes'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as TransportRoute));
    } catch (err) {
      console.error('Error fetching transport routes:', err);
      return [];
    }
  },

  async createTransportRoute(schoolId: string, data: Omit<TransportRoute, 'id' | 'schoolId'>): Promise<TransportRoute> {
    const colRef = collection(db, 'schools', schoolId, 'routes');
    const newDoc = doc(colRef);
    const route: TransportRoute = { ...data, id: newDoc.id, schoolId };
    await setDoc(newDoc, cleanForFirestore(route));
    return route;
  },

  async updateTransportRoute(schoolId: string, routeId: string, updates: Partial<TransportRoute>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'routes', routeId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },

  async deleteTransportRoute(schoolId: string, routeId: string): Promise<void> {
    await deleteDoc(doc(db, 'schools', schoolId, 'routes', routeId));
  },

  // Health
  async getHealthRecords(schoolId: string, studentId?: string): Promise<HealthRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'healthRecords'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as HealthRecord));
      if (studentId) list = list.filter((h) => h.studentId === studentId);
      return list;
    } catch (err) {
      console.error('Error fetching health records:', err);
      return [];
    }
  },

  async createHealthRecord(schoolId: string, data: Omit<HealthRecord, 'id' | 'schoolId'>): Promise<HealthRecord> {
    const colRef = collection(db, 'schools', schoolId, 'healthRecords');
    const newDoc = doc(colRef);
    const rec: HealthRecord = { ...data, id: newDoc.id, schoolId };
    await setDoc(newDoc, rec);
    return rec;
  },

  // Discipline
  async getDisciplineIncidents(schoolId: string, studentId?: string): Promise<DisciplineIncident[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'disciplineIncidents'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as DisciplineIncident));
      if (studentId) list = list.filter((di) => di.studentId === studentId);
      return list;
    } catch (err) {
      console.error('Error fetching discipline incidents:', err);
      return [];
    }
  },

  async createDisciplineIncident(schoolId: string, data: Omit<DisciplineIncident, 'id' | 'schoolId'>): Promise<DisciplineIncident> {
    const colRef = collection(db, 'schools', schoolId, 'disciplineIncidents');
    const newDoc = doc(colRef);
    const rec: DisciplineIncident = { ...data, id: newDoc.id, schoolId };
    await setDoc(newDoc, rec);
    return rec;
  },

  // Announcements & Events
  async getAnnouncements(schoolId: string): Promise<Announcement[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'announcements'));
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as Announcement))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error fetching announcements:', err);
      return [];
    }
  },

  async createAnnouncement(schoolId: string, data: Omit<Announcement, 'id' | 'schoolId' | 'createdAt'>): Promise<Announcement> {
    const colRef = collection(db, 'schools', schoolId, 'announcements');
    const newDoc = doc(colRef);
    const item: Announcement = { ...data, id: newDoc.id, schoolId, createdAt: new Date().toISOString() };
    await setDoc(newDoc, item);
    return item;
  },

  async getEvents(schoolId: string): Promise<SchoolEvent[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'events'));
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as SchoolEvent))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.error('Error fetching events:', err);
      return [];
    }
  },

  async createEvent(schoolId: string, data: Omit<SchoolEvent, 'id' | 'schoolId' | 'createdAt'>): Promise<SchoolEvent> {
    const colRef = collection(db, 'schools', schoolId, 'events');
    const newDoc = doc(colRef);
    const item: SchoolEvent = { ...data, id: newDoc.id, schoolId, createdAt: new Date().toISOString() };
    await setDoc(newDoc, item);
    return item;
  },

  // Online Admissions
  async getAdmissions(schoolId: string): Promise<AdmissionApplication[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'admissionApplications'));
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AdmissionApplication))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error fetching admissions:', err);
      return [];
    }
  },

  async submitOnlineAdmission(schoolId: string, data: Omit<AdmissionApplication, 'id' | 'schoolId' | 'applicationNumber' | 'status' | 'createdAt'>): Promise<AdmissionApplication> {
    const colRef = collection(db, 'schools', schoolId, 'admissionApplications');
    const newDoc = doc(colRef);
    const appNum = `APP/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;
    const application: AdmissionApplication = {
      ...data,
      id: newDoc.id,
      schoolId,
      applicationNumber: appNum,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, application);
    return application;
  },

  async updateAdmissionStatus(schoolId: string, appId: string, status: AdmissionApplication['status'], reviewNotes?: string): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'admissionApplications', appId);
    const updates: Partial<AdmissionApplication> = { status };
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    await updateDoc(docRef, updates);
  },

  // Website CMS
  async getWebsiteContent(schoolId: string = DEFAULT_SCHOOL_ID): Promise<WebsiteContent | null> {
    const sid = schoolId || DEFAULT_SCHOOL_ID;
    try {
      const sanitizeContent = (content: WebsiteContent): WebsiteContent => {
        if (!content) return content;
        return content;
      };

      const docRef = doc(db, 'schools', sid, 'websiteCMS', 'main');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const rawData = snap.data() as WebsiteContent;
        const mergedData: WebsiteContent = {
          ...DEFAULT_WEBSITE_CONTENT,
          ...rawData,
          stats: {
            ...DEFAULT_WEBSITE_CONTENT.stats,
            ...(rawData.stats || {}),
          },
          heroSlides: rawData.heroSlides && rawData.heroSlides.length > 0 ? rawData.heroSlides : DEFAULT_WEBSITE_CONTENT.heroSlides,
          facilities: rawData.facilities && rawData.facilities.length > 0 ? rawData.facilities : DEFAULT_WEBSITE_CONTENT.facilities,
          faqs: rawData.faqs && rawData.faqs.length > 0 ? rawData.faqs : DEFAULT_WEBSITE_CONTENT.faqs,
          typography: rawData.typography || DEFAULT_WEBSITE_CONTENT.typography,
        };
        const data = sanitizeContent(mergedData);
        try {
          localStorage.setItem(`website_cms_${sid}`, JSON.stringify(data));
          localStorage.setItem(`website_cms_${DEFAULT_SCHOOL_ID}`, JSON.stringify(data));
        } catch {
          // ignore local quota issues
        }
        return data;
      }
      // Check local cache if not found in Firestore
      const cached = localStorage.getItem(`website_cms_${sid}`) || localStorage.getItem(`website_cms_${DEFAULT_SCHOOL_ID}`);
      if (cached) {
        const parsed = JSON.parse(cached) as WebsiteContent;
        const mergedCached: WebsiteContent = {
          ...DEFAULT_WEBSITE_CONTENT,
          ...parsed,
          stats: {
            ...DEFAULT_WEBSITE_CONTENT.stats,
            ...(parsed.stats || {}),
          },
          heroSlides: parsed.heroSlides && parsed.heroSlides.length > 0 ? parsed.heroSlides : DEFAULT_WEBSITE_CONTENT.heroSlides,
          facilities: parsed.facilities && parsed.facilities.length > 0 ? parsed.facilities : DEFAULT_WEBSITE_CONTENT.facilities,
          faqs: parsed.faqs && parsed.faqs.length > 0 ? parsed.faqs : DEFAULT_WEBSITE_CONTENT.faqs,
          typography: parsed.typography || DEFAULT_WEBSITE_CONTENT.typography,
        };
        return sanitizeContent(mergedCached);
      }
      return { ...DEFAULT_WEBSITE_CONTENT, schoolId: sid };
    } catch (err) {
      console.error('Error fetching website content from firestore:', err);
      const cached = localStorage.getItem(`website_cms_${sid}`) || localStorage.getItem(`website_cms_${DEFAULT_SCHOOL_ID}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const sanitized = {
            ...parsed,
            faqs: (parsed.faqs || []).map((f: any) => ({
              ...f,
              answer: f.answer
                ? f.answer.replace(/Kileleshwa|Lavington|Ngong Road|Karen|South C|Westlands/gi, '').trim()
                : '',
            })),
          };
          return sanitized as WebsiteContent;
        } catch {
          // fallback
        }
      }
      return { ...DEFAULT_WEBSITE_CONTENT, schoolId: sid };
    }
  },

  async updateWebsiteContent(schoolId: string, updates: Partial<WebsiteContent>): Promise<void> {
    const sid = schoolId || DEFAULT_SCHOOL_ID;
    const docRef = doc(db, 'schools', sid, 'websiteCMS', 'main');
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      schoolId: sid,
      updatedAt: new Date().toISOString(),
    });

    try {
      await setDoc(docRef, cleanedUpdates, { merge: true });
      console.log('Firestore websiteCMS document saved successfully for school:', sid);
    } catch (err) {
      console.warn('Firestore setDoc failed for websiteCMS, saving to local cache:', err);
    }

    try {
      const existing = localStorage.getItem(`website_cms_${sid}`) || localStorage.getItem(`website_cms_${DEFAULT_SCHOOL_ID}`);
      const prev = existing ? JSON.parse(existing) : DEFAULT_WEBSITE_CONTENT;
      const merged = { ...prev, ...cleanedUpdates };
      localStorage.setItem(`website_cms_${sid}`, JSON.stringify(merged));
      if (sid !== DEFAULT_SCHOOL_ID) {
        localStorage.setItem(`website_cms_${DEFAULT_SCHOOL_ID}`, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Local storage cache update failed for website CMS:', e);
    }

    // Broadcast live event across browser/app components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('website_cms_updated', { detail: cleanedUpdates }));
    }
  },
};
