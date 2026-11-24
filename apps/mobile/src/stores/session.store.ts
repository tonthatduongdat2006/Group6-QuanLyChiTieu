// Store = state client thuần: trạng thái phiên cho UI (không chứa token, không chứa dữ liệu server).
import { create } from 'zustand';
import type { SessionStatus } from '@/api/session';

interface SessionUiState {
  status: SessionStatus;
  setStatus: (s: SessionStatus) => void;
}

export const useSessionStore = create<SessionUiState>((set) => ({
  status: 'unknown',
  setStatus: (status) => set({ status }),
}));
