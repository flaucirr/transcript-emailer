'use client';
import { useState, useRef, useEffect } from 'react';

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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
  // Auth state
  const [user, setUser] = useState<{id: number; username: string} | null>(null);
  const [authMessage, setAuthMessage] = useState<string>('');

  // Email generation state
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

  // Input fields for login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Ref for email body container
  const emailBodyRef = useRef<HTMLDivElement>(null);

  // Check auth status on mount
  useEffect(() => {
    fetch(`${apiBaseUrl}/auth/status`, {
      credentials: 'include', // Include cookies for authentication
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);
  

  // Login handler
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage('');
    try {
      const res = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setAuthMessage(data.error || 'Login failed.');
      }
    } catch {
      setAuthMessage('Login failed. Please try again.');
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch(`${apiBaseUrl}/logout`, { method: 'POST' });
      setUser(null);
      setGeneratedEmail(null);
      setUsage(null);
      setTranscript('');
      setAuthMessage('');
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthMessage('Logout failed. Please try again.');
    }
  };

  // Email generation
  const generateEmail = async () => {
    if (!transcript.trim()) {
      alert('Please provide a transcript first.');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, ...config }),
        credentials: 'include',
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

  if (!user) {
    // Show login form if not authenticated
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-100 text-center">Member Login</h2>
          <form onSubmit={login} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              required
              className="w-full p-3 rounded bg-gray-900 text-gray-100 border border-gray-700"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              required
              className="w-full p-3 rounded bg-gray-900 text-gray-100 border border-gray-700"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 py-3 rounded font-semibold text-white hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
          {authMessage && <p className="mt-4 text-red-500 text-center">{authMessage}</p>}
        </div>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    
    <div className="min-h-screen bg-gray-900 py-12 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Minutes of the Meeting Generator</h1>
            <p className="text-xl text-gray-400">Made by Rufi • Powered by AI</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
          >
            Logout
          </button>
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
