import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FileText, Plus, Search, Edit2, Trash2,
  Calendar, Users, Save, X, ChevronRight,
  Clock, History
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

function MinutesOfMeeting({ userRoles, members = [] }) {
  const [minutes, setMinutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: []
  });

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/minutes`, getAuthHeaders());
      setMinutes(response.data);
    } catch (error) {
      console.error('Error fetching minutes:', error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Error loading minutes: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const payload = {
        ...formData,
        attendees: formData.attendees // Already an array now
      };

      if (editingMinutes) {
        await axios.put(`${API_URL}/minutes/${editingMinutes._id}`, payload, getAuthHeaders());
        toast.success('Minutes updated successfully');
      } else {
        await axios.post(`${API_URL}/minutes`, payload, getAuthHeaders());
        toast.success('Minutes saved successfully');
      }

      setIsFormOpen(false);
      setEditingMinutes(null);
      setFormData({
        title: '',
        content: '',
        meetingDate: new Date().toISOString().split('T')[0],
        attendees: []
      });
      fetchMinutes();
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error('Error saving minutes');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete these meeting minutes?')) return;
    try {
      await axios.delete(`${API_URL}/minutes/${id}`, getAuthHeaders());
      toast.success('Minutes deleted successfully');
      fetchMinutes();
    } catch (error) {
      console.error('Error deleting minutes:', error);
      toast.error('Error deleting minutes');
    }
  };

  const handleEdit = (item, readOnly = false) => {
    setEditingMinutes(item);
    setFormData({
      title: item.title,
      content: item.content,
      meetingDate: new Date(item.meetingDate).toISOString().split('T')[0],
      attendees: Array.isArray(item.attendees) ? item.attendees : []
    });
    setIsReadOnly(readOnly);
    setIsFormOpen(true);
  };

  const toggleAttendee = (name) => {
    setFormData(prev => {
      const isSelected = prev.attendees.includes(name);
      if (isSelected) {
        return { ...prev, attendees: prev.attendees.filter(a => a !== name) };
      } else {
        return { ...prev, attendees: [...prev.attendees, name] };
      }
    });
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    return fullName.includes(memberSearch.toLowerCase()) && !formData.attendees.includes(`${m.firstName} ${m.lastName}`);
  }).slice(0, 10); // Limit results for performance

  const filteredMinutes = minutes.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-purple-100">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Minutes of Meeting</h2>
            <p className="text-sm text-gray-500">Record and manage church meeting minutes</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingMinutes(null);
            setFormData({
              title: '',
              content: '',
              meetingDate: new Date().toISOString().split('T')[0],
              attendees: []
            });
            setIsFormOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md"
        >
          <Plus className="w-5 h-5" /> New Minutes
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search minutes by title or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
        />
      </div>

      {/* Minutes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMinutes.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                  Meeting
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleEdit(item, false)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(item.meetingDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4 h-15">
                {item.content}
              </p>
              <div className="border-t pt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {item.attendees?.length || 0} Attendees
                </div>
                <button
                  onClick={() => handleEdit(item, true)}
                  className="text-purple-600 text-sm font-semibold flex items-center hover:underline"
                >
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMinutes.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No minutes found</h3>
          <p className="text-gray-500 mt-2">Start by recording your first meeting minutes.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-6 text-purple-600 font-bold hover:underline"
          >
            Create New Minutes
          </button>
        </div>
      )}

      {/* Minutes Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-purple-700 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {isReadOnly ? <FileText className="w-5 h-5" /> : (editingMinutes ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                {isReadOnly ? 'View Meeting Minutes' : (editingMinutes ? 'Edit Meeting Minutes' : 'Record New Meeting Minutes')}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-white hover:bg-white/20 p-1 rounded-full transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form id="minutes-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    readOnly={isReadOnly}
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={`w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isReadOnly ? 'bg-gray-50' : ''}`}
                    placeholder="e.g., Monthly Executive Meeting"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    readOnly={isReadOnly}
                    value={formData.meetingDate}
                    onChange={(e) => setFormData({...formData, meetingDate: e.target.value})}
                    className={`w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isReadOnly ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Attendees *</label>

                {/* Selected Attendees Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.attendees.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      {name}
                      {!isReadOnly && (
                        <button type="button" onClick={() => toggleAttendee(name)} className="hover:text-purple-900">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {formData.attendees.length === 0 && (
                    <span className="text-sm text-gray-400 italic">No attendees selected yet</span>
                  )}
                </div>

                {/* Member Search and Dropdown */}
                {!isReadOnly && (
                  <div className="relative">
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setShowMemberDropdown(true);
                        }}
                        onFocus={() => setShowMemberDropdown(true)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="Search members to add..."
                      />
                    </div>

                    {showMemberDropdown && memberSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {filteredMembers.length > 0 ? (
                          filteredMembers.map(m => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => {
                                toggleAttendee(`${m.firstName} ${m.lastName}`);
                                setMemberSearch('');
                                setShowMemberDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center justify-between group transition"
                            >
                              <div>
                                <div className="font-semibold text-gray-800">{m.firstName} {m.lastName}</div>
                                <div className="text-xs text-gray-500">{m.phoneNumber}</div>
                              </div>
                              <Plus className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">No matching members found</div>
                        )}
                        <div className="border-t p-2 bg-gray-50">
                          <button
                            type="button"
                            onClick={() => {
                              if (memberSearch.trim()) {
                                toggleAttendee(memberSearch.trim());
                                setMemberSearch('');
                                setShowMemberDropdown(false);
                              }
                            }}
                            className="w-full text-sm text-purple-600 font-bold py-1 hover:underline"
                          >
                            Add "{memberSearch}" as custom attendee
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!isReadOnly && <p className="text-[10px] text-gray-400 italic">Click on a member to add them. You can also type a name and click "Add as custom" for non-members.</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Minutes / Content *</label>
                <textarea
                  required
                  rows="12"
                  readOnly={isReadOnly}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className={`w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-serif text-lg leading-relaxed ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Record what was discussed, decisions made, and action items..."
                ></textarea>
              </div>
            </form>

            <div className="flex gap-3 p-6 pt-4 border-t bg-gray-50 rounded-b-2xl">
              {isReadOnly ? (
                <button
                  key="edit-button"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Use setTimeout to prevent the click event from bleeding into the newly rendered Save button
                    setTimeout(() => setIsReadOnly(false), 0);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg"
                >
                  <Edit2 className="w-5 h-5" />
                  Edit Minutes
                </button>
              ) : (
                <button
                  key="save-button"
                  form="minutes-form"
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {editingMinutes ? 'Update Minutes' : 'Save Minutes'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinutesOfMeeting;
