'use client';

import { useState, useEffect, useRef } from 'react';
import { usePusher } from '@/hooks/usePusher';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export interface Branch {
  code: string;
  name: string;
  description?: string;
  location?: {
    lat: number;
    lon: number;
  } | null;
  active: boolean;
}

// Module-level cache
let cachedBranches: Branch[] | null = null;
let cachedLoading = true;

// Hook with caching and real-time updates
export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>(cachedBranches || []);
  const [loading, setLoading] = useState(cachedLoading);
  const fetched = useRef(false);

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      if (data.success && data.branches) {
        const filtered = data.branches.filter((b: Branch) => b.active);
        setBranches(filtered);
        cachedBranches = filtered;
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
      cachedLoading = false;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchBranches();
  }, []);

  // Real-time Pusher subscription - refresh when branches change
  usePusher(CHANNELS.BRANCHES, [
    { event: EVENTS.BRANCH_CREATED, callback: fetchBranches },
    { event: EVENTS.BRANCH_UPDATED, callback: fetchBranches },
    { event: EVENTS.BRANCH_DELETED, callback: fetchBranches },
  ]);

  return { branches, loading, refetch: fetchBranches };
}

export default useBranches;
