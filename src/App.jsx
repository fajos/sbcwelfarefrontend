import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import ChurchCalendar from './components/ChurchCalendar';
import AttendanceSessions from './components/AttendanceSessions';
import AttendanceReports from './components/AttendanceReports';
import MemberProfileModal from './components/MemberProfileModal';
import ChildProfileModal from './components/ChildProfileModal';
import BulkSMSPanel from './components/BulkSMSPanel';
import MinutesOfMeeting from './components/MinutesOfMeeting';
import {
  Users, Search, Plus, Edit2, Trash2, 
  RefreshCw, Download, Upload, Church, 
  Phone, Mail, Briefcase, Heart, 
  GraduationCap, ChevronLeft, ChevronRight,
  Cake, Gift, Calendar as CalendarIcon, LogOut, Shield, CalendarDays, CheckCircle, Info,
  TrendingUp, Bell, MessageSquare, Send, FileText
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

// Set default authorization header if token exists
const token = localStorage.getItem('welfare_token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Cache configuration
let cachedMembers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [activeView, setActiveView] = useState('members'); // 'members', 'calendar', 'attendance', 'reports', 'bulksms', 'children', 'minutes'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [children, setChildren] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingChild, setEditingChild] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [viewingChild, setViewingChild] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', gender: '',
    phoneNumber: '', whatsappNumber: '', dateOfBirth: '',
    maritalStatus: '', weddingAnniversary: '', residentialAddress: '',
    occupation: '', completedFoundationClass: 'No', churchUnit: ''
  });
  const [childFormData, setChildFormData] = useState({
    firstName: '', lastName: '', parentsName: '',
    parentsPhoneNumber: '', dateOfBirth: '', class: '',
    parentIds: []
  });

  const topScrollBarRef = useRef(null);
  const bottomScrollBarRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Measure header height for sticky positioning
  useEffect(() => {
    if (!headerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.contentRect.height + 32); // contentRect + padding
      }
    });

    resizeObserver.observe(headerRef.current);
    return () => resizeObserver.disconnect();
  }, [isAuthenticated]); // Re-run when auth changes as header content changes



  // Check authentication and load data on mount
  useEffect(() => {
    const checkAndLoad = async () => {
      const storedToken = localStorage.getItem('welfare_token');
      const storedUser = localStorage.getItem('welfare_user');
      
      if (storedToken && storedUser) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await axios.get(`${API_URL}/auth/verify`, getAuthHeaders());
          if (response.data.valid) {
            const user = response.data.user; // Use fresh user data from server
            setIsAuthenticated(true);
            setCurrentUser(user);
            // Ensure roles is an array for multi-role support
            const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
            setUserRoles(roles);
            // Update localStorage with fresh data and token
            localStorage.setItem('welfare_user', JSON.stringify(user));
            if (response.data.token) {
              localStorage.setItem('welfare_token', response.data.token);
              axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            }
            await loadMembersData();
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          handleLogout();
        }
      }
    };
    
    checkAndLoad();
  }, []);

  const loadMembersData = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedMembers && (now - lastFetchTime) < CACHE_DURATION) {
      setMembers(cachedMembers.members);
      setChildren(cachedMembers.children);
      return;
    }
    
    setIsLoading(true);
    try {
      const [membersRes, childrenRes] = await Promise.all([
        axios.get(`${API_URL}/members`, getAuthHeaders()),
        axios.get(`${API_URL}/children`, getAuthHeaders())
      ]);

      const data = {
        members: membersRes.data,
        children: childrenRes.data
      };

      cachedMembers = data;
      lastFetchTime = now;
      setMembers(data.members);
      setChildren(data.children);
      setSelectedMemberIds([]);
      setSelectedChildIds([]);

      if (data.members.length > 0 || data.children.length > 0) {
        toast.success(`${data.members.length} members and ${data.children.length} children loaded`);
      }
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error('Error loading data');
      return { members: [], children: [] };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    // Ensure roles is an array for multi-role support
    const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
    setUserRoles(roles);
    await loadMembersData(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('welfare_token');
    localStorage.removeItem('welfare_user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRoles([]);
    setMembers([]);
    setShowAdminDashboard(false);
    setShowCalendar(false);
    setActiveView('members');
    toast.success('Logged out successfully');
  };

  const fetchUpcomingEvents = async () => {
  try {
    const response = await axios.get(`${API_URL}/calendar/upcoming`, getAuthHeaders());
    setUpcomingEvents(response.data);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
  }
};

useEffect(() => {
  if (isAuthenticated) {
    fetchUpcomingEvents();
  }
}, [isAuthenticated]);

const formatEventDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
};

const getDaysUntilEvent = (dateString) => {
  if (!dateString) return null;
  const eventDate = new Date(dateString);
  const today = new Date();

  // Compare dates using local time components to determine "today" relative to the user
  const d1 = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = d1 - d2;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getEventIcon = (eventType) => {
  switch (eventType) {
    case 'service': return '⛪';
    case 'prayer': return '🙏';
    case 'fellowship': return '🤝';
    case 'outreach': return '💪';
    case 'wedding': return '💒';
    case 'baptism': return '💧';
    default: return '📌';
  }
};

  const getMonthName = (monthNumber) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber];
  };

  const extractMonthDay = (dateString) => {
    if (!dateString || dateString === '-') return null;
    
    const patterns = [
      { regex: /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:\d{4})?/i },
      { regex: /(\d{1,2})\/(\d{1,2})(?:\/\d{4})?/ },
      { regex: /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i }
    ];
    
    const monthMap = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    
    for (const pattern of patterns) {
      const match = dateString.match(pattern.regex);
      if (match) {
        if (pattern.regex.toString().includes('january')) {
          const month = monthMap[match[1].toLowerCase()];
          const day = parseInt(match[2]);
          if (month !== undefined && day >= 1 && day <= 31) {
            return { month, day };
          }
        } else if (pattern.regex.toString().includes('/')) {
          const part1 = parseInt(match[1]);
          const part2 = parseInt(match[2]);

          let month, day;
          // Determine if it's DD/MM or MM/DD based on values > 12
          if (part1 > 12) {
            day = part1;
            month = part2 - 1;
          } else if (part2 > 12) {
            month = part1 - 1;
            day = part2;
          } else {
            // Default to DD/MM as suggested by the placeholder "25/12"
            day = part1;
            month = part2 - 1;
          }

          if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return { month, day };
          }
        }
 else if (pattern.regex.toString().includes('st|nd|rd|th')) {
          const day = parseInt(match[1]);
          const month = monthMap[match[2].toLowerCase()];
          if (month !== undefined && day >= 1 && day <= 31) {
            return { month, day };
          }
        }
      }
    }
    return null;
  };

  const calculateUpcomingEvents = (membersList) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const birthdays = [];
    const anniversaries = [];
    
    const daysUntil = (targetMonth, targetDay) => {
      const targetDateThisYear = new Date(currentYear, targetMonth, targetDay);
      const targetDateNextYear = new Date(currentYear + 1, targetMonth, targetDay);
      
      targetDateThisYear.setHours(0, 0, 0, 0);
      targetDateNextYear.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      if (targetDateThisYear >= todayStart) {
        return Math.ceil((targetDateThisYear - todayStart) / (1000 * 60 * 60 * 24));
      } else {
        return Math.ceil((targetDateNextYear - todayStart) / (1000 * 60 * 60 * 24));
      }
    };
    
    membersList.forEach(member => {
      if (member.dateOfBirth && member.dateOfBirth !== '-') {
        const birthDate = extractMonthDay(member.dateOfBirth);
        if (birthDate) {
          const days = daysUntil(birthDate.month, birthDate.day);
          if (days <= 30) {
            birthdays.push({
              ...member,
              eventDateFormatted: `${getMonthName(birthDate.month)} ${birthDate.day}`,
              daysUntil: days,
            });
          }
        }
      }
      
      if (member.maritalStatus?.toLowerCase() === 'married' && member.weddingAnniversary && member.weddingAnniversary !== '-') {
        const anniversaryDate = extractMonthDay(member.weddingAnniversary);
        if (anniversaryDate) {
          const days = daysUntil(anniversaryDate.month, anniversaryDate.day);
          if (days <= 30) {
            anniversaries.push({
              ...member,
              eventDateFormatted: `${getMonthName(anniversaryDate.month)} ${anniversaryDate.day}`,
              daysUntil: days,
            });
          }
        }
      }
    });
    
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);
    
    setUpcomingBirthdays(birthdays);
    setUpcomingAnniversaries(anniversaries);
  };

  useEffect(() => {
    if (isAuthenticated && members.length > 0) {
      calculateUpcomingEvents(members);
    }
  }, [members, isAuthenticated]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error('First Name and Last Name are required');
      return;
    }

    try {
      if (editingMember) {
        await axios.put(`${API_URL}/members/${editingMember._id}`, formData, getAuthHeaders());
        toast.success('Member updated successfully');
      } else {
        await axios.post(`${API_URL}/members`, formData, getAuthHeaders());
        toast.success('Member added successfully');
      }
      cachedMembers = null;
      await loadMembersData(true);
      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving member:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to add/edit members');
      } else if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error('Error saving member');
      }
    }
  };

  const handleEdit = (member) => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to edit members');
      return;
    }
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

  const toggleSelection = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m._id));
    }
  };

  const handleBroadcastSMS = async () => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to send SMS');
      return;
    }

    const message = prompt(`Enter message to send to ${selectedMemberIds.length} members:`);
    if (!message) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/notifications/broadcast-sms`, {
        memberIds: selectedMemberIds,
        message: message
      }, getAuthHeaders());

      toast.success(response.data.message);
      setSelectedMemberIds([]);
    } catch (error) {
      console.error('Error sending broadcast SMS:', error);
      toast.error(error.response?.data?.message || 'Failed to send broadcast SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to delete members');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedMemberIds.length} members? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        const headers = getAuthHeaders();
        await Promise.all(selectedMemberIds.map(id =>
          axios.delete(`${API_URL}/members/${id}`, headers)
        ));
        toast.success(`${selectedMemberIds.length} members deleted successfully`);
        setSelectedMemberIds([]);
        cachedMembers = null;
        await loadMembersData(true);
      } catch (error) {
        console.error('Error deleting members:', error);
        toast.error('Error deleting some members');
        await loadMembersData(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to delete members');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await axios.delete(`${API_URL}/members/${id}`, getAuthHeaders());
        toast.success('Member deleted successfully');
        cachedMembers = null;
        await loadMembersData(true);
      } catch (error) {
        console.error('Error deleting member:', error);
        if (error.response?.status === 401) {
          handleLogout();
        } else {
          toast.error('Error deleting member');
        }
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

  const handleChildSubmit = async (e) => {
    e.preventDefault();
    if (!childFormData.firstName || !childFormData.lastName) {
      toast.error('First Name and Last Name are required');
      return;
    }

    try {
      if (editingChild) {
        await axios.put(`${API_URL}/children/${editingChild._id}`, childFormData, getAuthHeaders());
        toast.success('Child updated successfully');
      } else {
        await axios.post(`${API_URL}/children`, childFormData, getAuthHeaders());
        toast.success('Child added successfully');
      }
      cachedMembers = null;
      await loadMembersData(true);
      resetChildForm();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving child:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to add/edit children');
      } else if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error('Error saving child');
      }
    }
  };

  const handleChildEdit = (child) => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to edit children');
      return;
    }
    setEditingChild(child);
    setChildFormData({
      firstName: child.firstName || '',
      lastName: child.lastName || '',
      parentsName: child.parentsName || '',
      parentsPhoneNumber: child.parentsPhoneNumber || '',
      dateOfBirth: child.dateOfBirth || '',
      class: child.class || '',
      parentIds: child.parentIds?.map(p => typeof p === 'object' ? p._id : p) || []
    });
    setIsFormOpen(true);
  };

  const toggleChildSelection = (id) => {
    setSelectedChildIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllChildSelection = () => {
    if (selectedChildIds.length === filteredChildren.length && filteredChildren.length > 0) {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds(filteredChildren.map(c => c._id));
    }
  };

  const handleBulkChildDelete = async () => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to delete children');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedChildIds.length} children? This action cannot be undone.`)) {
      try {
        setIsLoading(true);
        const headers = getAuthHeaders();
        await Promise.all(selectedChildIds.map(id =>
          axios.delete(`${API_URL}/children/${id}`, headers)
        ));
        toast.success(`${selectedChildIds.length} children deleted successfully`);
        setSelectedChildIds([]);
        cachedMembers = null;
        await loadMembersData(true);
      } catch (error) {
        console.error('Error deleting children:', error);
        toast.error('Error deleting some children');
        await loadMembersData(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetChildForm = () => {
    setChildFormData({
      firstName: '', lastName: '', parentsName: '',
      parentsPhoneNumber: '', dateOfBirth: '', class: '',
      parentIds: []
    });
    setEditingChild(null);
    setEditingMember(null); // Ensure we're not editing a member
  };

  const resetDatabase = async () => {
    if (!userRoles.includes('admin')) {
      toast.error('Only administrators can reset the database');
      return;
    }
    
    if (window.confirm('⚠️ WARNING: This will delete ALL members. Are you absolutely sure?')) {
      try {
        await axios.delete(`${API_URL}/members`, getAuthHeaders());
        toast.success('Database cleared successfully');
        cachedMembers = null;
        await loadMembersData(true);
      } catch (error) {
        console.error('Error clearing database:', error);
        if (error.response?.status === 401) {
          handleLogout();
        } else {
          toast.error('Error clearing database');
        }
      }
    }
  };

  const handleBulkImport = () => {
    if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
      toast.error('You do not have permission to import members');
      return;
    }
    
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
        axios.post(`${API_URL}/members`, member, getAuthHeaders())
      )).then(async () => {
        toast.success(`Successfully imported ${membersToImport.length} members`);
        cachedMembers = null;
        await loadMembersData(true);
        setImportData('');
        setIsImportOpen(false);
      }).catch(error => {
        console.error('Import error:', error);
        if (error.response?.status === 401) {
          handleLogout();
        } else {
          toast.error('Error importing members');
        }
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

  const exportChildrenToCSV = () => {
    const headers = [
      'First Name', 'Last Name', 'Parent\'s Name', 'Parent\'s Phone Number', 'Date of Birth', 'Class'
    ];

    const csvData = children.map(c => [
      c.firstName || '',
      c.lastName || '',
      c.parentsName || '',
      c.parentsPhoneNumber || '',
      c.dateOfBirth || '',
      c.class || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church_children_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful!');
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

  const filteredChildren = children.filter(child => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      child.firstName?.toLowerCase().includes(term) ||
      child.lastName?.toLowerCase().includes(term) ||
      child.parentsName?.toLowerCase().includes(term) ||
      child.parentsPhoneNumber?.includes(term) ||
      child.class?.toLowerCase().includes(term)
    );
  });

  const getEventColor = (days) => {
    if (days <= 7) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 14) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  // Show Admin Dashboard if toggled
  if (showAdminDashboard) {
    return <AdminDashboard onBack={() => setShowAdminDashboard(false)} />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-yellow-50">
      <Toaster position="top-right" />

      {/* Global Event Modal (for homepage/quick access) */}
      {selectedEvent && activeView !== 'calendar' && (
        <ChurchCalendar
          userRoles={userRoles}
          members={members}
          children={children}
          initialEvent={selectedEvent}
          onEventHandled={() => setSelectedEvent(null)}
          showOnlyModal={true}
        />
      )}

      {/* Header */}
      <header ref={headerRef} className="bg-gradient-to-r from-blue-900 via-purple-800 to-yellow-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-white">
                  <img 
                    src="/church-logo.png" 
                    alt="Church Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = '<span className="text-blue-900 font-bold text-2xl">⛪</span>';
                    }}
                  />
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  C&S Saints Builder Church
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-yellow-200 text-sm md:text-base">
                    Welfare Management System
                  </p>
                  {userRoles.includes('admin') && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Admin</span>
                  )}
                  {userRoles.includes('editor') && (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Editor</span>
                  )}
                  {userRoles.includes('Executives') && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">Executive</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              {/* View Toggle Buttons */}
              <button
                onClick={() => setActiveView('members')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                  activeView === 'members'
                    ? 'bg-white text-blue-900'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                <Users className="w-4 h-4 md:w-5 md:h-5" /> Members
              </button>
              <button
                onClick={() => setActiveView('children')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                  activeView === 'children'
                    ? 'bg-white text-blue-900'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                <Users className="w-4 h-4 md:w-5 md:h-5" /> Children
              </button>
              <button
                onClick={() => setActiveView('calendar')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                  activeView === 'calendar'
                    ? 'bg-white text-blue-900'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                <CalendarDays className="w-4 h-4 md:w-5 md:h-5" /> Calendar
              </button>
              <button
                onClick={() => setActiveView('attendance')}
                className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                  activeView === 'attendance'
                    ? 'bg-white text-blue-900'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> Attendance
              </button>
              {(userRoles.includes('admin') || userRoles.includes('Executives')) && (
                <button
                  onClick={() => setActiveView('reports')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                    activeView === 'reports'
                      ? 'bg-white text-blue-900'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5" /> Reports
                </button>
              )}

              {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                <button
                  onClick={() => setActiveView('bulksms')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                    activeView === 'bulksms'
                      ? 'bg-white text-blue-900'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" /> Bulk SMS
                </button>
              )}

              {(userRoles.includes('admin') || userRoles.includes('Executives')) && (
                <button
                  onClick={() => setActiveView('minutes')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition shadow-md text-sm md:text-base ${
                    activeView === 'minutes'
                      ? 'bg-white text-blue-900'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  <FileText className="w-4 h-4 md:w-5 md:h-5" /> Minutes
                </button>
              )}

              {/* Admin Panel Button */}
              {userRoles.includes('admin') && (
                <button
                  onClick={() => setShowAdminDashboard(true)}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-yellow-600 hover:to-yellow-700 transition shadow-md text-sm md:text-base"
                >
                  <Shield className="w-4 h-4 md:w-5 md:h-5" /> Admin Panel
                </button>
              )}
              
              {/* Member Management Buttons (only show when members view is active) */}
              {activeView === 'members' && (
                <>
                  {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                    <button
                      onClick={() => { setIsImportOpen(true); resetForm(); }}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-purple-800 transition shadow-md text-sm md:text-base"
                    >
                      <Upload className="w-4 h-4 md:w-5 md:h-5" /> Bulk Import
                    </button>
                  )}
                  <button
                    onClick={exportToCSV}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition shadow-md text-sm md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" /> Export CSV
                  </button>
                  {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                    <button
                      onClick={() => { setIsFormOpen(true); resetForm(); }}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-900 px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-yellow-600 hover:to-yellow-700 transition shadow-md text-sm md:text-base"
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Member
                    </button>
                  )}
                  {userRoles.includes('admin') && (
                    <button
                      onClick={resetDatabase}
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-red-700 hover:to-red-800 transition shadow-md text-sm md:text-base"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> Reset DB
                    </button>
                  )}
                </>
              )}

              {/* Children Management Buttons */}
              {activeView === 'children' && (
                <>
                  <button
                    onClick={exportChildrenToCSV}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition shadow-md text-sm md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" /> Export CSV
                  </button>
                  {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                    <button
                      onClick={() => { setIsFormOpen(true); resetChildForm(); }}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-900 px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-yellow-600 hover:to-yellow-700 transition shadow-md text-sm md:text-base"
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Child
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:from-gray-700 hover:to-gray-800 transition shadow-md text-sm md:text-base"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        


        {/* Calendar View */}
        {activeView === 'calendar' && (
          <ChurchCalendar
            userRoles={userRoles}
            members={members}
            children={children}
            initialEvent={selectedEvent}
            onEventHandled={() => setSelectedEvent(null)}
          />
        )}

        {/* Attendance History View */}
        {activeView === 'attendance' && (
          <AttendanceSessions
            onSelectSession={(session) => {
              setSelectedEvent({
                id: session.eventId,
                title: session.title,
                start: new Date(session.eventDate),
                end: new Date(session.eventDate),
                type: session.eventType,
                time: session.eventTime,
                location: session.location,
                isHistory: true
              });
              // Ensure we are in a state that will show the modal
              // The Global Event Modal at the top of main will handle this
            }}
          />
        )}

        {/* Reports View */}
        {activeView === 'reports' && (
          <AttendanceReports members={members} children={children} />
        )}

        {/* Bulk SMS View */}
        {activeView === 'bulksms' && (
          <BulkSMSPanel members={members} />
        )}

        {/* Minutes of Meeting View */}
        {activeView === 'minutes' && (userRoles.includes('admin') || userRoles.includes('Executives')) && (
          <MinutesOfMeeting userRoles={userRoles} members={members} />
        )}

        {/* Children View */}
        {activeView === 'children' && (
          <>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 mb-6">
              <p className="text-gray-700">
                Children's Department Management.
                <span className="ml-2 text-gray-500">({children.length} children loaded)</span>
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-orange-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Total Children</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-800">{children.length}</p>
                  </div>
                  <Users className="w-8 h-8 md:w-10 md:h-10 text-orange-600 opacity-75" />
                </div>
              </div>
            </div>

            {/* Search Bar & Action Bar (Sticky) */}
            <div
              className="bg-white rounded-lg shadow-xl mb-6 p-4 sticky z-40 border-2 border-orange-100 ring-4 ring-white ring-opacity-50"
              style={{ top: `${headerHeight}px` }}
            >
              <div className="flex gap-3 md:gap-4 flex-wrap items-center">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, parent's name, or class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
                  />
                </div>

                {selectedChildIds.length > 0 && (
                  <div className="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
                    <span className="text-orange-800 font-bold">{selectedChildIds.length} selected</span>
                    <div className="flex gap-2">
                      {selectedChildIds.length === 1 && (
                        <button
                          onClick={() => {
                            const child = children.find(c => c._id === selectedChildIds[0]);
                            setViewingChild(child);
                          }}
                          className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 transition"
                          title="View Profile"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                      {selectedChildIds.length === 1 && (userRoles.includes('admin') || userRoles.includes('editor')) && (
                        <button
                          onClick={() => {
                            const child = children.find(c => c._id === selectedChildIds[0]);
                            handleChildEdit(child);
                          }}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition"
                          title="Edit Selected"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                        <button
                          onClick={handleBulkChildDelete}
                          className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition"
                          title="Delete Selected"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedChildIds([])}
                        className="text-gray-500 hover:text-gray-700 p-1.5"
                        title="Clear Selection"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => loadMembersData(true)}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:from-orange-700 hover:to-orange-800 transition text-sm md:text-base"
                >
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> Refresh
                </button>
              </div>
            </div>

            {/* Children Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-800 to-yellow-700 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                          checked={filteredChildren.length > 0 && selectedChildIds.length === filteredChildren.length}
                          onChange={toggleAllChildSelection}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">First Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Last Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Parent's Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Parent's Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date of Birth</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredChildren.map((child, index) => {
                      const isSelected = selectedChildIds.includes(child._id);
                      return (
                        <tr
                          key={child._id}
                          className={`${isSelected ? 'bg-orange-50' : 'hover:bg-orange-50'} transition-colors duration-200 cursor-pointer`}
                          onClick={() => toggleChildSelection(child._id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                              checked={isSelected}
                              onChange={() => toggleChildSelection(child._id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{child.firstName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{child.lastName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{child.parentsName || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {child.parentsPhoneNumber && (
                              <a href={`tel:${child.parentsPhoneNumber}`} className="flex items-center gap-1 text-green-600 hover:text-green-800" onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3 h-3" /> {child.parentsPhoneNumber}
                              </a>
                            )}
                            {!child.parentsPhoneNumber && '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{child.dateOfBirth || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {child.class && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {child.class}
                              </span>
                            )}
                            {!child.class && '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredChildren.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No children found</p>
                  <p className="text-sm">Click "Add Child" to get started.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Members View */}
        {activeView === 'members' && (
          <>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 mb-6">
              <p className="text-gray-700">
                Welcome, <span className="font-semibold">{currentUser?.username}</span>! 
                You are logged in as <span className="font-semibold text-purple-600">{userRoles.join(', ')}</span>.
                {members.length > 0 && <span className="ml-2 text-gray-500">({members.length} members loaded)</span>}
              </p>
            </div>
            
            {/* Upcoming Events Section */}
{(upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0 || upcomingEvents.length > 0) && (
  <div className="mb-8">
    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent mb-4 flex items-center gap-2">
      <CalendarIcon className="w-6 h-6 text-purple-600" />
      Upcoming Events & Celebrations (Next 30 Days)
    </h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Upcoming Church Events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-blue-500">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3">
            <h3 className="font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              📅 Upcoming Church Events ({upcomingEvents.length}) - Next 30 Days
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {upcomingEvents.map((event, idx) => {
              const daysUntil = getDaysUntilEvent(event.eventDate);
              return (
                <div
                  key={idx}
                  className="p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEvent({
                      id: event._id || event.id,
                      title: event.title,
                      start: new Date(event.eventDate),
                      end: new Date(event.eventDate),
                      desc: event.description,
                      type: event.eventType,
                      location: event.location,
                      time: event.eventTime,
                      isRecurring: event.isRecurring,
                      recurrence: event.recurrence
                    });
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getEventIcon(event.eventType)}</span>
                        <p className="font-semibold text-gray-900">{event.title}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>📅 {formatEventDate(event.eventDate)}</span>
                        {event.eventTime && <span>⏰ {event.eventTime}</span>}
                        {event.location && <span>📍 {event.location}</span>}
                      </p>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        daysUntil === 0 ? 'bg-green-100 text-green-800' :
                        daysUntil <= 7 ? 'bg-red-100 text-red-800' :
                        daysUntil <= 14 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {daysUntil === 0 ? '🎉 TODAY!' : `in ${daysUntil} days`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-pink-500">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-3">
            <h3 className="font-bold flex items-center gap-2">
              <Cake className="w-5 h-5" />
              🎂 Upcoming Birthdays ({upcomingBirthdays.length}) - Next 30 Days
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
                      {member.daysUntil === 0 ? '🎉 HAPPY BIRTHDAY!' : `in ${member.daysUntil} days`}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                      <Cake className="w-3 h-3" /> {member.eventDateFormatted}
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-purple-500">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-3">
            <h3 className="font-bold flex items-center gap-2">
              <Gift className="w-5 h-5" />
              💍 Upcoming Anniversaries ({upcomingAnniversaries.length}) - Next 30 Days
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
                      {member.daysUntil === 0 ? '🎉 HAPPY ANNIVERSARY!' : `in ${member.daysUntil} days`}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                      <Gift className="w-3 h-3" /> {member.eventDateFormatted}
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-blue-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Total Members</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-800">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-600 opacity-75" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-purple-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Foundation Class</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-800">{stats.foundationComplete}</p>
                  </div>
                  <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-purple-600 opacity-75" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-yellow-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Church Units</p>
                    <p className="text-2xl md:text-3xl font-bold text-yellow-800">{stats.uniqueUnits}</p>
                  </div>
                  <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-yellow-600 opacity-75" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg transition border-l-4 border-pink-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Married Members</p>
                    <p className="text-2xl md:text-3xl font-bold text-pink-800">{stats.married}</p>
                  </div>
                  <Heart className="w-8 h-8 md:w-10 md:h-10 text-pink-600 opacity-75" />
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && members.length === 0 && (
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg mb-4 text-center">
                Loading members from database...
              </div>
            )}

            {/* Search Bar & Action Bar (Sticky) */}
            <div
              className="bg-white rounded-lg shadow-xl mb-6 p-4 sticky z-40 border-2 border-blue-100 ring-4 ring-white ring-opacity-50"
              style={{ top: `${headerHeight}px` }}
            >
              <div className="flex gap-3 md:gap-4 flex-wrap items-center">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, phone number, or church unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  />
                </div>

                {selectedMemberIds.length > 0 && (
                  <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                    <span className="text-blue-800 font-bold">{selectedMemberIds.length} selected</span>
                    <div className="flex gap-2">
                      {selectedMemberIds.length === 1 && (
                        <button
                          onClick={() => {
                            const member = members.find(m => m._id === selectedMemberIds[0]);
                            setViewingMember(member);
                          }}
                          className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 transition"
                          title="View Profile"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                      {selectedMemberIds.length === 1 && (userRoles.includes('admin') || userRoles.includes('editor')) && (
                        <button
                          onClick={() => {
                            const member = members.find(m => m._id === selectedMemberIds[0]);
                            handleEdit(member);
                          }}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition"
                          title="Edit Selected"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                        <button
                          onClick={handleBroadcastSMS}
                          className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition"
                          title="Send Broadcast SMS"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {(userRoles.includes('admin') || userRoles.includes('editor')) && (
                        <button
                          onClick={handleBulkDelete}
                          className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition"
                          title="Delete Selected"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedMemberIds([])}
                        className="text-gray-500 hover:text-gray-700 p-1.5"
                        title="Clear Selection"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => loadMembersData(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition text-sm md:text-base"
                >
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> Refresh
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="text-xs text-gray-500 text-center py-1">← Scroll horizontally →</div>
                <div 
                  ref={topScrollBarRef}
                  className="overflow-x-auto"
                >
                  <div style={{ width: '1450px', height: '10px' }}></div>
                </div>
              </div>
              
              <div 
                ref={bottomScrollBarRef}
                className="overflow-x-auto"
              >
                <table className="min-w-[1450px] w-full">
                  <thead className="bg-gradient-to-r from-blue-800 via-purple-800 to-yellow-700 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left border-r border-blue-600">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length}
                          onChange={toggleAllSelection}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">First Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Last Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Gender</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">WhatsApp</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Date of Birth</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Marital Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Wedding Anniversary</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Occupation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-blue-600">Foundation Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Church Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMembers.map((member, index) => {
                      const isSelected = selectedMemberIds.includes(member._id);
                      return (
                        <tr
                          key={member._id}
                          className={`${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50'} transition-colors duration-200 cursor-pointer`}
                          onClick={() => toggleSelection(member._id)}
                        >
                          <td className="px-4 py-3 border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              checked={isSelected}
                              onChange={() => toggleSelection(member._id)}
                            />
                          </td>
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
                              <a href={`tel:${member.phoneNumber}`} className="flex items-center gap-1 text-green-600 hover:text-green-800" onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3 h-3" /> {member.phoneNumber}
                              </a>
                            )}
                            {!member.phoneNumber && '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                            {member.whatsappNumber && (
                              <a href={`https://wa.me/${member.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-800" onClick={(e) => e.stopPropagation()}>
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
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {member.churchUnit && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                                {member.churchUnit}
                              </span>
                            )}
                            {!member.churchUnit && '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredMembers.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No members found</p>
                  <p className="text-sm">Click "Add Member" to get started.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Member Profile Modal */}
      {viewingMember && (
        <MemberProfileModal
          member={viewingMember}
          onClose={() => setViewingMember(null)}
          userRoles={userRoles}
        />
      )}

      {/* Child Profile Modal */}
      {viewingChild && (
        <ChildProfileModal
          child={viewingChild}
          onClose={() => setViewingChild(null)}
          userRoles={userRoles}
        />
      )}

      {/* Add/Edit Member or Child Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-800 to-purple-800 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {activeView === 'children'
                  ? (editingChild ? '✏️ Edit Child' : '➕ Add New Child')
                  : (editingMember ? '✏️ Edit Member' : '➕ Add New Member')}
              </h2>
              <button onClick={() => { setIsFormOpen(false); activeView === 'children' ? resetChildForm() : resetForm(); }} className="text-white hover:text-yellow-200 text-3xl">×</button>
            </div>

            {activeView === 'children' ? (
              <form onSubmit={handleChildSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">First Name *</label>
                    <input type="text" value={childFormData.firstName} onChange={e => setChildFormData({...childFormData, firstName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Last Name *</label>
                    <input type="text" value={childFormData.lastName} onChange={e => setChildFormData({...childFormData, lastName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-blue-800">Select Parent(s) from Members</label>
                    <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {members.sort((a, b) => a.firstName.localeCompare(b.firstName)).map(member => (
                          <label key={member._id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={childFormData.parentIds.includes(member._id)}
                              onChange={(e) => {
                                let newParentIds = [...childFormData.parentIds];
                                if (e.target.checked) {
                                  newParentIds.push(member._id);
                                } else {
                                  newParentIds = newParentIds.filter(id => id !== member._id);
                                }

                                // Auto-populate names and phone numbers
                                const selectedParents = members.filter(m => newParentIds.includes(m._id));
                                const combinedNames = selectedParents.map(p => `${p.firstName} ${p.lastName}`).join(' & ');
                                const combinedPhones = selectedParents.map(p => p.phoneNumber).filter(ph => ph && ph !== '-').join(', ');

                                setChildFormData({
                                  ...childFormData,
                                  parentIds: newParentIds,
                                  parentsName: combinedNames || childFormData.parentsName,
                                  parentsPhoneNumber: combinedPhones || childFormData.parentsPhoneNumber
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 truncate">{member.firstName} {member.lastName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 italic">Optional: Selecting parents will auto-fill the fields below. You can still edit them manually.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Parent's Name(s)</label>
                    <input type="text" value={childFormData.parentsName} onChange={e => setChildFormData({...childFormData, parentsName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g. John & Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Parent's Phone Number(s)</label>
                    <input type="text" value={childFormData.parentsPhoneNumber} onChange={e => setChildFormData({...childFormData, parentsPhoneNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g. 08012345678, 07087654321" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Date of Birth</label>
                    <input type="text" value={childFormData.dateOfBirth} onChange={e => setChildFormData({...childFormData, dateOfBirth: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g., December 25" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Class</label>
                    <input type="text" value={childFormData.class} onChange={e => setChildFormData({...childFormData, class: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" placeholder="e.g., Sunday School 1" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md">{editingChild ? 'Update Child' : 'Save Child'}</button>
                  <button type="button" onClick={() => { setIsFormOpen(false); resetChildForm(); }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">First Name *</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Last Name *</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Email</label>
                    <input type="text" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Gender</label>
                    <input type="text" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Male/Female/Other" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Phone Number</label>
                    <input type="text" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">WhatsApp Number</label>
                    <input type="text" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Date of Birth</label>
                    <input type="text" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., December 25 or 25/12" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Marital Status</label>
                    <input type="text" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Single/Married/Divorced/Widowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Wedding Anniversary</label>
                    <input type="text" value={formData.weddingAnniversary} onChange={e => setFormData({...formData, weddingAnniversary: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., June 1 or 01/06" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-blue-800">Residential Address</label>
                    <input type="text" value={formData.residentialAddress} onChange={e => setFormData({...formData, residentialAddress: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Occupation</label>
                    <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-blue-800">Completed Foundation Class?</label>
                    <select value={formData.completedFoundationClass} onChange={e => setFormData({...formData, completedFoundationClass: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-blue-800">Church Unit</label>
                    <input type="text" placeholder="e.g., Choir, Ushering, Welfare" value={formData.churchUnit} onChange={e => setFormData({...formData, churchUnit: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-md">{editingMember ? 'Update Member' : 'Save Member'}</button>
                  <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-2xl font-bold">📤 Bulk Import Members</h2>
              <button onClick={() => setIsImportOpen(false)} className="text-white hover:text-yellow-200 text-3xl">×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-purple-800">Upload CSV File</label>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="w-full border border-gray-300 rounded-lg p-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-purple-800">Or Paste CSV Data</label>
                <p className="text-xs text-gray-500 mb-2">Format: First Name, Last Name, Email, Gender, Phone, WhatsApp, DOB, Marital Status, Anniversary, Address, Occupation, Foundation Class (Yes/No), Church Unit</p>
                <textarea rows="6" value={importData} onChange={(e) => setImportData(e.target.value)} placeholder="John,Doe,john@email.com,Male,1234567890,1234567890,December 25,Married,June 1,123 Main St,Engineer,Yes,Choir" className="w-full border border-gray-300 rounded-lg p-2 font-mono text-sm"></textarea>
              </div>
              <div className="flex gap-3">
                <button onClick={handleBulkImport} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition">Import Members</button>
                <button onClick={() => setIsImportOpen(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
