import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../../../config/local-storage', () => ({
  getMediaPath: vi.fn((key: string) => `/media/${key}`),
}));

// vi.hoisted ensures the fn is available when vi.mock factory runs (hoisted above imports)
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import fs from 'fs';
import { analyzeStimulusComplexity } from '../stimulus-complexity.service';

const FALLBACK = { suggestedSeconds: 10, reason: 'Default recommendation' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeStimulusComplexity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API key present, file exists
    process.env.GEMINI_API_KEY = 'test-key';
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from('fake-image'));
  });

  // -----------------------------------------------------------------------
  // Guard clauses
  // -----------------------------------------------------------------------

  describe('guard clauses', () => {
    it('returns fallback when no API key is set', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;

      const result = await analyzeStimulusComplexity('photo.jpg');

      expect(result).toEqual(FALLBACK);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('uses GOOGLE_AI_API_KEY as fallback', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_AI_API_KEY = 'alt-key';
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 15, "reason": "Moderate"}' },
      });

      const result = await analyzeStimulusComplexity('photo.jpg');

      expect(result.suggestedSeconds).toBe(15);
    });

    it('returns fallback when file does not exist', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = await analyzeStimulusComplexity('missing.png');

      expect(result).toEqual(FALLBACK);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Clamping
  // -----------------------------------------------------------------------

  describe('clamping suggestedSeconds to 5-30 range', () => {
    it('clamps below minimum to 5', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 2, "reason": "Very simple"}' },
      });

      const result = await analyzeStimulusComplexity('simple.png');

      expect(result.suggestedSeconds).toBe(5);
    });

    it('clamps above maximum to 30', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 60, "reason": "Very complex"}' },
      });

      const result = await analyzeStimulusComplexity('complex.png');

      expect(result.suggestedSeconds).toBe(30);
    });

    it('rounds to nearest integer', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 12.7, "reason": "Medium"}' },
      });

      const result = await analyzeStimulusComplexity('medium.png');

      expect(result.suggestedSeconds).toBe(13);
    });

    it('passes through values within range unchanged', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 20, "reason": "Moderate complexity"}' },
      });

      const result = await analyzeStimulusComplexity('normal.png');

      expect(result.suggestedSeconds).toBe(20);
      expect(result.reason).toBe('Moderate complexity');
    });
  });

  // -----------------------------------------------------------------------
  // Gemini response parsing
  // -----------------------------------------------------------------------

  describe('Gemini response parsing', () => {
    it('parses clean JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 18, "reason": "Imagen con texto denso"}' },
      });

      const result = await analyzeStimulusComplexity('doc.png');

      expect(result).toEqual({ suggestedSeconds: 18, reason: 'Imagen con texto denso' });
    });

    it('strips markdown code fences from response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '```json\n{"suggestedSeconds": 22, "reason": "Complex layout"}\n```',
        },
      });

      const result = await analyzeStimulusComplexity('layout.png');

      expect(result).toEqual({ suggestedSeconds: 22, reason: 'Complex layout' });
    });

    it('handles missing reason gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 10}' },
      });

      const result = await analyzeStimulusComplexity('img.png');

      expect(result.suggestedSeconds).toBe(10);
      expect(result.reason).toBe('');
    });

    it('returns fallback on unparseable response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Sorry, I cannot process this image.' },
      });

      const result = await analyzeStimulusComplexity('bad.png');

      expect(result).toEqual(FALLBACK);
    });

    it('returns fallback when Gemini API throws', async () => {
      mockGenerateContent.mockRejectedValue(new Error('rate limited'));

      const result = await analyzeStimulusComplexity('rate.png');

      expect(result).toEqual(FALLBACK);
    });
  });

  // -----------------------------------------------------------------------
  // MIME type detection
  // -----------------------------------------------------------------------

  describe('MIME type detection', () => {
    it('sends image/jpeg for .jpg files', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 10, "reason": "ok"}' },
      });

      await analyzeStimulusComplexity('photo.jpg');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs[1].inlineData.mimeType).toBe('image/jpeg');
    });

    it('sends image/webp for .webp files', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 10, "reason": "ok"}' },
      });

      await analyzeStimulusComplexity('photo.webp');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs[1].inlineData.mimeType).toBe('image/webp');
    });

    it('defaults to image/png for unknown extensions', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"suggestedSeconds": 10, "reason": "ok"}' },
      });

      await analyzeStimulusComplexity('photo.bmp');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs[1].inlineData.mimeType).toBe('image/png');
    });
  });
});
