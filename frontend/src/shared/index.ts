/**
 * Shared Types and Interfaces - Centralized exports
 * Single source of truth for all shared types and interfaces
 */

// =====================================
// 🔐 AUTHENTICATION TYPES
// =====================================
export * from './types/auth.types';

// =====================================
// 🏢 COMPANY & CLIENT TYPES
// =====================================
export * from './types/clients.types';

// =====================================
// 🔬 RESEARCH TYPES
// =====================================
// export * from './types/research.types'; // Comentado para evitar conflictos

// =====================================
// 👁️ EYE TRACKING TYPES
// =====================================
export * from './types/eye-tracking.types';

// =====================================
// 🧠 COGNITIVE TASK TYPES
// =====================================
export * from './types/cognitive-task.types';

// =====================================
// 📊 SMART VOC TYPES
// =====================================
export * from './types/smart-voc.types';

// =====================================
// 🎭 EMOTION TYPES
// =====================================
export * from './types/emotion.types';

// =====================================
// 🌐 WEBSOCKET TYPES
// =====================================
export * from './types/websocket.types';

// =====================================
// 📋 INTERFACES
// =====================================
export * from './interfaces/api';
// export * from './interfaces/auth.interface'; // Comentado para evitar conflictos
export * from './interfaces/cognitive-task.interface';
export * from './interfaces/dashboard.interface';
export * from './interfaces/emotions.interface';
export * from './interfaces/eye-tracking.interface';
// export * from './interfaces/eyeTracking'; // Comentado para evitar conflictos
export * from './interfaces/eyeTrackingRecruit.interface';
export * from './interfaces/module-response.interface';
export * from './interfaces/newResearch.interface';
export * from './interfaces/participant';
export * from './interfaces/question-dictionary.interface';
// export * from './interfaces/question-types.enum'; // Comentado para evitar conflictos
export * from './interfaces/research-creation.interface';
export * from './interfaces/research.interface';
// export * from './interfaces/research.model'; // Comentado para evitar conflictos
// export * from './interfaces/smart-voc.interface'; // Comentado para evitar conflictos
export * from './interfaces/thank-you-screen.interface';

// =====================================
// 🛠️ UTILITIES
// =====================================
export * from './utils';
export * from './utils/websocket';
export * from './utils/data.processors';
