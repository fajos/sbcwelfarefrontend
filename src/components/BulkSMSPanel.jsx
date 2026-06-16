import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, Users, Layers, Plus, Trash2,
  Search, CheckSquare, Square, MessageSquare,
  AlertCircle, CheckCircle2, RefreshCw, Clock, X, Calendar, History
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

function BulkSMSPanel({ members }) {
  const [activeTab, setActiveTab] = useState('broadcast'); // 'broadcast', 'groups', 'scheduled', 'history'
  const [groups, setGroups] = useState([]);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [upcomingCelebrations, setUpcomingCelebrations] = useState([]);
  const [smsHistory, setSmsHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Broadcast State
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Group Creation State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '', members: [] });
  const [groupSearch, setGroupSearch] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchScheduledMessages();
    fetchUpcomingCelebrations();
    fetchSMSHistory();
  }, []);

  const fetchSMSHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/sms-history`, getAuthHeaders());
      setSmsHistory(response.data);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/groups`, getAuthHeaders());
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    }
  };

  const fetchScheduledMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/scheduled-sms`, getAuthHeaders());
      setScheduledMessages(response.data);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
    }
  };

  const fetchUpcomingCelebrations = async () => {
    try {
      const response = await axios.get(`${API_URL}/sms/upcoming-celebrations`, getAuthHeaders());
      setUpcomingCelebrations(response.data);
    } catch (error) {
      console.error('Error fetching celebrations:', error);
    }
  };

  const handleRefreshScheduled = () => {
    fetchScheduledMessages();
    fetchUpcomingCelebrations();
    toast.success('Schedules updated');
  };

  const handleSendBroadcast = async () => {
    if (selectedMemberIds.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (isScheduling && !scheduledDateTime) {
      toast.error('Please select a date and time for scheduling');
      return;
    }

    setLoading(true);
    try {
      if (isScheduling) {
        const response = await axios.post(`${API_URL}/scheduled-sms`, {
          memberIds: selectedMemberIds,
          message: broadcastMessage,
          scheduledTime: scheduledDateTime
        }, getAuthHeaders());
        toast.success('SMS scheduled successfully');
        fetchScheduledMessages();
      } else {
        const response = await axios.post(`${API_URL}/sms/broadcast`, {
          memberIds: selectedMemberIds,
          message: broadcastMessage
        }, getAuthHeaders());
        toast.success(response.data.message);
      }

      setBroadcastMessage('');
      setSelectedMemberIds([]);
      setIsScheduling(false);
      setScheduledDateTime('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduled = async (id) => {
    if (window.confirm('Cancel this scheduled message?')) {
      try {
        await axios.delete(`${API_URL}/scheduled-sms/${id}`, getAuthHeaders());
        toast.success('Scheduled message cancelled');
        fetchScheduledMessages();
      } catch (error) {
        toast.error('Failed to cancel message');
      }
    }
  };

  const handleSendToGroup = async (group) => {
    const message = prompt(`Send SMS to all ${group.members.length} members of "${group.name}":`);
    if (!message) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/groups/${group._id}/send-sms`, {
        message: message
      }, getAuthHeaders());
      toast.success(`SMS sent to ${group.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send group SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupFormData.name) {
      toast.error('Group name is required');
      return;
    }
    if (groupFormData.members.length === 0) {
      toast.error('Please select at least one member for the group');
      return;
    }

    try {
      await axios.post(`${API_URL}/groups`, groupFormData, getAuthHeaders());
      toast.success('Group created successfully');
      setIsGroupModalOpen(false);
      setGroupFormData({ name: '', description: '', members: [] });
      fetchGroups();
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await axios.delete(`${API_URL}/groups/${id}`, getAuthHeaders());
        toast.success('Group deleted');
        fetchGroups();
      } catch (error) {
        toast.error('Failed to delete group');
      }
    }
  };

  const filteredMembers = members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(broadcastSearch.toLowerCase()) ||
    m.churchUnit?.toLowerCase().includes(broadcastSearch.toLowerCase())
  );

  const groupFilteredMembers = members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'broadcast' ? 'bg-white text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Send className="w-5 h-5" /> Ad-hoc Broadcast
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'groups' ? 'bg-white text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Users className="w-5 h-5" /> Saved Groups
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'scheduled' ? 'bg-white text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-5 h-5" /> Scheduled
          {(scheduledMessages.length + upcomingCelebrations.length) > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
              {scheduledMessages.length + upcomingCelebrations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-center font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'history' ? 'bg-white text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <History className="w-5 h-5" /> Sent History
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'broadcast' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Member Selection Column */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col h-[600px]">
              <div className="mb-4">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" /> Select Recipients
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or unit..."
                    value={broadcastSearch}
                    onChange={(e) => setBroadcastSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">{selectedMemberIds.length} selected</span>
                  <button
                    onClick={() => setSelectedMemberIds(selectedMemberIds.length === filteredMembers.length ? [] : filteredMembers.map(m => m._id))}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    {selectedMemberIds.length === filteredMembers.length ? 'Deselect All' : 'Select All Filtered'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredMembers.map(member => (
                  <div
                    key={member._id}
                    onClick={() => {
                      if (selectedMemberIds.includes(member._id)) {
                        setSelectedMemberIds(selectedMemberIds.filter(id => id !== member._id));
                      } else {
                        setSelectedMemberIds([...selectedMemberIds, member._id]);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedMemberIds.includes(member._id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    {selectedMemberIds.includes(member._id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-gray-500">{member.phoneNumber || 'No phone'} • {member.churchUnit || 'No unit'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Column */}
            <div className="flex flex-col h-[600px]">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" /> Compose Message
              </h3>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your announcement here..."
                className="w-full flex-1 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
              ></textarea>

              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduling}
                    onChange={(e) => setIsScheduling(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Schedule for later</span>
                </label>

                {isScheduling && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-bold">SMS Info</span>
                </div>
                <p className="text-xs text-blue-700">
                  - Recipients: {selectedMemberIds.length}<br />
                  - Message Length: {broadcastMessage.length} characters ({Math.ceil(broadcastMessage.length / 160)} pages)<br />
                  - Delivery: {isScheduling ? `Scheduled for ${scheduledDateTime || '...'}` : 'Immediate'}
                </p>
              </div>

              <button
                onClick={handleSendBroadcast}
                disabled={loading || selectedMemberIds.length === 0}
                className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 text-white shadow-lg transition ${
                  loading || selectedMemberIds.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:scale-95'
                }`}
              >
                {loading ? <RefreshCw className="animate-spin" /> : (isScheduling ? <Clock className="w-5 h-5" /> : <Send />)}
                {isScheduling ? 'Schedule Broadcast' : 'Send Broadcast SMS'}
              </button>
            </div>
          </div>
        ) : activeTab === 'groups' ? (
          /* Groups View */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" /> Member Groups
              </h3>
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-800 transition"
              >
                <Plus className="w-5 h-5" /> Create New Group
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => (
                <div key={group._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition bg-white group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                      <Users className="w-6 h-6" />
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group._id)}
                      className="text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-lg text-gray-800">{group.name}</h4>
                  <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{group.description || 'No description'}</p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {group.members?.length || 0} Members
                    </span>
                    <button
                      onClick={() => handleSendToGroup(group)}
                      className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800"
                    >
                      <Send className="w-4 h-4" /> Send SMS
                    </button>
                  </div>
                </div>
              ))}

              {groups.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No groups created yet.</p>
                  <button
                    onClick={() => setIsGroupModalOpen(true)}
                    className="text-blue-600 font-bold hover:underline mt-2"
                  >
                    Create your first group
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* Sent History View */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-blue-600" /> Message History
              </h3>
              <button onClick={fetchSMSHistory} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Recipients</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {smsHistory.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(item.sentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.sentAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                          item.type === 'celebration' ? 'bg-purple-100 text-purple-700' :
                          item.type === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-sm text-gray-900 truncate" title={item.recipientNames}>
                          {item.recipientNames || `${item.recipients?.length || 0} Recipients`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.recipients?.length || 0} phone numbers
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-sm text-gray-600 line-clamp-2 italic" title={item.message}>
                          "{item.message}"
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {item.status === 'sent' ? (
                            <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="text-xs font-bold text-green-700 uppercase">Sent</span></>
                          ) : (
                            <><AlertCircle className="w-4 h-4 text-red-500" /> <span className="text-xs font-bold text-red-700 uppercase">Failed</span></>
                          )}
                        </div>
                        {item.error && <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate">{item.error}</div>}
                      </td>
                    </tr>
                  ))}
                  {smsHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-gray-500 italic">
                        No SMS history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Scheduled View */
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" /> Queue & Automations
              </h3>
              <button onClick={handleRefreshScheduled} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold">
                <RefreshCw className="w-4 h-4" /> Refresh Lists
              </button>
            </div>

            {/* Manual Schedules Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Send className="w-4 h-4" /> Manual Broadcasts ({scheduledMessages.length})
              </h4>
              <div className="space-y-4">
                {scheduledMessages.map(msg => (
                  <div key={msg._id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-gray-700">
                          {new Date(msg.scheduledTime).toLocaleString('en-NG', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelScheduled(msg._id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-full transition"
                        title="Cancel Schedule"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-100">
                      <p className="text-sm text-gray-800 italic">"{msg.message}"</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        <span className="font-medium">{msg.recipients.length} Recipients:</span>
                        <span className="truncate max-w-md">{msg.recipientNames}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider">
                        Pending
                      </div>
                    </div>
                  </div>
                ))}
                {scheduledMessages.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No manual broadcasts in queue
                  </p>
                )}
              </div>
            </div>

            {/* Automated Celebrations Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Automated Celebration SMS (Next 14 Days)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingCelebrations.map((celeb, index) => (
                  <div key={index} className="border border-blue-100 rounded-xl p-4 bg-blue-50/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {celeb.type === 'Birthday' ? <span className="text-lg">🎂</span> : <span className="text-lg">💍</span>}
                        <div>
                          <p className="text-sm font-bold text-gray-900">{celeb.name}</p>
                          <p className="text-[10px] text-blue-600 font-bold uppercase">{celeb.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-700">
                          {new Date(celeb.occurrenceDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {celeb.daysUntil === 0 ? 'Today' : celeb.daysUntil === 1 ? 'Tomorrow' : `in ${celeb.daysUntil} days`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100">
                      <span className="text-[10px] text-gray-500">{celeb.phoneNumber}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                        Auto-sends at 08:00 AM
                      </span>
                    </div>
                  </div>
                ))}
                {upcomingCelebrations.length === 0 && (
                  <div className="col-span-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 italic">No celebrations found in the next 14 days</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-blue-50">
              <h2 className="text-2xl font-bold text-blue-900">Create New Group</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-3xl">&times;</button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Group Name *</label>
                    <input
                      type="text"
                      required
                      value={groupFormData.name}
                      onChange={e => setGroupFormData({...groupFormData, name: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Choir Department"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                      value={groupFormData.description}
                      onChange={e => setGroupFormData({...groupFormData, description: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg h-32 resize-none"
                      placeholder="What is this group for?"
                    ></textarea>
                  </div>
                </div>

                <div className="flex flex-col h-[400px]">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Add Members ({groupFormData.members.length} selected)</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
                    {groupFilteredMembers.map(m => (
                      <div
                        key={m._id}
                        onClick={() => {
                          const members = groupFormData.members.includes(m._id)
                            ? groupFormData.members.filter(id => id !== m._id)
                            : [...groupFormData.members, m._id];
                          setGroupFormData({...groupFormData, members});
                        }}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${
                          groupFormData.members.includes(m._id) ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        {groupFormData.members.includes(m._id) ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <div className="w-4 h-4 border border-gray-300 rounded-full"></div>
                        )}
                        <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white py-3 rounded-lg font-bold hover:bg-blue-800"
                >
                  Create Group
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkSMSPanel;
