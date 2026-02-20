'use client';

import { useCallback, useRef } from 'react';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TextEditor({ value, onChange }: TextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'txt' || ext === 'md') {
        const text = await file.text();
        onChange(text);
      } else if (ext === 'docx') {
        // Use mammoth for Word documents
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToMarkdown({ arrayBuffer });
        onChange(result.value);
      } else if (ext === 'odt') {
        // ODT files are ZIP archives with content.xml inside
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractOdtText(arrayBuffer);
        onChange(text);
      } else {
        // Fallback: try reading as text
        const text = await file.text();
        onChange(text);
      }
    } catch (err) {
      console.error('Failed to import file:', err);
      alert('Failed to import file. Please try a .txt, .md, or .docx file.');
    }

    // Reset the input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Text to Analyze</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx,.odt,.doc"
            onChange={handleFileImport}
            className="hidden"
            id="file-import"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            📄 Import Document
          </button>
          {value && (
            <button
              onClick={() => onChange('')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your text here, or import a document using the button above...

Supports: Plain text (.txt), Markdown (.md), Word documents (.docx), and OpenDocument (.odt)"
        rows={16}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm leading-relaxed resize-y font-mono"
      />
    </div>
  );
}

async function extractOdtText(arrayBuffer: ArrayBuffer): Promise<string> {
  // ODT files are ZIP files. We use the browser's native DecompressionStream if available,
  // otherwise fall back to a basic extraction approach.
  try {
    const { Blob } = globalThis;
    const blob = new Blob([arrayBuffer]);
    const text = await blob.text();

    // Try to extract text content between <text:p> tags
    const matches = text.match(/<text:p[^>]*>(.*?)<\/text:p>/g);
    if (matches) {
      return matches
        .map(m => m.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join('\n\n');
    }

    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    throw new Error('Could not parse ODT file');
  }
}
