/**
 * Utilidades para parsear datos de NavigationFlow
 */

import type {
  NavigationFlowResponseValue,
  ParsedClick,
  ClickPosition,
  ImageSelection
} from '../types/data-processing';
import type {
  ClickTrackingData,
  VisualClickPoint
} from '../components/NavigationFlow/types';

const DEFAULT_HITZONE_SIZE = 50;

/**
 * Parsea imageSelections desde diferentes formatos (objeto, string JSON, etc.)
 */
function parseImageSelections(
  imageSelections: NavigationFlowResponseValue['imageSelections'],
  responseTimestamp: string
): ParsedClick[] {
  const clicks: ParsedClick[] = [];

  if (!imageSelections) {
    return clicks;
  }

  let imageSelectionsObj: Record<string, unknown> = {};

  if (typeof imageSelections === 'object' && !Array.isArray(imageSelections) && imageSelections !== null) {
    imageSelectionsObj = imageSelections as Record<string, unknown>;
  } else if (typeof imageSelections === 'string') {
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(imageSelections);
      } catch (parseError) {
        const extracted = extractImageSelectionsFromString(imageSelections);
        if (Object.keys(extracted).length > 0) {
          parsed = extracted;
        } else {
          throw parseError;
        }
      }

      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        imageSelectionsObj = parsed as Record<string, unknown>;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[NavigationFlowParser] Error parseando imageSelections:', error);
      }
      return clicks;
    }
  }

  if (Object.keys(imageSelectionsObj).length > 0) {
    Object.entries(imageSelectionsObj).forEach(([imageIndexStr, selection]) => {
      const selectionObj = selection as {
        hitzoneId?: string;
        click?: {
          x: number;
          y: number;
          hitzoneWidth?: number;
          hitzoneHeight?: number;
        };
      };

      if (selectionObj?.click) {
        clicks.push({
          x: selectionObj.click.x || 0,
          y: selectionObj.click.y || 0,
          timestamp: new Date(responseTimestamp).getTime() || Date.now(),
          isCorrect: true,
          imageIndex: parseInt(imageIndexStr, 10) || 0
        });
      }
    });
  }

  return clicks;
}

/**
 * Extrae imageSelections de un string JSON mal formateado usando regex
 */
function extractImageSelectionsFromString(
  jsonString: string
): Record<string, { hitzoneId?: string; click: { x: number; y: number } }> {
  const extracted: Record<string, { hitzoneId?: string; click: { x: number; y: number } }> = {};
  const imageIndexPattern = /"(\d+)":\s*\{[^}]*"click":\s*\{[^}]*"x":\s*([\d.]+)[^}]*"y":\s*([\d.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = imageIndexPattern.exec(jsonString)) !== null) {
    const imageIndex = match[1];
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);

    if (!isNaN(x) && !isNaN(y)) {
      const hitzoneIdMatch = jsonString.substring(0, match.index).match(/"hitzoneId":\s*"([^"]+)"/);
      const hitzoneId = hitzoneIdMatch ? hitzoneIdMatch[1] : undefined;

      extracted[imageIndex] = {
        hitzoneId,
        click: { x, y }
      };
    }
  }

  return extracted;
}

/**
 * Parsea clickPosition desde diferentes formatos
 */
function parseClickPosition(
  clickPosition: NavigationFlowResponseValue['clickPosition'],
  responseTimestamp: string,
  selectedImageIndex?: number
): ParsedClick | null {
  if (!clickPosition) {
    return null;
  }

  let clickPositionObj: ClickPosition | null = null;

  if (typeof clickPosition === 'object' && !Array.isArray(clickPosition) && clickPosition !== null) {
    clickPositionObj = clickPosition as ClickPosition;
  } else if (typeof clickPosition === 'string') {
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(clickPosition);
      } catch (parseError) {
        const extracted = extractClickPositionFromString(clickPosition);
        if (extracted) {
          parsed = extracted;
        } else {
          throw parseError;
        }
      }

      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        clickPositionObj = parsed as ClickPosition;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[NavigationFlowParser] Error parseando clickPosition:', error);
      }
      return null;
    }
  }

  if (clickPositionObj && clickPositionObj.x !== undefined && clickPositionObj.y !== undefined) {
    return {
      x: clickPositionObj.x || 0,
      y: clickPositionObj.y || 0,
      timestamp: new Date(responseTimestamp).getTime() || Date.now(),
      isCorrect: true,
      imageIndex: selectedImageIndex ?? 0
    };
  }

  return null;
}

