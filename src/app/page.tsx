'use client';
import { useState, useRef } from 'react';

import FileUploader from './components/FileUploader';
import EmailBodyRenderer from './components/EmailBodyRenderer';

interface GeneratedEmail {
  subject: string;
  body: string;
}

interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: string;
}


// Copy rendered content helper
const copyRenderedContent = (ref: React.RefObject<HTMLDivElement | null>) => {
  if (!ref.current) {
    alert('Nothing to copy.');
    return;
  }

  try {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ref.current);

    selection?.removeAllRanges();
    selection?.addRange(range);

    const success = document.execCommand('copy');

    selection?.removeAllRanges();

    if (success) {
      alert('Email copied to clipboard!');
    } else {
      alert('Copy failed - please try selecting manually.');
    }
  } catch (error) {
    console.error('Copy failed:', error);
    alert('Failed to copy.');
  }
};

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [config, setConfig] = useState({
    tone: 'professional',
    length: 'standard',
    includeActionItems: true,
    includeNextSteps: true,
  });
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Ref for rendered email body container
  const emailBodyRef = useRef<HTMLDivElement>(null);

  const generateEmail = async () => {
    if (!transcript.trim()) {
      alert('Please provide a transcript first.');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, ...config }),
      });

      const result = await response.json();
      if (result.success) {
        setGeneratedEmail(result.email);
        setUsage(result.usage);
      } else {
        alert(result.error || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate email. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Minutes of the Meeting Generator</h1>
          <p className="text-xl text-gray-400">Made by Rufi • Powered by AI</p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Upload Transcript</h2>
          <FileUploader onTextExtracted={setTranscript} />

          {/* Manual Input */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Or paste transcript manually:
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-32 p-3 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Paste your meeting transcript here..."
            />
          </div>
        </div>

        {/* Configuration */}
        {transcript && (
          <div className="bg-gray-800 rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Email Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
                <select
                  value={config.tone}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                  className="w-full p-3 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Length</label>
                <select
                  value={config.length}
                  onChange={(e) => setConfig({ ...config, length: e.target.value })}
                  className="w-full p-3 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeActionItems}
                  onChange={(e) => setConfig({ ...config, includeActionItems: e.target.checked })}
                  className="mr-2 accent-blue-500"
                  id="includeActionItems"
                />
                <label htmlFor="includeActionItems" className="text-sm text-gray-300">
                  Include Action Items
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeNextSteps}
                  onChange={(e) => setConfig({ ...config, includeNextSteps: e.target.checked })}
                  className="mr-2 accent-blue-500"
                  id="includeNextSteps"
                />
                <label htmlFor="includeNextSteps" className="text-sm text-gray-300">
                  Include Next Steps
                </label>
              </div>
            </div>

            <button
              onClick={generateEmail}
              disabled={generating}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {generating ? 'Generating Email...' : 'Generate Email'}
            </button>
          </div>
        )}

        {/* Results */}
        {generatedEmail && (
          <div className="bg-gray-800 rounded-lg shadow-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Generated Email</h2>
              <button
                onClick={() => copyRenderedContent(emailBodyRef)}
                className="copy-button bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Copy Email
              </button>
            </div>

            <div
              className="border rounded-lg p-6 bg-gray-900 text-gray-100"
              ref={emailBodyRef}
            >
              <div className="mb-4">
                <strong>Subject:</strong> {generatedEmail.subject}
              </div>
              <EmailBodyRenderer content={generatedEmail.body} />
            </div>

            {usage && (
              <div className="mt-4 text-sm text-gray-400">
                <p>
                  Token usage: {usage.input_tokens} input + {usage.output_tokens} output ={' '}
                  {usage.total_tokens} total
                </p>
                <p>Estimated cost: ${usage.estimated_cost}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
