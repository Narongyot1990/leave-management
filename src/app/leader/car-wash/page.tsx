'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/th';
import { Car, CalendarDays, Filter, ImageIcon, Users, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

dayjs.extend(isoWeek);
dayjs.locale('th');

interface UserInfo {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
}

interface Activity {
  _id: string;
  userId: UserInfo;
  activityType: string;
  imageUrl: string;
  caption: string;
  activityDate: string;
  activityTime: string;
  createdAt: string;
}

interface DriverOption {
  _id: string;
  lineDisplayName: string;
  name?: string;
  surname?: string;
}

export default function LeaderCarWashPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDriver, setSelectedDriver] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Image modal
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) {
      router.push('/leader/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Fetch drivers list
  useEffect(() => {
    if (!user) return;
    fetch('/api/users?status=active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDrivers(data.users || []);
      })
      .catch(console.error);
  }, [user]);

  // Fetch activities
  useEffect(() => {
    if (!user) return;
    fetchActivities();
  }, [user, selectedDriver, startDate, endDate]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDriver) params.set('userId', selectedDriver);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/car-wash?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const today = dayjs().startOf('day');
  const weekStart = dayjs().startOf('isoWeek');
  const monthStart = dayjs().startOf('month');

  const todayCount = activities.filter((a) => dayjs(a.activityDate).isSame(today, 'day')).length;
  const weekCount = activities.filter((a) => dayjs(a.activityDate).isAfter(weekStart.subtract(1, 'day'))).length;
  const monthCount = activities.filter((a) => dayjs(a.activityDate).isAfter(monthStart.subtract(1, 'day'))).length;

  const getDriverName = (u: UserInfo) => {
    if (u.name && u.surname) return `${u.name} ${u.surname}`;
    return u.lineDisplayName || 'Unknown';
  };

  const clearFilters = () => {
    setSelectedDriver('');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = selectedDriver || startDate || endDate;

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader
          title="กิจกรรมล้างรถ"
          backHref="/leader/home"
          rightContent={
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary text-fluid-xs flex items-center gap-1.5"
              style={hasFilters ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
            >
              <Filter className="w-3.5 h-3.5" />
              ตัวกรอง
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          }
        />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

            {/* Stats */}
            <div className="card p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-2xl font-extrabold" style={{ color: 'var(--accent)' }}>{todayCount}</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>วันนี้</p>
                </div>
                <div className="text-center p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-2xl font-extrabold" style={{ color: 'var(--success)' }}>{weekCount}</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>สัปดาห์นี้</p>
                </div>
                <div className="text-center p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-2xl font-extrabold" style={{ color: 'var(--warning)' }}>{monthCount}</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>เดือนนี้</p>
                </div>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="card p-4 space-y-3"
              >
                <div>
                  <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    เลือกพนักงาน
                  </label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="input"
                  >
                    <option value="">ทั้งหมด</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name && d.surname ? `${d.name} ${d.surname}` : d.lineDisplayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                      ตั้งแต่
                    </label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                      ถึง
                    </label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                  </div>
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="btn btn-secondary w-full text-fluid-xs">
                    ล้างตัวกรอง
                  </button>
                )}
              </motion.div>
            )}

            {/* Activity List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : activities.length === 0 ? (
                <div className="card p-12 text-center">
                  <Car className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีกิจกรรม</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity._id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="card overflow-hidden"
                    >
                      <div className="flex gap-3 p-4">
                        {/* Thumbnail */}
                        <button
                          onClick={() => setViewImage(activity.imageUrl)}
                          className="w-20 h-20 rounded-[var(--radius-md)] overflow-hidden shrink-0"
                          style={{ background: 'var(--bg-inset)' }}
                        >
                          <img src={activity.imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>
                              {activity.userId?.lineProfileImage ? (
                                <img src={activity.userId.lineProfileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (activity.userId?.name || activity.userId?.lineDisplayName)?.charAt(0) || '?'
                              )}
                            </div>
                            <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {getDriverName(activity.userId)}
                            </p>
                          </div>
                          {activity.caption && (
                            <p className="text-fluid-xs mb-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                              {activity.caption}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {dayjs(activity.activityDate).format('D MMM YYYY')}
                            </span>
                            <span>{activity.activityTime} น.</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {viewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            alt=""
            className="max-w-full max-h-[85vh] rounded-[var(--radius-lg)] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}

      <BottomNav role="leader" />
    </div>
  );
}
