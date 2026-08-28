import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { Announcement, SchoolEvent, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Megaphone, Calendar, PlusCircle, Trash2, Send, Clock, Users, Shield } from 'lucide-react';

export const CommunicationView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ANNOUNCEMENTS' | 'EVENTS'>('ANNOUNCEMENTS');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    targetRoles: ['PARENT', 'TEACHER', 'STUDENT'] as UserRole[],
    priority: 'MEDIUM' as Announcement['priority'],
    isPublicOnWebsite: true,
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    location: 'Main School Auditorium & Grounds',
    category: 'Academic' as SchoolEvent['category'],
    targetAudience: 'All' as SchoolEvent['targetAudience'],
    isPublicOnWebsite: true,
  });

  useEffect(() => {
    if (!school?.id) return;
    loadCommunication();
  }, [school?.id]);

  const loadCommunication = async () => {
    setLoading(true);
    try {
      const [annList, evtList] = await Promise.all([
        operationsService.getAnnouncements(school!.id),
        operationsService.getEvents(school!.id),
      ]);
      setAnnouncements(annList);
      setEvents(evtList);
    } catch (e: any) {
      showToast('Error loading communications: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsService.createAnnouncement(school!.id, {
        title: annForm.title,
        content: annForm.content,
        targetRoles: annForm.targetRoles,
        priority: annForm.priority,
        isPublicOnWebsite: annForm.isPublicOnWebsite,
        publishedBy: user?.fullName || 'School Administration',
      });
      showToast('Notice published successfully!', 'success');
      setIsAnnModalOpen(false);
      setAnnForm({
        title: '',
        content: '',
        targetRoles: ['PARENT', 'TEACHER', 'STUDENT'],
        priority: 'MEDIUM',
        isPublicOnWebsite: true,
      });
      await loadCommunication();
    } catch (e: any) {
      showToast('Error creating announcement: ' + e.message, 'error');
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsService.createEvent(school!.id, {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        endDate: eventForm.endDate || undefined,
        location: eventForm.location,
        category: eventForm.category,
        targetAudience: eventForm.targetAudience,
        isPublicOnWebsite: eventForm.isPublicOnWebsite,
      });
      showToast('Calendar event created!', 'success');
      setIsEventModalOpen(false);
      await loadCommunication();
    } catch (e: any) {
      showToast('Error saving event: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Broadcasts & Calendar Events</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Send notices to Parents, Teachers, and Students, and manage term event calendars.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'ANNOUNCEMENTS' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Megaphone className="w-4 h-4" />}
              onClick={() => setIsAnnModalOpen(true)}
            >
              New Circular / Notice
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => setIsEventModalOpen(true)}
            >
              Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('ANNOUNCEMENTS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ANNOUNCEMENTS'
              ? 'border-blue-900 text-blue-900 font-bold'
              : 'border-transparent text-slate-500'
          }`}
        >
          Notice Board & Circulars ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'EVENTS' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          School Calendar Events ({events.length})
        </button>
      </div>

      {activeTab === 'ANNOUNCEMENTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading notices...</div>
          ) : announcements.length === 0 ? (
            <div className="col-span-full p-12 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">No active circulars</div>
              <p className="text-xs text-slate-400">Click &apos;New Circular / Notice&apos; to broadcast an update.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <Badge
                    variant={
                      ann.priority === 'URGENT' || ann.priority === 'HIGH'
                        ? 'danger'
                        : ann.priority === 'MEDIUM'
                        ? 'warning'
                        : 'primary'
                    }
                    size="sm"
                  >
                    {ann.priority} Priority
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.content}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Audience: <strong>{ann.targetRoles?.join(', ') || 'All'}</strong></span>
                  <span>By: {ann.publishedBy}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">No events scheduled.</div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                    {evt.date}
                  </span>
                  {evt.isPublicOnWebsite && (
                    <Badge variant="success" size="sm">
                      Public Website
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{evt.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                </div>

                {evt.location && (
                  <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                    📍 {evt.location}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* New Circular Modal */}
      <Modal isOpen={isAnnModalOpen} onClose={() => setIsAnnModalOpen(false)} title="Publish Notice / Circular" maxWidth="md">
        <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Notice Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mid-Term Break & Fee Payment Advisory"
              value={annForm.title}
              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Priority Level</label>
              <select
                value={annForm.priority}
                onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium Notice</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Alert</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Display on Public Site</label>
              <select
                value={annForm.isPublicOnWebsite ? 'YES' : 'NO'}
                onChange={(e) => setAnnForm({ ...annForm, isPublicOnWebsite: e.target.value === 'YES' })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="YES">Yes, Public Notice</option>
                <option value="NO">Internal Portal Only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Circular Content *</label>
            <textarea
              rows={4}
              required
              placeholder="Detailed message..."
              value={annForm.content}
              onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAnnModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Broadcast Notice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Event Modal */}
      <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="Schedule School Event" maxWidth="md">
        <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Inter-House Swimming Gala"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Event Date *</label>
              <input
                type="date"
                required
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Category</label>
              <select
                value={eventForm.category}
                onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="Academic">Academic</option>
                <option value="Sports">Sports</option>
                <option value="Parent Meeting">Parent Meeting</option>
                <option value="Holiday">Holiday</option>
                <option value="Trip">Trip</option>
                <option value="Exam">Exam</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Venue / Location</label>
            <input
              type="text"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={eventForm.isPublicOnWebsite}
                onChange={(e) => setEventForm({ ...eventForm, isPublicOnWebsite: e.target.checked })}
                className="rounded text-blue-900"
              />
              <span className="font-semibold text-slate-700">Display on Public Website Calendar</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