/**
 * Extrae clickPosition de un string JSON mal formateado usando regex
 */
function extractClickPositionFromString(jsonString: string): ClickPosition | null {
  const xMatch = jsonString.match(/"x":\s*([\d.]+)/);
  const yMatch = jsonString.match(/"y":\s*([\d.]+)/);
  const widthMatch = jsonString.match(/"hitzoneWidth":\s*([\d.]+)/);
  const heightMatch = jsonString.match(/"hitzoneHeight":\s*([\d.]+)/);

  if (xMatch && yMatch) {
    const x = parseFloat(xMatch[1]);
    const y = parseFloat(yMatch[1]);
    const width = widthMatch ? parseFloat(widthMatch[1]) : undefined;
    const height = heightMatch ? parseFloat(heightMatch[1]) : undefined;

    if (!isNaN(x) && !isNaN(y)) {
      return { x, y, hitzoneWidth: width, hitzoneHeight: height };
    }
  }

  return null;
}

/**
 * Parsea allClicksTracking desde diferentes formatos
 */
function parseAllClicksTracking(
  allClicksTracking: NavigationFlowResponseValue['allClicksTracking'],
  responseTimestamp: string
): ParsedClick[] {
  if (!allClicksTracking) {
    return [];
  }

  let allClicksArray: Array<{
    x?: number;
    y?: number;
    timestamp?: number;
    isCorrectHitzone?: boolean;
    imageIndex?: number;
  }> = [];

  if (Array.isArray(allClicksTracking)) {
    allClicksArray = allClicksTracking;
  } else if (typeof allClicksTracking === 'string') {
    try {
      const parsed = JSON.parse(allClicksTracking);
      if (Array.isArray(parsed)) {
        allClicksArray = parsed;
      }
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[NavigationFlowParser] allClicksTracking viene como string mal formateado');
      }
    }
  }

  return allClicksArray.map((click) => ({
    x: click.x || 0,
    y: click.y || 0,
    timestamp: click.timestamp || new Date(responseTimestamp).getTime() || Date.now(),
    isCorrect: click.isCorrectHitzone !== false,
    imageIndex: click.imageIndex ?? 0
  }));
}

/**
 * Parsea visualClickPoints desde diferentes formatos
 */
function parseVisualClickPoints(
  visualClickPoints: NavigationFlowResponseValue['visualClickPoints'],
  responseTimestamp: string
): ParsedClick[] {
  if (!visualClickPoints) {
    return [];
  }

  const clicks: ParsedClick[] = [];

  if (Array.isArray(visualClickPoints)) {
    visualClickPoints.forEach((point) => {
      clicks.push({
        x: point.x || 0,
        y: point.y || 0,
        timestamp: point.timestamp || new Date(responseTimestamp).getTime() || Date.now(),
        isCorrect: point.isCorrect !== false,
        imageIndex: point.imageIndex ?? 0
      });
    });
  } else if (typeof visualClickPoints === 'object' && !Array.isArray(visualClickPoints) && visualClickPoints !== null) {
    Object.entries(visualClickPoints).forEach(([imageIndexStr, imageClicks]) => {
      if (Array.isArray(imageClicks)) {
        imageClicks.forEach((point) => {
          clicks.push({
            x: point.x || 0,
            y: point.y || 0,
            timestamp: point.timestamp || new Date(responseTimestamp).getTime() || Date.now(),
            isCorrect: point.isCorrect !== false,
            imageIndex: (point.imageIndex ?? parseInt(imageIndexStr, 10)) || 0
          });
        });
      }
    });
  }

  return clicks;
}

