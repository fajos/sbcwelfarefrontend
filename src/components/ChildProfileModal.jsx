import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  X, User, Phone, Calendar as CalendarIcon,
  CheckCircle, Clock, Award, Baby, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: { 'Authorization': `Bearer ${token}` }
  };
};

function ChildProfileModal({ child, onClose, userRoles }) {
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (child?._id) {
      fetchChildAttendance();
    }
  }, [child]);

  const fetchChildAttendance = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/attendance/child/${child._id}`, getAuthHeaders());
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching child attendance:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setIsLoading(false);
    }
  };

  if (!child) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white px-6 py-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl border-2 border-white/30">
              👶
            </div>
            <div>
              <h2 className="text-3xl font-bold">{child.firstName} {child.lastName}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {child.class && (
                  <span className="bg-white/20 text-white px-3 py-0.5 rounded-full text-sm font-medium border border-white/30">
                    {child.class}
                  </span>
                )}
                <span className="bg-yellow-400 text-yellow-900 px-3 py-0.5 rounded-full text-sm font-medium border border-yellow-500/30">
                  Children Department
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Child Info & Parents */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Baby className="w-5 h-5 text-pink-600" />
                  Child Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Date of Birth</p>
                      <p className="text-gray-700">{child.dateOfBirth || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Class / Department</p>
                      <p className="text-gray-700">{child.class || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <hr className="my-5 border-gray-100" />

                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Parent Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Parent/Guardian Name</p>
                      <p className="text-gray-700 font-medium">{child.parentsName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Parent Phone Number</p>
                      <p className="text-gray-700 font-medium">{child.parentsPhoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 rounded-xl shadow-md text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-300" />
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{attendance.length}</p>
                    <p className="text-xs text-purple-100 uppercase">Total Services</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">
                      {attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-purple-100 uppercase">Consistency</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance History */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="p-5 border-b flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Attendance History
                  </h3>
                </div>

                <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                  {isLoading ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading history...</p>
                    </div>
                  ) : attendance.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="px-6 py-3 font-bold">Event / Service</th>
                          <th className="px-6 py-3 font-bold">Date</th>
                          <th className="px-6 py-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendance.map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-800">{record.event?.title || 'Unknown Event'}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {record.eventDate ? format(new Date(record.eventDate), 'PPP') : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : record.status === 'late'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status === 'present' && <CheckCircle className="w-3 h-3" />}
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center">
                      <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500">No attendance records found for this child.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChildProfileModal;
