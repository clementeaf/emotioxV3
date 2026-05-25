/**
 * Client-side document parser.
 * Extracts text lines from .csv, .txt, .xlsx, .docx, and .pdf files.
 */
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Disable external worker to avoid CSP issues — uses built-in fake worker
GlobalWorkerOptions.workerSrc = '';

export interface CsvColumnInfo {
    headers: string[];
    preview: string[][]; // first 5 rows × all columns
    totalRows: number;
}

/**
 * Detects columns in a CSV/Excel file. Returns headers, preview rows, and total count.
 * Returns null for non-tabular files or files with only 1 column.
 */
export const detectCsvColumns = async (file: File): Promise<CsvColumnInfo | null> => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) return null;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) return null;

    // Column count = max width across all rows (header + data), since sparse arrays vary in length
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (colCount <= 1) return null;

    const headers = Array.from({ length: colCount }, (_, i) => repairMojibake(String(rows[0][i] ?? '').trim()));
    const dataRows = rows.slice(1);
    const preview = dataRows.slice(0, 5).map(row =>
        Array.from({ length: colCount }, (_, ci) => repairMojibake(String(row[ci] ?? '').trim()))
    );

    return { headers, preview, totalRows: dataRows.length };
};

/**
 * Extracts text lines from a file.
 * For CSV/Excel with multiple columns, pass columnIndex to select which column to parse.
 * Returns an array of non-empty text strings.
 */
export const parseDocument = async (file: File, columnIndex?: number): Promise<string[]> => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    switch (ext) {
        case '.txt':
            return parseTxt(file);
        case '.csv':
        case '.xlsx':
        case '.xls':
            return parseSpreadsheet(file, columnIndex);
        case '.docx':
            return parseDocx(file);
        case '.pdf':
            return parsePdf(file);
        default:
            throw new Error(`Unsupported file format: ${ext}`);
    }
};

/** Plain text: each non-empty line is an entry */
const parseTxt = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    let content = new TextDecoder('utf-8').decode(buffer);
    if (content.includes('\uFFFD')) {
        content = new TextDecoder('windows-1252').decode(buffer);
    }
    return content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
};

/**
 * Repairs UTF-8→Latin-1 mojibake common in Spanish CSV files.
 * e.g. "diseÃ±o" → "diseño", "PiÃ±a" → "Piña"
 */
const repairMojibake = (s: string): string => {
    // Detect: if string contains Ã followed by a Latin-1 continuation byte char, it's mojibake
    if (!/Ã/.test(s)) return s;
    try {
        // Re-encode as Latin-1 bytes, then decode as UTF-8
        const bytes = new Uint8Array([...s].map(c => c.charCodeAt(0) & 0xFF));
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        return decoded;
    } catch {
        // Not valid UTF-8 after re-encoding — return original
        return s;
    }
};

/** CSV/Excel: selected column of first sheet (skip header). Defaults to column 0. */
const parseSpreadsheet = async (file: File, columnIndex = 0): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return rows.slice(1)
        .map(row => repairMojibake(String(row[columnIndex] ?? '').trim()))
        .filter(text => text.length > 0);
};

/** Word (.docx): extract paragraphs as text lines */
const parseDocx = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);
};

/** PDF: extract text from all pages */
const parsePdf = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const lines: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        if (pageText.trim()) {
            lines.push(pageText.trim());
        }
    }

    return lines;
};
