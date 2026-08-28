import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { posService } from '../../services/posAndInventoryService';
import { POSProduct } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Package, PlusCircle, AlertTriangle, Search } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Uniform' as POSProduct['category'],
    costPrice: 500,
    sellingPrice: 850,
    currentStock: 50,
    lowStockThreshold: 10,
    unit: 'pcs',
  });

  useEffect(() => {
    if (!school?.id) return;
    loadInventory();
  }, [school?.id]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await posService.getProducts(school!.id);
      setProducts(data);
    } catch (e: any) {
      showToast('Error loading inventory items: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await posService.createProduct(school!.id, {
        name: form.name,
        sku: form.sku || `SKU-${Date.now().toString().slice(-4)}`,
        category: form.category,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        currentStock: Number(form.currentStock),
        lowStockThreshold: Number(form.lowStockThreshold),
        unit: form.unit,
      });

      showToast(`Item ${form.name} added to stock!`, 'success');
      setIsAddModalOpen(false);
      setForm({
        name: '',
        sku: '',
        category: 'Uniform',
        costPrice: 500,
        sellingPrice: 850,
        currentStock: 50,
        lowStockThreshold: 10,
        unit: 'pcs',
      });
      await loadInventory();
    } catch (e: any) {
      showToast('Error creating stock item: ' + e.message, 'error');
    }
  };

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStockCount = products.filter((p) => p.currentStock <= p.lowStockThreshold).length;
  const totalValue = products.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Uniform & Learning Asset Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Store inventory, minimum stock re-order thresholds, and warehouse valuation.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Stock Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Catalog Items</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{products.length} Products</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inventory Valuation (Retail)</div>
          <div className="text-xl font-extrabold text-blue-900 mt-1">
            {school?.currencySymbol || 'KSh'} {totalValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-extrabold text-amber-600">{lowStockCount} Items</span>
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Categories</option>
          <option value="Uniform">School Uniforms</option>
          <option value="Books">CBC Books & Workbooks</option>
          <option value="Stationery">Stationery & Geometry</option>
          <option value="Sports Gear">Sports & PE Kits</option>
          <option value="Food/Snack">Food / Snack</option>
          <option value="Merchandise">Merchandise</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading inventory catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No stock items found</div>
            <p className="text-xs text-slate-400">Click &apos;Add Stock Item&apos; to register products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU / Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Cost Price</th>
                  <th className="p-3.5 text-right">Selling Price</th>
                  <th className="p-3.5 text-center">In Stock</th>
                  <th className="p-3.5">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isLow = item.currentStock <= item.lowStockThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{item.category}</td>
                      <td className="p-3.5 text-right text-slate-500 font-mono">
                        {school?.currencySymbol || 'KSh'} {item.costPrice.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 font-mono">
                        {school?.currencySymbol || 'KSh'} {item.sellingPrice.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={isLow ? 'warning' : 'success'} size="sm">
                          {isLow ? `Low Stock (≤${item.lowStockThreshold})` : 'In Stock'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Stock Product" maxWidth="md">
        <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary School Cardigan - Size 32"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="Uniform">Uniform</option>
                <option value="Books">Books</option>
                <option value="Stationery">Stationery</option>
                <option value="Sports Gear">Sports Gear</option>
                <option value="Food/Snack">Food / Snack</option>
                <option value="Merchandise">Merchandise</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">SKU Code</label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Cost Price ({school?.currencySymbol}) *</label>
              <input
                type="number"
                required
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Selling Price ({school?.currencySymbol}) *</label>
              <input
                type="number"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Initial Qty</label>
              <input
                type="number"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Low Alert Min</label>
              <input
                type="number"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
