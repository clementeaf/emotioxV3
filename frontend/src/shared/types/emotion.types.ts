import { z } from 'zod';

// Enums
export enum EmotionIntensity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum EmotionCategory {
  BASIC = 'basic',
  COMPLEX = 'complex',
  SOCIAL = 'social'
}

// Base interfaces
export interface EmotionBase {
  name: string;
  description: string;
  intensity: EmotionIntensity;
  category: EmotionCategory;
  tags: string[];
}

export interface Emotion extends EmotionBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// DTOs
export interface CreateEmotionDto extends EmotionBase {}

export interface UpdateEmotionDto extends Partial<EmotionBase> {}

// Zod schemas for validation
export const emotionBaseSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  intensity: z.nativeEnum(EmotionIntensity),
  category: z.nativeEnum(EmotionCategory),
  tags: z.array(z.string())
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed')
});

export const createEmotionSchema = emotionBaseSchema;

export const updateEmotionSchema = emotionBaseSchema.partial();

// Type guards
export const isEmotionIntensity = (value: unknown): value is EmotionIntensity => {
  return typeof value === 'string' && Object.values(EmotionIntensity).includes(value as EmotionIntensity);
};

export const isEmotionCategory = (value: unknown): value is EmotionCategory => {
  return typeof value === 'string' && Object.values(EmotionCategory).includes(value as EmotionCategory);
}; 