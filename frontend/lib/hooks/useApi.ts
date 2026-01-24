"use client";

import { useState, useCallback } from 'react';
import { authApi, healthApi, projectsApi, ApiError } from '../api';

// Health check hook
export function useHealthCheck() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthApi.check();
      setStatus(result.status);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to connect to backend');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { check, loading, error, status };
}

// Auth hook
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.login(email, password);
      const me = await authApi.getMe();
      setUser(me);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || err.message);
      } else {
        setError('Login failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.register(email, password);
      const me = await authApi.getMe();
      setUser(me);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || err.message);
      } else {
        setError('Registration failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const getMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || err.message);
      } else {
        setError('Failed to get user info');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, register, logout, getMe, loading, error, user };
}

// Projects hook
export function useProjects() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list();
      setProjects(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || err.message);
      } else {
        setError('Failed to fetch projects');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, description?: string) => {
    setLoading(true);
    setError(null);
    try {
      const project = await projectsApi.create(name, description);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || err.message);
      } else {
        setError('Failed to create project');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchProjects, createProject, projects, loading, error };
}
