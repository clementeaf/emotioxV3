import { z } from 'zod';
import { Emotion } from './emotion.types';

// WebSocket Event Names
export enum WebSocketEvent {
  // Auth events
  TOKEN_REFRESH = 'token.refresh',
  TOKEN_UPDATE = 'token.update',
  
  // Emotion events
  EMOTION_CREATED = 'emotion.created',
  EMOTION_UPDATED = 'emotion.updated',
  EMOTION_DELETED = 'emotion.deleted',
  
  // Error events
  ERROR = 'error'
}

// Message Interfaces
export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  data: T;
}

export interface TokenRefreshResponse {
  token: string;
}

export interface EmotionChangeMessage {
  emotion: Emotion;
  userId: string;
}

export interface ErrorMessage {
  code: string;
  message: string;
}

// Zod Schemas for validation
export const tokenRefreshResponseSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

export const errorMessageSchema = z.object({
  code: z.string(),
  message: z.string()
});

// WebSocket Config
export interface WebSocketConfig {
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

// Type guards
export const isWebSocketEvent = (value: unknown): value is WebSocketEvent => {
  return typeof value === 'string' && Object.values(WebSocketEvent).includes(value as WebSocketEvent);
};

export const isWebSocketMessage = <T>(value: unknown): value is WebSocketMessage<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    'data' in value &&
    isWebSocketEvent((value as { event: unknown }).event)
  );
}; 