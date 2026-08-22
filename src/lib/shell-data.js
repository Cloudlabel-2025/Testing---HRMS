'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const ShellDataContext = createContext(null);

export function ShellDataProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [newsAnnouncements, setNewsAnnouncements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [employeeProfileId, setEmployeeProfileId] = useState(null);

  const refreshShellData = useCallback(async () => {
    if (!user) return;

    const loadNotifications = api.get('/api/notifications')
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {});

    const loadPendingRequests = ['super_admin', 'admin_full'].includes(user.role)
      ? api.get('/api/core/self-service-requests?status=pending')
        .then(data => setPendingRequests(Array.isArray(data?.requests) ? data.requests.length : 0))
        .catch(() => {})
      : Promise.resolve(setPendingRequests(0));

    const loadAnnouncements = api.get('/api/announcements')
      .then(data => {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const announcements = Array.isArray(data?.announcements) ? data.announcements : [];
        setNewsAnnouncements(announcements
          .filter(announcement => new Date(announcement.createdAt).getTime() >= cutoff)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => setNewsAnnouncements([]));

    await Promise.all([loadNotifications, loadPendingRequests, loadAnnouncements]);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNewsAnnouncements([]);
      setPendingRequests(0);
      setEmployeeProfileId(null);
      return;
    }

    let cancelled = false;

    void refreshShellData();
    api.get('/api/employees/me')
      .then(data => { if (!cancelled) setEmployeeProfileId(data?.employeeId || null); })
      .catch(() => {});

    const interval = setInterval(() => {
      void refreshShellData();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, refreshShellData]);

  const value = useMemo(() => ({
    notifications,
    setNotifications,
    refreshShellData,
    newsAnnouncements,
    pendingRequests,
    employeeProfileId,
  }), [notifications, refreshShellData, newsAnnouncements, pendingRequests, employeeProfileId]);

  return <ShellDataContext.Provider value={value}>{children}</ShellDataContext.Provider>;
}

export function useShellData() {
  const value = useContext(ShellDataContext);
  if (!value) throw new Error('useShellData must be used inside ShellDataProvider');
  return value;
}
