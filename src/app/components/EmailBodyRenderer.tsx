import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface EmailBodyProps {
  content: string;
}

const css = `
  .email-body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #eee;
  }
  .email-body p {
    margin-bottom: 1rem;
  }
  .email-body ul,
  .email-body ol {
    padding-left: 1.25rem;
    margin-bottom: 1rem;
  }
  .email-body li {
    margin-bottom: 0.5rem;
  }
  .email-body strong {
    font-weight: 700;
  }
  .email-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  .email-body th,
  .email-body td {
    border: 1px solid #444;
    padding: 0.5rem;
    text-align: left;
  }
  .email-body h1,
  .email-body h2,
  .email-body h3 {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
  }
`;

const EmailBodyRenderer = forwardRef<HTMLDivElement, EmailBodyProps>(({ content }, ref) => (
  <>
    <style>{css}</style>
    <div className="email-body" ref={ref}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  </>
));

export default EmailBodyRenderer;
