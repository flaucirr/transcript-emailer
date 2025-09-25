import { markdownToHtml } from './markdownUtils';

export async function copyEmailToClipboard(markdownContent: string) {
    try {
      const htmlContent = await markdownToHtml(markdownContent);
  
      const blobInput = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([markdownContent], { type: 'text/plain' }),
      });
  
      await navigator.clipboard.write([blobInput]);
      alert('Email copied to clipboard with formatting!');
    } catch (error) {
      await navigator.clipboard.writeText(markdownContent);
      alert('Email copied to clipboard as plain text.');
    }
  }
  
