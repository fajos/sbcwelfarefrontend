import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, PieChart as PieChartIcon,
  Calendar, Download, RefreshCw, Filter, ChevronRight,
  UserCheck, MapPin, Award, Search, ArrowLeft, FileText, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('welfare_token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

function AttendanceReports({ members = [], children = [] }) {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [demographics, setDemographics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState({});
  const [childSessionAttendance, setChildSessionAttendance] = useState({});
  const [view, setView] = useState('trends'); // 'trends', 'demographics', or 'services'
  const [months, setMonths] = useState(6);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'present', 'absent'
  const [demographicTab, setDemographicTab] = useState('members'); // 'members', 'children'
  const [serviceReportTab, setServiceReportTab] = useState('members'); // 'members', 'children'

  useEffect(() => {
    fetchData();
    fetchSessions();
  }, [months]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendsRes, demoRes] = await Promise.all([
        axios.get(`${API_URL}/reports/attendance-trends?months=${months}`, getAuthHeaders()),
        axios.get(`${API_URL}/reports/demographics`, getAuthHeaders())
      ]);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedTrends = trendsRes.data.map(item => ({
        ...item,
        name: `${monthNames[item.month - 1]} ${item.year}`,
        avg: Math.round(item.avgAttendance * 10) / 10
      }));

      setTrends(formattedTrends);
      setDemographics(demoRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendance/sessions`, getAuthHeaders());
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchSessionDetails = async (session) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/attendance?eventId=${session.eventId}&eventDate=${session.eventDate}`,
        getAuthHeaders()
      );
      const attendanceMap = {};
      const childAttendanceMap = {};
      response.data.forEach(record => {
        if (record.member) {
          const memberId = record.member._id || record.member;
          attendanceMap[memberId] = record.status;
        } else if (record.child) {
          const childId = record.child._id || record.child;
          childAttendanceMap[childId] = record.status;
        }
      });
      setSessionAttendance(attendanceMap);
      setChildSessionAttendance(childAttendanceMap);
      setSelectedSession(session);
      setView('services');
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const exportServiceReport = () => {
    if (!selectedSession) return;

    let headers, csvData, fileName;

    if (serviceReportTab === 'members') {
      headers = ['First Name', 'Last Name', 'Church Unit', 'Status'];
      csvData = members.map(m => [
        m.firstName,
        m.lastName,
        m.churchUnit || 'N/A',
        sessionAttendance[m._id] === 'present' ? 'Present' : 'Absent'
      ]);
      fileName = `Attendance_Members_${selectedSession.title}_${new Date(selectedSession.eventDate).toLocaleDateString()}.csv`;
    } else {
      headers = ['First Name', 'Last Name', 'Parent Name', 'Parent Phone', 'Class', 'Status'];
      csvData = children.map(c => [
        c.firstName,
        c.lastName,
        c.parentsName || 'N/A',
        c.parentsPhoneNumber || 'N/A',
        c.class || 'N/A',
        childSessionAttendance[c._id] === 'present' ? 'Present' : 'Absent'
      ]);
      fileName = `Attendance_Children_${selectedSession.title}_${new Date(selectedSession.eventDate).toLocaleDateString()}.csv`;
    }

    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !selectedSession && view !== 'services') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Generating reports...</p>
      </div>
    );
  }

  const filteredServiceMembers = members.filter(m => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const status = sessionAttendance[m._id] === 'present' ? 'present' : 'absent';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredServiceChildren = children.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const status = childSessionAttendance[c._id] === 'present' ? 'present' : 'absent';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Attendance & Insights
          </h2>
          <p className="text-gray-500">Analyze church growth and member participation</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
          <button
            onClick={() => { setView('trends'); setSelectedSession(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              view === 'trends' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Attendance Trends
          </button>
          <button
            onClick={() => { setView('demographics'); setSelectedSession(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              view === 'demographics' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setView('services')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              view === 'services' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Service Reports
          </button>
        </div>
      </div>

      {view === 'trends' && (
        <div className="space-y-6">
          {/* Trends Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Overall</span>
              </div>
              <p className="text-gray-500 text-sm mb-1">Total Attendance</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {trends.reduce((acc, curr) => acc + curr.totalAttendance, 0).toLocaleString()}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Avg / Service</span>
              </div>
              <p className="text-gray-500 text-sm mb-1">Average Attendance</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {trends.length > 0
                  ? Math.round(trends.reduce((acc, curr) => acc + curr.avg, 0) / trends.length)
                  : 0}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Growth</span>
              </div>
              <p className="text-gray-500 text-sm mb-1">Sessions Tracked</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {trends.reduce((acc, curr) => acc + curr.sessionsCount, 0)}
              </h3>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-blue-500" />
                Monthly Attendance Pattern
              </h3>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>Last 3 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
              </select>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="memberAttendance" name="Members" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="childAttendance" name="Children" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg" name="Avg / Session" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {view === 'demographics' && demographics && (
        <div className="space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setDemographicTab('members')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${demographicTab === 'members' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Members
            </button>
            <button
              onClick={() => setDemographicTab('children')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${demographicTab === 'children' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Children
            </button>
          </div>

          {demographicTab === 'members' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Gender Distribution
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographics.genderStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="_id"
                        label={({_id, percent}) => `${_id || 'Unknown'}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {demographics.genderStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  Foundation Class Status
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographics.foundationClassStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="_id"
                        label={({_id, percent}) => `${_id}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {demographics.foundationClassStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#10b981', '#ef4444', '#94a3b8'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Church Units Distribution
                </h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographics.unitStats.filter(u => u._id)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="_id"
                        type="category"
                        width={150}
                        axisLine={false}
                        tickLine={false}
                        tick={{fill: '#64748b', fontSize: 12}}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="count" name="Members" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  Children Classes Distribution
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographics.childClassStats.filter(u => u._id)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="count" name="Children" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'services' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedSession ? (
            <div className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Select a Service for Detailed Report
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session, idx) => (
                  <div
                    key={idx}
                    onClick={() => fetchSessionDetails(session)}
                    className="p-4 border rounded-xl hover:bg-blue-50 cursor-pointer transition group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
                        {session.eventType}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition" />
                    </div>
                    <h4 className="font-bold text-gray-800 mb-1">{session.title}</h4>
                    <p className="text-sm text-gray-500 mb-2">{format(new Date(session.eventDate), 'PPP')}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Users className="w-3 h-3" />
                      {session.presentCount} Total Present
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="p-6 border-b bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setSelectedSession(null); setSessionAttendance({}); setChildSessionAttendance({}); }}
                    className="p-2 hover:bg-white rounded-full transition shadow-sm border border-transparent hover:border-gray-200"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedSession.title}</h3>
                    <p className="text-sm text-gray-500">{format(new Date(selectedSession.eventDate), 'PPP')} • Detailed Report</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportServiceReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm text-sm font-bold"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-b bg-white">
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setServiceReportTab('members')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${serviceReportTab === 'members' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Members
                  </button>
                  <button
                    onClick={() => setServiceReportTab('children')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${serviceReportTab === 'children' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Children
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white border-b flex flex-wrap gap-4 items-center justify-between">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    All ({serviceReportTab === 'members' ? members.length : children.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('present')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === 'present' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                  >
                    Present ({serviceReportTab === 'members' ? Object.values(sessionAttendance).filter(v => v === 'present').length : Object.values(childSessionAttendance).filter(v => v === 'present').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('absent')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === 'absent' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                  >
                    Absent ({serviceReportTab === 'members' ? (members.length - Object.values(sessionAttendance).filter(v => v === 'present').length) : (children.length - Object.values(childSessionAttendance).filter(v => v === 'present').length)})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    {serviceReportTab === 'members' ? (
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Member Name</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Church Unit</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Child Name</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Parent/Class</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {serviceReportTab === 'members' ? (
                      filteredServiceMembers.map(m => (
                        <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{m.firstName} {m.lastName}</div>
                            <div className="text-xs text-gray-500">{m.phoneNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            {m.churchUnit ? (
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium border border-indigo-100">
                                {m.churchUnit}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {sessionAttendance[m._id] === 'present' ? (
                              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredServiceChildren.map(c => (
                        <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{c.firstName} {c.lastName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{c.parentsName}</div>
                            <div className="text-xs text-gray-500">{c.class || 'No Class'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {childSessionAttendance[c._id] === 'present' ? (
                              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {((serviceReportTab === 'members' && filteredServiceMembers.length === 0) || (serviceReportTab === 'children' && filteredServiceChildren.length === 0)) && (
                  <div className="py-20 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No results found matching your filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AttendanceReports;