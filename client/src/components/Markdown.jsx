import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

export default function Markdown({ children, className = '' }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(String(children || ''))), [children]);
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
