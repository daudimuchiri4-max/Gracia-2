import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { POSProduct, POSSale } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const posService = {
  async getProducts(schoolId: string): Promise<POSProduct[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'products'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as POSProduct));
    } catch (err) {
      console.error('Error fetching POS products:', err);
      return [];
    }
  },

  async createProduct(schoolId: string, data: Omit<POSProduct, 'id' | 'schoolId' | 'createdAt'>): Promise<POSProduct> {
    const colRef = collection(db, 'schools', schoolId, 'products');
    const newDoc = doc(colRef);
    const newProd: POSProduct = {
      ...data,
      id: newDoc.id,
      schoolId,
      sellingPrice: Number(data.sellingPrice),
      costPrice: Number(data.costPrice),
      currentStock: Number(data.currentStock),
      lowStockThreshold: Number(data.lowStockThreshold) || 5,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(newProd));
    return newProd;
  },

  async updateProduct(schoolId: string, productId: string, updates: Partial<POSProduct>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'products', productId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },

  async getSales(schoolId: string): Promise<POSSale[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'sales'));
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as POSSale))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error fetching POS sales:', err);
      return [];
    }
  },

  async recordSale(schoolId: string, saleData: Omit<POSSale, 'id' | 'schoolId' | 'saleNumber' | 'createdAt'>): Promise<POSSale> {
    const colRef = collection(db, 'schools', schoolId, 'sales');
    const newDoc = doc(colRef);
    const saleNum = `POS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const sale: POSSale = {
      ...saleData,
      id: newDoc.id,
      schoolId,
      saleNumber: saleNum,
      createdAt: now,
    };

    await setDoc(newDoc, cleanForFirestore(sale));

    // Decrement stock for each item purchased
    for (const item of sale.items) {
      try {
        const prodRef = doc(db, 'schools', schoolId, 'products', item.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const p = prodSnap.data() as POSProduct;
          const newQty = Math.max(0, (p.currentStock || 0) - item.quantity);
          await setDoc(prodRef, { currentStock: newQty }, { merge: true });
        }
      } catch (e) {
        console.error('Error decrementing stock for product:', item.productId, e);
      }
    }

    return sale;
  },
};
