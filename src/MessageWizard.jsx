import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Send, MessageCircle, Calendar, Users, CheckCircle, XCircle, Loader, Coins } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

function MessageWizard({ members, upcomingBirthdays, upcomingAnniversaries, onClose }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [messageType, setMessageType] = useState('birthday');
  const [isSending, setIsSending] = useState(false);
  const [sendMode, setSendMode] = useState('single');
  const [sendingResults, setSendingResults] = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/sms-balance`, getAuthHeaders());
      setBalance(response.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const sendSingleWish = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    
    if (!selectedMember.phoneNumber) {
      toast.error('This member has no phone number');
      return;
    }
    
    setIsSending(true);
    try {
      const endpoint = messageType === 'birthday' 
        ? `${API_URL}/send-birthday-wish`
        : `${API_URL}/send-anniversary-wish`;
      
      const payload = {
        phoneNumber: selectedMember.phoneNumber,
        name: `${selectedMember.firstName} ${selectedMember.lastName}`,
        churchUnit: selectedMember.churchUnit
      };
      
      if (messageType === 'anniversary') {
        payload.spouseName = '';
      }
      
      await axios.post(endpoint, payload, getAuthHeaders());
      toast.success(`${messageType === 'birthday' ? 'Birthday' : 'Anniversary'} wish sent to ${selectedMember.firstName}!`);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error sending wish:', error);
      toast.error('Failed to send message. Check phone number.');
    } finally {
      setIsSending(false);
    }
  };

  const sendBulkWishes = async (when) => {
    setIsSending(true);
    setSendingResults(null);
    try {
      const response = await axios.post(`${API_URL}/send-bulk-wishes`, { date: when }, getAuthHeaders());
      setSendingResults(response.data.results);
      toast.success(response.data.message);
      fetchBalance(); // Refresh balance after sending
    } catch (error) {
      console.error('Error sending bulk wishes:', error);
      toast.error('Failed to send bulk wishes');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Send Wishes to Members
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-3xl">×</button>
        </div>

        <div className="p-6">
          {/* Balance Display */}
          {balance && (
            <div className={`p-3 rounded-lg flex items-center justify-between mb-4 ${balance.balance < 100 ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="font-semibold">SMS Balance:</span>
                <span>₦{balance.balance?.toLocaleString()}</span>
                <span className="text-xs text-gray-500">(~{Math.floor(balance.balance / 1.9)} messages)</span>
              </div>
              <a
                href="https://multitexter.com/dashboard/topup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Top up →
              </a>
            </div>
          )}

          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">Send Mode</label>
            <div className="flex gap-3">
              <button
                onClick={() => setSendMode('single')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  sendMode === 'single'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Single Member
              </button>
              <button
                onClick={() => setSendMode('bulk-today')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  sendMode === 'bulk-today'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Today's Celebrants
              </button>
              <button
                onClick={() => setSendMode('bulk-tomorrow')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  sendMode === 'bulk-tomorrow'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Tomorrow's Celebrants
              </button>
            </div>
          </div>

          {/* Single Member Mode */}
          {sendMode === 'single' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Message Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMessageType('birthday')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                      messageType === 'birthday'
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    🎂 Birthday Wish
                  </button>
                  <button
                    onClick={() => setMessageType('anniversary')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                      messageType === 'anniversary'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    💍 Anniversary Wish
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Select Member</label>
                <select
                  value={selectedMember?._id || ''}
                  onChange={(e) => {
                    const member = members.find(m => m._id === e.target.value);
                    setSelectedMember(member);
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select a member --</option>
                  {members.map(member => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName} - {member.phoneNumber || 'No phone'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMember && !selectedMember.phoneNumber && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                  ⚠️ This member has no phone number. Please update their profile.
                </div>
              )}

              {selectedMember && selectedMember.phoneNumber && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2">Preview:</h4>
                  <div className="bg-white p-3 rounded border">
                    {messageType === 'birthday' ? (
                      <div>
                        <p className="text-pink-600 font-bold">🎂 HAPPY BIRTHDAY! 🎂</p>
                        <p className="mt-2">Dear <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>,</p>
                        <p>Warmest wishes from C&S Saints Builder Church! May your day be filled with God's blessings.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-purple-600 font-bold">💍 HAPPY WEDDING ANNIVERSARY! 💍</p>
                        <p className="mt-2">Dear <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>,</p>
                        <p>Congratulations! C&S Saints Builder Church celebrates God's faithfulness in your union.</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Will be sent to: {selectedMember.phoneNumber}
                  </p>
                </div>
              )}

              <button
                onClick={sendSingleWish}
                disabled={!selectedMember || !selectedMember.phoneNumber || isSending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
              >
                {isSending ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSending ? 'Sending...' : `Send ${messageType === 'birthday' ? 'Birthday' : 'Anniversary'} Wish`}
              </button>
            </>
          )}

          {/* Bulk Mode */}
          {(sendMode === 'bulk-today' || sendMode === 'bulk-tomorrow') && (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>⚠️ Important:</strong> This will send wishes to ALL members celebrating{' '}
                  {sendMode === 'bulk-today' ? 'today' : 'tomorrow'}.
                  Please ensure you have verified their phone numbers.
                </p>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">
                  Members to be notified ({sendMode === 'bulk-today' ? 'Today' : 'Tomorrow'}):
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sendMode === 'bulk-today' ? (
                    <>
                      {upcomingBirthdays.filter(b => b.daysUntil === 0).length === 0 && 
                       upcomingAnniversaries.filter(a => a.daysUntil === 0).length === 0 && (
                        <p className="text-gray-500 text-sm">No celebrations today</p>
                      )}
                      {upcomingBirthdays.filter(b => b.daysUntil === 0).map((member, idx) => (
                        <div key={idx} className="bg-pink-50 p-2 rounded flex justify-between items-center">
                          <span>🎂 {member.firstName} {member.lastName}</span>
                          <span className="text-xs text-gray-500">{member.phoneNumber || 'No phone'}</span>
                        </div>
                      ))}
                      {upcomingAnniversaries.filter(a => a.daysUntil === 0).map((member, idx) => (
                        <div key={idx} className="bg-purple-50 p-2 rounded flex justify-between items-center">
                          <span>💍 {member.firstName} {member.lastName}</span>
                          <span className="text-xs text-gray-500">{member.phoneNumber || 'No phone'}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {upcomingBirthdays.filter(b => b.daysUntil === 1).length === 0 && 
                       upcomingAnniversaries.filter(a => a.daysUntil === 1).length === 0 && (
                        <p className="text-gray-500 text-sm">No celebrations tomorrow</p>
                      )}
                      {upcomingBirthdays.filter(b => b.daysUntil === 1).map((member, idx) => (
                        <div key={idx} className="bg-pink-50 p-2 rounded flex justify-between items-center">
                          <span>🎂 {member.firstName} {member.lastName}</span>
                          <span className="text-xs text-gray-500">{member.phoneNumber || 'No phone'}</span>
                        </div>
                      ))}
                      {upcomingAnniversaries.filter(a => a.daysUntil === 1).map((member, idx) => (
                        <div key={idx} className="bg-purple-50 p-2 rounded flex justify-between items-center">
                          <span>💍 {member.firstName} {member.lastName}</span>
                          <span className="text-xs text-gray-500">{member.phoneNumber || 'No phone'}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => sendBulkWishes(sendMode === 'bulk-today' ? 'today' : 'tomorrow')}
                disabled={isSending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
              >
                {isSending ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSending ? 'Sending...' : `Send Wishes to All (${sendMode === 'bulk-today' ? 'Today' : 'Tomorrow'})`}
              </button>

              {sendingResults && (
                <div className="mt-4 space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h5 className="font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Sent Successfully
                    </h5>
                    <p className="text-sm text-green-700">
                      Birthdays: {sendingResults.birthdays.sent.length} | 
                      Anniversaries: {sendingResults.anniversaries.sent.length}
                    </p>
                  </div>
                  {sendingResults.birthdays.failed.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h5 className="font-semibold text-red-800 flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Failed
                      </h5>
                      {sendingResults.birthdays.failed.map((fail, idx) => (
                        <p key={idx} className="text-sm text-red-700">{fail.name}: {fail.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageWizard;