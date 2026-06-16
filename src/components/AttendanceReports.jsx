import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, PieChart as PieChartIcon,
  Calendar, Download, RefreshCw, Filter, ChevronRight,
  UserCheck, MapPin, Clock, Award
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

function AttendanceReports() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [demographics, setDemographics] = useState(null);
  const [view, setView] = useState('trends'); // 'trends' or 'demographics'
  const [months, setMonths] = useState(6);

  useEffect(() => {
    fetchData();
  }, [months]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendsRes, demoRes] = await Promise.all([
        axios.get(`${API_URL}/reports/attendance-trends?months=${months}`, getAuthHeaders()),
        axios.get(`${API_URL}/reports/demographics`, getAuthHeaders())
      ]);

      // Format months for the chart
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Generating reports...</p>
      </div>
    );
  }

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

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border">
          <button
            onClick={() => setView('trends')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              view === 'trends' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Attendance Trends
          </button>
          <button
            onClick={() => setView('demographics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              view === 'demographics' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Member Insights
          </button>
        </div>
      </div>

      {view === 'trends' ? (
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
                  <Bar dataKey="totalAttendance" name="Total Attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg" name="Avg / Session" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demographic Charts */}
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
      )}
    </div>
  );
}

export default AttendanceReports;