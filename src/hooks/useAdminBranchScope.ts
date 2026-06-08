'use client';

import { useCallback, useMemo, useState } from 'react';

export function useAdminBranchScope(defaultBranch = 'all') {
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

  const branchCode = useMemo(
    () => (selectedBranch !== 'all' ? selectedBranch : null),
    [selectedBranch],
  );

  const withBranchParam = useCallback((url: string) => {
    if (!branchCode) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}branch=${encodeURIComponent(branchCode)}`;
  }, [branchCode]);

  const appendBranchToParams = useCallback((params: URLSearchParams) => {
    if (branchCode) {
      params.set('branch', branchCode);
    } else {
      params.delete('branch');
    }
    return params;
  }, [branchCode]);

  return {
    selectedBranch,
    setSelectedBranch,
    branchCode,
    withBranchParam,
    appendBranchToParams,
  };
}

export default useAdminBranchScope;
