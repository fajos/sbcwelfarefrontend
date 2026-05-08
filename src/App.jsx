import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  RefreshCw, Download, Upload, Church, 
  Phone, Mail, Briefcase, Heart, 
  GraduationCap, ChevronLeft, ChevronRight,
  Cake, Gift, Calendar as CalendarIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cache configuration
let cachedMembers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

function App() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', gender: '',
    phoneNumber: '', whatsappNumber: '', dateOfBirth: '',
    maritalStatus: '', weddingAnniversary: '', residentialAddress: '',
    occupation: '', completedFoundationClass: 'No', churchUnit: ''
  });

  // Refs for synchronized scrolling
  const topScrollBarRef = useRef(null);
  const bottomScrollBarRef = useRef(null);

  // Helper function to extract month and day from date string
  const extractMonthDay = (dateString) => {
    if (!dateString || dateString === '-') return null;
    
    // Try to parse various date formats
    const patterns = [
      // Month Day, Year (e.g., "December 25, 1990" or "Dec 25, 1990")
      { regex: /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:\d{4})?/i },
      // Month/Day (e.g., "12/25" or "12/25/1990")
      { regex: /(\d{1,2})\/(\d{1,2})(?:\/\d{4})?/ },
      // Day Month (e.g., "25 December" or "25 Dec")
      { regex: /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i }
    ];
    
    for (const pattern of patterns) {
      const match = dateString.match(pattern.regex);
      if (match) {
        if (pattern.regex.toString().includes('january')) {
          // Month name format
          const monthMap = {
            january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
            april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
            august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
            november: 10, nov: 10, december: 11, dec: 11
          };
          const month = monthMap[match[1].toLowerCase()];
          const day = parseInt(match[2]);
          if (month !== undefined && day >= 1 && day <= 31) {
            return { month, day };
          }
        } else if (pattern.regex.toString().includes('/')) {
          // Month/Day format
          const month = parseInt(match[1]) - 1;
          const day = parseInt(match[2]);
          if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return { month, day };
          }
        } else if (pattern.regex.toString().includes('st|nd|rd|th')) {
          // Day Month format
          const day = parseInt(match[1]);
          const monthMap = {
            january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
            april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
            august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
            november: 10, nov: 10, december: 11, dec: 11
          };
          const month = monthMap[match[2].toLowerCase()];
          if (month !== undefined && day >= 1 && day <= 31) {
            return { month, day };
          }
        }
      }
    }
    return null;
  };

  // Calculate upcoming birthdays and anniversaries
  const calculateUpcomingEvents = (membersList) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const birthdays = [];
    const anniversaries = [];
    
    // Calculate days until a given month/day
    const daysUntil = (targetMonth, targetDay) => {
      const targetDateThisYear = new Date(currentYear, targetMonth, targetDay);
      const targetDateNextYear = new Date(currentYear + 1, targetMonth, targetDay);
      
      if (targetDateThisYear > today) {
        return Math.ceil((targetDateThisYear - today) / (1000 * 60 * 60 * 24));
      } else {
        return Math.ceil((targetDateNextYear - today) / (1000 * 60 * 60 * 24));
      }
    };
    
    membersList.forEach(member => {
      // Process birthday
      if (member.dateOfBirth && member.dateOfBirth !== '-') {
        const birthDate = extractMonthDay(member.dateOfBirth);
        if (birthDate) {
          const days = daysUntil(birthDate.month, birthDate.day);
          if (days <= 60) { // Show upcoming events within 60 days
            birthdays.push({
              ...member,
              eventDate: `${birthDate.month + 1}/${birthDate.day}`,
              daysUntil: days,
              type: 'birthday'
            });
          }
        }
      }
      
      // Process wedding anniversary
      if (member.weddingAnniversary && member.weddingAnniversary !== '-' && member.maritalStatus === 'Married') {
        const anniversaryDate = extractMonthDay(member.weddingAnniversary);
        if (anniversaryDate) {
          const days = daysUntil(anniversaryDate.month, anniversaryDate.day);
          if (days <= 60) {
            anniversaries.push({
              ...member,
              eventDate: `${anniversaryDate.month + 1}/${anniversaryDate.day}`,
              daysUntil: days,
              type: 'anniversary'
            });
          }
        }
      }
    });
    
    // Sort by days until event
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);
    
    setUpcomingBirthdays(birthdays);
    setUpcomingAnniversaries(anniversaries);
  };

  // Load cached data immediately, then fetch fresh data in background
  useEffect(() => {
    if (cachedMembers) {
      setMembers(cachedMembers);
      calculateUpcomingEvents(cachedMembers);
    }
    fetchMembers();
  }, []);

  // Recalculate events when members change
  useEffect(() => {
    calculateUpcomingEvents(members);
  }, [members]);

  // Synchronize top and bottom scroll bars
  useEffect(() => {
    const topScroll = topScrollBarRef.current;
    const bottomScroll = bottomScrollBarRef.current;
    
    if (topScroll && bottomScroll) {
      const syncTopToBottom = () => {
        bottomScroll.scrollLeft = topScroll.scrollLeft;
      };
      
      const syncBottomToTop = () => {
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      };
      
      topScroll.addEventListener('scroll', syncTopToBottom);
      bottomScroll.addEventListener('scroll', syncBottomToTop);
      
      return () => {
        topScroll.removeEventListener('scroll', syncTopToBottom);
        bottomScroll.removeEventListener('scroll', syncBottomToTop);
      };
    }
  }, [members]);

  const fetchMembers = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedMembers && (now - lastFetchTime) < CACHE_DURATION) {
      setMembers(cachedMembers);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/members`);
      cachedMembers = response.data;
      lastFetchTime = now;
      setMembers(response.data);
      toast.success(`${response.data.length} members loaded`);
    } catch (error) {
      console.error('Error fetching members:', error);
      if (!cachedMembers) {
        toast.error('Error loading members');
      }
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
      cachedMembers = null;
      await fetchMembers(true);
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
        cachedMembers = null;
        await fetchMembers(true);
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
        cachedMembers = null;
        await fetchMembers(true);
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
      )).then(async () => {
        toast.success(`Successfully imported ${membersToImport.length} members`);
        cachedMembers = null;
        await fetchMembers(true);
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

  // Function to get event color based on days remaining
  const getEventColor = (days) => {
    if (days <= 7) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 14) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

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
        
        {/* Upcoming Events Section */}
        {(upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Upcoming Celebrations
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Birthdays */}
              {upcomingBirthdays.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-3">
                    <h3 className="font-bold flex items-center gap-2">
                      <Cake className="w-5 h-5" />
                      🎂 Upcoming Birthdays ({upcomingBirthdays.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {upcomingBirthdays.map((member, idx) => (
                      <div key={idx} className="p-4 hover:bg-pink-50 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {member.churchUnit ? `📌 ${member.churchUnit}` : 'No unit assigned'}
                            </p>
                            {member.phoneNumber && (
                              <p className="text-xs text-gray-400 mt-1">
                                📞 {member.phoneNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getEventColor(member.daysUntil)}`}>
                              {member.daysUntil === 0 ? '🎉 TODAY!' : `in ${member.daysUntil} days`}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              📅 {member.eventDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upcoming Anniversaries */}
              {upcomingAnniversaries.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-3">
                    <h3 className="font-bold flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      💍 Upcoming Anniversaries ({upcomingAnniversaries.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {upcomingAnniversaries.map((member, idx) => (
                      <div key={idx} className="p-4 hover:bg-purple-50 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {member.churchUnit ? `📌 ${member.churchUnit}` : 'No unit assigned'}
                            </p>
                            {member.phoneNumber && (
                              <p className="text-xs text-gray-400 mt-1">
                                📞 {member.phoneNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getEventColor(member.daysUntil)}`}>
                              {member.daysUntil === 0 ? '🎉 TODAY!' : `in ${member.daysUntil} days`}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              📅 {member.eventDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Loading Indicator */}
        {isLoading && !cachedMembers && (
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg mb-4 text-center">
            Loading members from database...
          </div>
        )}

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
              onClick={() => fetchMembers(true)}
              className="bg-gray-600 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition text-sm md:text-base"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> Refresh
            </button>
          </div>
        </div>

        {/* Members Table - Keep existing table code */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* TOP SCROLL BAR */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="text-xs text-gray-500 text-center py-1">← Scroll horizontally →</div>
            <div 
              ref={topScrollBarRef}
              className="overflow-x-auto"
            >
              <div style={{ width: '1400px', height: '10px' }}></div>
            </div>
          </div>
          
          {/* MAIN TABLE CONTAINER */}
          <div 
            ref={bottomScrollBarRef}
            className="overflow-x-auto"
          >
            <table className="min-w-[1400px] w-full">
              <thead className="bg-gradient-to-r from-green-700 to-emerald-700 text-white sticky top-0 z-10">
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
                          {member.whatsappNumber}
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
                  <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="text" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <input type="text" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Male/Female/Other" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input type="text" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input type="text" value={formData.whatsappNumber} onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input type="text" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Any format" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marital Status</label>
                  <input type="text" value={formData.maritalStatus} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Single/Married/Divorced/Widowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wedding Anniversary</label>
                  <input type="text" value={formData.weddingAnniversary} onChange={e => setFormData({ ...formData, weddingAnniversary: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Any format" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Residential Address</label>
                  <input type="text" value={formData.residentialAddress} onChange={e => setFormData({ ...formData, residentialAddress: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Occupation</label>
                  <input type="text" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Completed Foundation Class?</label>
                  <select value={formData.completedFoundationClass} onChange={e => setFormData({ ...formData, completedFoundationClass: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Church Unit</label>
                  <input type="text" placeholder="e.g., Choir, Ushering, Welfare" value={formData.churchUnit} onChange={e => setFormData({ ...formData, churchUnit: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent" />
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