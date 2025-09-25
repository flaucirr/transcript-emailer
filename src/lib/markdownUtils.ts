import { marked } from 'marked';

export async function markdownToHtml(markdown: string): Promise<string> {
  // If marked is async, await it:
  return await marked(markdown);
}
