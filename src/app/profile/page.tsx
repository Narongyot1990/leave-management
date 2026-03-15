<<<<<<< D:/projects/ITL/drivers/src/app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Phone, PhoneCall, User, Hash, Circle, CheckCircle2, AlertCircle, Pencil, MapPin, Flag, Brain, Trophy, Star, Zap, BookOpen, TrendingUp, MessageCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import DriverProfile from '@/components/DriverProfile';

interface DriverUser {
  id: string;
  lineDisplayName: string;
  linePublicId?: string;
  lineProfileImage?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status?: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('driverUser', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />
      <div className="flex-1 lg:pl-[240px] relative">
        <DriverProfile user={user} isMe={true} />
      </div>
      <div className="lg:hidden">
        <BottomNav role="driver" />
      </div>
    </div>
  );
}
=======
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Phone, PhoneCall, User, Hash, Circle, CheckCircle2, AlertCircle, Pencil, MapPin, Flag, Brain, Trophy, Star, Zap, BookOpen, TrendingUp, MessageCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import DriverProfile from '@/components/DriverProfile';
import { DriverUser } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('driverUser', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />
      <div className="flex-1 lg:pl-[240px] relative">
        <DriverProfile user={user} isMe={true} />
      </div>
      <div className="lg:hidden">
        <BottomNav role="driver" />
      </div>
    </div>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/profile/page.tsx
