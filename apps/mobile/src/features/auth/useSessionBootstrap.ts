// Khôi phục phiên khi mở app + đồng bộ trạng thái SessionManager → store UI.
import { useEffect } from 'react';
import { session } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { useSessionStore } from '@/stores/session.store';

export function useSessionBootstrap() {
  const setStatus = useSessionStore((s) => s.setStatus);
  useEffect(() => {
    const unsub = session.subscribe((s) => {
      setStatus(s);
      if (s === 'signedOut') queryClient.clear(); // không để dữ liệu user cũ trong cache
    });
    void session.restore();
    return unsub;
  }, [setStatus]);
  return useSessionStore((s) => s.status);
}
