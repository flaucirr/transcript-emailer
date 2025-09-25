// components/FileUploader.tsx
'use client';
import { useState } from 'react';
// import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export default function FileUploader({ onTextExtracted }: { onTextExtracted: (text: string) => void }) {
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const extractTextFromFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    
    if (file.type === 'application/pdf') {
      // Use PDF.js for client-side PDF processing
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText;
      
    } else if (file.type.includes('wordprocessingml')) {
      // Process .docx files
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
      
    } else if (file.type === 'text/plain') {
      // Process .txt files
      return new TextDecoder().decode(arrayBuffer);
      
    } else {
      throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT files.');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 40 * 1024 * 1024) { // 40MB limit
      alert('File too large. Please use files under 40MB.');
      return;
    }

    setProcessing(true);
    try {
        const extractedText = await extractTextFromFile(file);
        onTextExtracted(extractedText);
      } catch (error: unknown) {
        let message = 'Failed to process file.';
        if (error instanceof Error) {
          message = error.message;
          console.error('File processing failed:', message);
        } else {
          console.error('File processing failed:', error);
        }
        alert(`Failed to process file: ${message}`);
      } finally {
        setProcessing(false);
      }      
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${processing ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        {processing ? (
          <div className="text-blue-600">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Processing file...
          </div>
        ) : (
          <>
            <div className="text-gray-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium">Drop your transcript file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Supports PDF, DOCX, TXT (max 40MB)</p>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Files
            </label>
          </>
        )}
      </div>
    </div>
  );
}
