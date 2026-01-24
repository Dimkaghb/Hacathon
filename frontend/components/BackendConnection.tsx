"use client";

import { useEffect, useState } from 'react';
import { useHealthCheck, useProjects } from '@/lib/hooks/useApi';
import { useAuth as useAuthContext } from '@/lib/contexts/AuthContext';

export default function BackendConnection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { check, loading, error, status } = useHealthCheck();
  const { user } = useAuthContext();
  const { fetchProjects, projects, loading: projectsLoading } = useProjects();

  useEffect(() => {
    // Check backend health on mount
    check();
    
    // Fetch projects if user is authenticated
    if (user) {
      fetchProjects();
    }
  }, [check, user, fetchProjects]);

  const getStatusColor = () => {
    if (loading) return 'bg-yellow-500';
    if (status === 'healthy') return 'bg-green-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {isExpanded ? (
        <div className="bg-[#2a2a2a] p-4 rounded-lg shadow-lg border border-gray-700 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Debug Info
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
          
          {/* Health Status */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${getStatusColor()} ${
                  loading ? 'animate-pulse' : ''
                }`}
              />
              <span className="text-xs text-gray-400">
                {loading ? 'Checking...' : status || 'Disconnected'}
              </span>
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className="mb-3 p-2 bg-[#1a1a1a] rounded text-xs">
              <p className="text-gray-300">
                <strong>User:</strong> {user.email}
              </p>
            </div>
          )}

          {/* Projects Count */}
          {projects.length > 0 && (
            <div className="text-xs text-gray-400 mb-3">
              Projects: {projects.length}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              check();
              if (user) {
                fetchProjects();
              }
            }}
            disabled={loading}
            className="w-full text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-[#2a2a2a] p-2 rounded-lg shadow-lg border border-gray-700 hover:bg-[#333] transition-colors"
          title="Show debug info"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor()} ${
                loading ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-xs text-gray-400">Debug</span>
          </div>
        </button>
      )}
    </div>
  );
}
