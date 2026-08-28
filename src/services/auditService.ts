import { collection, doc, setDoc, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog, UserRole } from '../types';

export const auditService = {
  async logAction(
    schoolId: string,
    user: { id: string; name: string; role: UserRole },
    action: string,
    module: AuditLog['module'],
    details: string
  ): Promise<void> {
    try {
      const colRef = collection(db, 'schools', schoolId, 'auditLogs');
      const newDoc = doc(colRef);
      const log: AuditLog = {
        id: newDoc.id,
        schoolId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        module,
        details,
        timestamp: new Date().toISOString(),
      };
      await setDoc(newDoc, log);
    } catch (e) {
      console.error('Audit logging error:', e);
    }
  },

  async getAuditLogs(schoolId: string): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'auditLogs'));
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AuditLog))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error('Error getting audit logs:', err);
      return [];
    }
  },
};
