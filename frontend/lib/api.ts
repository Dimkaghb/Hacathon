// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

// Fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = tokenStorage.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }

    // Handle 401 - try refresh token
    if (response.status === 401 && tokenStorage.getRefreshToken()) {
      try {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry original request
          headers['Authorization'] = `Bearer ${tokenStorage.getAccessToken()}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      } catch {
        // Refresh failed, clear tokens
        tokenStorage.clearTokens();
      }
    }

    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Handle empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    // FastAPI expects refresh_token as form data or query parameter for simple str type
    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      tokenStorage.setTokens(data.access_token, data.refresh_token);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  tokenStorage.clearTokens();
  return false;
}

// Auth API
export const authApi = {
  register: async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; refresh_token: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; refresh_token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  logout: () => {
    tokenStorage.clearTokens();
  },

  getMe: async () => {
    return apiFetch<{ id: string; email: string; created_at: string }>(
      '/api/auth/me'
    );
  },
};

// Projects API
export const projectsApi = {
  list: async () => {
    return apiFetch<
      Array<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>
    >('/api/projects');
  },

  get: async (projectId: string) => {
    return apiFetch<{
      id: string;
      name: string;
      description: string | null;
      canvas_state: any;
      created_at: string;
      updated_at: string;
      nodes: any[];
      connections: any[];
    }>(`/api/projects/${projectId}`);
  },

  create: async (name: string, description?: string) => {
    return apiFetch<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  update: async (projectId: string, data: { name?: string; description?: string; canvas_state?: any }) => {
    return apiFetch<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (projectId: string) => {
    return apiFetch<void>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  // Sharing methods
  enableSharing: async (projectId: string) => {
    return apiFetch<{
      share_enabled: boolean;
      share_token: string | null;
      share_url: string | null;
    }>(`/api/projects/${projectId}/share`, {
      method: 'POST',
    });
  },

  disableSharing: async (projectId: string) => {
    return apiFetch<{
      share_enabled: boolean;
      share_token: string | null;
      share_url: string | null;
    }>(`/api/projects/${projectId}/share`, {
      method: 'DELETE',
    });
  },

  regenerateShareLink: async (projectId: string) => {
    return apiFetch<{
      share_enabled: boolean;
      share_token: string | null;
      share_url: string | null;
    }>(`/api/projects/${projectId}/share/regenerate`, {
      method: 'POST',
    });
  },

  getShareStatus: async (projectId: string) => {
    return apiFetch<{
      share_enabled: boolean;
      share_token: string | null;
      share_url: string | null;
    }>(`/api/projects/${projectId}/share`);
  },

  // Access shared project (no auth required)
  getShared: async (shareToken: string) => {
    return apiFetch<{
      id: string;
      name: string;
      description: string | null;
      canvas_state: any;
      share_enabled: boolean;
      created_at: string;
      updated_at: string;
      nodes: any[];
      connections: any[];
    }>(`/api/projects/shared/${shareToken}`);
  },
};

// Health check
export const healthApi = {
  check: async () => {
    return apiFetch<{ status: string }>('/health');
  },
};

// Helper to build URL with optional share token
const buildUrl = (path: string, shareToken?: string | null) => {
  if (shareToken) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}share=${shareToken}`;
  }
  return path;
};

// Nodes API
export const nodesApi = {
  list: async (projectId: string, shareToken?: string | null) => {
    return apiFetch<
      Array<{
        id: string;
        project_id: string;
        type: string;
        position_x: number;
        position_y: number;
        data: Record<string, any>;
        status: string;
        character_id?: string;
        error_message?: string;
        created_at: string;
        updated_at: string;
      }>
    >(buildUrl(`/api/projects/${projectId}/nodes`, shareToken));
  },

  get: async (projectId: string, nodeId: string, shareToken?: string | null) => {
    return apiFetch<{
      id: string;
      project_id: string;
      type: string;
      position_x: number;
      position_y: number;
      data: Record<string, any>;
      status: string;
      character_id?: string;
      error_message?: string;
      created_at: string;
      updated_at: string;
    }>(buildUrl(`/api/projects/${projectId}/nodes/${nodeId}`, shareToken));
  },

  create: async (projectId: string, nodeData: {
    type: string;
    position_x: number;
    position_y: number;
    data?: Record<string, any>;
    character_id?: string;
  }, shareToken?: string | null) => {
    return apiFetch<{
      id: string;
      project_id: string;
      type: string;
      position_x: number;
      position_y: number;
      data: Record<string, any>;
      status: string;
      created_at: string;
      updated_at: string;
    }>(buildUrl(`/api/projects/${projectId}/nodes`, shareToken), {
      method: 'POST',
      body: JSON.stringify(nodeData),
    });
  },

  update: async (projectId: string, nodeId: string, nodeData: {
    position_x?: number;
    position_y?: number;
    data?: Record<string, any>;
    character_id?: string;
  }, shareToken?: string | null) => {
    return apiFetch<{
      id: string;
      position_x: number;
      position_y: number;
      data: Record<string, any>;
      status: string;
    }>(buildUrl(`/api/projects/${projectId}/nodes/${nodeId}`, shareToken), {
      method: 'PUT',
      body: JSON.stringify(nodeData),
    });
  },

  delete: async (projectId: string, nodeId: string, shareToken?: string | null) => {
    return apiFetch<void>(buildUrl(`/api/projects/${projectId}/nodes/${nodeId}`, shareToken), {
      method: 'DELETE',
    });
  },
};

