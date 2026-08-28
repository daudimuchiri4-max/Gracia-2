import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeAndPaymentService';
import { TransportRoute, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Bus,
  PlusCircle,
  MapPin,
  Users,
  Phone,
  Edit2,
  Trash2,
  UserPlus,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Clock,
  Shield,
  X,
} from 'lucide-react';

export const TransportView: React.FC = () => {
  const { school, activeRole } = useAuth();
  const { showToast } = useToast();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState<TransportRoute | null>(null);

  // Form State
  const [form, setForm] = useState({
    routeName: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    vehicleCapacity: 30,
    stop1: 'Stop A - Estate Gate',
    pickupTime1: '06:45 AM',
    dropoffTime1: '04:15 PM',
    fare1: 14000,
  });

  // Assign Learner State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assignFare, setAssignFare] = useState<number>(14000);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    loadTransport();
  }, [school?.id]);

  const loadTransport = async () => {
    setLoading(true);
    try {
      const [rList, sList] = await Promise.all([
        operationsService.getTransportRoutes(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setRoutes(rList);
      setStudents(sList);
    } catch (e: any) {
      showToast('Error loading transport routes: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsService.createTransportRoute(school!.id, {
        routeName: form.routeName,
        vehicleNumber: form.vehicleNumber,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        vehicleCapacity: Number(form.vehicleCapacity),
        stops: [
          {
            name: form.stop1,
            pickupTime: form.pickupTime1,
            dropoffTime: form.dropoffTime1,
            fareTerm: Number(form.fare1),
          },
        ],
        activeStudentsCount: 0,
      });

      showToast(`Transport route '${form.routeName}' added!`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      await loadTransport();
    } catch (e: any) {
      showToast('Error creating route: ' + e.message, 'error');
    }
  };

  const openEditModal = (route: TransportRoute) => {
    setSelectedRoute(route);
    const stop0 = route.stops?.[0] || {
      name: 'Stage 1',
      pickupTime: '06:45 AM',
      dropoffTime: '04:15 PM',
      fareTerm: 14000,
    };
    setForm({
      routeName: route.routeName,
      vehicleNumber: route.vehicleNumber,
      driverName: route.driverName,
      driverPhone: route.driverPhone,
      vehicleCapacity: route.vehicleCapacity || 30,
      stop1: stop0.name,
      pickupTime1: stop0.pickupTime,
      dropoffTime1: stop0.dropoffTime,
      fare1: stop0.fareTerm || 14000,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    try {
      await operationsService.updateTransportRoute(school!.id, selectedRoute.id, {
        routeName: form.routeName,
        vehicleNumber: form.vehicleNumber,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        vehicleCapacity: Number(form.vehicleCapacity),
        stops: [
          {
            name: form.stop1,
            pickupTime: form.pickupTime1,
            dropoffTime: form.dropoffTime1,
            fareTerm: Number(form.fare1),
          },
        ],
      });

      showToast(`Transport route '${form.routeName}' updated!`, 'success');
      setIsEditModalOpen(false);
      setSelectedRoute(null);
      resetForm();
      await loadTransport();
    } catch (e: any) {
      showToast('Error updating route: ' + e.message, 'error');
    }
  };

  const openDeleteModal = (route: TransportRoute) => {
    setSelectedRoute(route);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRoute = async () => {
    if (!selectedRoute) return;
    try {
      await operationsService.deleteTransportRoute(school!.id, selectedRoute.id);
      showToast(`Route '${selectedRoute.routeName}' deleted successfully.`, 'info');
      setIsDeleteModalOpen(false);
      setSelectedRoute(null);
      await loadTransport();
    } catch (e: any) {
      showToast('Error deleting route: ' + e.message, 'error');
    }
  };

  const openAssignModal = (route: TransportRoute) => {
    setSelectedRoute(route);
    const fare = route.stops?.[0]?.fareTerm || 14000;
    setAssignFare(fare);
    setSelectedStudentId('');
    setIsAssignModalOpen(true);
  };

  const handleAssignStudentToTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !selectedStudentId) return;
    setIsAssigning(true);
    try {
      await feeService.syncStudentTransportFee(
        school!.id,
        selectedStudentId,
        selectedRoute.id,
        assignFare
      );

      const studentName = students.find((s) => s.id === selectedStudentId)?.fullName || 'Learner';
      showToast(
        `Enrolled ${studentName} to ${selectedRoute.routeName}. Transport fee of ${school?.currencySymbol || 'KSh'} ${assignFare.toLocaleString()} added to student fee balance!`,
        'success'
      );
      setIsAssignModalOpen(false);
      setSelectedStudentId('');
      await loadTransport();
    } catch (e: any) {
      showToast('Error assigning student: ' + e.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Unassign ${studentName} from this school bus route?`)) return;
    try {
      await studentService.updateStudent(school!.id, studentId, { transportRouteId: '' });
      showToast(`Unassigned ${studentName} from transport route.`, 'info');
      await loadTransport();
    } catch (e: any) {
      showToast('Error unassigning learner: ' + e.message, 'error');
    }
  };

  const resetForm = () => {
    setForm({
      routeName: '',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      vehicleCapacity: 30,
      stop1: 'Stop A - Estate Gate',
      pickupTime1: '06:45 AM',
      dropoffTime1: '04:15 PM',
      fare1: 14000,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 flex items-center justify-center text-blue-900">
              <Bus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">School Bus Transport & Fleet</h2>
            <Badge variant="primary" size="sm">
              {routes.length} Active Routes
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fleet tracking, designated pickup stages, driver contacts, and automatic fee invoicing for bus learners.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
        >
          Add Transport Route
        </Button>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
          Loading bus routes and passenger manifest...
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
            <Bus className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-slate-800">No transport routes configured</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create bus zones, stages, and driver details. Enrolled students will have transport fees automatically billed to their term accounts.
          </p>
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create First Route
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {routes.map((route) => {
            const enrolledStudents = students.filter((s) => s.transportRouteId === route.id);
            const capacity = route.vehicleCapacity || 30;
            const isFull = enrolledStudents.length >= capacity;

            return (
              <div
                key={route.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 tracking-tight">{route.routeName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {route.vehicleNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            GPS Active
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(route)}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Route"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(route)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned Driver:
                      </span>
                      <span className="font-bold text-slate-800 text-xs">{route.driverName}</span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{route.driverPhone}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Seating Capacity:
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-blue-950 text-sm">
                          {enrolledStudents.length} / {capacity}
                        </span>
                        <Badge variant={isFull ? 'danger' : 'success'} size="sm">
                          {isFull ? 'Full' : `${capacity - enrolledStudents.length} Left`}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Bus Stops */}
                  {route.stops && route.stops.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Designated Stage & Term Fare:
                      </span>
                      <div className="space-y-1.5">
                        {route.stops.map((st, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                              <span>{st.name}</span>
                            </div>
                            <div className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                              {st.pickupTime} • {school?.currencySymbol || 'KSh'}{' '}
                              {st.fareTerm?.toLocaleString()}/term
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enrolled Learners List */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Enrolled Passengers ({enrolledStudents.length}):
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<UserPlus className="w-3.5 h-3.5 text-blue-900" />}
                        onClick={() => openAssignModal(route)}
                        className="text-[11px] py-1 px-2.5 font-bold"
                      >
                        Enroll Learner
                      </Button>
                    </div>

                    {enrolledStudents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1">
                        No students allocated to this bus route yet. Click &apos;Enroll Learner&apos; to add.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {enrolledStudents.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{st.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-mono ml-2">
                                ({st.currentClass} {st.stream})
                              </span>
                            </div>
                            <button
                              onClick={() => handleUnassignStudent(st.id, st.fullName)}
                              className="text-[10px] text-red-500 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded cursor-pointer"
                              title="Unassign from route"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Auto Fee Billing: <strong className="text-slate-700">Enabled</strong>
                  </span>
                  <Badge variant="primary" size="sm">
                    Term 1 Route
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Route Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Transport Route"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRoute} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Route Name & Zone *</label>
            <input
              type="text"
              required
              placeholder="e.g. Route 3: Mwiki - Kasarani - Hunters"
              value={form.routeName}
              onChange={(e) => setForm({ ...form, routeName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Vehicle / Reg No. *</label>
              <input
                type="text"
                required
                placeholder="e.g. KDB 412X (33-Seater)"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Vehicle Capacity (Seats)</label>
              <input
                type="number"
                value={form.vehicleCapacity}
                onChange={(e) => setForm({ ...form, vehicleCapacity: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Driver Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tr. / Mr. Peter Kamau"
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Driver Phone Contact *</label>
              <input
                type="tel"
                required
                placeholder="+254 7..."
                value={form.driverPhone}
                onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <span className="font-bold text-slate-800 block mb-2">Stage Timing & Term Fare</span>
            <div className="space-y-3">
              <div>
                <label className="font-medium text-slate-600">Primary Pickup Stop / Estate</label>
                <input
                  type="text"
                  value={form.stop1}
                  onChange={(e) => setForm({ ...form, stop1: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-medium text-slate-600">Pickup Time</label>
                  <input
                    type="text"
                    value={form.pickupTime1}
                    onChange={(e) => setForm({ ...form, pickupTime1: e.target.value })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Dropoff Time</label>
                  <input
                    type="text"
                    value={form.dropoffTime1}
                    onChange={(e) => setForm({ ...form, dropoffTime1: e.target.value })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Fare / Term ({school?.currencySymbol || 'KSh'})</label>
                  <input
                    type="number"
                    value={form.fare1}
                    onChange={(e) => setForm({ ...form, fare1: Number(e.target.value) })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-blue-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Route Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Route: ${selectedRoute?.routeName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateRoute} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Route Name & Zone *</label>
            <input
              type="text"
              required
              value={form.routeName}
              onChange={(e) => setForm({ ...form, routeName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Vehicle / Reg No. *</label>
              <input
                type="text"
                required
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Vehicle Capacity (Seats)</label>
              <input
                type="number"
                value={form.vehicleCapacity}
                onChange={(e) => setForm({ ...form, vehicleCapacity: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Driver Full Name *</label>
              <input
                type="text"
                required
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Driver Phone Contact *</label>
              <input
                type="tel"
                required
                value={form.driverPhone}
                onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <span className="font-bold text-slate-800 block mb-2">Stage Timing & Term Fare</span>
            <div className="space-y-3">
              <div>
                <label className="font-medium text-slate-600">Primary Pickup Stop / Estate</label>
                <input
                  type="text"
                  value={form.stop1}
                  onChange={(e) => setForm({ ...form, stop1: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-medium text-slate-600">Pickup Time</label>
                  <input
                    type="text"
                    value={form.pickupTime1}
                    onChange={(e) => setForm({ ...form, pickupTime1: e.target.value })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Dropoff Time</label>
                  <input
                    type="text"
                    value={form.dropoffTime1}
                    onChange={(e) => setForm({ ...form, dropoffTime1: e.target.value })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600">Fare / Term ({school?.currencySymbol || 'KSh'})</label>
                  <input
                    type="number"
                    value={form.fare1}
                    onChange={(e) => setForm({ ...form, fare1: Number(e.target.value) })}
                    className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-blue-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Transport Route"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Are you sure you want to delete this route?</span>
              <p className="mt-1 text-[11px]">
                This will permanently delete route <strong>{selectedRoute?.routeName}</strong> ({selectedRoute?.vehicleNumber}). Learners assigned will be unlinked.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteRoute}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Enroll Learner Modal with Auto-Billing */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Enroll Learner on ${selectedRoute?.routeName || 'Route'}`}
        maxWidth="md"
      >
        <form onSubmit={handleAssignStudentToTransport} className="space-y-4 text-xs">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 flex items-start gap-2.5">
            <DollarSign className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Automatic Fee Invoicing Integration</span>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Enrolling a learner automatically links the route to their bio record and adds the transport fee to their term invoice and fee balance.
              </p>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Select Learner *</label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
            >
              <option value="">-- Choose Learner from Directory --</option>
              {students
                .filter((s) => s.transportRouteId !== selectedRoute?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.admissionNumber}) - {s.currentClass} {s.stream}
                    {s.transportRouteId ? ' [Transfer from other route]' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">
              Transport Fee for Term ({school?.currencySymbol || 'KSh'}) *
            </label>
            <input
              type="number"
              required
              value={assignFare}
              onChange={(e) => setAssignFare(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold text-blue-900"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default route stop fee: {school?.currencySymbol || 'KSh'}{' '}
              {(selectedRoute?.stops?.[0]?.fareTerm || 14000).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isAssigning}>
              Confirm Enrollment & Bill Fee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
