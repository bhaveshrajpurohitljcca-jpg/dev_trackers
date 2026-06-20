import React, { useState, useEffect, useMemo } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation,
  Link
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  LogOut, 
  Calendar, 
  Award, 
  Users, 
  Settings as SettingsIcon, 
  Trophy, 
  CheckCircle2, 
  FolderGit2, 
  Plus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Clock, 
  X, 
  Flame, 
  BookOpen, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  Check, 
  ChevronRight,
  Eye,
  EyeOff,
  TrendingUp,
  ShieldCheck,
  CalendarDays,
  Sliders
} from 'lucide-react';
import { api } from './services/api';
import type { User, DailyLog, RoadmapTech, Technology, Project, LeaderboardUser, EmailLog } from './services/api';
import { SUGGESTED_PROJECTS } from './data/suggestedProjects';

// ============================================================================
// CONTEXT / STATE PROVIDER
// ============================================================================

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (err) {
      setUser(null);
      localStorage.removeItem('access_token');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (u: string, p: string) => {
    setLoading(true);
    try {
      const data = await api.login(u, p);
      localStorage.setItem('access_token', data.access_token);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const value = { user, loading, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// ROUTING HELPERS
// ============================================================================

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (!adminOnly && user.role === 'admin' && location.pathname !== '/profile' && location.pathname !== '/gallery') return <Navigate to="/admin/dashboard" replace />;

  return <>{children}</>;
}

// ============================================================================
// COMMON SUB-COMPONENTS
// ============================================================================

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

// Custom Toast System Hook
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showSuccess = (msg: string) => setToast({ message: msg, type: 'success' });
  const showError = (msg: string) => setToast({ message: msg, type: 'error' });
  const close = () => setToast(null);

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={close} />
  ) : null;

  return { showSuccess, showError, ToastComponent };
}

// ============================================================================
// LAYOUT & NAVIGATION
// ============================================================================

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <BookOpen size={24} />
        <span>DevTracker</span>
      </div>

      <nav className="sidebar-nav">
        {user.role === 'admin' ? (
          <>
            <Link to="/admin/dashboard" className={`sidebar-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Admin Dash</span>
            </Link>
            <div style={{ margin: '1.5rem 0 0.5rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Admin Panel
            </div>
            <Link to="/admin/users" className={`sidebar-link ${location.pathname === '/admin/users' ? 'active' : ''}`}>
              <Users size={18} />
              <span>Users</span>
            </Link>
            <Link to="/admin/performance" className={`sidebar-link ${location.pathname === '/admin/performance' ? 'active' : ''}`}>
              <TrendingUp size={18} />
              <span>Performance</span>
            </Link>
             <Link to="/admin/roadmaps" className={`sidebar-link ${location.pathname === '/admin/roadmaps' ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>Roadmaps</span>
            </Link>
            <Link to="/admin/settings" className={`sidebar-link ${location.pathname === '/admin/settings' ? 'active' : ''}`}>
              <SettingsIcon size={18} />
              <span>Settings</span>
            </Link>
            <Link to="/gallery" className={`sidebar-link ${location.pathname === '/gallery' ? 'active' : ''}`}>
              <Award size={18} />
              <span>Showcase Gallery</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/logs" className={`sidebar-link ${location.pathname === '/logs' ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Work Logs</span>
            </Link>
            <Link to="/roadmap" className={`sidebar-link ${location.pathname === '/roadmap' ? 'active' : ''}`}>
              <CheckCircle2 size={18} />
              <span>Roadmaps</span>
            </Link>
            <Link to="/projects" className={`sidebar-link ${location.pathname.startsWith('/projects') ? 'active' : ''}`}>
              <FolderGit2 size={18} />
              <span>Projects</span>
            </Link>
            <Link to="/leaderboard" className={`sidebar-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
              <Trophy size={18} />
              <span>Leaderboard</span>
            </Link>
            <Link to="/gallery" className={`sidebar-link ${location.pathname === '/gallery' ? 'active' : ''}`}>
              <Award size={18} />
              <span>Showcase Gallery</span>
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
        </Link>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

const toLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatHours = (hours: number | undefined | null, minutes?: number) => {
  if (hours === undefined || hours === null || isNaN(hours)) return '0 hrs';
  
  if (minutes === undefined) {
    if (hours % 1 !== 0) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      if (h === 0 && m === 0) return '0 hrs';
      if (h === 0) return `${m} mins`;
      if (m === 0) return `${h} hrs`;
      return `${h}h ${m}m`;
    } else {
      return `${hours} hrs`;
    }
  }
  
  if (hours === 0 && minutes === 0) return '0 hrs';
  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours}h ${minutes}m`;
};

// ============================================================================
// COMPONENT: HEATMAP (GITHUB STYLE)
// ============================================================================

function HeatmapCalendar({ logs }: { logs: Record<string, number> }) {
  const monthsData = useMemo(() => {
    const groups: { monthName: string; days: any[] }[] = [];
    const today = new Date();
    
    // Go back 30 days (1 month)
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toLocalDateString(d);
      const hours = logs[dateStr] || 0;
      
      const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      let group = groups.find(g => g.monthName === monthName);
      if (!group) {
        group = { monthName, days: [] };
        groups.push(group);
      }
      group.days.push({ date: dateStr, hours, dayVal: d.getDate(), dayOfWeek: d.getDay() });
    }
    
    // Pad each month's array so it starts on the correct day of the week column (S M T W T F S)
    return groups.map(group => {
      const firstDay = group.days[0];
      const padding = [];
      for (let p = 0; p < firstDay.dayOfWeek; p++) {
        padding.push({ isPadding: true });
      }
      return {
        monthName: group.monthName,
        days: [...padding, ...group.days]
      };
    });
  }, [logs]);

  const getLevel = (hours: number) => {
    if (hours === 0) return 'level-0';
    if (hours <= 2) return 'level-1';
    if (hours <= 4) return 'level-2';
    if (hours <= 6) return 'level-3';
    return 'level-4';
  };

  return (
    <div className="glass-card section-card">
      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CalendarDays size={18} /> Contribution Calendar
      </h3>
      <div className="heatmap-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '240px' }}>
          {monthsData.map((month) => (
            <div key={month.monthName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '4px' }}>
                {month.monthName}
              </div>
              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 28px)', gap: '6px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 28px)', gap: '6px' }}>
                {month.days.map((d: any, idx: number) => {
                  if (d.isPadding) {
                    return <div key={`pad-${idx}`} style={{ width: '28px', height: '28px' }} />;
                  }
                  return (
                    <div 
                      key={d.date} 
                      className={`heatmap-cell ${getLevel(d.hours)}`} 
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: d.hours > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                        cursor: 'default'
                      }}
                      title={`${d.date}: ${formatHours(d.hours)} logged`}
                    >
                      {d.dayVal}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="heatmap-legend" style={{ gap: '6px', marginTop: '0.5rem', width: '100%', maxWidth: '232px', justifyContent: 'center' }}>
          <span>Less</span>
          <div className="heatmap-legend-cell level-0" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <div className="heatmap-legend-cell level-1" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <div className="heatmap-legend-cell level-2" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <div className="heatmap-legend-cell level-3" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <div className="heatmap-legend-cell level-4" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: DYNAMIC SVG CATEGORY BAR CHART
// ============================================================================

function CategoryChart({ coding, learning }: { coding: number, learning: number }) {
  const data = [
    { label: 'Coding', value: coding, color: 'var(--color-primary)' },
    { label: 'Learning', value: learning, color: 'var(--color-secondary)' },
  ];

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="glass-card section-card">
      <h3 className="section-title">
        <TrendingUp size={18} /> Work Category Breakdown (Hours)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        {data.map(item => {
          const percentage = (item.value / maxVal) * 100;
          return (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatHours(item.value)}</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    backgroundColor: item.color, 
                    borderRadius: '10px',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 0 8px ${item.color}`
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE: LOGIN
// ============================================================================

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username, password);
      // Wait for auth context to update and redirect
      // Fetch profile to redirect admin vs user
      const u = await api.getMe();
      if (u.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(from);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials or deactivated account');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box glass-card">
        <div className="login-header">
          <div className="login-logo">
            <BookOpen size={32} />
            <span>DevTracker</span>
          </div>
          <p className="login-subtitle">Sign in to track your progress & hours</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', padding: '0.75rem', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                id="username"
                className="form-input" 
                style={{ paddingLeft: '2.5rem' }}
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                id="password"
                className="form-input" 
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '45px' }} type="submit" disabled={loading}>
            {loading ? <div className="spinner-small"></div> : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE: USER DASHBOARD
// ============================================================================

export function UserDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { ToastComponent } = useToast();

  const fetchDashboard = async () => {
    try {
      const dbData = await api.getUserDashboard();
      setData(dbData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '2.5rem 2rem', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)', 
        borderRadius: '20px', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '800', 
            margin: 0, 
            background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Let's Do It Together.
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem', fontWeight: 500 }}>
            Welcome back, {data?.full_name}! Here is your learning and coding progress overview.
          </p>
        </div>
        <div>
          {data?.logged_today ? (
            <div className="badge badge-active" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}>
              <CheckCircle2 size={16} /> Logged Today
            </div>
          ) : (
            <div className="badge badge-other" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <AlertCircle size={16} /> Pending Log
            </div>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="dash-grid-stats">
        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Current Streak</span>
            <div className="stat-icon" style={{ color: 'var(--color-primary)' }}><Flame size={18} /></div>
          </div>
          <span className="stat-value">{data?.current_streak} days</span>
          <span className="stat-desc">Log daily to increase</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Hours Submitted (Today)</span>
            <div className="stat-icon" style={{ color: 'var(--color-secondary)' }}><Clock size={18} /></div>
          </div>
          <span className="stat-value">{formatHours(data?.today_hours)}</span>
          <span className="stat-desc">Coding: {formatHours(data?.today_coding_hours)} | Learning: {formatHours(data?.today_learning_hours)}</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Hours</span>
            <div className="stat-icon" style={{ color: 'var(--color-success)' }}><Clock size={18} /></div>
          </div>
          <span className="stat-value">{formatHours(data?.total_hours)}</span>
          <span className="stat-desc">Accumulated time</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Weekly / Monthly</span>
            <div className="stat-icon" style={{ color: 'var(--color-accent)' }}><Calendar size={18} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem' }}>
            {formatHours(data?.weekly_hours)} / {formatHours(data?.monthly_hours)}
          </span>
          <span className="stat-desc">Weekly vs Monthly hours</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Completed Topics</span>
            <div className="stat-icon" style={{ color: 'var(--color-secondary)' }}><CheckCircle2 size={18} /></div>
          </div>
          <span className="stat-value">{data?.completed_topics}</span>
          <span className="stat-desc">Roadmap checkpoints</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Current Rank</span>
            <div className="stat-icon" style={{ color: 'var(--color-warning)' }}><Trophy size={18} /></div>
          </div>
          <span className="stat-value">#{data?.rank}</span>
          <span className="stat-desc">Team leaderboard standing</span>
        </div>
      </div>

      <div className="dash-grid-details">
        {/* Left Column */}
        <div>
          {/* Heatmap */}
          <HeatmapCalendar logs={data?.heatmap || {}} />

          {/* Progress Chart */}
          <CategoryChart 
            coding={data?.coding_hours || 0}
            learning={data?.learning_hours || 0}
          />
        </div>

        {/* Right Column */}
        <div>
          {/* Upcoming Deadline Widget */}
          <div className="glass-card section-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h3 className="section-title" style={{ border: 'none', padding: '0', marginBottom: '0.75rem' }}>
              Deadline Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Daily Log Deadline:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{data?.deadline_time} PM</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Please log your daily work hours before the deadline to secure your logging streak.
              </p>
              {data?.logged_today ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  <ShieldCheck size={18} />
                  <span>Log Submitted! Streak Safe.</span>
                </div>
              ) : (
                <Link to="/logs" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Submit Log Now
                </Link>
              )}
            </div>
          </div>

          {/* Weekly Work Target Widget */}
          <div className="glass-card section-card" style={{ borderLeft: `4px solid ${data?.weekly_work_hours >= (data?.weekly_target_hours || 10) ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
            <h3 className="section-title" style={{ border: 'none', padding: '0', marginBottom: '0.75rem' }}>
              Weekly Work Target
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Hours Logged (Coding & Learning):</span>
                <strong>{formatHours(data?.weekly_work_hours)} / {data?.weekly_target_hours || 10} hrs</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', margin: '0.25rem 0' }}>
                <div 
                  style={{ 
                    width: `${Math.min((data?.weekly_work_hours / (data?.weekly_target_hours || 10)) * 100, 100)}%`, 
                    height: '100%', 
                    backgroundColor: data?.weekly_work_hours >= (data?.weekly_target_hours || 10) ? 'var(--color-success)' : 'var(--color-warning)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              {data?.weekly_work_hours >= (data?.weekly_target_hours || 10) ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>Target Met! Excellent work this week.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
                  <span>Need {formatHours(Math.max(0, (data?.weekly_target_hours || 10) - data?.weekly_work_hours))} more to reach the {data?.weekly_target_hours || 10}hr target.</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Progress bar */}
          <div className="glass-card section-card">
            <h3 className="section-title">Roadmap Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Overall Completion:</span>
                <strong>{data?.progress_percentage}%</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${data?.progress_percentage}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--color-secondary)',
                    borderRadius: '10px'
                  }} 
                />
              </div>
              <Link to="/roadmap" style={{ color: 'var(--color-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>
                View assigned technologies <ChevronRight size={14} />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: ADMIN DASHBOARD
// ============================================================================

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const { showSuccess, showError, ToastComponent } = useToast();

  const fetchDashboard = async (offset = weekOffset) => {
    try {
      const dbData = await api.adminGetDashboard(offset);
      setData(dbData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboard(weekOffset);
  }, [weekOffset]);

  const handleTriggerReminders = async () => {
    setTriggering('reminder');
    try {
      const res = await api.triggerReminders();
      showSuccess(res.detail);
      fetchDashboard(weekOffset);
    } catch (err: any) {
      showError(err.message || 'Failed to trigger reminders');
    } finally {
      setTriggering(null);
    }
  };

  const handleTriggerDeadlineCheck = async () => {
    setTriggering('deadline');
    try {
      const res = await api.triggerDeadlineCheck();
      showSuccess(res.detail);
      fetchDashboard(weekOffset);
    } catch (err: any) {
      showError(err.message || 'Failed to trigger deadline audit');
    } finally {
      setTriggering(null);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '2.5rem 2rem', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)', 
        borderRadius: '20px', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '800', 
            margin: 0, 
            background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Let's Do It Together.
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem', fontWeight: 500 }}>
            Admin Control Panel — Monitor activity, send notifications, and configure global system rules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Week:</span>
            <select
              value={weekOffset}
              onChange={(e) => setWeekOffset(parseInt(e.target.value))}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.6rem 1.2rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={0} style={{ background: '#1e1b4b' }}>Current Week</option>
              <option value={1} style={{ background: '#1e1b4b' }}>1 Week Ago</option>
              <option value={2} style={{ background: '#1e1b4b' }}>2 Weeks Ago</option>
              <option value={3} style={{ background: '#1e1b4b' }}>3 Weeks Ago</option>
              <option value={4} style={{ background: '#1e1b4b' }}>4 Weeks Ago</option>
            </select>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleTriggerReminders}
            disabled={triggering !== null}
            style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
          >
            {triggering === 'reminder' ? 'Sending...' : 'Send Reminders'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleTriggerDeadlineCheck}
            disabled={triggering !== null}
            style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
          >
            {triggering === 'deadline' ? 'Auditing...' : 'Check Deadlines'}
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="dash-grid-stats">
        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Developers</span>
            <div className="stat-icon" style={{ color: 'var(--color-primary)' }}><Users size={18} /></div>
          </div>
          <span className="stat-value">{data?.active_users} / {data?.total_users}</span>
          <span className="stat-desc">Active vs Total users</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Today's Logs Status</span>
            <div className="stat-icon" style={{ color: 'var(--color-success)' }}><CheckCircle2 size={18} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem' }}>
            {data?.today_submitted_logs} Submitted / {data?.today_missing_logs} Missing
          </span>
          <span className="stat-desc">Work logs audit for today</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Team Hours</span>
            <div className="stat-icon" style={{ color: 'var(--color-secondary)' }}><Clock size={18} /></div>
          </div>
          <span className="stat-value">{formatHours(data?.total_team_hours)}</span>
          <span className="stat-desc">All developers combined</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Weekly Team Hours</span>
            <div className="stat-icon" style={{ color: 'var(--color-accent)' }}><TrendingUp size={18} /></div>
          </div>
          <span className="stat-value">{formatHours(data?.weekly_team_hours)}</span>
          <span className="stat-desc">Current calendar week</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Longest Active Streak</span>
            <div className="stat-icon" style={{ color: 'var(--color-warning)' }}><Flame size={18} /></div>
          </div>
          <span className="stat-value">{data?.longest_streak_value} days</span>
          <span className="stat-desc">{data?.longest_streak_name}</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Most Active Developer</span>
            <div className="stat-icon" style={{ color: 'var(--color-primary)' }}><Award size={18} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data?.most_active_name}
          </span>
          <span className="stat-desc">{data?.most_active_count} total entries logged</span>
        </div>
      </div>

      <div className="dash-grid-details">
        {/* Left Column */}
        <div>
          {/* Top Performers Card */}
          <div className="glass-card section-card">
            <h3 className="section-title">
              <Trophy size={18} /> Top Performers (Total Hours)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {data?.top_performers?.length > 0 ? (
                data.top_performers.map((perf: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="user-avatar" style={{ 
                        width: '32px', 
                        height: '32px', 
                        fontSize: '0.8rem',
                        background: idx === 0 ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : idx === 1 ? 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)' : 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' 
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontWeight: 600 }}>{perf.name}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700 }}>{formatHours(perf.hours)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: '1rem 0' }}>
                  <p>No performer stats yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Missing Logs Widget */}
          <div className="glass-card section-card">
            <h3 className="section-title">
              <AlertCircle size={18} /> Today's Missing Logs
            </h3>
            <div style={{ marginTop: '0.5rem' }}>
              {data?.today_missing_names?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.today_missing_names.map((name: string) => (
                    <span key={name} className="badge badge-other" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', textTransform: 'none' }}>
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <CheckCircle2 size={16} /> All developers have logged today!
                </div>
              )}
            </div>
          </div>

          {/* Weekly Target Progress Widget */}
          <div className="glass-card section-card">
            <h3 className="section-title">
              <Calendar size={18} /> Weekly Target Progress (Coding & Learning)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {data?.user_weekly_progress?.length > 0 ? (
                data.user_weekly_progress.map((userProg: any, idx: number) => {
                  const targetHours = userProg.weekly_target_hours || 10;
                  const metTarget = userProg.weekly_work_hours >= targetHours;
                  return (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{userProg.full_name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {formatHours(userProg.weekly_work_hours)} / {targetHours} hrs
                          </span>
                          <span className={`badge ${metTarget ? 'badge-active' : 'badge-other'}`} style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.15rem 0.4rem',
                            backgroundColor: metTarget ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: metTarget ? 'var(--color-success)' : 'var(--color-warning)',
                            border: metTarget ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                            textTransform: 'none'
                          }}>
                            {metTarget ? 'Target Met' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${Math.min((userProg.weekly_work_hours / targetHours) * 100, 100)}%`, 
                            height: '100%', 
                            backgroundColor: metTarget ? 'var(--color-success)' : 'var(--color-warning)',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state" style={{ padding: '1rem 0' }}>
                  <p>No user progress data available.</p>
                </div>
              )}
            </div>
          </div>
        </div>


      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: WORK LOGS
// ============================================================================

export function WorkLogs() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError, ToastComponent } = useToast();

  // Form states
  const [category, setCategory] = useState<'Coding' | 'Learning' | 'Nothing Today'>('Coding');
  const [logHours, setLogHours] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [description, setDescription] = useState('');

  // Filters (None, we removed them)
  const fetchLogs = async () => {
    try {
      const data = await api.getLogs({});
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isNothingToday = category === 'Nothing Today';
    
    if (!isNothingToday && (!logHours || !logMinutes || !description.trim())) {
      showError('Please enter hours, minutes, and description');
      return;
    }
    
    let hoursVal = 0;
    let minsVal = 0;
    let desc = 'Nothing Today';
    
    if (!isNothingToday) {
      hoursVal = parseInt(logHours, 10);
      minsVal = parseInt(logMinutes, 10);
      if (isNaN(hoursVal) || hoursVal < 0 || hoursVal > 24) {
        showError('Hours must be an integer between 0 and 24');
        return;
      }
      if (isNaN(minsVal) || minsVal < 0 || minsVal > 59) {
        showError('Minutes must be an integer between 0 and 59');
        return;
      }
      if (hoursVal === 0 && minsVal === 0) {
        showError('Total log time must be greater than 0');
        return;
      }
      if (hoursVal === 24 && minsVal > 0) {
        showError('Total log time cannot exceed 24 hours');
        return;
      }
      desc = description.trim();
    }

    setSubmitting(true);
    try {
      await api.logWork({
        date: toLocalDateString(new Date()),
        category,
        hours: hoursVal,
        minutes: minsVal,
        description: desc,
      });
      showSuccess('Work hours logged successfully!');
      
      // Reset form & reload
      setLogHours('');
      setLogMinutes('');
      setDescription('');
      fetchLogs();
    } catch (err: any) {
      showError(err.message || 'Failed to log work');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Daily Work Logs</h1>
          <span className="page-subtitle">Submit daily logs and track hours.</span>
        </div>
      </div>

      {/* LOG WORK HOURS FORM */}
      {user?.role === 'user' && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '1.25rem', border: 'none', padding: 0 }}>
            <Clock size={18} /> Log Work Hours
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label" htmlFor="category">Category</label>
              <select 
                id="category"
                className="form-input form-select" 
                value={category} 
                onChange={(e) => setCategory(e.target.value as any)} 
                disabled={submitting}
              >
                <option value="Coding">Coding</option>
                <option value="Learning">Learning</option>
                <option value="Nothing Today">Nothing Today</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label" htmlFor="logHours">Hours</label>
              <input 
                id="logHours"
                type="number"
                min="0"
                max="24"
                placeholder="0"
                className="form-input" 
                value={category === 'Nothing Today' ? '0' : logHours} 
                onChange={(e) => setLogHours(e.target.value)} 
                disabled={submitting || category === 'Nothing Today'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label" htmlFor="logMinutes">Minutes</label>
              <input 
                id="logMinutes"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                className="form-input" 
                value={category === 'Nothing Today' ? '0' : logMinutes} 
                onChange={(e) => setLogMinutes(e.target.value)} 
                disabled={submitting || category === 'Nothing Today'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: '2 1 300px' }}>
              <label className="form-label" htmlFor="description">Description of Work</label>
              <input 
                id="description"
                type="text" 
                placeholder={category === 'Nothing Today' ? 'Nothing Today' : 'What did you achieve today?'}
                className="form-input" 
                value={category === 'Nothing Today' ? 'Nothing Today' : description} 
                onChange={(e) => setDescription(e.target.value)} 
                disabled={submitting || category === 'Nothing Today'}
              />
            </div>

            <button 
              className="btn btn-primary" 
              style={{ height: '42px', minWidth: '150px', flexShrink: 0 }} 
              type="submit" 
              disabled={submitting}
            >
              {submitting ? 'Logging...' : 'Submit Log'}
            </button>
          </form>
        </div>
      )}

      {/* LOGS TABLE */}
      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : logs.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  {user?.role === 'admin' && <th>Developer</th>}
                  <th>Date</th>
                  <th>Category</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    {user?.role === 'admin' && (
                      <td style={{ fontWeight: 600 }}>{log.user_name}</td>
                    )}
                    <td>{log.date}</td>
                    <td>
                      <span className={`badge badge-${log.category.toLowerCase()}`}>
                        {log.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatHours(log.hours, log.minutes)}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description}>
                      {log.description}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <h3>No logs found</h3>
            <p>Try resetting the filters or create a new daily log entry.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: ROADMAP & CHECKLIST TRACKER
// ============================================================================

export function Roadmap() {
  const [roadmaps, setRoadmaps] = useState<RoadmapTech[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError, ToastComponent } = useToast();

  const fetchRoadmap = async () => {
    try {
      const data = await api.getRoadmap();
      setRoadmaps(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleToggleTopic = async (topicId: number, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await api.uncompleteTopic(topicId);
        showSuccess('Topic marked as incomplete');
      } else {
        await api.completeTopic(topicId);
        showSuccess('Topic completed! Great job.');
      }
      fetchRoadmap();
    } catch (err: any) {
      showError(err.message || 'Failed to update topic');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Learning Roadmaps</h1>
          <span className="page-subtitle">Track your assigned technology stacks and complete curriculum topics.</span>
        </div>
      </div>

      {roadmaps.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {roadmaps.map((tech) => (
            <div key={tech.id} className="glass-card">
              {/* Tech Header */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tech.name}</h2>
                  {tech.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{tech.description}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '200px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span>Progress</span>
                      <span>{tech.percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${tech.percentage}%`, 
                          height: '100%', 
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '10px',
                          boxShadow: `0 0 10px var(--color-primary-glow)`
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics Checklist Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {tech.topics.map((topic) => (
                  <div 
                    key={topic.id} 
                    className="topic-checkbox-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      backgroundColor: topic.is_completed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255,255,255,0.01)',
                      border: '1px solid',
                      borderColor: topic.is_completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'var(--transition-normal)'
                    }}
                    onClick={() => handleToggleTopic(topic.id, topic.is_completed)}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '6px', 
                      border: '2px solid',
                      borderColor: topic.is_completed ? 'var(--color-success)' : 'var(--text-muted)',
                      backgroundColor: topic.is_completed ? 'var(--color-success)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'var(--transition-fast)'
                    }}>
                      {topic.is_completed && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: 500,
                        color: topic.is_completed ? 'var(--text-primary)' : 'var(--text-secondary)',
                        textDecoration: topic.is_completed ? 'line-through' : 'none'
                      }}>
                        {topic.name}
                      </span>
                      {topic.is_completed && topic.completed_at && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Done on {new Date(topic.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card">
          <div className="empty-state">
            <BookOpen size={48} className="empty-icon" />
            <h3>No roadmaps assigned</h3>
            <p>Please contact the administrator to assign technology learning roadmaps to your profile.</p>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ============================================================================
// PAGE: PROJECTS
// ============================================================================

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError, ToastComponent } = useToast();

  // Create Project Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Completed' | 'Archived'>('Active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [hostUrl, setHostUrl] = useState('');

  // Suggested Projects team & technology selection logic
  const mapUserTeamToKey = (userTeam: string | null | undefined): string | null => {
    if (!userTeam) return null;
    const lower = userTeam.toLowerCase();
    if (lower.includes('back')) return 'Backend Team';
    if (lower.includes('front')) return 'Frontend Team';
    if (lower.includes('data') || lower.includes('db') || lower.includes('sql') || lower.includes('postgres')) return 'Database Team';
    return null;
  };

  const userPrimaryMapped = mapUserTeamToKey(user?.primary_team);
  const userSecondaryMapped = mapUserTeamToKey(user?.secondary_team);

  const availableTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    if (userPrimaryMapped) teamsSet.add(userPrimaryMapped);
    if (userSecondaryMapped) teamsSet.add(userSecondaryMapped);
    
    // If none are mapped or user is admin/unassigned, show all teams
    if (teamsSet.size === 0) {
      return ["Backend Team", "Database Team", "Frontend Team"];
    }
    return Array.from(teamsSet);
  }, [userPrimaryMapped, userSecondaryMapped]);

  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    if (availableTeams.length > 0) {
      setSelectedTeam(availableTeams[0]);
    }
  }, [availableTeams]);

  const availableTechs = useMemo(() => {
    if (!selectedTeam || !SUGGESTED_PROJECTS[selectedTeam]) return [];
    return Object.keys(SUGGESTED_PROJECTS[selectedTeam]);
  }, [selectedTeam]);

  const [selectedTech, setSelectedTech] = useState<string>('');

  useEffect(() => {
    if (availableTechs.length > 0) {
      setSelectedTech(availableTechs[0]);
    } else {
      setSelectedTech('');
    }
  }, [availableTechs]);

  const suggestedList = useMemo(() => {
    if (!selectedTeam || !selectedTech || !SUGGESTED_PROJECTS[selectedTeam]) return [];
    return SUGGESTED_PROJECTS[selectedTeam][selectedTech] || [];
  }, [selectedTeam, selectedTech]);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showError('Project Name is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.createProject({
        name,
        description: description || null,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        github_url: githubUrl || null,
        host_url: hostUrl || null
      });
      showSuccess('Project created successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setStatus('Active');
      setStartDate('');
      setEndDate('');
      setGithubUrl('');
      setHostUrl('');
      setShowModal(false);
      
      fetchProjects();
    } catch (err: any) {
      showError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Projects</h1>
          <span className="page-subtitle">Create, monitor, and log hours towards development projects.</span>
        </div>
        {user?.role === 'user' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Create Project</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="proj-name">Project Name</label>
                <input 
                  id="proj-name"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. E-Commerce Platform"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="proj-desc">Description</label>
                <textarea 
                  id="proj-desc"
                  rows={3} 
                  className="form-input" 
                  placeholder="Summarize the project..."
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="proj-github">GitHub Repository Link (Optional)</label>
                <input 
                  id="proj-github"
                  type="url" 
                  className="form-input" 
                  placeholder="e.g. https://github.com/username/repo"
                  value={githubUrl} 
                  onChange={(e) => setGithubUrl(e.target.value)} 
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="proj-host">Hosted Website Link (Optional)</label>
                <input 
                  id="proj-host"
                  type="url" 
                  className="form-input" 
                  placeholder="e.g. https://myproject.vercel.app"
                  value={hostUrl} 
                  onChange={(e) => setHostUrl(e.target.value)} 
                  disabled={submitting}
                />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column: My Projects */}
        <div style={{ flex: '1 1 500px' }}>
          {projects.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {projects.map((proj) => (
                <div key={proj.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span className={`badge badge-${proj.status.toLowerCase()}`}>{proj.status}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {proj.start_date || 'N/A'} - {proj.end_date || 'N/A'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{proj.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {proj.description || 'No description provided.'}
                  </p>

                  {/* Project Links */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {proj.github_url && (
                      <a 
                        href={proj.github_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <FolderGit2 size={14} /> Repo
                      </a>
                    )}
                    {proj.host_url && (
                      <a 
                        href={proj.host_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-success)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <CheckCircle2 size={14} /> Live Site
                      </a>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours Invested</div>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatHours(proj.hours_invested)}</strong>
                      </div>
                      <Link to={`/projects/${proj.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Open Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card">
              <div className="empty-state">
                <FolderGit2 size={48} className="empty-icon" />
                <h3>No projects registered</h3>
                {user?.role === 'user' ? (
                  <p>Get started by creating a new project mapping your coding goals.</p>
                ) : (
                  <p>No developers have created projects yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Suggested Projects Sidebar */}
        <div style={{ flex: '0 0 380px', width: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 12rem)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: 'var(--color-primary)' }} /> Suggested Projects
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Assigned projects based on your active development tracks.
              </p>
            </div>

            {/* Selector Dropdowns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {availableTeams.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE TEAM</label>
                  <select 
                    value={selectedTeam} 
                    onChange={(e) => setSelectedTeam(e.target.value)} 
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      padding: '0.5rem', 
                      color: 'var(--text-primary)', 
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    {availableTeams.map(t => (
                      <option key={t} value={t} style={{ backgroundColor: '#18181b', color: 'var(--text-primary)' }}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {availableTechs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TECHNOLOGY</label>
                  <select 
                    value={selectedTech} 
                    onChange={(e) => setSelectedTech(e.target.value)}
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      padding: '0.5rem', 
                      color: 'var(--text-primary)', 
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    {availableTechs.map(tech => (
                      <option key={tech} value={tech} style={{ backgroundColor: '#18181b', color: 'var(--text-primary)' }}>{tech}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scrollable Levels List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {suggestedList.length > 0 ? (
                suggestedList.map((item) => (
                  <div 
                    key={item.level} 
                    style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '10px', 
                      padding: '1rem', 
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
                        Level {item.level}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
                      {item.description}
                    </p>
                    
                    {item.challenges && item.challenges.length > 0 && (
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Extra Challenges:</span>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '1rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {item.challenges.map((c, i) => (
                            <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  No suggested projects found for this selection.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: PROJECT DETAILS
// ============================================================================

export function ProjectDetails() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { project_id } = useNavigateParameters();
  const { showSuccess, showError, ToastComponent } = useToast();

  // Log Hours Form
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');

  const fetchProjectDetail = async () => {
    try {
      if (!project_id) return;
      const data = await api.getProject(parseInt(project_id));
      setProject(data);
    } catch (err) {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetail();
  }, [project_id]);

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project_id || !hours || !minutes || !description) {
      showError('Please fill in all fields');
      return;
    }

    const hoursVal = parseInt(hours, 10);
    const minsVal = parseInt(minutes, 10);
    if (isNaN(hoursVal) || hoursVal < 0 || hoursVal > 24) {
      showError('Hours must be an integer between 0 and 24');
      return;
    }
    if (isNaN(minsVal) || minsVal < 0 || minsVal > 59) {
      showError('Minutes must be an integer between 0 and 59');
      return;
    }
    if (hoursVal === 0 && minsVal === 0) {
      showError('Total log time must be greater than 0');
      return;
    }
    if (hoursVal === 24 && minsVal > 0) {
      showError('Total log time cannot exceed 24 hours');
      return;
    }

    setSubmittingLog(true);
    try {
      await api.logProjectHours(parseInt(project_id), { 
        hours: hoursVal, 
        minutes: minsVal,
        description,
        date: toLocalDateString(new Date())
      });
      showSuccess('Hours logged and registered on your daily feed!');
      setHours('');
      setMinutes('');
      setDescription('');
      setShowLogModal(false);
      fetchProjectDetail();
    } catch (err: any) {
      showError(err.message || 'Failed to log hours');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !window.confirm(`Are you sure you want to delete project: ${project.name}?`)) return;

    try {
      await api.deleteProject(project.id);
      navigate('/projects');
    } catch (err: any) {
      showError(err.message || 'Failed to delete project');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!project) return null;

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Created Date: {project.start_date || 'N/A'}
            </span>
          </div>
          <h1 className="page-title">{project.name}</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {user?.role === 'user' && (
            <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>
              <Clock size={16} /> Log Hours
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDeleteProject} style={{ padding: '0.75rem' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* LOG HOURS MODAL */}
      {showLogModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Log Project Hours</h3>
              <button className="btn-close" onClick={() => setShowLogModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleLogHours}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="log-hrs">Hours</label>
                  <input 
                    id="log-hrs"
                    type="number" 
                    min="0"
                    max="24"
                    placeholder="0"
                    className="form-input" 
                    value={hours} 
                    onChange={(e) => setHours(e.target.value)} 
                    disabled={submittingLog}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="log-mins">Minutes</label>
                  <input 
                    id="log-mins"
                    type="number" 
                    min="0"
                    max="59"
                    placeholder="0"
                    className="form-input" 
                    value={minutes} 
                    onChange={(e) => setMinutes(e.target.value)} 
                    disabled={submittingLog}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="log-desc">Work Details</label>
                <textarea 
                  id="log-desc"
                  rows={3} 
                  placeholder="What code module or feature did you complete?"
                  className="form-input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={submittingLog}
                />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submittingLog}>
                {submittingLog ? 'Logging...' : 'Log Project Time'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS VIEW */}
      <div className="dash-grid-details">
        {/* Left column: Logs & Timeline */}
        <div className="glass-card section-card">
          <h3 className="section-title">Project Work Timeline</h3>
          {project.logs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
              {project.logs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '1rem', borderLeft: '2px solid var(--color-primary-glow)', paddingLeft: '1.25rem', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: '-6px', 
                    top: '2px', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--color-primary)',
                    boxShadow: '0 0 8px var(--color-primary)' 
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--color-secondary)' }}>{formatHours(log.hours, log.minutes)}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.logged_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <Clock size={32} className="empty-icon" />
              <p>No project logs filed yet. Click "Log Hours" to add one.</p>
            </div>
          )}
        </div>

        {/* Right column: Details Stats */}
        <div className="glass-card section-card">
          <h3 className="section-title">Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hours Invested</div>
              <strong style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>{formatHours(project.hours_invested)}</strong>
            </div>
            
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start / Target End Date</div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {project.start_date || 'N/A'} to {project.end_date || 'N/A'}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Description</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {project.description || 'No description provided.'}
              </p>
            </div>

            {project.github_url && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GitHub Repository</div>
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-secondary)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                  <FolderGit2 size={16} /> View Code
                </a>
              </div>
            )}

            {project.host_url && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Hosted Live Site</div>
                <a href={project.host_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                  <CheckCircle2 size={16} /> Visit Website
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Custom hook to parse query/params in React Router V7
function useNavigateParameters() {
  const location = useLocation();
  const project_id = location.pathname.split('/').pop();
  return { project_id };
}

// ============================================================================
// PAGE: LEADERBOARD
// ============================================================================

export function Leaderboard() {
  const [board, setBoard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState<'total' | 'weekly' | 'monthly'>('total');

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setBoard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const sortedBoard = useMemo(() => {
    const list = [...board];
    if (sortType === 'total') {
      return list.sort((a, b) => b.total_hours - a.total_hours);
    } else if (sortType === 'weekly') {
      return list.sort((a, b) => b.weekly_hours - a.weekly_hours);
    } else {
      return list.sort((a, b) => b.monthly_hours - a.monthly_hours);
    }
  }, [board, sortType]);

  const topThree = useMemo(() => {
    return sortedBoard.slice(0, 3);
  }, [sortedBoard]);

  const remaining = useMemo(() => {
    return sortedBoard.slice(3);
  }, [sortedBoard]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Developer Leaderboard</h1>
          <span className="page-subtitle">Compete on coding & study hours logged. Top ranking devs crowned weekly!</span>
        </div>

        {/* SORT TOGGLE */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '0.25rem', borderRadius: '10px' }}>
          <button 
            className={`btn ${sortType === 'total' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => setSortType('total')}
          >
            All-Time
          </button>
          <button 
            className={`btn ${sortType === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => setSortType('weekly')}
          >
            Weekly
          </button>
          <button 
            className={`btn ${sortType === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: 'none' }}
            onClick={() => setSortType('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* TOP PODIUM (GOLD, SILVER, BRONZE CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Rank 2 (Silver) */}
        {topThree[1] && (
          <div className="glass-card" style={{ order: 1, borderTop: '4px solid #94a3b8', transform: 'scale(0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem', background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)', marginBottom: '0.5rem' }}>
              2
            </div>
            <h3 style={{ fontSize: '1.2rem' }}>{topThree[1].full_name}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{topThree[1].team || 'Developer'}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
              {formatHours(sortType === 'total' ? topThree[1].total_hours : sortType === 'weekly' ? topThree[1].weekly_hours : topThree[1].monthly_hours)}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Flame size={14} /> {topThree[1].current_streak} Day Streak
            </span>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {topThree[0] && (
          <div className="glass-card" style={{ order: 0, borderTop: '4px solid #fbbf24', transform: 'scale(1.03)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem', zIndex: 1 }}>
            <div className="user-avatar" style={{ width: '70px', height: '70px', fontSize: '1.75rem', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', marginBottom: '0.5rem', border: '3px solid #fbbf24' }}>
              1
            </div>
            <h3 style={{ fontSize: '1.35rem' }}>{topThree[0].full_name}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{topThree[0].team || 'Developer'}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-secondary)', marginTop: '0.5rem' }}>
              {formatHours(sortType === 'total' ? topThree[0].total_hours : sortType === 'weekly' ? topThree[0].weekly_hours : topThree[0].monthly_hours)}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Flame size={14} /> {topThree[0].current_streak} Day Streak
            </span>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {topThree[2] && (
          <div className="glass-card" style={{ order: 2, borderTop: '4px solid #b45309', transform: 'scale(0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div className="user-avatar" style={{ width: '55px', height: '55px', fontSize: '1.35rem', background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', marginBottom: '0.5rem' }}>
              3
            </div>
            <h3 style={{ fontSize: '1.1rem' }}>{topThree[2].full_name}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{topThree[2].team || 'Developer'}</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
              {formatHours(sortType === 'total' ? topThree[2].total_hours : sortType === 'weekly' ? topThree[2].weekly_hours : topThree[2].monthly_hours)}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Flame size={14} /> {topThree[2].current_streak} Day Streak
            </span>
          </div>
        )}
      </div>

      {/* LEADERBOARD TABLE FOR REMAINING */}
      <div className="glass-card" style={{ padding: 0 }}>
        {remaining.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Developer</th>
                  <th>Team</th>
                  <th>Streak</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {remaining.map((row, idx) => (
                  <tr key={row.user_id}>
                    <td style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-muted)' }}>
                      #{idx + 4}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.team || 'Developer'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                        <Flame size={14} /> {row.current_streak} days
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                      {formatHours(sortType === 'total' ? row.total_hours : sortType === 'weekly' ? row.weekly_hours : row.monthly_hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Trophy size={48} className="empty-icon" />
            <h3>No additional rankings</h3>
            <p>Ranks 1 to 3 are showcased on the podium above.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}



// ============================================================================
// PAGE: GALLERY SHOWCASE ZONE
// ============================================================================

export function Gallery() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>('canvas');
  const [coords, setCoords] = useState<{[key: string]: {x: number, y: number}}>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragInitial, setDragInitial] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<{id: number, char: string, x: number, y: number, dx: number, dy: number, dr: number}[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const fetchShowcase = async () => {
    try {
      setLoading(true);
      const res = await api.getShowcase();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcase();
  }, []);

  const items = useMemo(() => {
    const list: any[] = [];
    if (!data) return list;
    
    if (data.projects) {
      data.projects.forEach((p: any) => list.push({ ...p, type: 'project', uniqueId: `project-${p.id}` }));
    }
    if (data.completions) {
      data.completions.forEach((c: any) => list.push({ ...c, type: 'completion', uniqueId: `completion-${c.id}` }));
    }
    if (data.daily_kings) {
      data.daily_kings.forEach((k: any) => list.push({ ...k, type: 'king', uniqueId: `king-${k.id}` }));
    }
    if (data.champions) {
      data.champions.forEach((ch: any) => list.push({ ...ch, type: 'champion', uniqueId: `champion-${ch.user_id}` }));
    }
    if (data.streaks) {
      data.streaks.forEach((s: any) => list.push({ ...s, type: 'streak', uniqueId: `streak-${s.id}` }));
    }

    const getSortTime = (item: any) => {
      if (item.type === 'project') return new Date(item.date || 0).getTime();
      if (item.type === 'completion') return new Date(item.completed_at || 0).getTime();
      if (item.type === 'king') return new Date(item.date || 0).getTime();
      return Date.now();
    };

    return list.sort((a, b) => getSortTime(b) - getSortTime(a));
  }, [data]);

  // Initialize coordinates for canvas view
  useEffect(() => {
    if (items.length > 0 && viewMode === 'canvas') {
      const newCoords = { ...coords };
      let changed = false;
      const cols = Math.max(1, Math.floor((window.innerWidth - 320) / 360));
      
      items.forEach((item, idx) => {
        if (!newCoords[item.uniqueId]) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          newCoords[item.uniqueId] = {
            x: col * 340 + 20,
            y: row * 270 + 80
          };
          changed = true;
        }
      });
      if (changed) {
        setCoords(newCoords);
      }
    }
  }, [items, viewMode]);

  const handleTidyUp = () => {
    const newCoords: {[key: string]: {x: number, y: number}} = {};
    const cols = Math.max(1, Math.floor((window.innerWidth - 320) / 360));
    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      newCoords[item.uniqueId] = {
        x: col * 340 + 20,
        y: row * 270 + 80
      };
    });
    setCoords(newCoords);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDraggedId(id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragInitial(coords[id] || { x: 0, y: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedId || !canvasRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const containerRect = canvasRef.current.getBoundingClientRect();
    
    const nextX = Math.max(0, Math.min(containerRect.width - 320, dragInitial.x + dx));
    const nextY = Math.max(0, Math.min(containerRect.height - 250, dragInitial.y + dy));
    
    setCoords(prev => ({
      ...prev,
      [draggedId]: { x: nextX, y: nextY }
    }));
  };

  const handleMouseUp = () => {
    setDraggedId(null);
  };

  const handleHighFive = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + window.scrollY;
    const emojis = ['🎉', '🔥', '👏', '🚀', '⭐', '🙌', '💯', '✨'];
    
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      char: emojis[Math.floor(Math.random() * emojis.length)],
      x,
      y,
      dx: (Math.random() - 0.5) * 160,
      dy: -100 - Math.random() * 80,
      dr: Math.random() * 360
    }));

    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 800);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const renderCardContent = (item: any) => {
    const initials = item.user_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

    switch (item.type) {
      case 'project':
        return (
          <>
            <div className="card-badge-row">
              <span className={`badge ${item.status === 'Completed' ? 'badge-completed' : 'badge-active'}`}>
                {item.status}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project Showcase</span>
            </div>
            <h3 className="card-title">{item.name}</h3>
            <p className="card-desc">{item.description || 'No description provided.'}</p>
            <div className="grace-text" style={{ borderColor: 'var(--color-primary)' }}>
              🎯 Invested: {item.hours}h {item.minutes}m of building.
            </div>
            <div className="card-meta">
              <div className="card-avatar">{initials}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.user_name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                {item.github_url && (
                  <a href={item.github_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '5px' }}>
                    <FolderGit2 size={16} />
                  </a>
                )}
                {item.host_url && (
                  <a href={item.host_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '5px' }}>
                    <Eye size={16} />
                  </a>
                )}
              </div>
            </div>
          </>
        );

      case 'completion':
        return (
          <>
            <div className="card-badge-row">
              <span className="badge badge-learning" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                Milestone Complete
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Roadmap</span>
            </div>
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Cleared "{item.topic_name}"</h3>
            <p className="card-desc" style={{ fontSize: '0.85rem' }}>Successfully completed study topic in <strong>{item.tech_name}</strong> roadmap.</p>
            <div className="grace-text" style={{ color: '#22d3ee', backgroundColor: 'rgba(6, 182, 212, 0.08)', borderColor: '#06b6d4' }}>
              📚 Milestone achieved! Knowledge extended.
            </div>
            <div className="card-meta">
              <div className="card-avatar" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)' }}>{initials}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.user_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{formatDate(item.completed_at)}</span>
            </div>
          </>
        );

      case 'king':
        return (
          <>
            <div className="card-badge-row">
              <span className="badge badge-coding" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                Daily Grind King
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Heavy Log</span>
            </div>
            <h3 className="card-title">Logged {item.hours}h {item.minutes}m</h3>
            <p className="card-desc">{item.description}</p>
            <div className="grace-text" style={{ color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: '#10b981' }}>
              👑 {item.grace_word}
            </div>
            <div className="card-meta">
              <div className="card-avatar" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%)' }}>{initials}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.user_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{formatDate(item.date)}</span>
            </div>
          </>
        );

      case 'champion':
        return (
          <>
            <div className="card-badge-row">
              <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                Consistency Champion
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5-Day Grind</span>
            </div>
            <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Averages {item.average_hours}h/day</h3>
            <p className="card-desc" style={{ fontSize: '0.8rem' }}>Logged a total of {item.total_hours} hours over the last 5 days. Daily target consistency maintained!</p>
            
            {/* SVG MINI-CHART */}
            <div className="mini-chart">
              <svg width="270" height="70" viewBox="0 0 270 70">
                <defs>
                  <linearGradient id={`grad-${item.user_id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const vals = item.chart_data?.values || [];
                  const maxVal = Math.max(2.5, ...vals);
                  const points = vals.map((v: number, idx: number) => {
                    const x = idx * 48 + 20;
                    const y = 50 - (v / maxVal) * 40;
                    return { x, y, val: v };
                  });
                  const pathD = points.reduce((acc: string, p: any, idx: number) => {
                    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                  }, '');
                  const areaD = points.length > 0 
                    ? `${pathD} L ${points[points.length - 1].x} 52 L ${points[0].x} 52 Z`
                    : '';

                  return (
                    <>
                      {areaD && <path d={areaD} fill={`url(#grad-${item.user_id})`} />}
                      {pathD && <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                      {points.map((p: any, idx: number) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="3" fill="#090d16" stroke="#fbbf24" strokeWidth="2" />
                          <text x={p.x} y="62" fontSize="7" fill="var(--text-muted)" textAnchor="middle">
                            {item.chart_data?.labels[idx] || ''}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            
            <div className="card-meta">
              <div className="card-avatar" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(239, 68, 68, 0.3) 100%)' }}>{initials}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.user_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Consistency King</span>
            </div>
          </>
        );

      case 'streak':
        return (
          <>
            <div className="card-badge-row">
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                Streak Star
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Streak</span>
            </div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{item.current_streak} Day Streak</span>
              <span className="pulsing-flame">🔥</span>
            </h3>
            <p className="card-desc">Logging hours consistently! Longest streak: {item.longest_streak} days.</p>
            <div className="grace-text" style={{ color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#ef4444' }}>
              ⚡ Keeping the fire burning! Unstoppable.
            </div>
            <div className="card-meta">
              <div className="card-avatar" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(245, 158, 11, 0.3) 100%)' }}>{initials}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.user_name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>On Fire</span>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      <div className="gallery-container">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title-section">
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>🌟 Developer Showcase Zone</span>
            </h1>
            <span className="page-subtitle">Celebrating recent milestones, consistent grinds, and outstanding achievements!</span>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="gallery-controls" style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {viewMode === 'canvas' && (
              <button className="btn btn-secondary" onClick={handleTidyUp} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                Tidy Up Board
              </button>
            )}
            <div className="view-toggle">
              <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                Grid View
              </button>
              <button className={`toggle-btn ${viewMode === 'canvas' ? 'active' : ''}`} onClick={() => setViewMode('canvas')}>
                Canvas Zone
              </button>
            </div>
          </div>
        </div>

        {/* RENDER VIEW */}
        {items.length === 0 ? (
          <div className="glass-card empty-state" style={{ padding: '4rem 2rem' }}>
            <Award size={48} className="empty-icon" />
            <h3>No recent achievements to showcase yet</h3>
            <p>Keep logging your hours, finishing roadmap topics, and completing projects to showcase your hard work!</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="gallery-grid">
            {items.map(item => (
              <div 
                key={item.uniqueId} 
                className={`showcase-card ${item.type}-card`}
                style={{ cursor: item.type === 'project' ? 'pointer' : 'default' }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.highfive-btn') || (e.target as HTMLElement).closest('.btn-secondary') || (e.target as HTMLElement).closest('a')) {
                    return;
                  }
                  if (item.type === 'project') {
                    setSelectedProject(item);
                  }
                }}
              >
                {renderCardContent(item)}
                <div className="card-action-row">
                  <button className="highfive-btn" onClick={handleHighFive}>
                    👏 High Five
                  </button>
                  {item.type === 'project' && (
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }} onClick={() => setSelectedProject(item)}>
                      🔍 Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            ref={canvasRef}
            className="canvas-board"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ height: `${Math.max(700, Math.ceil(items.length / 3) * 270 + 150)}px` }}
          >
            <div className="canvas-instruction">
              <Sliders size={14} /> Drag elements by their top headers to arrange your showcase zone!
            </div>
            
            {items.map(item => {
              const isDragging = draggedId === item.uniqueId;
              const xCoord = coords[item.uniqueId]?.x ?? 20;
              const yCoord = coords[item.uniqueId]?.y ?? 80;
              
              return (
                <div 
                  key={item.uniqueId}
                  className={`showcase-card ${item.type}-card ${isDragging ? 'is-dragging' : ''}`}
                  style={{
                    transform: `translate3d(${xCoord}px, ${yCoord}px, 0)`,
                    transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                    zIndex: isDragging ? 100 : undefined,
                    cursor: isDragging ? 'grabbing' : (item.type === 'project' ? 'pointer' : 'grab')
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.highfive-btn') || (e.target as HTMLElement).closest('.btn-secondary') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('.card-drag-handle')) {
                      return;
                    }
                    if (item.type === 'project') {
                      setSelectedProject(item);
                    }
                  }}
                >
                  <div className="card-drag-handle" onMouseDown={(e) => handleMouseDown(e, item.uniqueId)}>
                    ⋮⋮ DRAG TO MOVE
                  </div>
                  {renderCardContent(item)}
                  <div className="card-action-row">
                    <button className="highfive-btn" onClick={handleHighFive}>
                      👏 High Five
                    </button>
                    {item.type === 'project' && (
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }} onClick={() => setSelectedProject(item)}>
                        🔍 Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROJECT DETAILS MODAL OVERLAY */}
      {selectedProject && (
        <div className="project-detail-overlay" onClick={() => setSelectedProject(null)}>
          <div className="project-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="project-detail-header">
              <div className="project-detail-title-section">
                <span className={`badge ${selectedProject.status === 'Completed' ? 'badge-completed' : 'badge-active'}`} style={{ width: 'fit-content' }}>
                  {selectedProject.status}
                </span>
                <h2 className="project-detail-title">{selectedProject.name}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Developer: <strong>{selectedProject.user_name}</strong> (@{selectedProject.username})
                </span>
              </div>
              <button className="btn-close" onClick={() => setSelectedProject(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="project-detail-stats">
              <div className="project-detail-stat-card">
                <span className="project-detail-stat-label">Total Invested</span>
                <span className="project-detail-stat-value">{selectedProject.hours}h {selectedProject.minutes}m</span>
              </div>
              <div className="project-detail-stat-card" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="project-detail-stat-label">GitHub URL</span>
                <span className="project-detail-stat-value" style={{ fontSize: '0.85rem' }}>
                  {selectedProject.github_url ? (
                    <a href={selectedProject.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                      Open Code ↗
                    </a>
                  ) : 'Not Linked'}
                </span>
              </div>
              <div className="project-detail-stat-card">
                <span className="project-detail-stat-label">Host URL</span>
                <span className="project-detail-stat-value" style={{ fontSize: '0.85rem' }}>
                  {selectedProject.host_url ? (
                    <a href={selectedProject.host_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-secondary)', textDecoration: 'none' }}>
                      Live Demo ↗
                    </a>
                  ) : 'Not Linked'}
                </span>
              </div>
            </div>

            <div className="project-detail-section">
              <span className="project-detail-section-title">About Project</span>
              <p className="project-detail-desc">{selectedProject.description || 'No description provided for this project.'}</p>
            </div>

            {selectedProject.date && (
              <div className="project-detail-section">
                <span className="project-detail-section-title">Launch Date</span>
                <p className="project-detail-desc" style={{ fontSize: '0.9rem' }}>{formatDate(selectedProject.date)}</p>
              </div>
            )}

            <div className="project-detail-section">
              <span className="project-detail-section-title">Development Log Timeline</span>
              {selectedProject.logs && selectedProject.logs.length > 0 ? (
                <div className="project-logs-timeline">
                  {selectedProject.logs.map((log: any) => (
                    <div key={log.id} className="project-log-item">
                      <div className="project-log-item-header">
                        <span className="project-log-item-time">{log.hours}h {log.minutes}m logged</span>
                        <span className="project-log-item-date">{formatDate(log.logged_at)}</span>
                      </div>
                      <p className="project-log-item-desc">{log.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="project-detail-desc" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>No development logs have been recorded for this project yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER FLOATING PARTICLES */}
      {particles.map(p => (
        <span
          key={p.id}
          className="emoji-particle"
          style={{
            left: p.x,
            top: p.y,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--dr': `${p.dr}deg`
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}
    </Layout>
  );
}



// ============================================================================
// PAGE: PROFILE
// ============================================================================

export function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    hours: number;
  } | null>(null);
  const { user } = useAuth();

  const fetchProfile = async (offset = weekOffset, isInitial = false) => {
    if (!isInitial) setChartLoading(true);
    try {
      if (!user) return;
      const data = await api.adminGetUserProfile(user.id, offset);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(weekOffset, true);
  }, [user]);

  useEffect(() => {
    fetchProfile(weekOffset, false);
  }, [weekOffset]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">User Profile</h1>
      </div>

      {profile?.user?.role === 'admin' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Avatar & Basic Info */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2.5rem 2rem' }}>
            <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', marginBottom: '1rem' }}>
              {profile?.user?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{profile?.user?.full_name}</h2>
            <span className={`badge badge-${profile?.user?.role}`} style={{ marginTop: '0.5rem' }}>
              {profile?.user?.role}
            </span>
            
            <div style={{ borderTop: '1px solid var(--border-color)', width: '100%', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Username</span>
                <strong style={{ color: 'var(--text-primary)' }}>@{profile?.user?.username}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Email Address</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile?.user?.email}</strong>
              </div>
            </div>
          </div>

          {/* Right Column: System Administration Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card">
              <h3 className="section-title">System Administration</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Welcome to the administrator profile. You have complete administrative control over the platform, allowing you to:
              </p>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.25rem', marginTop: '0.75rem', lineHeight: '1.8' }}>
                <li>Register, edit, and deactivate team members</li>
                <li>Configure global training roadmap technologies and checklist topics</li>
                <li>Manage developer assignments and progress check-offs</li>
                <li>Configure system-wide deadlines, reminder alerts, and grace periods</li>
                <li>Audit system email notification delivery logs</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Avatar & Basic Info */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2.5rem 2rem' }}>
            <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', marginBottom: '1rem' }}>
              {profile?.user?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{profile?.user?.full_name}</h2>
            <span style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.25rem' }}>
              {profile?.user?.team || 'Developer'}
            </span>
            <span className={`badge badge-${profile?.user?.role}`} style={{ marginTop: '0.5rem' }}>
              {profile?.user?.role}
            </span>
            
            <div style={{ borderTop: '1px solid var(--border-color)', width: '100%', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Username</span>
                <strong style={{ color: 'var(--text-primary)' }}>@{profile?.user?.username}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Email Address</span>
                <strong style={{ color: 'var(--text-primary)' }}>{profile?.user?.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Leaderboard Standing</span>
                <strong style={{ color: 'var(--color-warning)' }}>Rank #{profile?.rank}</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Streaks & Achievements */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Quick stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Hours</div>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-primary)', display: 'block', marginTop: '0.25rem' }}>
                  {formatHours(profile?.total_hours)}
                </strong>
              </div>

              <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Streak</div>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-warning)', display: 'block', marginTop: '0.25rem' }}>
                  {profile?.current_streak} days
                </strong>
              </div>

              <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Longest Streak</div>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  {profile?.longest_streak} days
                </strong>
              </div>

              <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed Topics</div>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-success)', display: 'block', marginTop: '0.25rem' }}>
                  {profile?.completed_topics_count}
                </strong>
              </div>
            </div>

            {/* WEEKLY LOGGED HOURS CHART CARD */}
            <div className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, border: 'none', padding: 0 }}>
                  <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} /> Weekly Logged Hours (Total Work)
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Week:</span>
                  <select
                    value={weekOffset}
                    onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={0} style={{ background: '#1e1b4b' }}>Current Week</option>
                    <option value={1} style={{ background: '#1e1b4b' }}>1 Week Ago</option>
                    <option value={2} style={{ background: '#1e1b4b' }}>2 Weeks Ago</option>
                    <option value={3} style={{ background: '#1e1b4b' }}>3 Weeks Ago</option>
                    <option value={4} style={{ background: '#1e1b4b' }}>4 Weeks Ago</option>
                  </select>
                </div>
              </div>

              {chartLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
                  <div className="spinner"></div>
                </div>
              ) : profile?.weekly_hours ? (() => {
                const chartWidth = 700;
                const chartHeight = 250;
                const paddingLeft = 40;
                const paddingRight = 20;
                const paddingTop = 20;
                const paddingBottom = 40;

                const graphWidth = chartWidth - paddingLeft - paddingRight;
                const graphHeight = chartHeight - paddingTop - paddingBottom;

                // Find max hours logged to scale Y axis dynamically
                let maxHours = 8;
                const userMax = Math.max(...(profile.weekly_hours || []), 0);
                if (userMax > maxHours) {
                  maxHours = userMax;
                }
                maxHours = Math.ceil(maxHours / 2) * 2;

                // Generate Y axis ticks
                const yTicks = [];
                const tickCount = 5;
                for (let i = 0; i < tickCount; i++) {
                  yTicks.push((maxHours / (tickCount - 1)) * i);
                }

                const chartDays = profile.week_days || ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const chartDates = profile.week_dates || [];

                const points = (profile.weekly_hours || []).map((val: number, i: number) => {
                  const x = paddingLeft + (i / 6) * graphWidth;
                  const y = paddingTop + graphHeight - (val / maxHours) * graphHeight;
                  return `${x},${y}`;
                });
                const dPath = `M ${points.join(' L ')}`;

                return (
                  <div style={{ position: 'relative', width: '100%', overflowX: 'visible' }}>
                    <svg 
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                      width="100%" 
                      height={chartHeight}
                      style={{ minWidth: '500px', overflow: 'visible' }}
                    >
                      {/* Grid Lines & Y-ticks */}
                      {yTicks.map((tick: number) => {
                        const y = paddingTop + graphHeight - (tick / maxHours) * graphHeight;
                        return (
                          <g key={tick}>
                            <line 
                              x1={paddingLeft} 
                              y1={y} 
                              x2={chartWidth - paddingRight} 
                              y2={y} 
                              stroke="rgba(255,255,255,0.05)" 
                              strokeWidth="1"
                            />
                            <text 
                              x={paddingLeft - 10} 
                              y={y + 4} 
                              fill="var(--text-muted)" 
                              fontSize="10" 
                              textAnchor="end"
                            >
                              {tick.toFixed(0)}h
                            </text>
                          </g>
                        );
                      })}

                      {/* X Axis ticks */}
                      {chartDays.map((day: string, i: number) => {
                        const x = paddingLeft + (i / 6) * graphWidth;
                        return (
                          <g key={day}>
                            <line 
                              x1={x} 
                              y1={paddingTop} 
                              x2={x} 
                              y2={paddingTop + graphHeight} 
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="1"
                            />
                            <text 
                              x={x} 
                              y={paddingTop + graphHeight + 18} 
                              fill="var(--text-secondary)" 
                              fontSize="11" 
                              fontWeight="600"
                              textAnchor="middle"
                            >
                              {day}
                            </text>
                            <text 
                              x={x} 
                              y={paddingTop + graphHeight + 32} 
                              fill="var(--text-muted)" 
                              fontSize="9" 
                              textAnchor="middle"
                            >
                              {chartDates[i] ? chartDates[i].substring(5) : ''}
                            </text>
                          </g>
                        );
                      })}

                      {/* User Path */}
                      <path 
                        d={dPath} 
                        fill="none" 
                        stroke="var(--color-primary)" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ 
                          filter: `drop-shadow(0px 2px 4px rgba(139, 92, 246, 0.4))`
                        }}
                      />

                      {/* Dots at each point */}
                      {(profile.weekly_hours || []).map((val: number, i: number) => {
                        const x = paddingLeft + (i / 6) * graphWidth;
                        const y = paddingTop + graphHeight - (val / maxHours) * graphHeight;
                        return (
                          <circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r="5" 
                            fill="var(--background-card)" 
                            stroke="var(--color-primary)" 
                            strokeWidth="2.5" 
                            style={{ cursor: 'pointer', transition: 'r 0.1s ease' }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                              if (rect) {
                                const pageX = e.clientX - rect.left;
                                const pageY = e.clientY - rect.top;
                                setHoveredPoint({
                                  x: pageX,
                                  y: pageY,
                                  date: `${chartDays[i]} ${chartDates[i] ? chartDates[i] : ''}`,
                                  hours: val
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}
                    </svg>

                    {hoveredPoint && (
                      <div style={{
                        position: 'absolute',
                        left: `${hoveredPoint.x}px`,
                        top: `${hoveredPoint.y - 75}px`,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        pointerEvents: 'none',
                        zIndex: 10,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)',
                        minWidth: '110px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.1s ease'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hoveredPoint.date}</div>
                        <div style={{ marginTop: '0.3rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                          {formatHours(hoveredPoint.hours)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  No logged hours details.
                </div>
              )}
            </div>

            {/* Assigned Tech roadmaps */}
            <div className="glass-card">
              <h3 className="section-title">Assigned Learning Roadmap</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {profile?.assigned_technologies?.length > 0 ? (
                  profile.assigned_technologies.map((tech: any) => (
                    <div key={tech.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{tech.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {tech.completed_topics} / {tech.total_topics} Topics Completed
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {tech.total_topics > 0 ? Math.round((tech.completed_topics / tech.total_topics) * 100) : 0}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: '1rem 0' }}>
                    <p>No technologies assigned.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}

// ============================================================================
// ADMIN PAGE: USER MANAGEMENT
// ============================================================================

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState<'create' | 'edit' | 'reset-pwd' | 'profile' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const { showSuccess, showError, ToastComponent } = useToast();

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [primaryTeam, setPrimaryTeam] = useState('');
  const [secondaryTeam, setSecondaryTeam] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(10);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await api.adminGetUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('user');
    setPrimaryTeam('');
    setSecondaryTeam('');
    setIsActive(true);
    setWeeklyTargetHours(10);
    setShowCreatePassword(false);
    setShowModal('create');
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setFullName(u.full_name);
    setUsername(u.username);
    setEmail(u.email);
    setRole(u.role);
    setPrimaryTeam(u.primary_team || '');
    setSecondaryTeam(u.secondary_team || '');
    setIsActive(u.is_active);
    setWeeklyTargetHours(u.weekly_target_hours || 10);
    setShowModal('edit');
  };

  const openResetPwdModal = (u: User) => {
    setSelectedUser(u);
    setPassword('');
    setShowResetPassword(false);
    setShowModal('reset-pwd');
  };

  const openProfileModal = async (u: User) => {
    setSelectedUser(u);
    setSelectedProfile(null);
    setShowModal('profile');
    try {
      const p = await api.adminGetUserProfile(u.id);
      setSelectedProfile(p);
    } catch (err) {
      showError('Failed to load user profile');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !email || !password) {
      showError('All fields are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.adminCreateUser({
        full_name: fullName,
        username,
        email,
        password,
        role,
        primary_team: primaryTeam || null,
        secondary_team: secondaryTeam || null,
        is_active: isActive,
        weekly_target_hours: weeklyTargetHours
      });
      showSuccess('User successfully created!');
      setShowModal(null);
      fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!fullName || !username || !email) {
      showError('All fields are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.adminUpdateUser(selectedUser.id, {
        full_name: fullName,
        username,
        email,
        role,
        primary_team: primaryTeam || null,
        secondary_team: secondaryTeam || null,
        is_active: isActive,
        weekly_target_hours: weeklyTargetHours
      });
      showSuccess('User profile successfully updated!');
      setShowModal(null);
      fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password) return;

    setSubmitting(true);
    try {
      await api.adminResetPassword(selectedUser.id, password);
      showSuccess('Password successfully reset!');
      setShowModal(null);
    } catch (err: any) {
      showError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Are you sure you want to delete user: ${u.full_name}?`)) return;

    try {
      await api.adminDeleteUser(u.id);
      showSuccess('User successfully deleted');
      fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Failed to delete user');
    }
  };

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">User Management</h1>
          <span className="page-subtitle">Configure team credentials, assign organizational teams, and manage active directory profiles.</span>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* CREATE MODAL */}
      {showModal === 'create' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Create New User</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-name">Full Name</label>
                <input id="new-name" type="text" className="form-input" placeholder="e.g. Rahul Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-user">Username</label>
                <input id="new-user" type="text" className="form-input" placeholder="e.g. rahul" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-email">Email Address</label>
                <input id="new-email" type="email" className="form-input" placeholder="e.g. rahul@tracker.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="new-pwd" 
                    type={showCreatePassword ? "text" : "password"} 
                    className="form-input" 
                    style={{ paddingRight: '2.5rem' }}
                    placeholder="Enter secure password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={submitting} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-role">Role</label>
                <select id="new-role" className="form-input form-select" value={role} onChange={(e) => setRole(e.target.value as any)} disabled={submitting}>
                  <option value="user">Team Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-primary-team">Primary Team</label>
                  <input id="new-primary-team" type="text" className="form-input" placeholder="e.g. Backend Dev" value={primaryTeam} onChange={(e) => setPrimaryTeam(e.target.value)} disabled={submitting} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-secondary-team">Secondary Team (Optional)</label>
                  <input id="new-secondary-team" type="text" className="form-input" placeholder="e.g. Frontend Dev" value={secondaryTeam} onChange={(e) => setSecondaryTeam(e.target.value)} disabled={submitting} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-target-hours">Weekly Target Hours</label>
                <input 
                  id="new-target-hours" 
                  type="number" 
                  className="form-input" 
                  min={1} 
                  max={168} 
                  value={weeklyTargetHours} 
                  onChange={(e) => setWeeklyTargetHours(parseInt(e.target.value) || 10)} 
                  disabled={submitting} 
                  required 
                />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input id="new-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={submitting} />
                <label className="form-label" htmlFor="new-active" style={{ cursor: 'pointer' }}>Is Active Profile</label>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showModal === 'edit' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit User Details</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Full Name</label>
                <input id="edit-name" type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-user">Username</label>
                <input id="edit-user" type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-email">Email Address</label>
                <input id="edit-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-role">Role</label>
                <select id="edit-role" className="form-input form-select" value={role} onChange={(e) => setRole(e.target.value as any)} disabled={submitting}>
                  <option value="user">Team Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-primary-team">Primary Team</label>
                  <input id="edit-primary-team" type="text" className="form-input" value={primaryTeam} onChange={(e) => setPrimaryTeam(e.target.value)} disabled={submitting} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-secondary-team">Secondary Team (Optional)</label>
                  <input id="edit-secondary-team" type="text" className="form-input" value={secondaryTeam} onChange={(e) => setSecondaryTeam(e.target.value)} disabled={submitting} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-target-hours">Weekly Target Hours</label>
                <input 
                  id="edit-target-hours" 
                  type="number" 
                  className="form-input" 
                  min={1} 
                  max={168} 
                  value={weeklyTargetHours} 
                  onChange={(e) => setWeeklyTargetHours(parseInt(e.target.value) || 10)} 
                  disabled={submitting} 
                  required 
                />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input id="edit-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={submitting} />
                <label className="form-label" htmlFor="edit-active" style={{ cursor: 'pointer' }}>Is Active Profile</label>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showModal === 'reset-pwd' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Reset Password: {selectedUser.username}</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPwd}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-pwd-val">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="reset-pwd-val" 
                    type={showResetPassword ? "text" : "password"} 
                    className="form-input" 
                    style={{ paddingRight: '2.5rem' }}
                    placeholder="Enter new password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={submitting} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Resetting...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROFILE PROFILE MODAL */}
      {showModal === 'profile' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="modal-title">Complete Developer Profile</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>

            {selectedProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                    {selectedProfile.user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>{selectedProfile.user.full_name}</h2>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      @{selectedProfile.user.username} • {selectedProfile.user.email}
                    </span>
                  </div>
                </div>

                {/* Grid stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Hours</span>
                    <strong style={{ display: 'block', color: 'var(--color-primary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                      {formatHours(selectedProfile.total_hours)}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Streak</span>
                    <strong style={{ display: 'block', color: 'var(--color-warning)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                      {selectedProfile.current_streak} days
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Topics Done</span>
                    <strong style={{ display: 'block', color: 'var(--color-success)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                      {selectedProfile.completed_topics_count}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rank</span>
                    <strong style={{ display: 'block', color: 'var(--color-secondary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                      #{selectedProfile.rank}
                    </strong>
                  </div>
                </div>

                {/* Roadmaps */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned Technologies</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedProfile.assigned_technologies.map((tech: any) => (
                      <div key={tech.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <span>{tech.name}</span>
                        <strong style={{ color: 'var(--color-secondary)' }}>{tech.completed_topics} / {tech.total_topics} topics done</strong>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            )}
          </div>
        </div>
      )}

      {/* USERS LIST TABLE */}
      <div className="glass-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : users.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Developer</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                          {u.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td>@{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.team || '—'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-archived'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => openProfileModal(u)}>
                          Profile
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => openEditModal(u)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => openResetPwdModal(u)}>
                          <Lock size={12} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.35rem' }} onClick={() => handleDelete(u)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No users registered</h3>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ============================================================================
// ADMIN PAGE: ROADMAP & TECH MANAGEMENT
// ============================================================================

export function AdminRoadmaps() {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState<'tech' | 'assign' | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { showSuccess, showError, ToastComponent } = useToast();

  // Tech Form Inputs
  const [techName, setTechName] = useState('');
  const [techDesc, setTechDesc] = useState('');
  const [topicsText, setTopicsText] = useState(''); // comma-separated or newline list

  // Roadmap Assignments Inputs
  const [assignedTechIds, setAssignedTechIds] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      const t = await api.getTechnologies();
      const u = await api.adminGetUsers();
      setTechs(t);
      setUsers(u.filter(user => user.role === 'user'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateTechModal = () => {
    setSelectedTech(null);
    setTechName('');
    setTechDesc('');
    setTopicsText('');
    setShowModal('tech');
  };

  const openEditTechModal = (t: Technology) => {
    setSelectedTech(t);
    setTechName(t.name);
    setTechDesc(t.description || '');
    setTopicsText(t.topics.map(x => x.name).join('\n'));
    setShowModal('tech');
  };

  const openAssignModal = async (u: User) => {
    setSelectedUser(u);
    setAssignedTechIds([]);
    setShowModal('assign');
    
    try {
      const res = await api.adminGetUserProfile(u.id);
      const assignedIds = res.assigned_technologies.map((t: any) => t.id);
      setAssignedTechIds(assignedIds);
    } catch (err) {
      showError('Failed to fetch assigned technologies');
    }
  };

  const handleTechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName) {
      showError('Technology Name is required');
      return;
    }

    // Split topics by newline or comma and clean whitespaces
    const topicsList = topicsText
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    setSubmitting(true);
    try {
      if (selectedTech) {
        await api.adminUpdateTech(selectedTech.id, {
          name: techName,
          description: techDesc || null,
          topics: topicsList
        });
        showSuccess('Technology updated successfully!');
      } else {
        await api.adminCreateTech({
          name: techName,
          description: techDesc || null,
          topics: topicsList
        });
        showSuccess('Technology created successfully!');
      }
      setShowModal(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to process technology');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      await api.adminAssignRoadmap(selectedUser.id, assignedTechIds);
      showSuccess(`Roadmap updated for ${selectedUser.full_name}`);
      setShowModal(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to assign roadmap');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckTech = (techId: number, checked: boolean) => {
    if (checked) {
      setAssignedTechIds([...assignedTechIds, techId]);
    } else {
      setAssignedTechIds(assignedTechIds.filter(id => id !== techId));
    }
  };

  const handleDeleteTech = async (t: Technology) => {
    if (!window.confirm(`Are you sure you want to delete ${t.name}? All topics and completions will be lost.`)) return;

    try {
      await api.adminDeleteTech(t.id);
      showSuccess('Technology deleted');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete technology');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Roadmap & Technology Management</h1>
          <span className="page-subtitle">Configure curriculum roadmaps, register core technologies, and assign syllabus checklist topics to developers.</span>
        </div>
        <button className="btn btn-primary" onClick={openCreateTechModal}>
          <Plus size={18} /> Add Tech
        </button>
      </div>

      {/* CREATE/EDIT TECH MODAL */}
      {showModal === 'tech' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedTech ? 'Edit Technology' : 'Create Technology'}</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleTechSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="tech-name-input">Technology Name</label>
                <input id="tech-name-input" type="text" className="form-input" placeholder="e.g. FastAPI" value={techName} onChange={(e) => setTechName(e.target.value)} disabled={submitting} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="tech-desc-input">Description</label>
                <input id="tech-desc-input" type="text" className="form-input" placeholder="Brief tagline..." value={techDesc} onChange={(e) => setTechDesc(e.target.value)} disabled={submitting} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="tech-topics-input">Topics (One per line)</label>
                <textarea 
                  id="tech-topics-input"
                  rows={8}
                  placeholder="Variables&#10;Loops&#10;Functions&#10;OOP"
                  className="form-input" 
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  value={topicsText} 
                  onChange={(e) => setTopicsText(e.target.value)} 
                  disabled={submitting}
                />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : selectedTech ? 'Save Changes' : 'Create Technology'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROADMAP ASSIGNMENT MODAL */}
      {showModal === 'assign' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="modal-title">Assign Roadmap: {selectedUser.full_name}</h3>
              <button className="btn-close" onClick={() => setShowModal(null)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAssignSubmit} style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
                {techs.map((tech) => (
                  <div key={tech.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <input 
                      id={`tech-chk-${tech.id}`}
                      type="checkbox" 
                      style={{ width: '16px', height: '16px' }}
                      checked={assignedTechIds.includes(tech.id)}
                      onChange={(e) => handleCheckTech(tech.id, e.target.checked)}
                      disabled={submitting}
                    />
                    <label htmlFor={`tech-chk-${tech.id}`} style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{tech.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.topics.length} topics total</span>
                    </label>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={submitting}>
                {submitting ? 'Assigning...' : 'Save Assignments'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRID LAYOUT: LEFT = TECH LIST, RIGHT = USER ROADMAP ASSIGNMENT TRIGGERS */}
      <div className="dash-grid-details">
        {/* Technologies List */}
        <div className="glass-card section-card">
          <h3 className="section-title">Registered Technologies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {techs.length > 0 ? (
              techs.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t.name}</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {t.topics.length} checklist topics registered
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openEditTechModal(t)}>
                      Edit Tech
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteTech(t)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <BookOpen size={32} className="empty-icon" />
                <p>No technologies registered.</p>
              </div>
            )}
          </div>
        </div>

        {/* User Roadmaps */}
        <div className="glass-card section-card">
          <h3 className="section-title">Developer Assignments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {users.length > 0 ? (
              users.map((u) => (
                <div 
                  key={u.id} 
                  className="glass-card" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem', 
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', flexShrink: 0 }}>
                      {u.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>{u.full_name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{u.username} • {u.team || 'Developer'}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }} 
                    onClick={() => openAssignModal(u)}
                  >
                    Edit Roadmap
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Users size={32} className="empty-icon" />
                <p>No team members registered yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// ADMIN PAGE: SETTINGS & NOTIFICATIONS LOGS
// ============================================================================

export function AdminSettings() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();

  // Form states
  const [deadline, setDeadline] = useState('');
  const [reminder, setReminder] = useState('');
  const [grace, setGrace] = useState('');

  // SMTP States
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // Broadcast States
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Log Selection & Deletion States
  const [visibleLogsCount, setVisibleLogsCount] = useState(10);
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [deletingLogs, setDeletingLogs] = useState(false);

  // Developer Target configuration states
  const [users, setUsers] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState<number | ''>('');
  const [targetHours, setTargetHours] = useState<number>(10);
  const [updatingTarget, setUpdatingTarget] = useState(false);

  const fetchData = async () => {
    try {
      const s = await api.adminGetSettings();
      const l = await api.adminGetEmailLogs();
      const u = await api.adminGetUsers();
      
      setDeadline(s.daily_log_deadline);
      setReminder(s.reminder_time);
      setGrace(s.grace_period_minutes.toString());
      setSmtpHost(s.smtp_host || 'smtp.gmail.com');
      setSmtpPort((s.smtp_port || 587).toString());
      setSmtpUser(s.smtp_user || '');
      setSmtpPassword(s.smtp_password || '');
      setEmailLogs(l);
      setSelectedLogIds([]); // Clear selections on refresh
      
      setUsers(u);
      if (u.length > 0) {
        setTargetUserId(u[0].id);
        setTargetHours(u[0].weekly_target_hours || 10);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline || !reminder || !grace) {
      showError('Please fill in all fields');
      return;
    }

    const g = parseInt(grace);
    if (isNaN(g) || g < 0 || g > 120) {
      showError('Grace period must be between 0 and 120 minutes');
      return;
    }

    const p = parseInt(smtpPort);
    if (isNaN(p) || p <= 0) {
      showError('SMTP port must be a valid positive number');
      return;
    }

    setSaving(true);
    try {
      await api.adminUpdateSettings({
        daily_log_deadline: deadline,
        reminder_time: reminder,
        grace_period_minutes: g,
        smtp_host: smtpHost,
        smtp_port: p,
        smtp_user: smtpUser,
        smtp_password: smtpPassword
      });
      showSuccess('System settings successfully updated!');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastBody) {
      showError('Please enter both subject and message body');
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await api.triggerBroadcast(broadcastSubject, broadcastBody);
      showSuccess(res.detail);
      setBroadcastSubject('');
      setBroadcastBody('');
      fetchData(); // Refresh email logs to show sent outbox
    } catch (err: any) {
      showError(err.message || 'Failed to send broadcast email. Verify your SMTP settings.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteSelectedLogs = async () => {
    if (selectedLogIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedLogIds.length} selected email logs?`)) return;
    
    setDeletingLogs(true);
    try {
      await api.adminDeleteEmailLogs(selectedLogIds, false);
      showSuccess('Selected email logs deleted successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete selected logs');
    } finally {
      setDeletingLogs(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL email logs? This cannot be undone.')) return;
    
    setDeletingLogs(true);
    try {
      await api.adminDeleteEmailLogs(undefined, true);
      showSuccess('All email logs cleared successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to clear email logs');
    } finally {
      setDeletingLogs(false);
    }
  };

  const handleToggleLogSelection = (id: number) => {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter(logId => logId !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  };

  const handleTargetUserChange = (userId: number) => {
    setTargetUserId(userId);
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setTargetHours(selected.weekly_target_hours || 10);
    }
  };

  const handleSaveTargetHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    const selected = users.find(u => u.id === targetUserId);
    if (!selected) return;

    setUpdatingTarget(true);
    try {
      await api.adminUpdateUser(targetUserId, {
        full_name: selected.full_name,
        username: selected.username,
        email: selected.email,
        role: selected.role,
        primary_team: selected.primary_team || null,
        secondary_team: selected.secondary_team || null,
        is_active: selected.is_active,
        weekly_target_hours: targetHours
      });
      showSuccess(`Weekly target hours updated for ${selected.full_name}!`);
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, weekly_target_hours: targetHours } : u));
    } catch (err: any) {
      showError(err.message || 'Failed to update target hours');
    } finally {
      setUpdatingTarget(false);
    }
  };

  const handleSelectAllVisibleLogs = (visibleLogIds: number[]) => {
    const allSelected = visibleLogIds.every(id => selectedLogIds.includes(id));
    if (allSelected) {
      setSelectedLogIds(selectedLogIds.filter(id => !visibleLogIds.includes(id)));
    } else {
      const newSelections = [...selectedLogIds];
      visibleLogIds.forEach(id => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      setSelectedLogIds(newSelections);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">System Settings & Audits</h1>
          <span className="page-subtitle">Configure daily deadlines, reminder windows, and inspect system email delivery logs.</span>
        </div>
      </div>

      <div className="dash-grid-details">
        {/* Left Column: Settings Configuration & Broadcast */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-card section-card">
            <h3 className="section-title">
              <Sliders size={18} style={{ color: 'var(--color-primary)' }} /> System Configuration
            </h3>
            
            <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="deadline-input">Daily Log Submission Deadline</label>
                <input 
                  id="deadline-input"
                  type="text" 
                  placeholder="22:00"
                  className="form-input" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={saving}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format: HH:MM (24-hour clock)</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reminder-input">Reminder Send Time</label>
                <input 
                  id="reminder-input"
                  type="text" 
                  placeholder="21:30"
                  className="form-input" 
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  disabled={saving}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format: HH:MM (24-hour clock)</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="grace-input">Grace Period (Minutes)</label>
                <input 
                  id="grace-input"
                  type="number" 
                  className="form-input" 
                  value={grace}
                  onChange={(e) => setGrace(e.target.value)}
                  disabled={saving}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minutes to allow logs past deadline</span>
              </div>

              {/* SMTP Settings Segment */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
                <h4 className="section-title" style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} style={{ color: 'var(--color-secondary)' }} /> Admin Gmail SMTP Server
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                  Provide the Gmail address and a 16-character Google <strong>App Password</strong> (generate this in Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords) to send real outbox notifications.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp-host-input">SMTP Server Host</label>
                  <input 
                    id="smtp-host-input"
                    type="text" 
                    className="form-input" 
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp-port-input">SMTP Server Port</label>
                  <input 
                    id="smtp-port-input"
                    type="number" 
                    className="form-input" 
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp-user-input">Sender Gmail Address (Admin)</label>
                  <input 
                    id="smtp-user-input"
                    type="email" 
                    placeholder="e.g. your-admin-email@gmail.com"
                    className="form-input" 
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp-password-input">Google App Password (16 chars)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      id="smtp-password-input"
                      type={showSmtpPassword ? "text" : "password"} 
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="form-input" 
                      style={{ paddingRight: '2.5rem' }}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>

          {/* Developer Weekly Targets Card */}
          <div className="glass-card section-card">
            <h3 className="section-title">
              <Clock size={18} style={{ color: 'var(--color-primary)' }} /> Developer Weekly Targets
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Configure custom weekly target hours for individual developers. The default is 10 hours.
            </p>
            
            <form onSubmit={handleSaveTargetHours}>
              <div className="form-group">
                <label className="form-label" htmlFor="target-user-select">Select Developer</label>
                <select 
                  id="target-user-select" 
                  className="form-input form-select" 
                  value={targetUserId} 
                  onChange={(e) => handleTargetUserChange(Number(e.target.value))}
                  disabled={updatingTarget}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (@{u.username}) — Current: {u.weekly_target_hours || 10}h
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="target-hours-input">Weekly Target Hours</label>
                <input 
                  id="target-hours-input"
                  type="number" 
                  className="form-input" 
                  min={1}
                  max={168}
                  value={targetHours}
                  onChange={(e) => setTargetHours(parseInt(e.target.value) || 10)}
                  disabled={updatingTarget}
                />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={updatingTarget}>
                {updatingTarget ? 'Saving...' : 'Update Target Hours'}
              </button>
            </form>
          </div>

          {/* Broadcast Form Card */}
          <div className="glass-card section-card">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} style={{ color: 'var(--color-secondary)' }} /> Broadcast Manual Email
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Send an instant custom email broadcast to all active members in the team using the SMTP credentials configured above.
            </p>
            <form onSubmit={handleBroadcastSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="broadcast-subject">Subject</label>
                <input 
                  id="broadcast-subject"
                  type="text" 
                  placeholder="e.g. Urgent Update: Submit your pending logs"
                  className="form-input" 
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  disabled={sendingBroadcast}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="broadcast-body">Message Content</label>
                <textarea 
                  id="broadcast-body"
                  placeholder="Write your email body here..."
                  className="form-input" 
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  disabled={sendingBroadcast}
                />
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '1rem' }} 
                type="submit" 
                disabled={sendingBroadcast || !broadcastSubject || !broadcastBody}
              >
                {sendingBroadcast ? 'Sending Broadcast...' : 'Broadcast Email to All Users'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Email logs */}
        <div className="glass-card section-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '650px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <Mail size={18} style={{ color: 'var(--color-secondary)' }} /> Outbox Mail Logs (SMTP)
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                onClick={handleDeleteSelectedLogs}
                disabled={selectedLogIds.length === 0 || deletingLogs}
              >
                Delete Selected ({selectedLogIds.length})
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                onClick={handleDeleteAllLogs}
                disabled={emailLogs.length === 0 || deletingLogs}
              >
                Delete All
              </button>
            </div>
          </div>
          
          {emailLogs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <input 
                type="checkbox"
                id="select-all-visible"
                checked={emailLogs.slice(0, visibleLogsCount).every(log => selectedLogIds.includes(log.id))}
                onChange={() => handleSelectAllVisibleLogs(emailLogs.slice(0, visibleLogsCount).map(l => l.id))}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="select-all-visible" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Select All Visible ({Math.min(visibleLogsCount, emailLogs.length)})
              </label>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '550px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {emailLogs.length > 0 ? (
              emailLogs.slice(0, visibleLogsCount).map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                  <div style={{ paddingTop: '0.15rem' }}>
                    <input 
                      type="checkbox"
                      checked={selectedLogIds.includes(log.id)}
                      onChange={() => handleToggleLogSelection(log.id)}
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <strong style={{ color: 'var(--color-secondary)' }}>To: {log.recipient_email}</strong>
                      <span style={{ 
                        color: log.status === 'Sent' ? 'var(--color-success)' : 'rgb(239, 68, 68)', 
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        {log.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{log.subject}</div>
                    <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace', padding: '0.4rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>{log.body}</p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '3rem 0' }}>
                <Mail size={32} className="empty-icon" />
                <p>No emails logged in outbox.</p>
              </div>
            )}
          </div>

          {emailLogs.length > visibleLogsCount && (
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', padding: '0.5rem' }} 
              onClick={() => setVisibleLogsCount(prev => prev + 10)}
            >
              Load More Logs
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: ADMIN USER PERFORMANCE
// ============================================================================

export function AdminPerformance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleUsers, setVisibleUsers] = useState<Record<number, boolean>>({});
  const { showError, ToastComponent } = useToast();

  // Filters and tooltips states
  const getTodayISTString = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [perfDate, setPerfDate] = useState<string>(getTodayISTString());
  const [chartUserFilter, setChartUserFilter] = useState<number | 'all'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    userName: string;
    date: string;
    hours: number;
    color: string;
  } | null>(null);

  // Table real-time filters
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Checklist panel states
  const [checklistUserId, setChecklistUserId] = useState<number | null>(null);
  const [checklistProfile, setChecklistProfile] = useState<any>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const fetchPerformance = async (offset = weekOffset, pDate = perfDate) => {
    try {
      const res = await api.adminGetPerformance(offset, pDate);
      setData(res);
      // Initialize all users as visible in chart
      if (res && res.users_performance) {
        const visibility: Record<number, boolean> = {};
        res.users_performance.forEach((user: any) => {
          visibility[user.user_id] = true;
        });
        setVisibleUsers(visibility);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch user performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPerformance(weekOffset, perfDate);
  }, [weekOffset, perfDate]);

  // Set default checklist user
  useEffect(() => {
    if (data && data.users_performance && data.users_performance.length > 0 && !checklistUserId) {
      setChecklistUserId(data.users_performance[0].user_id);
    }
  }, [data]);

  // Fetch checklist profile when selected user changes
  useEffect(() => {
    const fetchChecklist = async () => {
      if (!checklistUserId) return;
      setChecklistLoading(true);
      try {
        const p = await api.adminGetUserProfile(checklistUserId);
        setChecklistProfile(p);
      } catch (err) {
        console.error(err);
      } finally {
        setChecklistLoading(false);
      }
    };
    fetchChecklist();
  }, [checklistUserId]);

  const isUserVisibleOnChart = (userId: number) => {
    if (chartUserFilter !== 'all') {
      return chartUserFilter === userId;
    }
    return visibleUsers[userId];
  };

  const toggleUserVisibility = (userId: number) => {
    setVisibleUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!data) return <Layout><div className="empty-state"><p>No performance data available.</p></div></Layout>;

  // Filtered users for table
  const filteredUsers = data.users_performance.filter((user: any) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const userTeams = [];
    if (user.primary_team) userTeams.push(user.primary_team.toLowerCase());
    if (user.secondary_team) userTeams.push(user.secondary_team.toLowerCase());
    const matchesTeam = selectedTeam === 'all' || userTeams.includes(selectedTeam.toLowerCase());

    const matchesStatus = selectedStatus === 'all' ||
                          (selectedStatus === 'logged' && user.has_logged_today) ||
                          (selectedStatus === 'not_logged' && !user.has_logged_today);

    const matchesCategory = selectedCategory === 'all' ||
                            (user.has_logged_today && user.today_log?.category?.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesTeam && matchesStatus && matchesCategory;
  });

  // SVG Chart Configuration
  const days = data.week_days; // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const dates = data.week_dates; // dates strings
  const chartWidth = 700;
  const chartHeight = 300;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Find max hours logged by any visible user to scale Y axis
  let maxHours = 8; // default minimum Y-max
  data.users_performance.forEach((user: any) => {
    if (isUserVisibleOnChart(user.user_id)) {
      const userMax = Math.max(...user.weekly_hours, 0);
      if (userMax > maxHours) {
        maxHours = userMax;
      }
    }
  });
  // Round up to nearest even number
  maxHours = Math.ceil(maxHours / 2) * 2;

  // Generate Y axis tick labels
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i < tickCount; i++) {
    yTicks.push((maxHours / (tickCount - 1)) * i);
  }

  // Predefined line colors for users
  const colors = [
    '#8B5CF6', // violet
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#A855F7', // purple
  ];

  const getUserColor = (index: number) => {
    return colors[index % colors.length];
  };

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">User Performance Panel</h1>
          <span className="page-subtitle">Track daily hourly logging, see today's status, and monitor team performance.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* CHART SECTION */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <TrendingUp size={18} /> Daily Logging Hours Chart
            </h3>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Week:</span>
                <select
                  value={weekOffset}
                  onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0} style={{ background: '#1e1b4b' }}>Current Week</option>
                  <option value={1} style={{ background: '#1e1b4b' }}>1 Week Ago</option>
                  <option value={2} style={{ background: '#1e1b4b' }}>2 Weeks Ago</option>
                  <option value={3} style={{ background: '#1e1b4b' }}>3 Weeks Ago</option>
                  <option value={4} style={{ background: '#1e1b4b' }}>4 Weeks Ago</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Developer:</span>
                <select
                  value={chartUserFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChartUserFilter(val === 'all' ? 'all' : Number(val));
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>All Developers</option>
                  {data.users_performance.map((u: any) => (
                    <option key={u.user_id} value={u.user_id} style={{ background: '#1e1b4b' }}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ position: 'relative', width: '100%', overflowX: 'visible' }}>
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              width="100%" 
              height={chartHeight}
              style={{ minWidth: '600px', overflow: 'visible' }}
            >
              {/* Grid Lines & Y-ticks */}
              {yTicks.map((tick: number) => {
                const y = paddingTop + graphHeight - (tick / maxHours) * graphHeight;
                return (
                  <g key={tick}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={chartWidth - paddingRight} 
                      y2={y} 
                      stroke="rgba(255,255,255,0.05)" 
                      strokeWidth="1"
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      fill="var(--text-muted)" 
                      fontSize="10" 
                      textAnchor="end"
                    >
                      {tick.toFixed(0)}h
                    </text>
                  </g>
                );
              })}

              {/* X Axis ticks */}
              {days.map((day: string, i: number) => {
                const x = paddingLeft + (i / 6) * graphWidth;
                return (
                  <g key={day}>
                    <line 
                      x1={x} 
                      y1={paddingTop} 
                      x2={x} 
                      y2={paddingTop + graphHeight} 
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                    <text 
                      x={x} 
                      y={paddingTop + graphHeight + 18} 
                      fill="var(--text-secondary)" 
                      fontSize="11" 
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {day}
                    </text>
                    <text 
                      x={x} 
                      y={paddingTop + graphHeight + 32} 
                      fill="var(--text-muted)" 
                      fontSize="9" 
                      textAnchor="middle"
                    >
                      {dates[i] ? dates[i].substring(5) : ''}
                    </text>
                  </g>
                );
              })}

              {/* User Line Paths */}
              {data.users_performance.map((user: any, userIdx: number) => {
                if (!isUserVisibleOnChart(user.user_id)) return null;
                const color = getUserColor(userIdx);
                
                // Construct path coordinates
                const points = user.weekly_hours.map((val: number, i: number) => {
                  const x = paddingLeft + (i / 6) * graphWidth;
                  const y = paddingTop + graphHeight - (val / maxHours) * graphHeight;
                  return `${x},${y}`;
                });
                const dPath = `M ${points.join(' L ')}`;

                return (
                  <g key={user.user_id}>
                    {/* Line */}
                    <path 
                      d={dPath} 
                      fill="none" 
                      stroke={color} 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ 
                        transition: 'all 0.3s ease',
                        filter: `drop-shadow(0px 2px 4px rgba(0,0,0,0.3))`
                      }}
                    />
                    {/* Dots at each point */}
                    {user.weekly_hours.map((val: number, i: number) => {
                      const x = paddingLeft + (i / 6) * graphWidth;
                      const y = paddingTop + graphHeight - (val / maxHours) * graphHeight;
                      return (
                        <circle 
                          key={i} 
                          cx={x} 
                          cy={y} 
                          r="5" 
                          fill="var(--background-card)" 
                          stroke={color} 
                          strokeWidth="2.5" 
                          style={{ cursor: 'pointer', transition: 'r 0.1s ease' }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            if (rect) {
                              const pageX = e.clientX - rect.left;
                              const pageY = e.clientY - rect.top;
                              setHoveredPoint({
                                x: pageX,
                                y: pageY,
                                userName: user.full_name,
                                date: `${days[i]} ${dates[i] ? dates[i] : ''}`,
                                hours: val,
                                color
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <title>{`${user.full_name}: ${formatHours(val)} (${days[i]} ${dates[i]})`}</title>
                        </circle>
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div style={{
                position: 'absolute',
                left: `${hoveredPoint.x}px`,
                top: `${hoveredPoint.y - 75}px`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${hoveredPoint.color}`,
                borderRadius: '8px',
                padding: '0.6rem 0.8rem',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)',
                minWidth: '130px',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s ease'
              }}>
                <div style={{ fontWeight: 700, color: hoveredPoint.color, marginBottom: '0.2rem' }}>{hoveredPoint.userName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hoveredPoint.date}</div>
                <div style={{ marginTop: '0.3rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                  {formatHours(hoveredPoint.hours)}
                </div>
              </div>
            )}
          </div>

          {/* LEGEND / USER TOGGLES */}
          {chartUserFilter === 'all' && (
            <div style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.75rem', 
              justifyContent: 'center' 
            }}>
              {data.users_performance.map((user: any, userIdx: number) => {
                const color = getUserColor(userIdx);
                const isVisible = visibleUsers[user.user_id];
                return (
                  <button 
                    key={user.user_id}
                    onClick={() => toggleUserVisibility(user.user_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: isVisible ? 'rgba(255,255,255,0.05)' : 'transparent',
                      border: `1px solid ${isVisible ? color : 'var(--border-color)'}`,
                      color: isVisible ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ 
                      display: 'inline-block', 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      backgroundColor: color,
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                    {user.full_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DETAILS TABLE SECTION */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Team Performance & Logs</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Log Date:</span>
                <input 
                  type="date" 
                  className="form-input"
                  value={perfDate}
                  onChange={(e) => setPerfDate(e.target.value)}
                  style={{ 
                    height: '38px', 
                    padding: '0.5rem', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    width: '160px'
                  }}
                />
              </div>
            </div>

            {/* Real-time Filters Bar */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              padding: '1rem', 
              background: 'rgba(255,255,255,0.01)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              alignItems: 'center'
            }}>
              {/* Search filter */}
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search team member..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ height: '38px', width: '100%' }}
                />
              </div>

              {/* Team filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Team:</span>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>All Teams</option>
                  {Array.from(new Set(data.users_performance.flatMap((u: any) => {
                    const teams = [];
                    if (u.primary_team) teams.push(u.primary_team);
                    if (u.secondary_team) teams.push(u.secondary_team);
                    return teams;
                  }))).map((teamName: any) => (
                    <option key={teamName} value={teamName} style={{ background: '#1e1b4b' }}>
                      {teamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>All Status</option>
                  <option value="logged" style={{ background: '#1e1b4b' }}>Logged</option>
                  <option value="not_logged" style={{ background: '#1e1b4b' }}>Not Logged</option>
                </select>
              </div>

              {/* Category filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#1e1b4b' }}>All Categories</option>
                  <option value="coding" style={{ background: '#1e1b4b' }}>Coding</option>
                  <option value="learning" style={{ background: '#1e1b4b' }}>Learning</option>
                  <option value="nothing today" style={{ background: '#1e1b4b' }}>Nothing Today</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>User Details</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Status on Date</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)', width: '40%' }}>Date's Work Log</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Avg Hours/Entry</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Total Logs</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: any, idx: number) => {
                    const color = getUserColor(data.users_performance.findIndex((u: any) => u.user_id === user.user_id));
                    return (
                      <tr 
                        key={user.user_id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                        }}
                      >
                        {/* User Details */}
                        <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            backgroundColor: color, 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</span>
                          </div>
                        </td>
                        
                        {/* Status Today */}
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: user.has_logged_today ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: user.has_logged_today ? 'var(--color-success)' : 'var(--color-danger)',
                              border: user.has_logged_today ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            {user.has_logged_today ? 'Logged' : 'Not Logged'}
                          </span>
                        </td>

                        {/* Today's Log Details */}
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          {user.has_logged_today && user.today_log ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span className={`badge badge-${user.today_log.category.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.7rem' }}>
                                  {user.today_log.category}
                                </span>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                  {formatHours(user.today_log.hours, user.today_log.minutes)}
                                </strong>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                                {user.today_log.description}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              No log submitted on this date
                            </span>
                          )}
                        </td>

                        {/* Average Hours */}
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-secondary)' }}>
                          {formatHours(user.average_hours_per_day)}
                        </td>

                        {/* Total Log Entries Count */}
                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {user.total_logs_count} entries
                        </td>

                        {/* Total Hours */}
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatHours(user.total_hours)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No team members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SYLLABUS CHECKLIST PANEL */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Developer Syllabus Progress Checklist</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                View detailed roadmap topics checklist and completion dates for the selected developer.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Select Developer:</span>
              <select
                value={checklistUserId || ''}
                onChange={(e) => setChecklistUserId(Number(e.target.value))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {data.users_performance.map((u: any) => (
                  <option key={u.user_id} value={u.user_id} style={{ background: '#1e1b4b' }}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {checklistLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : checklistProfile ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              {checklistProfile.assigned_technologies?.length > 0 ? (
                checklistProfile.assigned_technologies.map((tech: any) => (
                  <div key={tech.id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tech.name}</h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tech.description || 'No description available'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {tech.completed_topics} / {tech.total_topics} Topics ({tech.total_topics > 0 ? Math.round((tech.completed_topics / tech.total_topics) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                      <div style={{
                        width: `${tech.total_topics > 0 ? (tech.completed_topics / tech.total_topics) * 100 : 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {/* Topics Checklist Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {tech.topics?.map((topic: any, idx: number) => (
                        <div key={topic.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: topic.completed ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                          border: `1px solid ${topic.completed ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-color)'}`,
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: topic.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: topic.completed ? 'var(--color-success)' : 'var(--text-muted)'
                          }}>
                            {topic.completed ? <Check size={14} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }}></div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <span style={{ 
                              fontSize: '0.85rem', 
                              fontWeight: 600, 
                              color: topic.completed ? 'var(--text-primary)' : 'var(--text-secondary)',
                              textDecoration: topic.completed ? 'none' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {idx + 1}. {topic.name}
                            </span>
                            {topic.completed && topic.completed_at && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                Completed: {new Date(topic.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <p>No learning roadmaps assigned to this developer.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <p>No profile data available.</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}


// ==============================================================================================================
// MAIN ROOT APP COMPONENT
// ============================================================================

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/logs" element={
            <ProtectedRoute>
              <WorkLogs />
            </ProtectedRoute>
          } />

          <Route path="/roadmap" element={
            <ProtectedRoute>
              <Roadmap />
            </ProtectedRoute>
          } />

          <Route path="/projects" element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          } />

          <Route path="/projects/:project_id" element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          } />

          <Route path="/gallery" element={
            <ProtectedRoute>
              <Gallery />
            </ProtectedRoute>
          } />


          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          // /messages route removed

          {/* ADMIN ONLY ROUTES */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly={true}>
              <AdminUsers />
            </ProtectedRoute>
          } />

          <Route path="/admin/performance" element={
            <ProtectedRoute adminOnly={true}>
              <AdminPerformance />
            </ProtectedRoute>
          } />

          <Route path="/admin/roadmaps" element={
            <ProtectedRoute adminOnly={true}>
              <AdminRoadmaps />
            </ProtectedRoute>
          } />

          <Route path="/admin/settings" element={
            <ProtectedRoute adminOnly={true}>
              <AdminSettings />
            </ProtectedRoute>
          } />

          // /admin/messages route removed

          {/* FALLBACK REDIRECTS */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