// Connections API
export const connectionsApi = {
  list: async (projectId: string, shareToken?: string | null) => {
    return apiFetch<
      Array<{
        id: string;
        project_id: string;
        source_node_id: string;
        target_node_id: string;
        source_handle?: string;
        target_handle?: string;
        created_at: string;
      }>
    >(buildUrl(`/api/projects/${projectId}/connections`, shareToken));
  },

  create: async (projectId: string, connectionData: {
    source_node_id: string;
    target_node_id: string;
    source_handle?: string;
    target_handle?: string;
  }, shareToken?: string | null) => {
    return apiFetch<{
      id: string;
      source_node_id: string;
      target_node_id: string;
      source_handle?: string;
      target_handle?: string;
    }>(buildUrl(`/api/projects/${projectId}/connections`, shareToken), {
      method: 'POST',
      body: JSON.stringify(connectionData),
    });
  },

  delete: async (projectId: string, connectionId: string, shareToken?: string | null) => {
    return apiFetch<void>(buildUrl(`/api/projects/${projectId}/connections/${connectionId}`, shareToken), {
      method: 'DELETE',
    });
  },
};

// Files API
export const filesApi = {
  uploadDirect: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = tokenStorage.getAccessToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/upload-direct`, {
        method: 'POST',
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          // Don't set Content-Type header - browser will set it with boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }
        throw new ApiError(response.status, response.statusText, errorData);
      }

      return response.json() as Promise<{
        file_id: string;
        url: string; // Signed download URL
        gcs_uri?: string; // GCS URI for reference
        object_name: string;
        filename: string | null;
        content_type: string | null;
        size: number;
      }>;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiError(
          0,
          'Network Error',
          {
            detail: `Cannot connect to backend at ${API_BASE_URL}. Please ensure the backend server is running.`,
            type: 'network_error',
            api_url: API_BASE_URL,
          }
        );
      }
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }
      // Wrap other errors
      throw new ApiError(0, 'Upload Failed', {
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        original_error: error,
      });
    }
  },
};

// AI/Video Generation API
export const aiApi = {
  generateVideo: async (request: {
    node_id: string;
    prompt: string;
    image_url?: string;
    character_id?: string;
    resolution?: string;
    aspect_ratio?: string;
    duration?: number;
    negative_prompt?: string;
  }) => {
    return apiFetch<{
      job_id: string;
      node_id: string;
      type: string;
      status: string;
      progress: number;
    }>('/api/ai/generate-video', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getJobStatus: async (jobId: string) => {
    return apiFetch<{
      job_id: string;
      node_id: string;
      type: string;
      status: string;
      progress: number;
      result?: Record<string, any>;
      error?: string;
      progress_message?: string;
      stage?: string;
    }>(`/api/ai/jobs/${jobId}`);
  },

  getLatestJobForNode: async (nodeId: string) => {
    return apiFetch<{
      job_id: string;
      node_id: string;
      type: string;
      status: string;
      progress: number;
      result?: Record<string, any>;
      error?: string;
      progress_message?: string;
      stage?: string;
    }>(`/api/ai/nodes/${nodeId}/jobs/latest`);
  },

  extendVideo: async (request: {
    node_id: string;
    video_url: string;
    prompt: string;
    veo_video_uri?: string;
    veo_video_name?: string;
    extension_count?: number;
  }) => {
    return apiFetch<{
      job_id: string;
      node_id: string;
      type: string;
      status: string;
      progress: number;
    }>('/api/ai/extend-video', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
