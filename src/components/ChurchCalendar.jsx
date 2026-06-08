import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, Edit2, Trash2, X, Calendar as CalendarIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
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

function ChurchCalendar({ userRole }) {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
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

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-xl font-bold">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-white text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
                  placeholder="Church auditorium, Online, etc."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded-lg p-2"
                  rows="2"
                />
              </div>

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

              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1">
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingEvent.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex-1"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChurchCalendar;