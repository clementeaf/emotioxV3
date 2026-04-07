/**
 * Client-side document parser.
 * Extracts text lines from .csv, .txt, .xlsx, .docx, and .pdf files.
 */
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// PDF.js worker — use CDN to avoid bundling issues
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.6.205/pdf.worker.min.mjs`;

/**
 * Extracts text lines from a file.
 * Returns an array of non-empty text strings.
 */
export const parseDocument = async (file: File): Promise<string[]> => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    switch (ext) {
        case '.txt':
            return parseTxt(file);
        case '.csv':
            return parseCsv(file);
        case '.xlsx':
        case '.xls':
            return parseExcel(file);
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

/** CSV: first column of each row (skip header) */
const parseCsv = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Skip header, take first column
    return rows.slice(1)
        .map(row => String(row[0] ?? '').trim())
        .filter(text => text.length > 0);
};

/** Excel (.xlsx/.xls): first column of first sheet (skip header) */
const parseExcel = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return rows.slice(1)
        .map(row => String(row[0] ?? '').trim())
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
