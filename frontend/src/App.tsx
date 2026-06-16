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
  Sliders,
  MessageSquare,
  Send
} from 'lucide-react';
import { api } from './services/api';
import type { User, DailyLog, RoadmapTech, Technology, Project, LeaderboardUser, EmailLog, Message } from './services/api';

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
  if (!adminOnly && user.role === 'admin' && location.pathname !== '/profile') return <Navigate to="/admin/dashboard" replace />;

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
            <Link to="/admin/messages" className={`sidebar-link ${location.pathname === '/admin/messages' ? 'active' : ''}`}>
              <MessageSquare size={18} />
              <span>Messages</span>
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
            <Link to="/messages" className={`sidebar-link ${location.pathname === '/messages' ? 'active' : ''}`}>
              <MessageSquare size={18} />
              <span>Messages</span>
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
      const dateStr = d.toISOString().split('T')[0];
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
                      title={`${d.date}: ${d.hours} hours logged`}
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
                <span style={{ color: 'var(--text-secondary)' }}>{item.value.toFixed(1)} hrs</span>
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
          <span className="stat-value">{data?.today_hours || 0} hrs</span>
          <span className="stat-desc">Coding: {data?.today_coding_hours || 0}h | Learning: {data?.today_learning_hours || 0}h</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Hours</span>
            <div className="stat-icon" style={{ color: 'var(--color-success)' }}><Clock size={18} /></div>
          </div>
          <span className="stat-value">{data?.total_hours?.toFixed(1)} hrs</span>
          <span className="stat-desc">Accumulated time</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Weekly / Monthly</span>
            <div className="stat-icon" style={{ color: 'var(--color-accent)' }}><Calendar size={18} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem' }}>
            {data?.weekly_hours.toFixed(1)} / {data?.monthly_hours.toFixed(1)}
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
          <div className="glass-card section-card" style={{ borderLeft: `4px solid ${data?.weekly_work_hours >= 10 ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
            <h3 className="section-title" style={{ border: 'none', padding: '0', marginBottom: '0.75rem' }}>
              Weekly Work Target
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Hours Logged (Coding & Learning):</span>
                <strong>{data?.weekly_work_hours?.toFixed(1)} / 10.0 hrs</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', margin: '0.25rem 0' }}>
                <div 
                  style={{ 
                    width: `${Math.min((data?.weekly_work_hours / 10) * 100, 100)}%`, 
                    height: '100%', 
                    backgroundColor: data?.weekly_work_hours >= 10 ? 'var(--color-success)' : 'var(--color-warning)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              {data?.weekly_work_hours >= 10 ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>Target Met! Excellent work this week.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
                  <span>Need {(10 - data?.weekly_work_hours).toFixed(1)} more hours to reach the 10hr target.</span>
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
  const { showSuccess, showError, ToastComponent } = useToast();

  const fetchDashboard = async () => {
    try {
      const dbData = await api.adminGetDashboard();
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

  const handleTriggerReminders = async () => {
    setTriggering('reminder');
    try {
      const res = await api.triggerReminders();
      showSuccess(res.detail);
      fetchDashboard();
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
      fetchDashboard();
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
          <span className="stat-value">{data?.total_team_hours.toFixed(1)} hrs</span>
          <span className="stat-desc">All developers combined</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Weekly Team Hours</span>
            <div className="stat-icon" style={{ color: 'var(--color-accent)' }}><TrendingUp size={18} /></div>
          </div>
          <span className="stat-value">{data?.weekly_team_hours.toFixed(1)} hrs</span>
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
                    <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700 }}>{perf.hours.toFixed(1)} hrs</span>
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
                  const metTarget = userProg.weekly_work_hours >= 10;
                  return (
                    <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{userProg.full_name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {userProg.weekly_work_hours.toFixed(1)} / 10 hrs
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
                            width: `${Math.min((userProg.weekly_work_hours / 10) * 100, 100)}%`, 
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
    
    let h = 0;
    let desc = 'Nothing Today';
    
    if (!isNothingToday) {
      const hoursVal = parseInt(logHours, 10);
      const minsVal = parseInt(logMinutes, 10);
      if (isNaN(hoursVal) || hoursVal < 0 || hoursVal > 24) {
        showError('Hours must be an integer between 0 and 24');
        return;
      }
      if (isNaN(minsVal) || minsVal < 0 || minsVal > 59) {
        showError('Minutes must be an integer between 0 and 59');
        return;
      }
      h = hoursVal + (minsVal / 60.0);
      if (h <= 0) {
        showError('Total log time must be greater than 0');
        return;
      }
      if (h > 24) {
        showError('Total log time cannot exceed 24 hours');
        return;
      }
      desc = description.trim();
    }

    setSubmitting(true);
    try {
      await api.logWork({
        date: new Date().toISOString().split('T')[0],
        category,
        hours: h,
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

  const formatHours = (hoursFloat: number) => {
    const h = Math.floor(hoursFloat);
    const m = Math.round((hoursFloat - h) * 60);
    if (h === 0 && m === 0) return '0 hrs';
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hrs`;
    return `${h}h ${m}m`;
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
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatHours(log.hours)}</td>
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
        end_date: endDate || null
      });
      showSuccess('Project created successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setStatus('Active');
      setStartDate('');
      setEndDate('');
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

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROJECTS GRID */}
      {projects.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {projects.map((proj) => (
            <div key={proj.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className={`badge badge-${proj.status.toLowerCase()}`}>{proj.status}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {proj.start_date || 'N/A'} - {proj.end_date || 'N/A'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{proj.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {proj.description || 'No description provided.'}
              </p>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours Invested</div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{proj.hours_invested.toFixed(1)} hrs</strong>
                </div>
                <Link to={`/projects/${proj.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  Open Details
                </Link>
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
    if (!project_id || !hours || !description) {
      showError('Please fill in all fields');
      return;
    }

    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) {
      showError('Hours must be a number between 0 and 24');
      return;
    }

    setSubmittingLog(true);
    try {
      await api.logProjectHours(parseInt(project_id), { hours: h, description });
      showSuccess('Hours logged and registered on your daily feed!');
      setHours('');
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
              <div className="form-group">
                <label className="form-label" htmlFor="log-hrs">Hours Invested</label>
                <input 
                  id="log-hrs"
                  type="number" 
                  step="0.5" 
                  placeholder="e.g. 3"
                  className="form-input" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                  disabled={submittingLog}
                />
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
                      <strong style={{ color: 'var(--color-secondary)' }}>{log.hours.toFixed(1)} hrs</strong>
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
              <strong style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>{project.hours_invested.toFixed(1)} hrs</strong>
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
              {sortType === 'total' ? topThree[1].total_hours : sortType === 'weekly' ? topThree[1].weekly_hours : topThree[1].monthly_hours} hrs
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
              {sortType === 'total' ? topThree[0].total_hours : sortType === 'weekly' ? topThree[0].weekly_hours : topThree[0].monthly_hours} hrs
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
              {sortType === 'total' ? topThree[2].total_hours : sortType === 'weekly' ? topThree[2].weekly_hours : topThree[2].monthly_hours} hrs
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
                      {sortType === 'total' ? row.total_hours.toFixed(1) : sortType === 'weekly' ? row.weekly_hours.toFixed(1) : row.monthly_hours.toFixed(1)} hrs
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
// PAGE: PROFILE
// ============================================================================

export function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const data = await api.adminGetUserProfile(user.id);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

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
                  {profile?.total_hours.toFixed(1)}
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
        is_active: isActive
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
        is_active: isActive
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
                      {selectedProfile.total_hours.toFixed(1)}
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

  const fetchData = async () => {
    try {
      const s = await api.adminGetSettings();
      const l = await api.adminGetEmailLogs();
      setDeadline(s.daily_log_deadline);
      setReminder(s.reminder_time);
      setGrace(s.grace_period_minutes.toString());
      setSmtpHost(s.smtp_host || 'smtp.gmail.com');
      setSmtpPort((s.smtp_port || 587).toString());
      setSmtpUser(s.smtp_user || '');
      setSmtpPassword(s.smtp_password || '');
      setEmailLogs(l);
      setSelectedLogIds([]); // Clear selections on refresh
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

  const fetchPerformance = async () => {
    try {
      const res = await api.adminGetPerformance();
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
    fetchPerformance();
  }, []);

  const toggleUserVisibility = (userId: number) => {
    setVisibleUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!data) return <Layout><div className="empty-state"><p>No performance data available.</p></div></Layout>;

  // Filtered users for table
  const filteredUsers = data.users_performance.filter((user: any) =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (visibleUsers[user.user_id]) {
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
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={18} /> Current Week Logging (Daily Hours)
          </h3>
          
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
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
                if (!visibleUsers[user.user_id]) return null;
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
                          r="4" 
                          fill="var(--background-card)" 
                          stroke={color} 
                          strokeWidth="2.5" 
                          style={{ cursor: 'pointer' }}
                        >
                          <title>{`${user.full_name}: ${val} hours (${days[i]} ${dates[i]})`}</title>
                        </circle>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* LEGEND / USER TOGGLES */}
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
        </div>

        {/* DETAILS TABLE SECTION */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Team Performance & Logs</h3>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search team member..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '38px', paddingRight: '2rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>User Details</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Today's Status</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)', width: '25%' }}>Today's Work Log</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-secondary)', width: '20%' }}>Technology Progress</th>
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
                                  {user.today_log.hours.toFixed(1)} hrs
                                </strong>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                                {user.today_log.description}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              No log submitted today
                            </span>
                          )}
                        </td>

                        {/* Technology Progress */}
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Completed: <span style={{ color: 'var(--color-primary)' }}>{user.completed_techs_count}</span> / {user.total_assigned_techs}
                            </div>
                            {user.completed_techs_count > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {user.completed_techs_list.map((techName: string) => (
                                  <span 
                                    key={techName} 
                                    className="badge badge-coding" 
                                    style={{ 
                                      fontSize: '0.65rem', 
                                      textTransform: 'none', 
                                      padding: '0.15rem 0.4rem', 
                                      backgroundColor: 'rgba(139, 92, 246, 0.08)',
                                      color: 'var(--color-primary)',
                                      border: '1px solid rgba(139, 92, 246, 0.15)'
                                    }}
                                  >
                                    {techName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                {user.total_assigned_techs > 0 ? 'Learning in progress...' : 'No roadmaps assigned'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Average Hours */}
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-secondary)' }}>
                          {user.average_hours_per_day.toFixed(1)} hrs
                        </td>

                        {/* Total Log Entries Count */}
                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {user.total_logs_count} entries
                        </td>

                        {/* Total Hours */}
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {user.total_hours.toFixed(1)} hrs
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No team members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}


// ==============================================================================================================
// PAGE: USER MESSAGES
// ==============================================================================================================

export function UserMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();

  const fetchMessages = async (skipCount = 0) => {
    try {
      if (skipCount === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const data = await api.getReceivedMessages(5, skipCount);
      if (skipCount === 0) {
        setMessages(data);
      } else {
        setMessages((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 5);
    } catch (err: any) {
      showError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMessages(0);
  }, []);

  const handleDelete = async (messageId: number) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showSuccess('Message deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete message');
    }
  };

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Received Messages</h1>
          <span className="page-subtitle">View notifications and guidelines sent by administrators.</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : messages.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="glass-card" 
                style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '1rem'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                      Admin: {msg.sender_name || 'System'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      • {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {msg.content}
                  </p>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ 
                    padding: '0.4rem', 
                    minWidth: 'auto', 
                    borderRadius: '6px', 
                    color: '#ff4d4f', 
                    borderColor: 'rgba(255, 77, 79, 0.2)' 
                  }}
                  onClick={() => handleDelete(msg.id)}
                  title="Delete message"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {hasMore && (
              <button 
                className="btn btn-outline" 
                style={{ alignSelf: 'center', marginTop: '1rem', minWidth: '150px' }} 
                onClick={() => fetchMessages(messages.length)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '3rem 0' }}>
            <MessageSquare size={48} className="empty-icon" style={{ opacity: 0.5 }} />
            <h3>No messages yet</h3>
            <p>You haven't received any messages from the admin yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}


// ==============================================================================================================
// PAGE: ADMIN MESSAGES
// ==============================================================================================================

export function AdminMessages() {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [content, setContent] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();

  const fetchUsers = async () => {
    try {
      const data = await api.adminGetUsers();
      // Filter out admin users
      setUsers(data.filter(u => u.role === 'user' && u.is_active));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSentMessages = async (skipCount = 0) => {
    try {
      if (skipCount === 0) {
        setLoadingMessages(true);
      } else {
        setLoadingMore(true);
      }
      const data = await api.getSentMessages(5, skipCount);
      if (skipCount === 0) {
        setMessages(data);
      } else {
        setMessages((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 5);
    } catch (err: any) {
      showError(err.message || 'Failed to load sent messages');
    } finally {
      setLoadingMessages(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSentMessages(0);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) {
      showError('Please select a recipient');
      return;
    }
    if (!content.trim()) {
      showError('Please type a message');
      return;
    }

    setSubmitting(true);
    try {
      const newMsg = await api.sendMessage(Number(recipientId), content.trim());
      showSuccess('Message sent successfully!');
      setContent('');
      // Prepend to messages list
      setMessages(prev => [newMsg, ...prev]);
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (messageId: number) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showSuccess('Message deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete message');
    }
  };

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Admin Messaging</h1>
          <span className="page-subtitle">Send guidelines or direct feedback to individual team members.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* SEND MESSAGE FORM */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
            <Send size={18} /> Send New Message
          </h3>
          <form onSubmit={handleSend}>
            <div className="form-group">
              <label className="form-label" htmlFor="recipient">Recipient User</label>
              {loadingUsers ? (
                <div style={{ padding: '0.5rem 0' }}>Loading users...</div>
              ) : (
                <select
                  id="recipient"
                  className="form-input form-select"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Select Recipient User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (@{u.username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="content">Message Content</label>
              <textarea
                id="content"
                rows={5}
                placeholder="Type your message here..."
                className="form-input"
                style={{ resize: 'vertical', minHeight: '100px' }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', height: '42px' }}
              disabled={submitting || loadingUsers}
            >
              <Send size={16} />
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* RECENTLY SENT LIST */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
            <MessageSquare size={18} /> Recently Sent
          </h3>
          
          {loadingMessages ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : messages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: '0.85rem' }}>
                        To: {msg.recipient_name || 'User'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {msg.content}
                    </p>
                  </div>
                  <button 
                    className="btn btn-outline" 
                    style={{ 
                      padding: '0.3rem', 
                      minWidth: 'auto', 
                      borderRadius: '5px', 
                      color: '#ff4d4f', 
                      borderColor: 'rgba(255, 77, 79, 0.15)',
                      marginTop: '0.2rem'
                    }}
                    onClick={() => handleDelete(msg.id)}
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {hasMore && (
                <button 
                  className="btn btn-outline" 
                  style={{ alignSelf: 'center', marginTop: '0.5rem', width: '100%', fontSize: '0.85rem' }} 
                  onClick={() => fetchSentMessages(messages.length)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <MessageSquare size={36} className="empty-icon" style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>No sent messages found.</p>
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


          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/messages" element={
            <ProtectedRoute>
              <UserMessages />
            </ProtectedRoute>
          } />

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

          <Route path="/admin/messages" element={
            <ProtectedRoute adminOnly={true}>
              <AdminMessages />
            </ProtectedRoute>
          } />

          {/* FALLBACK REDIRECTS */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
