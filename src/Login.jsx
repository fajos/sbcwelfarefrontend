import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Church, Lock, User, LogIn } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('welfare_token', token);
      localStorage.setItem('welfare_user', JSON.stringify(user));
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      toast.success(`Welcome back, ${user.username}!`);
      
      // Call the onLogin callback
      if (onLogin) {
        onLogin(user);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-yellow-700 flex items-center justify-center px-4">
      <Toaster position="top-right" />
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-3 shadow-lg">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center">
              <img 
                src="/church-logo.png" 
                alt="Church Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.parentElement.innerHTML = '<Church className="w-12 h-12 text-blue-900" />';
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">C&S Saints Builder Church</h1>
          <p className="text-gray-500 mt-1">Welfare Management System</p>
          <div className="mt-4 h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Logging in...'
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Login
              </>
            )}
          </button>
        </form>
        
        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 text-center mt-2">
            Contact system administrator for access
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;