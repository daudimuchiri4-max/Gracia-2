import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { posService } from '../../services/posAndInventoryService';
import { studentService } from '../../services/studentService';
import { printerService } from '../../services/printerService';
import { PrinterManagerModal } from '../../components/ui/PrinterManagerModal';
import { POSProduct, POSSale, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Search,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Zap,
} from 'lucide-react';

interface CartItem {
  product: POSProduct;
  quantity: number;
}

export const POSView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [sales, setSales] = useState<POSSale[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState<POSSale['customerType']>('STUDENT');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'CARD'>('MPESA');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'HISTORY'>('TERMINAL');

  useEffect(() => {
    if (!school?.id) return;
    loadData();
  }, [school?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodList, saleList, stdList] = await Promise.all([
        posService.getProducts(school!.id),
        posService.getSales(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setProducts(prodList);
      setSales(saleList);
      setStudents(stdList);
      if (stdList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(stdList[0].id);
      }
    } catch (e: any) {
      showToast('Error loading POS data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: POSProduct) => {
    if (product.currentStock <= 0) {
      showToast(`${product.name} is out of stock!`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          showToast(`Cannot add more than available stock (${product.currentStock})`, 'warning');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.currentStock) {
              showToast(`Max stock is ${item.product.currentStock}`, 'warning');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Please add items to cart before checkout', 'warning');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    setProcessing(true);

    try {
      const saleNumber = `POS-${Date.now().toString().slice(-6)}`;
      const saleItems = cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.sellingPrice,
        total: c.product.sellingPrice * c.quantity,
      }));

      await posService.recordSale(school!.id, {
        customerType,
        studentId: customerType === 'STUDENT' ? student?.id : undefined,
        studentName: customerType === 'STUDENT' ? student?.fullName : undefined,
        customerName: customerType === 'STUDENT' ? student?.fullName : walkInName || 'Walk-in Customer',
        items: saleItems,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod,
        paymentReference: paymentReference || (paymentMethod === 'MPESA' ? `QK${Date.now().toString().slice(-6)}` : undefined),
        cashierId: user?.id || 'cashier-01',
        cashierName: user?.fullName || 'POS Attendant',
      });

      // Automatically dispatch receipt to connected physical thermal printer
      try {
        await printerService.printThermalReceipt(
          {
            receiptNumber: saleNumber,
            date: new Date(),
            cashierName: user?.fullName || 'POS Attendant',
            studentName: customerType === 'STUDENT' ? student?.fullName : undefined,
            admissionNumber: customerType === 'STUDENT' ? student?.admissionNumber : undefined,
            classLevel: customerType === 'STUDENT' ? student?.currentClass : undefined,
            customerName: customerType === 'STUDENT' ? student?.fullName : walkInName || 'Walk-in',
            items: saleItems.map((i) => ({
              name: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.total,
            })),
            subtotal,
            total: subtotal,
            paymentMethod,
            transactionReference: paymentReference,
          },
          school
        );
      } catch (printErr) {
        console.warn('Auto print error:', printErr);
      }

      showToast(`Sale recorded! Receipt sent to physical printer (${school?.currencySymbol} ${subtotal.toLocaleString()})`, 'success');
      setCart([]);
      setPaymentReference('');
      await loadData();
    } catch (e: any) {
      showToast('Error completing checkout: ' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReprintSale = (sale: POSSale) => {
    printerService.printThermalReceipt(
      {
        receiptNumber: sale.saleNumber,
        date: sale.createdAt,
        cashierName: sale.cashierName || 'POS Cashier',
        studentName: sale.studentName,
        customerName: sale.customerName,
        items: sale.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.total,
        })),
        subtotal: sale.subtotal,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        transactionReference: sale.paymentReference,
      },
      school
    );
    showToast(`Re-printing POS slip #${sale.saleNumber}`, 'info');
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Canteen & Uniform Store Point-of-Sale (POS)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick cashier checkout, student billing, Lipa na M-Pesa receipts, and automatic inventory updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Physical Printer Setup Trigger */}
          <button
            onClick={() => setPrinterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
            title="Physical POS Printer Configuration"
          >
            <Printer className="w-3.5 h-3.5 text-blue-900" />
            <span>Printer Setup</span>
          </button>

          <Button
            variant={activeTab === 'TERMINAL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('TERMINAL')}
          >
            Cashier Register
          </Button>
          <Button
            variant={activeTab === 'HISTORY' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('HISTORY')}
          >
            Sales Receipts ({sales.length})
          </Button>
        </div>
      </div>

      {activeTab === 'TERMINAL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Product Catalog Grid */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="Uniform">Uniforms</option>
                <option value="Books">Books</option>
                <option value="Stationery">Stationery</option>
                <option value="Sports Gear">Sports Gear</option>
                <option value="Food/Snack">Food / Snack</option>
              </select>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const inCart = cart.find((c) => c.product.id === prod.id);
                const outOfStock = prod.currentStock <= 0;
                return (
                  <div
                    key={prod.id}
                    onClick={() => !outOfStock && addToCart(prod)}
                    className={`bg-white p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      outOfStock
                        ? 'opacity-50 border-slate-200 cursor-not-allowed'
                        : inCart
                        ? 'border-blue-900 ring-2 ring-blue-900/10 shadow-xs'
                        : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 mt-0.5">{prod.name}</h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-900 font-mono">
                        {school?.currencySymbol} {prod.sellingPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {outOfStock ? 'Out of stock' : `${prod.currentStock} ${prod.unit}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Checkout Cart Panel */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[620px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-900" />
                  <span className="font-bold text-sm text-slate-900">Current Order Cart</span>
                </div>
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                  {cart.reduce((a, c) => a + c.quantity, 0)} items
                </span>
              </div>

              {/* Customer Selector */}
              <div className="py-3 space-y-2 border-b border-slate-100 text-xs">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('STUDENT')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-center cursor-pointer ${
                      customerType === 'STUDENT' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Enrolled Learner
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('WALK_IN')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-center cursor-pointer ${
                      customerType === 'WALK_IN' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Walk-in / Parent
                  </button>
                </div>

                {customerType === 'STUDENT' ? (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.currentClass} - {s.admissionNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter customer / parent name..."
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                  />
                )}
              </div>

              {/* Cart Items List */}
              <div className="overflow-y-auto max-h-56 divide-y divide-slate-100 py-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">Cart is empty. Tap items to add.</div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="pr-2">
                        <div className="font-semibold text-slate-900 line-clamp-1">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {school?.currencySymbol} {item.product.sellingPrice.toLocaleString()} x {item.quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-slate-900 w-16 text-right font-mono">
                          {school?.currencySymbol} {(item.product.sellingPrice * item.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total & Checkout */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MPESA')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                      paymentMethod === 'MPESA' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                      paymentMethod === 'CASH' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                      paymentMethod === 'CARD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>

              {paymentMethod === 'MPESA' && (
                <input
                  type="text"
                  placeholder="M-Pesa Reference (e.g. QK89123KL)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-sm">Total Payable:</span>
                <span className="font-black text-xl text-blue-900 font-mono">
                  {school?.currencySymbol || 'KSh'} {subtotal.toLocaleString()}
                </span>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full py-2.5 font-bold"
                icon={<CheckCircle className="w-4 h-4" />}
                loading={processing}
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                Complete & Print Receipt
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* History Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No sale transactions logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Receipt #</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Purchased Items</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5 text-right">Total Amount</th>
                    <th className="p-3.5">Cashier</th>
                    <th className="p-3.5 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-mono font-bold text-blue-900">{s.saleNumber}</td>
                      <td className="p-3.5 text-slate-600">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="p-3.5 font-semibold text-slate-900">
                        {s.customerName || s.studentName || 'Walk-in'}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        {s.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="primary" size="sm">
                          {s.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 font-mono">
                        {school?.currencySymbol || 'KSh'} {s.total.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-slate-500 font-medium">{s.cashierName}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleReprintSale(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-900 hover:text-white rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          title="Print Thermal Slip to Physical Printer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <PrinterManagerModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />
    </div>
  );
};
