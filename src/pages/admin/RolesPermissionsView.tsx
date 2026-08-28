import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  rolePermissionService,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  PermissionDefinition,
} from '../../services/rolePermissionService';
import { RoleDefinition, PermissionKey } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  ShieldCheck,
  Shield,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  Search,
  Users,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Filter,
  Eye,
  Sliders,
} from 'lucide-react';

export const RolesPermissionsView: React.FC = () => {
  const { school, switchRole } = useAuth();
  const { showToast } = useToast();

  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleForm, setRoleForm] = useState<{
    name: string;
    code: string;
    description: string;
    category: RoleDefinition['category'];
    permissions: PermissionKey[];
  }>({
    name: '',
    code: '',
    description: '',
    category: 'CUSTOM',
    permissions: [],
  });

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    loadRoles();
  }, [school?.id]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await rolePermissionService.getRoles(school!.id);
      setRoles(data);
    } catch (e: any) {
      showToast('Error loading roles: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      code: '',
      description: '',
      category: 'CUSTOM',
      permissions: ['STUDENTS_VIEW', 'ATTENDANCE_VIEW'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleDefinition) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description,
      category: role.category,
      permissions: [...role.permissions],
    });
    setIsModalOpen(true);
  };

  const togglePermission = (key: PermissionKey) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(key);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter((p) => p !== key) };
      } else {
        return { ...prev, permissions: [...prev.permissions, key] };
      }
    });
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === module).map((p) => p.key);
    const allSelected = modulePerms.every((key) => roleForm.permissions.includes(key));

    setRoleForm((prev) => {
      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((k) => !modulePerms.includes(k)),
        };
      } else {
        const set = new Set([...prev.permissions, ...modulePerms]);
        return { ...prev, permissions: Array.from(set) };
      }
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    if (!roleForm.name.trim()) {
      showToast('Please enter a role name', 'warning');
      return;
    }

    setSaving(true);
    try {
      const generatedCode =
        roleForm.code.trim().toUpperCase() ||
        roleForm.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

      if (editingRole) {
        await rolePermissionService.updateRole(school.id, editingRole.id, {
          name: roleForm.name,
          code: generatedCode,
          description: roleForm.description,
          category: roleForm.category,
          permissions: roleForm.permissions,
        });
        showToast(`Role '${roleForm.name}' updated successfully!`, 'success');
      } else {
        await rolePermissionService.createRole(school.id, {
          name: roleForm.name,
          code: generatedCode,
          description: roleForm.description,
          category: roleForm.category,
          isSystem: false,
          permissions: roleForm.permissions,
          userCount: 0,
        });
        showToast(`New custom role '${roleForm.name}' created!`, 'success');
      }

      setIsModalOpen(false);
      await loadRoles();
    } catch (e: any) {
      showToast('Error saving role: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.isSystem) {
      showToast('System core roles cannot be deleted, but you can customize their permissions.', 'warning');
      return;
    }

    if (confirm(`Are you sure you want to delete custom role '${role.name}'?`)) {
      try {
        await rolePermissionService.deleteRole(school!.id, role.id);
        showToast(`Role '${role.name}' deleted.`, 'success');
        await loadRoles();
      } catch (e: any) {
        showToast('Error deleting role: ' + e.message, 'error');
      }
    }
  };

  const filteredRoles = roles.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Group permissions by module
  const modulesList = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.module)));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roles & Permissions Governance</h2>
            <Badge variant="primary" size="sm">
              RBAC Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define granular access permissions, create custom school roles, and configure feature authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Role Cards
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Permissions Matrix
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Create Custom Role
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Roles</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{roles.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {roles.filter((r) => r.isSystem).length} System • {roles.filter((r) => !r.isSystem).length} Custom
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Permissions</div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">{ALL_PERMISSIONS.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across 5 Institutional Modules</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff & Users</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {roles.reduce((acc, r) => acc + (r.userCount || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Assigned to defined roles</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Model</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Role-Based Access (RBAC)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Zero-trust security policy</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search role name, code, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Role Categories</option>
          <option value="ADMINISTRATIVE">Administrative</option>
          <option value="ACADEMIC">Academic</option>
          <option value="FINANCE">Finance</option>
          <option value="OPERATIONS">Operations</option>
          <option value="SUPPORT">Support</option>
          <option value="PORTAL">Portals</option>
          <option value="CUSTOM">Custom Created</option>
        </select>
      </div>

      {/* View Mode 1: Role Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map((role) => {
            const isSuper = role.code === 'SUPER_ADMIN';
            const permPercent = Math.round((role.permissions.length / ALL_PERMISSIONS.length) * 100);

            return (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSuper
                            ? 'bg-rose-900 text-rose-100'
                            : role.category === 'ADMINISTRATIVE'
                            ? 'bg-blue-900 text-blue-100'
                            : role.category === 'FINANCE'
                            ? 'bg-emerald-900 text-emerald-100'
                            : role.category === 'ACADEMIC'
                            ? 'bg-indigo-900 text-indigo-100'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{role.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{role.code}</span>
                      </div>
                    </div>

                    <Badge
                      variant={
                        role.isSystem
                          ? 'primary'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {role.category}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{role.description}</p>

                  {/* Permissions Progress / Count */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-500">Granted Permissions</span>
                      <span className="font-bold text-slate-900">
                        {isSuper ? 'Full Access (All 24)' : `${role.permissions.length} / ${ALL_PERMISSIONS.length}`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isSuper
                            ? 'bg-rose-600'
                            : permPercent > 70
                            ? 'bg-blue-600'
                            : permPercent > 30
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: isSuper ? '100%' : `${permPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Sample Permissions Badges */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {role.permissions.slice(0, 4).map((pKey) => {
                      const def = ALL_PERMISSIONS.find((p) => p.key === pKey);
                      return (
                        <span
                          key={pKey}
                          className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-medium"
                        >
                          {def?.label || pKey}
                        </span>
                      );
                    })}
                    {role.permissions.length > 4 && (
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        +{role.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{role.userCount || 0} active users</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEditModal(role)}
                    >
                      Configure
                    </Button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Enterprise Matrix */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                <th className="p-3 sticky left-0 bg-slate-900 z-10 w-72">Permission Module & Key</th>
                {filteredRoles.map((r) => (
                  <th key={r.id} className="p-3 text-center min-w-[120px]">
                    <div className="font-bold text-[11px] leading-tight">{r.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">{r.code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modulesList.map((modName) => {
                const modPerms = ALL_PERMISSIONS.filter((p) => p.module === modName);
                return (
                  <React.Fragment key={modName}>
                    <tr className="bg-slate-100/80 font-bold text-slate-800">
                      <td colSpan={filteredRoles.length + 1} className="px-3 py-2 text-[11px] uppercase tracking-wider">
                        {modName} ({modPerms.length} permissions)
                      </td>
                    </tr>
                    {modPerms.map((perm) => (
                      <tr key={perm.key} className="hover:bg-slate-50">
                        <td className="p-3 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-100">
                          <div className="font-semibold text-slate-900">{perm.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{perm.key}</div>
                        </td>
                        {filteredRoles.map((r) => {
                          const has = r.code === 'SUPER_ADMIN' || r.permissions.includes(perm.key);
                          return (
                            <td key={r.id} className="p-3 text-center">
                              {has ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? `Configure Role: ${editingRole.name}` : 'Create Custom School Role'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-6 text-xs">
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700">Role Display Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Housemaster / ICT Coordinator"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">System Code Identifier</label>
              <input
                type="text"
                placeholder="e.g. ICT_COORDINATOR"
                value={roleForm.code}
                onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Role Category</label>
              <select
                value={roleForm.category}
                onChange={(e) => setRoleForm({ ...roleForm, category: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="ADMINISTRATIVE">Administrative</option>
                <option value="ACADEMIC">Academic</option>
                <option value="FINANCE">Finance</option>
                <option value="OPERATIONS">Operations</option>
                <option value="SUPPORT">Support</option>
                <option value="PORTAL">Portals</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Role Description</label>
              <input
                type="text"
                placeholder="Responsibilities and access scope summary..."
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Granular Permissions Checkboxes */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Module Permissions Matrix</h4>
                <p className="text-[11px] text-slate-500">
                  Select specific capabilities granted to users with this role.
                </p>
              </div>
              <div className="text-[11px] font-bold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
                {roleForm.permissions.length} of {ALL_PERMISSIONS.length} Permissions Selected
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {modulesList.map((modName) => {
                const modPerms = ALL_PERMISSIONS.filter((p) => p.module === modName);
                const allSelected = modPerms.every((k) => roleForm.permissions.includes(k.key));

                return (
                  <div
                    key={modName}
                    className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-900" />
                        <span>{modName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(modName)}
                        className="text-[11px] font-semibold text-blue-900 hover:text-blue-950 cursor-pointer"
                      >
                        {allSelected ? 'Deselect All' : 'Select All in Module'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {modPerms.map((p) => {
                        const isChecked = roleForm.permissions.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            onClick={(e) => {
                              e.preventDefault();
                              togglePermission(p.key);
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-0.5 rounded text-blue-900 focus:ring-blue-900 pointer-events-none"
                            />
                            <div>
                              <div className="font-bold text-xs leading-tight">{p.label}</div>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{p.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={saving}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
