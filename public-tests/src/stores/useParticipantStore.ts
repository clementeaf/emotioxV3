import { create } from 'zustand';

interface ParticipantState {
  participantId: string | null;
  email: string | null;
  setParticipantId: (id: string) => void;
  setEmail: (email: string) => void;
  clearParticipant: () => void;
  getParticipantId: () => string;
}

// 🎯 NO MÁS LOCALSTORAGE - Solo memoria en runtime
export const useParticipantStore = create<ParticipantState>()(
  (set, get) => ({
      participantId: null,
      email: null,

      setParticipantId: (id: string) => {
        set({ participantId: id });
      },

      setEmail: (email: string) => {
        set({ email });
      },

      clearParticipant: () => {
        set({ participantId: null, email: null });
      },

      getParticipantId: () => {
        const currentId = get().participantId;
        if (!currentId) {
          const newId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          set({ participantId: newId });
          return newId;
      }
      return currentId;
    }
  })
);
