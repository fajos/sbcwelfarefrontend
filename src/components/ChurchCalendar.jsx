import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Plus, Edit2, Trash2, X, Calendar as CalendarIcon,
  Users, CheckCircle, Circle, Search, Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: { 'Authorization': `Bearer ${token}` }
  };
};

function ChurchCalendar({ userRole, members = [], initialEvent = null, onEventHandled, showOnlyModal = false }) {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('details'); // 'details' or 'attendance'
  const [attendance, setAttendance] = useState({});
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    eventType: 'service',
    location: '',
    isRecurring: false,
    recurrence: {
      pattern: 'none',
      interval: 1,
      dayOfWeek: 0,
      nth: 1,
      endDate: ''
    }
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (initialEvent) {
      handleSelectEvent(initialEvent);
    }
  }, [initialEvent]);

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

      const response = await axios.get(`${API_URL}/calendar?start=${start}&end=${end}`, getAuthHeaders());
      const formattedEvents = response.data.map(event => ({
        id: event._id,
        title: event.title,
        start: new Date(event.eventDate),
        end: new Date(event.eventDate),
        desc: event.description,
        type: event.eventType,
        location: event.location,
        time: event.eventTime,
        isRecurring: event.isRecurring,
        recurrence: event.recurrence
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar');
    }
  };

  const fetchAttendance = async (eventId, date) => {
    setIsLoadingAttendance(true);
    try {
      const dateISO = date.toISOString();
      const response = await axios.get(`${API_URL}/attendance?eventId=${eventId}&eventDate=${dateISO}`, getAuthHeaders());
      const attendanceMap = {};
      response.data.forEach(record => {
        const memberId = record.member._id || record.member;
        attendanceMap[memberId] = record.status;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const toggleAttendance = (memberId) => {
    // Check if event is in the past
    const isPast = editingEvent?.start && new Date(editingEvent.start).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);

    // Disable editing if it's a history record or a past event
    if (editingEvent?.isHistory || isPast) return;

    setAttendance(prev => {
      if (prev[memberId] === 'present') {
        const newState = { ...prev };
        delete newState[memberId];
        return newState;
      } else {
        return { ...prev, [memberId]: 'present' };
      }
    });
  };

  const handleSaveAttendance = async () => {
    try {
      const records = Object.entries(attendance).map(([memberId, status]) => ({
        memberId,
        status
      }));

      await axios.post(`${API_URL}/attendance/bulk`, {
        eventId: editingEvent.id,
        eventDate: editingEvent.start.toISOString(),
        records
      }, getAuthHeaders());

      toast.success('Attendance updated successfully');
      setShowModal(false);
      resetForm();
      if (onEventHandled) onEventHandled();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await axios.put(`${API_URL}/calendar/${editingEvent.id}`, formData, getAuthHeaders());
        toast.success('Event updated successfully');
      } else {
        await axios.post(`${API_URL}/calendar`, formData, getAuthHeaders());
        toast.success('Event created successfully');
      }
      fetchEvents();
      resetForm();
      setShowModal(false);
      if (onEventHandled) onEventHandled();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`${API_URL}/calendar/${id}`, getAuthHeaders());
        toast.success('Event deleted successfully');
        fetchEvents();
        setShowModal(false);
        resetForm();
        if (onEventHandled) onEventHandled();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventDate: '',
      eventTime: '',
      eventType: 'service',
      location: '',
      isRecurring: false,
      recurrence: {
        pattern: 'none',
        interval: 1,
        dayOfWeek: 0,
        nth: 1,
        endDate: ''
      }
    });
    setEditingEvent(null);
    setViewMode('details');
    setAttendance({});
    setAttendanceSearch('');
  };

  const handleSelectSlot = (slotInfo) => {
    if (userRole === 'admin' || userRole === 'editor') {
      const date = new Date(slotInfo.start);
      setFormData({
        ...formData,
        eventDate: format(date, 'yyyy-MM-dd')
      });
      setShowModal(true);
    }
  };

  const handleSelectEvent = (event) => {
    setEditingEvent(event);
    setViewMode('details');
    setFormData({
      title: event.title,
      description: event.desc || '',
      eventDate: format(event.start, 'yyyy-MM-dd'),
      eventTime: event.time || '',
      eventType: event.type || 'service',
      location: event.location || '',
      isRecurring: event.isRecurring || false,
      recurrence: event.recurrence || {
        pattern: 'none',
        interval: 1,
        dayOfWeek: 0,
        nth: 1,
        endDate: ''
      }
    });
    setShowModal(true);
    fetchAttendance(event.id, event.start);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';
    switch (event.type) {
      case 'service': backgroundColor = '#3b82f6'; break;
      case 'prayer': backgroundColor = '#8b5cf6'; break;
      case 'fellowship': backgroundColor = '#10b981'; break;
      case 'outreach': backgroundColor = '#f59e0b'; break;
      case 'wedding': backgroundColor = '#ec4899'; break;
      case 'baptism': backgroundColor = '#06b6d4'; break;
      default: backgroundColor = '#6b7280';
    }
    return { style: { backgroundColor, borderRadius: '4px', border: 'none' } };
  };

  return (
    <>
      {!showOnlyModal && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              Church Calendar
            </h2>
            {(userRole === 'admin' || userRole === 'editor') && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Event
              </button>
            )}
          </div>

          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable={(userRole === 'admin' || userRole === 'editor')}
            eventPropGetter={eventStyleGetter}
          />
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg shrink-0">
              <h3 className="text-xl font-bold">
                {editingEvent ? (
                  (editingEvent.isHistory || (editingEvent.start && new Date(editingEvent.start).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)))
                    ? 'View Event Details'
                    : 'Edit Event'
                ) : 'Add New Event'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); if(onEventHandled) onEventHandled(); }} className="text-white text-2xl hover:text-gray-200 transition-colors">×</button>
            </div>

            {editingEvent && (
              <div className="flex border-b bg-blue-50 shrink-0">
                <button
                  onClick={() => setViewMode('details')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${viewMode === 'details' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-blue-100'}`}
                >
                  <CalendarIcon className="w-4 h-4" /> Details
                </button>
                <button
                  onClick={() => setViewMode('attendance')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${viewMode === 'attendance' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-blue-100'}`}
                >
                  <Users className="w-4 h-4" /> Attendance
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {viewMode === 'details' ? (
                <form onSubmit={handleSubmit} className="p-6">
                {(() => {
                  const isPast = editingEvent?.isHistory || (editingEvent?.start && new Date(editingEvent.start).setHours(0,0,0,0) < new Date().setHours(0,0,0,0));
                  return (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Title *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          required
                          disabled={isPast}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Date *</label>
                        <input
                          type="date"
                          value={formData.eventDate}
                          onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          required
                          disabled={isPast}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Time</label>
                        <input
                          type="time"
                          value={formData.eventTime}
                          onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          disabled={isPast}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Event Type</label>
                        <select
                          value={formData.eventType}
                          onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          disabled={isPast}
                        >
                          <option value="service">⛪ Service</option>
                          <option value="prayer">🙏 Prayer Meeting</option>
                          <option value="fellowship">🤝 Fellowship</option>
                          <option value="outreach">💪 Outreach</option>
                          <option value="wedding">💒 Wedding</option>
                          <option value="baptism">💧 Baptism</option>
                          <option value="other">📌 Other</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          placeholder="Church auditorium, Online, etc."
                          disabled={isPast}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full border rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-500"
                          rows="2"
                          disabled={isPast}
                        />
                      </div>

                      {!isPast && (
                        <>
                          <div className="mb-4 border-t pt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.isRecurring}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  isRecurring: e.target.checked,
                                  recurrence: { ...formData.recurrence, pattern: e.target.checked ? 'weekly' : 'none' }
                                })}
                                className="w-4 h-4 rounded text-blue-600"
                              />
                              <span className="text-sm font-medium text-gray-700">Recurring Event</span>
                            </label>
                          </div>

                          {formData.isRecurring && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Repeat Pattern</label>
                                <select
                                  value={formData.recurrence.pattern}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, pattern: e.target.value }
                                  })}
                                  className="w-full border rounded p-1.5 mt-1 text-sm"
                                >
                                  <option value="daily">Every Day</option>
                                  <option value="weekly">Every Week</option>
                                  <option value="monthly">Every Month</option>
                                  <option value="nth_day_of_week">Specific Day of Month</option>
                                </select>
                              </div>

                              {formData.recurrence.pattern === 'nth_day_of_week' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">Occurrence</label>
                                    <select
                                      value={formData.recurrence.nth}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        recurrence: { ...formData.recurrence, nth: parseInt(e.target.value) }
                                      })}
                                      className="w-full border rounded p-1.5 mt-1 text-sm"
                                    >
                                      <option value="1">First</option>
                                      <option value="2">Second</option>
                                      <option value="3">Third</option>
                                      <option value="4">Fourth</option>
                                      <option value="5">Last</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">Day</label>
                                    <select
                                      value={formData.recurrence.dayOfWeek}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        recurrence: { ...formData.recurrence, dayOfWeek: parseInt(e.target.value) }
                                      })}
                                      className="w-full border rounded p-1.5 mt-1 text-sm"
                                    >
                                      <option value="0">Sunday</option>
                                      <option value="1">Monday</option>
                                      <option value="2">Tuesday</option>
                                      <option value="3">Wednesday</option>
                                      <option value="4">Thursday</option>
                                      <option value="5">Friday</option>
                                      <option value="6">Saturday</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Ends On (Optional)</label>
                                <input
                                  type="date"
                                  value={formData.recurrence.endDate}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, endDate: e.target.value }
                                  })}
                                  className="w-full border rounded p-1.5 mt-1 text-sm"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 mb-6">
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 font-bold">
                              {editingEvent ? 'Update' : 'Create'} Event
                            </button>
                            {editingEvent && (
                              <button
                                type="button"
                                onClick={() => handleDelete(editingEvent.id)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg flex-1 font-bold"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </form>
            ) : (
              <div className="flex flex-col h-[500px]">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {isLoadingAttendance ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p>Loading attendance records...</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {(() => {
                        const isPast = editingEvent?.start && new Date(editingEvent.start).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                        const displayMembers = members.filter(m => {
                          const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
                          const matchesSearch = fullName.includes(attendanceSearch.toLowerCase());

                          if (editingEvent?.isHistory || isPast) {
                            return matchesSearch && attendance[m._id] === 'present';
                          }
                          return matchesSearch;
                        });

                        if (displayMembers.length === 0) {
                          return (
                            <div className="p-12 text-center text-gray-400">
                              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p className="font-medium text-gray-500">
                                {editingEvent?.isHistory || isPast
                                  ? (attendanceSearch ? 'No matching present members' : 'No members were marked present')
                                  : (attendanceSearch ? 'No members found matching search' : 'No members in database')}
                              </p>
                              {!(editingEvent?.isHistory || isPast) && !attendanceSearch && members.length > 0 && (
                                <p className="text-xs mt-1">Try searching or adding members to the database.</p>
                              )}
                            </div>
                          );
                        }

                        return displayMembers.map(member => (
                          <div
                            key={member._id}
                            onClick={() => toggleAttendance(member._id)}
                            className={`flex items-center justify-between p-4 transition-colors ${
                              editingEvent?.isHistory || isPast ? 'cursor-default' : 'hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${attendance[member._id] === 'present' ? 'bg-green-500 shadow-md' : 'bg-gray-300'}`}>
                                {member.firstName?.[0] || ''}{member.lastName?.[0] || ''}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{member.firstName} {member.lastName}</p>
                                <p className="text-xs text-gray-500">{member.churchUnit || 'No Unit Assigned'}</p>
                              </div>
                            </div>
                            <div>
                              {attendance[member._id] === 'present' ? (
                                <div className="bg-green-100 p-1 rounded-full">
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 border-2 border-gray-200 rounded-full" />
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
                  <div className="text-sm font-medium text-gray-600">
                    <span className="text-green-600 font-bold">
                      {Object.values(attendance).filter(v => v === 'present').length}
                    </span> present
                  </div>
                  {(() => {
                    const isPast = editingEvent?.start && new Date(editingEvent.start).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                    if (!editingEvent?.isHistory && !isPast) {
                      return (
                        <button
                          onClick={handleSaveAttendance}
                          disabled={isLoadingAttendance}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md disabled:bg-gray-400"
                        >
                          Save Attendance
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChurchCalendar;