'use client';

import { useState, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Copy button component
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all',
        'bg-glass-10 hover:bg-glass-20 text-foreground-secondary hover:text-foreground-primary',
        copied && 'bg-green-500/20 text-green-400'
      )}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <CheckIcon /> Copiado
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <CopyIcon /> Copiar
        </span>
      )}
    </button>
  );
}

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Code block with syntax highlighting
const CodeBlock = memo(function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {/* Language label */}
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-[10px] uppercase tracking-wider text-foreground-tertiary bg-scrim-30 rounded-br">
          {language}
        </div>
      )}

      {/* Copy button */}
      <CopyButton code={value} />

      {/* Code */}
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '2.5rem 1rem 1rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '13px',
          lineHeight: '1.5',
          background: 'rgba(0, 0, 0, 0.4)',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

// Inline code
const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-scrim-20 dark:bg-glass-10 px-1.5 py-0.5 rounded text-[13px] font-mono text-pink-400">
    {children}
  </code>
);

// Image with lightbox and download
const MarkdownImage = memo(function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className="relative my-3 rounded-lg overflow-hidden border border-glass-10 inline-block cursor-pointer group"
        onClick={() => setShowLightbox(true)}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-glass-5">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
        {error ? (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 text-red-400 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Erro ao carregar imagem
          </div>
        ) : (
          <img
            src={src}
            alt={alt || ''}
            className="max-w-full max-h-[400px] object-contain"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            loading="lazy"
          />
        )}
        {/* Hover overlay */}
        {!error && (
          <div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="text-xs text-foreground-primary bg-overlay px-2 py-1 rounded flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
              Ampliar
            </span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-scrim-90 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 text-foreground-secondary hover:text-foreground-primary transition-colors"
              onClick={() => setShowLightbox(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Download button */}
            <button
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-glass-10 hover:bg-glass-20 text-foreground-primary rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-sm">Download</span>
            </button>

            {/* Image info */}
            {alt && (
              <div className="absolute bottom-4 left-4 text-foreground-secondary text-sm">
                {alt}
              </div>
            )}

            {/* Full image */}
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={src}
              alt={alt || ''}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
});

// Custom components for markdown elements
const components = {
  // Code blocks
  code({ inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const value = String(children).replace(/\n$/, '');

    if (!inline && (match || value.includes('\n'))) {
      return <CodeBlock language={language} value={value} />;
    }

    return <InlineCode {...props}>{children}</InlineCode>;
  },

  // Tables
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-glass-10">
        <table className="min-w-full divide-y divide-glass-10">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }: any) {
    return <thead className="bg-glass-5">{children}</thead>;
  },
  th({ children }: any) {
    return (
      <th className="px-4 py-2 text-left text-xs font-semibold text-foreground-primary uppercase tracking-wider">
        {children}
      </th>
    );
  },
  td({ children }: any) {
    return (
      <td className="px-4 py-2 text-sm text-foreground-secondary border-t border-glass-5">
        {children}
      </td>
    );
  },

  // Links
  a({ href, children }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    );
  },

  // Images with lightbox and download
  img({ src, alt }: any) {
    return <MarkdownImage src={src} alt={alt} />;
  },

  // Headers
  h1({ children }: any) {
    return <h1 className="text-xl font-bold text-foreground-primary mt-4 mb-2">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-lg font-semibold text-foreground-primary mt-4 mb-2">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-base font-semibold text-foreground-primary mt-3 mb-1">{children}</h3>;
  },
  h4({ children }: any) {
    return <h4 className="text-sm font-semibold text-foreground-primary mt-2 mb-1">{children}</h4>;
  },

  // Lists
  ul({ children }: any) {
    return <ul className="list-disc list-inside space-y-1 my-2 text-foreground-primary">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside space-y-1 my-2 text-foreground-primary">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="text-sm leading-relaxed">{children}</li>;
  },

  // Blockquote
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-4 border-blue-500/50 pl-4 my-3 italic text-foreground-secondary">
        {children}
      </blockquote>
    );
  },

  // Horizontal rule
  hr() {
    return <hr className="my-4 border-glass-10" />;
  },

  // Paragraphs
  p({ children }: any) {
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },

  // Strong/Bold
  strong({ children }: any) {
    return <strong className="font-semibold text-foreground-primary">{children}</strong>;
  },

  // Emphasis/Italic
  em({ children }: any) {
    return <em className="italic text-foreground-primary">{children}</em>;
  },
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