/**
 * Extrae todos los clicks de una respuesta de NavigationFlow
 */
export function extractClicksFromResponse(
  responseValue: NavigationFlowResponseValue,
  responseTimestamp: string
): ParsedClick[] {
  const clicks: ParsedClick[] = [];

  const imageSelectionsClicks = parseImageSelections(responseValue.imageSelections, responseTimestamp);
  clicks.push(...imageSelectionsClicks);

  if (clicks.length === 0) {
    const clickPositionClick = parseClickPosition(
      responseValue.clickPosition,
      responseTimestamp,
      responseValue.selectedImageIndex
    );
    if (clickPositionClick) {
      const hasClickForImage = clicks.some(c => c.imageIndex === clickPositionClick.imageIndex);
      if (!hasClickForImage) {
        clicks.push(clickPositionClick);
      }
    }
  }

  if (clicks.length === 0) {
    const allClicksTrackingClicks = parseAllClicksTracking(responseValue.allClicksTracking, responseTimestamp);
    clicks.push(...allClicksTrackingClicks);
  }

  if (clicks.length === 0) {
    const visualClickPointsClicks = parseVisualClickPoints(responseValue.visualClickPoints, responseTimestamp);
    clicks.push(...visualClickPointsClicks);
  }

  return clicks;
}

/**
 * Procesa los clicks extraídos y los convierte en estructuras de datos finales
 */
export function processNavigationFlowClicks(
  clicks: ParsedClick[],
  responseValue: NavigationFlowResponseValue,
  responseTimestamp: string,
  participantId: string,
  responseIndex: number
): {
  allClicksTracking: ClickTrackingData[];
  visualClickPoints: VisualClickPoint[];
  imageSelections: Record<string, ImageSelection>;
} {
  const allClicksTracking: ClickTrackingData[] = [];
  const visualClickPoints: VisualClickPoint[] = [];
  const imageSelections: Record<string, ImageSelection> = {};

  clicks.forEach((click) => {
    const hitzoneId =
      (typeof responseValue?.selectedHitzone === 'string' ? responseValue.selectedHitzone : undefined) ||
      (typeof responseValue?.hitzoneId === 'string' ? responseValue.hitzoneId : undefined) ||
      `hitzone-${responseIndex}`;

    const hitzoneWidth =
      (typeof responseValue?.clickPosition === 'object' &&
      responseValue.clickPosition &&
      'hitzoneWidth' in responseValue.clickPosition
        ? (responseValue.clickPosition as { hitzoneWidth?: number }).hitzoneWidth
        : undefined) ||
      (typeof responseValue?.hitzoneWidth === 'number' ? responseValue.hitzoneWidth : undefined) ||
      DEFAULT_HITZONE_SIZE;

    const hitzoneHeight =
      (typeof responseValue?.clickPosition === 'object' &&
      responseValue.clickPosition &&
      'hitzoneHeight' in responseValue.clickPosition
        ? (responseValue.clickPosition as { hitzoneHeight?: number }).hitzoneHeight
        : undefined) ||
      (typeof responseValue?.hitzoneHeight === 'number' ? responseValue.hitzoneHeight : undefined) ||
      DEFAULT_HITZONE_SIZE;

    allClicksTracking.push({
      x: click.x,
      y: click.y,
      timestamp: click.timestamp,
      hitzoneId,
      imageIndex: click.imageIndex,
      isCorrectHitzone: click.isCorrect,
      participantId
    });

    visualClickPoints.push({
      x: click.x,
      y: click.y,
      timestamp: click.timestamp,
      isCorrect: click.isCorrect,
      imageIndex: click.imageIndex,
      participantId
    });

    const selectionKey = `${participantId}-${click.imageIndex}-${allClicksTracking.length}`;
    imageSelections[selectionKey] = {
      hitzoneId,
      click: {
        x: click.x,
        y: click.y,
        hitzoneWidth,
        hitzoneHeight
      }
    };
  });

  return {
    allClicksTracking,
    visualClickPoints,
    imageSelections
  };
}

