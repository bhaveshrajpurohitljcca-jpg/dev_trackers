// API client service for React frontend

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  team: string | null;
  primary_team?: string | null;
  secondary_team?: string | null;
  is_active: boolean;
  created_date: string;
  weekly_target_hours?: number;
}


export interface Activity {
  id: number;
  user_id: number | null;
  user_name: string;
  activity_type: string;
  detail: string;
  created_at: string;
}

export interface DailyLog {
  id: number;
  user_id: number;
  date: string;
  category: 'Coding' | 'Learning' | 'Nothing Today';
  hours: number;
  minutes: number;
  description: string;
  created_at: string;
  user_name?: string;
}

export interface Topic {
  id: number;
  name: string;
  sequence_order: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface RoadmapTech {
  id: number;
  name: string;
  description: string | null;
  percentage: number;
  topics: Topic[];
}

export interface Technology {
  id: number;
  name: string;
  description: string | null;
  topics: { id: number; name: string; sequence_order: number; technology_id: number }[];
}

export interface ProjectLog {
  id: number;
  project_id: number;
  user_id: number;
  hours: number;
  minutes: number;
  description: string;
  logged_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  status: 'Active' | 'Completed' | 'Archived';
  start_date: string | null;
  end_date: string | null;
  github_url?: string | null;
  host_url?: string | null;
  hours_invested_hours: number;
  hours_invested_minutes: number;
  hours_invested: number;
  logs: ProjectLog[];
}

export interface LeaderboardUser {
  user_id: number;
  full_name: string;
  username: string;
  team: string | null;
  total_hours: number;
  weekly_hours: number;
  monthly_hours: number;
  current_streak: number;
  longest_streak: number;
}

// Achievements interface removed

export interface SystemSettings {
  id: number;
  daily_log_deadline: string;
  reminder_time: string;
  grace_period_minutes: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
}

export interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

// Message interface removed

// Request Interceptor Helper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Set default content type to JSON unless body is FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      // If we are not on the login page already, reload to force login redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || 'API request failed');
  }

  return res.json();
}

export const api = {
  // Auth API
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    return request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe(): Promise<User> {
    return request<User>('/users/me');
  },

  // Admin User Management
  async adminGetUsers(): Promise<User[]> {
    return request<User[]>('/admin/users');
  },

  async adminCreateUser(user: any): Promise<User> {
    return request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async adminUpdateUser(userId: number, user: any): Promise<User> {
    return request<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async adminDeleteUser(userId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async adminResetPassword(userId: number, password: string): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async adminGetUserProfile(userId: number, weekOffset: number = 0): Promise<any> {
    return request<any>(`/admin/users/${userId}/profile?week_offset=${weekOffset}`);
  },

  // Admin Roadmap/Tech Management
  async getTechnologies(): Promise<Technology[]> {
    return request<Technology[]>('/technologies');
  },

  async adminCreateTech(tech: any): Promise<Technology> {
    return request<Technology>('/admin/tech', {
      method: 'POST',
      body: JSON.stringify(tech),
    });
  },

  async adminUpdateTech(techId: number, tech: any): Promise<Technology> {
    return request<Technology>(`/admin/tech/${techId}`, {
      method: 'PUT',
      body: JSON.stringify(tech),
    });
  },

  async adminDeleteTech(techId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/tech/${techId}`, {
      method: 'DELETE',
    });
  },

  async adminAssignRoadmap(userId: number, techIds: number[]): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/users/${userId}/roadmap`, {
      method: 'POST',
      body: JSON.stringify({ tech_ids: techIds }),
    });
  },

  // Admin Settings & Email Logs
  async adminGetSettings(): Promise<SystemSettings> {
    return request<SystemSettings>('/admin/settings');
  },

  async adminUpdateSettings(settings: any): Promise<SystemSettings> {
    return request<SystemSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async adminGetEmailLogs(): Promise<EmailLog[]> {
    return request<EmailLog[]>('/admin/email-logs');
  },

  async adminDeleteEmailLogs(ids?: number[], deleteAll = false): Promise<{ detail: string }> {
    return request<{ detail: string }>('/admin/email-logs', {
      method: 'DELETE',
      body: JSON.stringify({ ids, delete_all: deleteAll }),
    });
  },

  // Work Logs
  async logWork(log: Omit<DailyLog, 'id' | 'user_id' | 'created_at'>): Promise<DailyLog> {
    return request<DailyLog>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  async getLogs(params: {
    userId?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<DailyLog[]> {
    let query = '';
    const queryParts: string[] = [];
    if (params.userId) queryParts.push(`user_id=${params.userId}`);
    if (params.category) queryParts.push(`category=${params.category}`);
    if (params.startDate) queryParts.push(`start_date=${params.startDate}`);
    if (params.endDate) queryParts.push(`end_date=${params.endDate}`);
    if (queryParts.length) query = '?' + queryParts.join('&');
    return request<DailyLog[]>(`/logs${query}`);
  },

  // Learning Roadmap Tracker
  async getRoadmap(): Promise<RoadmapTech[]> {
    return request<RoadmapTech[]>('/roadmap');
  },

  async completeTopic(topicId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/roadmap/topics/${topicId}/complete`, {
      method: 'POST',
    });
  },

  async uncompleteTopic(topicId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/roadmap/topics/${topicId}/uncomplete`, {
      method: 'DELETE',
    });
  },

  // Projects
  async createProject(project: any): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/projects');
  },

  async getProject(projectId: number): Promise<Project> {
    return request<Project>(`/projects/${projectId}`);
  },

  async logProjectHours(projectId: number, log: any): Promise<ProjectLog> {
    return request<ProjectLog>(`/projects/${projectId}/logs`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  async updateProject(projectId: number, project: any): Promise<Project> {
    return request<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  },

  async deleteProject(projectId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  // Leaderboard & Achievements
  async getLeaderboard(): Promise<LeaderboardUser[]> {
    return request<LeaderboardUser[]>('/leaderboard');
  },

  // Achievements method removed

  // Activities Feed
  async getActivities(): Promise<Activity[]> {
    return request<Activity[]>('/activities');
  },

  // Dashboard Summaries
  async getUserDashboard(): Promise<any> {
    return request<any>('/dashboard');
  },

  async adminGetDashboard(weekOffset: number = 0): Promise<any> {
    return request<any>(`/admin/dashboard?week_offset=${weekOffset}`);
  },

  async adminGetPerformance(weekOffset: number = 0, perfDate?: string): Promise<any> {
    let url = `/admin/performance?week_offset=${weekOffset}`;
    if (perfDate) {
      url += `&perf_date=${perfDate}`;
    }
    return request<any>(url);
  },

  // Email Reminders Triggers
  async triggerReminders(): Promise<{ detail: string }> {
    return request<{ detail: string }>('/notifications/reminder', { method: 'POST' });
  },

  async triggerDeadlineCheck(): Promise<{ detail: string }> {
    return request<{ detail: string }>('/notifications/deadline-check', { method: 'POST' });
  },

  async triggerBroadcast(subject: string, body: string): Promise<{ detail: string }> {
    return request<{ detail: string }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ subject, body }),
    });
  },

  // Messaging methods removed
};
