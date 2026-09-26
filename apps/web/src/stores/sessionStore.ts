import { create } from 'zustand';
import { ModelTransformState, DEFAULT_MODEL_TRANSFORM, applyGestureCommand, GestureCommand } from '@edugesture/shared-types';

interface SessionStoreState {
  transform: ModelTransformState;
  participantCount: number;
  isLocked: boolean;
  gestureStatus: string;
  setTransform: (transform: ModelTransformState) => void;
  applyCommand: (command: GestureCommand) => void;
  setParticipantCount: (count: number) => void;
  setIsLocked: (locked: boolean) => void;
  setGestureStatus: (status: string) => void;
  resetTransform: () => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  transform: DEFAULT_MODEL_TRANSFORM,
  participantCount: 1,
  isLocked: false,
  gestureStatus: 'Offline (Start Agent)',
  setTransform: (transform) => set({ transform }),
  applyCommand: (command) =>
    set((state) => ({
      transform: applyGestureCommand(state.transform, command),
    })),
  setParticipantCount: (count) => set({ participantCount: count }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setGestureStatus: (gestureStatus) => set({ gestureStatus }),
  resetTransform: () => set({ transform: DEFAULT_MODEL_TRANSFORM }),
}));
