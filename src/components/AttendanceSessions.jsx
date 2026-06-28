import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { CheckCircle, Calendar as CalendarIcon, Users, Search, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: { 'Authorization': `Bearer ${token}` }
  };
};

function AttendanceSessions({ onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/attendance/sessions`, getAuthHeaders());
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to load attendance history');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteSession = async (e, session) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the attendance records for "${session.title}" on ${format(new Date(session.eventDate), 'PPP')}?`)) return;

    try {
      await axios.delete(`${API_URL}/attendance/session?eventId=${session.eventId}&eventDate=${session.eventDate}`, getAuthHeaders());
      toast.success('Attendance session deleted successfully');
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to delete attendance session');
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'service': return '⛪';
      case 'prayer': return '🙏';
      case 'fellowship': return '🤝';
      case 'outreach': return '💪';
      case 'wedding': return '💒';
      case 'baptism': return '💧';
      default: return '📌';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading attendance history...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Attendance History
            </h2>
            <p className="text-gray-500 text-sm mt-1">Review and manage past service attendance</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[600px] overflow-y-auto">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session, idx) => (
            <div
              key={`${session.eventId}-${session.eventDate}`}
              onClick={() => onSelectSession(session)}
              className="p-4 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  {getEventIcon(session.eventType)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    {session.title}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {format(new Date(session.eventDate), 'PPP')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {session.presentCount} Total ({session.memberCount}M, {session.childCount}C)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDeleteSession(e, session)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  title="Delete attendance session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium">No attendance records found</p>
            <p className="text-gray-400 text-sm">Records appear here once you save attendance for an event.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceSessions;