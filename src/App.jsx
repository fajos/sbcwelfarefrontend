import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  RefreshCw, Download, Upload, Church, 
  Phone, Mail, Briefcase, Heart, 
  GraduationCap, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', gender: '',
    phoneNumber: '', whatsappNumber: '', dateOfBirth: '',
    maritalStatus: '', weddingAnniversary: '', residentialAddress: '',
    occupation: '', completedFoundationClass: 'No', churchUnit: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/members`);
      setMembers(response.data);
      toast.success(`${response.data.length} members loaded`);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Error loading members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      toast.error('Error saving member');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      gender: member.gender || '',
      phoneNumber: member.phoneNumber || '',
      whatsappNumber: member.whatsappNumber || '',
      dateOfBirth: member.dateOfBirth || '',
      maritalStatus: member.maritalStatus || '',
      weddingAnniversary: member.weddingAnniversary || '',
      residentialAddress: member.residentialAddress || '',
      occupation: member.occupation || '',
      completedFoundationClass: member.completedFoundationClass || 'No',
      churchUnit: member.churchUnit || ''
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

  const resetDatabase = async () => {
    if (window.confirm('⚠️ WARNING: This will delete ALL members. Are you absolutely sure?')) {
      try {
        await axios.delete(`${API_URL}/members`);
        toast.success('Database cleared successfully');
        fetchMembers();
      } catch (error) {
        console.error('Error clearing database:', error);
        toast.error('Error clearing database');
      }
    }
  };

  const handleBulkImport = () => {
    try {
      const rows = importData.trim().split('\n');
      const membersToImport = [];
      
      const startRow = rows[0].toLowerCase().includes('first') ? 1 : 0;
      
      for (let i = startRow; i < rows.length; i++) {
        const cols = rows[i].split(',').map(col => col.trim());
        if (cols.length >= 2 && cols[0] && cols[1]) {
          membersToImport.push({
            firstName: cols[0],
            lastName: cols[1],
            email: cols[2] || '',
            gender: cols[3] || '',
            phoneNumber: cols[4] || '',
            whatsappNumber: cols[5] || '',
            dateOfBirth: cols[6] || '',
            maritalStatus: cols[7] || '',
            weddingAnniversary: cols[8] || '',
            residentialAddress: cols[9] || '',
            occupation: cols[10] || '',
            completedFoundationClass: cols[11] === 'Yes' ? 'Yes' : 'No',
            churchUnit: cols[12] || ''
          });
        }
      }
      
      if (membersToImport.length === 0) {
        toast.error('No valid members found to import');
        return;
      }
      
      Promise.all(membersToImport.map(member => 
        axios.post(`${API_URL}/members`, member)
      )).then(() => {
        toast.success(`Successfully imported ${membersToImport.length} members`);
        fetchMembers();
        setImportData('');
        setIsImportOpen(false);
      }).catch(error => {
        console.error('Import error:', error);
        toast.error('Error importing members');
      });
      
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Error parsing import data');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportData(event.target.result);
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    const headers = [
      'First Name', 'Last Name', 'Email', 'Gender', 'Phone Number', 
      'WhatsApp Number', 'Date of Birth', 'Marital Status', 'Wedding Anniversary', 
      'Residential Address', 'Occupation', 'Completed Foundation Class', 'Church Unit'
    ];
    
    const csvData = members.map(m => [
      m.firstName || '',
      m.lastName || '',
      m.email || '',
      m.gender || '',
      m.phoneNumber || '',
      m.whatsappNumber || '',
      m.dateOfBirth || '',
      m.maritalStatus || '',
      m.weddingAnniversary || '',
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
  
  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      member.firstName?.toLowerCase().includes(term) ||
      member.lastName?.toLowerCase().includes(term) ||
      member.phoneNumber?.includes(term) ||
      member.churchUnit?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gradient-to-r from-green-800 to-emerald-800 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <Church className="w-8 h-8 md:w-10 md:h-10" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">C&S Saints Builder Church</h1>
                <p className="text-green-200 text-sm md:text-base">Welfare Management System</p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <button
                onClick={() => { setIsImportOpen(true); resetForm(); }}
                className="bg-purple-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md text-sm md:text-base"
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5" /> Bulk Import
              </button>
              <button
                onClick={exportToCSV}
                className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition shadow-md text-sm md:text-base"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5" /> Export CSV
              </button>
              <button
                onClick={() => { setIsFormOpen(true); resetForm(); }}
                className="bg-white text-green-800 px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-green-100 transition shadow-md text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Member
              </button>
              <button
                onClick={resetDatabase}
                className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-700 transition shadow-md text-sm md:text-base"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> Reset DB
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm">Total Members</p>
                <p className="text-2xl md:text-3xl font-bold text-green-800">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 md:w-10 md:h-10 text-green-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm">Foundation Class</p>
                <p className="text-2xl md:text-3xl font-bold text-green-800">{stats.foundationComplete}</p>
              </div>
              <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-blue-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm">Church Units</p>
                <p className="text-2xl md:text-3xl font-bold text-green-800">{stats.uniqueUnits}</p>
              </div>
              <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-purple-600 opacity-75" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-pink-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm">Married Members</p>
                <p className="text-2xl md:text-3xl font-bold text-green-800">{stats.married}</p>
              </div>
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-pink-600 opacity-75" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-4">
          <div className="flex gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search by name, phone number, or church unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm md:text-base"
              />
            </div>
            <button
              onClick={fetchMembers}
              className="bg-gray-600 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition text-sm md:text-base"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> Refresh
            </button>
          </div>
        </div>

        {/* Members Table - With Top Scroll Bar and Better Design */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Horizontal scrollbar at top */}
          <div className="overflow-x-auto overflow-y-hidden" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }}>
              <div className="h-3 bg-gray-100"></div>
            </div>
          </div>
          
          {/* Table with horizontal scroll */}
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full">
              <thead className="bg-gradient-to-r from-green-700 to-emerald-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">First Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Last Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Date of Birth</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Marital Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Wedding Anniversary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Occupation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Foundation Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-green-600">Church Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMembers.map((member, index) => (
                  <tr key={member._id} className="hover:bg-green-50 transition-colors duration-200">
                    <td className="px-4 py-3 text-sm text-gray-500 border-r border-gray-200">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">{member.firstName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{member.lastName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{member.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {member.gender && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.gender === 'Male' ? 'bg-blue-100 text-blue-800' : member.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'}`}>
                          {member.gender}
                        </span>
                      )}
                      {!member.gender && '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {member.phoneNumber && (
                        <a href={`tel:${member.phoneNumber}`} className="flex items-center gap-1 text-green-600 hover:text-green-800">
                          <Phone className="w-3 h-3" /> {member.phoneNumber}
                        </a>
                      )}
                      {!member.phoneNumber && '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {member.whatsappNumber && (
                        <a href={`https://wa.me/${member.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-800">
                          <Mail className="w-3 h-3" /> {member.whatsappNumber}
                        </a>
                      )}
                      {!member.whatsappNumber && '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{member.dateOfBirth || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {member.maritalStatus && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.maritalStatus === 'Married' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {member.maritalStatus}
                        </span>
                      )}
                      {!member.maritalStatus && '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{member.weddingAnniversary || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200 max-w-xs truncate" title={member.residentialAddress}>
                      {member.residentialAddress || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{member.occupation || '-'}</td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${member.completedFoundationClass === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {member.completedFoundationClass === 'Yes' ? '✓ Completed' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      {member.churchUnit && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                          {member.churchUnit}
                        </span>
                      )}
                      {!member.churchUnit && '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium">No members found</p>
              <p className="text-sm">Click "Add Member" to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Member Modal - Keep as is */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-green-800">
                {editingMember ? '✏️ Edit Member' : '➕ Add New Member'}
              </h2>
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="text-gray-500 hover:text-gray-700 text-3xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="text" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <input type="text" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Male/Female/Other" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input type="text" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input type="text" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input type="text" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Any format" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marital Status</label>
                  <input type="text" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Single/Married/Divorced/Widowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wedding Anniversary</label>
                  <input type="text" value={formData.weddingAnniversary} onChange={e => setFormData({...formData, weddingAnniversary: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Any format" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Residential Address</label>
                  <input type="text" value={formData.residentialAddress} onChange={e => setFormData({...formData, residentialAddress: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Occupation</label>
                  <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Completed Foundation Class?</label>
                  <select value={formData.completedFoundationClass} onChange={e => setFormData({...formData, completedFoundationClass: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Church Unit</label>
                  <input type="text" placeholder="e.g., Choir, Ushering, Welfare" value={formData.churchUnit} onChange={e => setFormData({...formData, churchUnit: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-md">{editingMember ? 'Update Member' : 'Save Member'}</button>
                <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-green-800">📤 Bulk Import Members</h2>
              <button onClick={() => setIsImportOpen(false)} className="text-gray-500 hover:text-gray-700 text-3xl">×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Upload CSV File</label>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="w-full border rounded-lg p-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Or Paste CSV Data</label>
                <p className="text-xs text-gray-500 mb-2">Format: First Name, Last Name, Email, Gender, Phone, WhatsApp, DOB, Marital Status, Anniversary, Address, Occupation, Foundation Class (Yes/No), Church Unit</p>
                <textarea rows="6" value={importData} onChange={(e) => setImportData(e.target.value)} placeholder="John,Doe,john@email.com,Male,1234567890,1234567890,25th Dec 1990,Married,June 1st 2015,123 Main St,Engineer,Yes,Choir" className="w-full border rounded-lg p-2 font-mono text-sm"></textarea>
              </div>
              <div className="flex gap-3">
                <button onClick={handleBulkImport} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700">Import Members</button>
                <button onClick={() => setIsImportOpen(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;