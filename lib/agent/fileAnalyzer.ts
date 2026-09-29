import { MessageAttachment } from '@/types';

export interface ProcessedAttachment {
  name: string;
  type: string;
  mimeType: string;
  base64Data?: string;
  extractedText?: string;
  isImage: boolean;
  isPdf: boolean;
  isText: boolean;
}

/**
 * Parses data URI into raw base64 and mime type.
 * e.g., "data:image/png;base64,iVBORw0KGgo..." -> { mimeType: "image/png", base64: "iVBORw0KGgo..." }
 */
export function parseDataUri(uri: string): { mimeType: string; base64: string } | null {
  if (!uri || typeof uri !== 'string') return null;
  const match = uri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

/**
 * Safe text extractor from PDF buffer using pdf-parse or fallback
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // Dynamic require to prevent ESM bundler export resolution issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require('pdf-parse');
    const parserFn = typeof pdf === 'function' ? pdf : pdf.default || pdf.pdfParse;
    if (typeof parserFn === 'function') {
      const res = await parserFn(buffer);
      return res?.text?.trim() || '';
    }
    return '';
  } catch (err) {
    console.warn('[FileAnalyzer] Failed to parse PDF text:', err);
    return '';
  }
}

/**
 * Process an attachment and extract text / base64 for LLM consumption.
 */
export async function processAttachment(att: MessageAttachment): Promise<ProcessedAttachment> {
  const isImage = (att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(att.name)) ?? false;
  const isPdf = att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
  const isText = (att.type?.startsWith('text/') || /\.(txt|md|csv|json|ts|js|py|html|css)$/i.test(att.name)) ?? false;

  let mimeType = att.type || 'application/octet-stream';
  if (isPdf) mimeType = 'application/pdf';
  if (isImage && !mimeType.startsWith('image/')) {
    if (att.name.endsWith('.png')) mimeType = 'image/png';
    else if (att.name.endsWith('.webp')) mimeType = 'image/webp';
    else if (att.name.endsWith('.gif')) mimeType = 'image/gif';
    else mimeType = 'image/jpeg';
  }

  let base64Data: string | undefined = undefined;
  let extractedText: string | undefined = undefined;

  // Extract from data URI or content
  const dataUriInfo = parseDataUri(att.content || att.url || '');
  if (dataUriInfo) {
    base64Data = dataUriInfo.base64;
    mimeType = dataUriInfo.mimeType || mimeType;
  } else if (att.content && !att.content.startsWith('data:')) {
    // If content is already plain text
    extractedText = att.content;
    base64Data = Buffer.from(att.content, 'utf-8').toString('base64');
  }

  // If PDF and we have base64Data, extract text
  if (isPdf && base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    extractedText = await parsePdfBuffer(buffer);
  }

  return {
    name: att.name,
    type: att.type,
    mimeType,
    base64Data,
    extractedText,
    isImage,
    isPdf,
    isText,
  };
}

/**
 * Process all attachments for a user prompt.
 */
export async function processAllAttachments(attachments: MessageAttachment[] = []): Promise<ProcessedAttachment[]> {
  const results: ProcessedAttachment[] = [];
  for (const att of attachments) {
    try {
      const processed = await processAttachment(att);
      results.push(processed);
    } catch (err) {
      console.error(`[FileAnalyzer] Error processing attachment ${att.name}:`, err);
    }
  }
  return results;
}
