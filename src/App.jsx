import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  RefreshCw, Download, Church, Calendar, 
  Phone, Mail, MapPin, Briefcase, Heart, 
  GraduationCap, Home, Briefcase as WorkIcon,
  Cake, Gift
} from 'lucide-react';

// Better API URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.timeout = 30000;

// Add request interceptor for debugging
axios.interceptors.request.use(
  config => {
    console.log(`📤 Making request to: ${config.url}`);
    return config;
  },
  error => {
    console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
  response => {
    console.log(`📥 Response from: ${response.config.url}`, response.status);
    return response;
  },
  error => {
    console.error('📥 Response error:', error.response?.status, error.message);
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (error.response?.status === 404) {
      toast.error('Backend server not found. Please check if it\'s running.');
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    } else if (!error.response) {
      toast.error('Cannot connect to server. Please check your network.');
    }
    return Promise.reject(error);
  }
);

function App() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', gender: '',
    phoneNumber: '', whatsappNumber: '', dateOfBirth: '',
    maritalStatus: '', weddingAnniversary: '', residentialAddress: '',
    occupation: '', completedFoundationClass: 'No', churchUnit: ''
  });

  useEffect(() => {
    // Check backend health on startup
    checkBackendHealth();
    fetchMembers();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await axios.get(`${API_URL.replace('/api', '')}/api/health`);
      console.log('✅ Backend is healthy:', response.data);
      toast.success('Connected to server successfully');
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      toast.error(`Cannot connect to backend server. Please ensure it's running at ${API_URL}`);
    }
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/members`);
      setMembers(response.data);
      toast.success(`${response.data.length} members loaded`);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Error loading members. Make sure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName) {
      toast.error('First Name and Last Name are required');
      return;
    }

    try {
      if (editingMember) {
        await axios.put(`${API_URL}/members/${editingMember._id}`, formData);
        toast.success('Member updated successfully');
      } else {
        await axios.post(`${API_URL}/members`, formData);
        toast.success('Member added successfully');
      }
      fetchMembers();
      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Error saving member: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      ...member,
      dateOfBirth: member.dateOfBirth?.split('T')[0] || '',
      weddingAnniversary: member.weddingAnniversary?.split('T')[0] || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await axios.delete(`${API_URL}/members/${id}`);
        toast.success('Member deleted successfully');
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Error deleting member');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', email: '', gender: '',
      phoneNumber: '', whatsappNumber: '', dateOfBirth: '',
      maritalStatus: '', weddingAnniversary: '', residentialAddress: '',
      occupation: '', completedFoundationClass: 'No', churchUnit: ''
    });
    setEditingMember(null);
  };

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Gender', 'Phone', 'WhatsApp', 'DOB', 'Marital Status', 'Wedding Anniversary', 'Address', 'Occupation', 'Foundation Class', 'Church Unit'];
    const csvData = filteredMembers.map(m => [
      m.firstName || '',
      m.lastName || '',
      m.email || '',
      m.gender || '',
      m.phoneNumber || '',
      m.whatsappNumber || '',
      m.dateOfBirth?.split('T')[0] || '',
      m.maritalStatus || '',
      m.weddingAnniversary?.split('T')[0] || '',
      m.residentialAddress || '',
      m.occupation || '',
      m.completedFoundationClass || 'No',
      m.churchUnit || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church_members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful!');
  };

  const getStats = () => {
    return {
      total: members.length,
      foundationComplete: members.filter(m => m.completedFoundationClass === 'Yes').length,
      uniqueUnits: new Set(members.map(m => m.churchUnit).filter(Boolean)).size,
      married: members.filter(m => m.maritalStatus === 'Married').length
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Toaster position="top-right" />

            {/* Add connection status indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-md px-3 py-1 text-xs">
        {isLoading ? '🔄 Connecting...' : '✅ Connected'}
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-green-800 to-emerald-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <Church className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">C&S Saints Builder Church</h1>
                <p className="text-green-200">Welfare Management System</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setIsFormOpen(true); resetForm(); }}
                className="bg-white text-green-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-green-100 transition shadow-md"
              >
                <Plus className="w-5 h-5" /> Add Member
              </button>
              <button
                onClick={exportToCSV}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition shadow-md"
              >
                <Download className="w-5 h-5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Members</p>
                <p className="text-3xl font-bold text-green-800">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-green-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Foundation Class</p>
                <p className="text-3xl font-bold text-green-800">{stats.foundationComplete}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-green-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Church Units</p>
                <p className="text-3xl font-bold text-green-800">{stats.uniqueUnits}</p>
              </div>
              <Briefcase className="w-10 h-10 text-green-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Married Members</p>
                <p className="text-3xl font-bold text-green-800">{stats.married}</p>
              </div>
              <Heart className="w-10 h-10 text-green-600 opacity-75" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, phone number, or church unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={fetchMembers}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition"
            >
              <RefreshCw className="w-5 h-5" /> Refresh
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Personal Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Church</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </div>
                    {member.dateOfBirth && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Cake className="w-3 h-3" /> DOB: {new Date(member.dateOfBirth).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {member.phoneNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> {member.phoneNumber}
                        </div>
                      )}
                      {member.whatsappNumber && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-green-600 text-xs">WhatsApp:</span> {member.whatsappNumber}
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="w-4 h-4 text-xs" /> {member.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {member.gender && <div>Gender: {member.gender}</div>}
                      {member.maritalStatus && <div>Status: {member.maritalStatus}</div>}
                      {member.weddingAnniversary && (
                        <div className="flex items-center gap-1 mt-1">
                          <Gift className="w-3 h-3" /> Anniversary: {new Date(member.weddingAnniversary).toLocaleDateString()}
                        </div>
                      )}
                      {member.occupation && <div className="flex items-center gap-1 mt-1"><WorkIcon className="w-3 h-3" /> {member.occupation}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {member.churchUnit && <div className="font-medium text-green-700">📌 {member.churchUnit}</div>}
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${member.completedFoundationClass === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {member.completedFoundationClass === 'Yes' ? '✓ Foundation Completed' : 'Foundation Pending'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="Edit Member"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member._id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Delete Member"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-lg">No members found</p>
              <p className="text-sm">Click "Add Member" to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-green-800">
                {editingMember ? '✏️ Edit Member' : '➕ Add New Member'}
              </h2>
              <button
                onClick={() => { setIsFormOpen(false); resetForm(); }}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information Section */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 border-b border-green-200 pb-2">
                    👤 Personal Information
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500">
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input type="tel" value={formData.whatsappNumber} onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📅 Date of Birth</label>
                  <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                  <select value={formData.maritalStatus} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500">
                    <option value="">Select Status</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💍 Wedding Anniversary</label>
                  <input type="date" value={formData.weddingAnniversary} onChange={e => setFormData({ ...formData, weddingAnniversary: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏠 Residential Address</label>
                  <input type="text" value={formData.residentialAddress} onChange={e => setFormData({ ...formData, residentialAddress: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💼 Occupation</label>
                  <input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>

                {/* Church Information Section */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 border-b border-green-200 pb-2 mt-4">
                    ⛪ Church Information
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completed Foundation Class?</label>
                  <select value={formData.completedFoundationClass} onChange={e => setFormData({ ...formData, completedFoundationClass: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500">
                    <option value="No">❌ Not Completed</option>
                    <option value="Yes">✅ Completed</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Church Unit</label>
                  <input type="text" placeholder="e.g., Choir, Ushering, Welfare, Prayer Warriors" value={formData.churchUnit} onChange={e => setFormData({ ...formData, churchUnit: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-md">
                  {editingMember ? '💾 Update Member' : '💾 Save Member'}
                </button>
                <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">
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

export default App;