import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Cake, Gift, Send, MessageSquare,
  Calendar, RefreshCw, ChevronRight, User,
  Bell, Phone, CheckCircle2, AlertCircle
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

function NotificationsPanel() {
  const [celebrations, setCelebrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingSms, setSendingSms] = useState(null); // ID of member being sent SMS

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const fetchCelebrations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/notifications/upcoming-celebrations`, getAuthHeaders());
      setCelebrations(response.data);
    } catch (error) {
      console.error('Error fetching celebrations:', error);
      toast.error('Failed to load upcoming celebrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCelebrationSMS = async (celebration) => {
    const defaultMessages = {
      'Birthday': `Happy Birthday ${celebration.name}! C&S Saints Builder Church celebrates with you on this special day. May God's blessings be upon you.`,
      'Anniversary': `Happy Wedding Anniversary ${celebration.name}! C&S Saints Builder Church rejoices with your family today. May your home continue to be blessed.`
    };

    const message = prompt('Customize your message:', defaultMessages[celebration.type]);

    if (!message) return;

    setSendingSms(celebration.memberId + celebration.type);
    try {
      await axios.post(`${API_URL}/notifications/send-sms`, {
        phoneNumber: celebration.phoneNumber,
        message: message
      }, getAuthHeaders());

      toast.success(`Message sent to ${celebration.name}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error(error.response?.data?.message || 'Failed to send SMS');
    } finally {
      setSendingSms(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-500">Checking for celebrations...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="font-bold">Upcoming Celebrations</h2>
        </div>
        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
          This Month
        </span>
      </div>

      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {celebrations.length > 0 ? (
          celebrations.map((item, index) => (
            <div key={`${item.memberId}-${index}`} className="p-4 hover:bg-gray-50 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    item.type === 'Birthday' ? 'bg-pink-100 text-pink-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {item.type === 'Birthday' ? <Cake className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {item.type}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Day {item.day}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSendCelebrationSMS(item)}
                  disabled={sendingSms === item.memberId + item.type || !item.phoneNumber}
                  className={`p-2 rounded-full transition ${
                    !item.phoneNumber
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50 bg-gray-50'
                  }`}
                  title={item.phoneNumber ? 'Send SMS Greeting' : 'No phone number available'}
                >
                  {sendingSms === item.memberId + item.type ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {!item.phoneNumber && (
                <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Missing phone number
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No celebrations scheduled for the remainder of this month.</p>
          </div>
        )}
      </div>

      {celebrations.length > 0 && (
        <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Click the send icon to message members via Multitexter SMS
          </p>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;