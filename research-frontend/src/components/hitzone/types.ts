/**
 * Tipos para hitzones
 */

export interface HitZone {
  id: string;
  name?: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HitzoneArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

