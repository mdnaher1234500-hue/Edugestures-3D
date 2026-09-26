// ============================================================
// @edugesture/shared-types
// Domain enums, interfaces, Socket.IO event contracts, and the
// authoritative gesture reducer shared by NestJS + Next.js + Python.
// ============================================================

// ───── Core domain enums ─────

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum GestureType {
  ROTATE = 'ROTATE',
  ZOOM = 'ZOOM',
  SELECT = 'SELECT',
  HIGHLIGHT = 'HIGHLIGHT',
  RESET = 'RESET',
}

export enum SessionStatus {
  PENDING = 'PENDING',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

export enum ModelStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ParticipantStatus {
  ACTIVE = 'ACTIVE',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
  MUTED = 'MUTED',
}

// ───── Auth payloads ─────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ───── 3D Model domain ─────

export interface ThreeDModelSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: number;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  status: ModelStatus;
  createdAt: string;
}

export interface CreateModelDto {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

// ───── Session domain ─────

export interface SessionSummary {
  id: string;
  code: string;
  title: string;
  status: SessionStatus;
  modelId: string;
  modelUrl: string;
  modelName: string;
  teacherId: string;
  teacherName: string;
  participantCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  isLocked?: boolean;
}

export interface CreateSessionDto {
  title: string;
  modelId: string;
}

export interface JoinSessionDto {
  code: string;
}

// ───── Chat ─────

export interface ChatMessagePayload {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
}

// ───── Attendance ─────

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  joinedAt: string;
  leftAt: string | null;
  duration: number; // seconds
}

// ───── 3D model transform state (authoritative, teacher-driven) ─────

export interface ModelTransformState {
  rotationX: number;
  rotationY: number;
  zoom: number;
  selectedMeshName: string | null;
  highlightedMeshName: string | null;
  updatedAt: number;
}

export const DEFAULT_MODEL_TRANSFORM: ModelTransformState = {
  rotationX: 0,
  rotationY: 0,
  zoom: 1,
  selectedMeshName: null,
  highlightedMeshName: null,
  updatedAt: 0,
};

// ───── Gesture command (emitted by Python agent or teacher client) ─────

export interface GestureCommand {
  type: GestureType;
  sessionId?: string;
  payload: {
    deltaX?: number;
    deltaY?: number;
    zoomDelta?: number;
    meshName?: string | null;
    anchorX?: number;
    anchorY?: number;
  };
  timestamp: number;
}

// ───── Socket.IO event contracts ─────

export interface ServerToClientEvents {
  // Session lifecycle
  'session:state': (state: ModelTransformState) => void;
  'session:participants': (count: number) => void;
  'session:ended': () => void;
  'session:error': (message: string) => void;

  // Chat
  'chat:message': (message: ChatMessagePayload) => void;
  'chat:history': (messages: ChatMessagePayload[]) => void;

  // Participant events
  'participant:joined': (data: { userId: string; name: string; role: UserRole }) => void;
  'participant:left': (data: { userId: string; name: string }) => void;
  'participant:muted': (data: { userId: string }) => void;
  'participant:removed': (data: { userId: string }) => void;

  // Classroom control
  'classroom:locked': (locked: boolean) => void;
}

export interface ClientToServerEvents {
  // Session
  'session:join': (payload: { sessionCode: string; token: string }) => void;
  'session:leave': (payload: { sessionCode: string }) => void;

  // Gesture commands (teacher / Python agent only)
  'gesture:command': (payload: { sessionCode: string; command: GestureCommand }) => void;

  // Chat
  'chat:send': (payload: { sessionCode: string; message: string }) => void;
  'chat:history': (payload: { sessionCode: string }) => void;

  // Moderation (teacher only)
  'participant:mute': (payload: { sessionCode: string; userId: string }) => void;
  'participant:remove': (payload: { sessionCode: string; userId: string }) => void;
  'classroom:lock': (payload: { sessionCode: string; locked: boolean }) => void;
}

// ───── MediaPipe hand landmark subset (used by Python agent & frontend) ─────

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark[];

// ───── Shared gesture → transform reducer ─────
// Pure function used by BOTH the teacher client (for optimistic local
// rendering) and the NestJS gateway (as the authoritative source of truth).
// Keeping this in shared-types guarantees they never drift apart.

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4.0;

export function applyGestureCommand(
  state: ModelTransformState,
  command: GestureCommand,
): ModelTransformState {
  switch (command.type) {
    case GestureType.ROTATE: {
      const deltaX = command.payload.deltaX ?? 0;
      const deltaY = command.payload.deltaY ?? 0;
      return {
        ...state,
        rotationY: state.rotationY + deltaX,
        rotationX: clamp(state.rotationX + deltaY, -Math.PI / 2, Math.PI / 2),
        updatedAt: command.timestamp,
      };
    }
    case GestureType.ZOOM: {
      const zoomDelta = command.payload.zoomDelta ?? 0;
      return {
        ...state,
        zoom: clamp(state.zoom + zoomDelta, MIN_ZOOM, MAX_ZOOM),
        updatedAt: command.timestamp,
      };
    }
    case GestureType.SELECT: {
      return {
        ...state,
        selectedMeshName: command.payload.meshName ?? null,
        updatedAt: command.timestamp,
      };
    }
    case GestureType.HIGHLIGHT: {
      return {
        ...state,
        highlightedMeshName: command.payload.meshName ?? null,
        updatedAt: command.timestamp,
      };
    }
    case GestureType.RESET: {
      return {
        ...DEFAULT_MODEL_TRANSFORM,
        updatedAt: command.timestamp,
      };
    }
    default:
      return state;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
