'use client';

import { lazy, Suspense, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Message, MessageAttachment, SquadType } from '@/types';

// Lazy load heavy markdown renderer
const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer }))
);

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

// Memoized to prevent re-renders when other messages update
export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return <SystemMessage content={message.content} />;
  }

  // Different animations for user vs agent messages
  const messageAnimation = isUser
    ? {
        initial: { opacity: 0, y: 10, x: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, x: 0, scale: 1 },
        transition: { type: 'spring', damping: 25, stiffness: 400 },
      }
    : {
        initial: { opacity: 0, y: 10, x: -10 },
        animate: { opacity: 1, y: 0, x: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <motion.div
      initial={messageAnimation.initial}
      animate={messageAnimation.animate}
      transition={messageAnimation.transition as any}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      {showAvatar && !isUser && (
        <GlassAvatar
          name={message.agentName || 'Agent'}
          size="sm"
          squadType={(message.squadType as SquadType) || 'default'}
          className="flex-shrink-0 mt-1"
        />
      )}

      {/* Message Content */}
      <div className={cn('space-y-1', isUser && 'items-end')}>
        {/* Agent name and badge */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-medium text-secondary">
              {message.agentName}
            </span>
            {message.squadType && (
              <Badge variant="outline">
                {message.squadType}
              </Badge>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 max-w-full',
            isUser
              ? 'message-bubble-user rounded-br-md'
              : 'message-bubble-agent glass rounded-bl-md'
          )}
        >
          <MessageContent
            content={message.content}
            isStreaming={message.isStreaming}
            isUser={isUser}
          />

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <span
            className={cn(
              'text-[10px] text-tertiary',
              isUser ? 'mr-1 text-right' : 'ml-1'
            )}
          >
            {formatRelativeTime(message.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Only re-render if message content or streaming state changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.attachments === nextProps.message.attachments &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTimestamp === nextProps.showTimestamp
  );
});

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
}

function MessageContent({ content, isStreaming, isUser }: MessageContentProps) {
  if (!content && isStreaming) {
    return <TypingIndicator />;
  }

  // Check if content has markdown formatting (for user messages)
  const hasMarkdown = isUser && /[*_`#\[\]|>]/.test(content);

  // For user messages with markdown formatting, use markdown renderer
  // For simple user messages, use plain text for performance
  if (isUser && !hasMarkdown) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }

  // For agent messages or user messages with markdown, use full Markdown rendering (lazy loaded)
  return (
    <div className="relative">
      <Suspense fallback={<MarkdownFallback content={content} />}>
        <MarkdownRenderer content={content} />
      </Suspense>
      {isStreaming && <StreamingCursor />}
    </div>
  );
}

// Attachments component for media display
interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const images = attachments.filter(a => a.type === 'image');
  const files = attachments.filter(a => a.type !== 'image');

  return (
    <div className="mt-3 space-y-2">
      {/* Image grid */}
      {images.length > 0 && (
        <div className={cn(
          'grid gap-2',
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' :
          'grid-cols-2 md:grid-cols-3'
        )}>
          {images.map((img) => (
            <ImageAttachment key={img.id} attachment={img} />
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <FileAttachment key={file.id} attachment={file} />
          ))}
        </div>
      )}
    </div>
  );
}

// Image attachment with lightbox
function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const imageUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group cursor-pointer rounded-lg overflow-hidden border border-glass-10"
        onClick={() => setShowLightbox(true)}
      >
        <img
          src={attachment.thumbnailUrl || imageUrl}
          alt={attachment.name}
          className="w-full h-auto max-h-[300px] object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="text-xs text-foreground-primary bg-overlay px-2 py-1 rounded">
            Clique para ampliar
          </span>
        </div>
      </motion.div>

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
            <div className="absolute bottom-4 left-4 text-foreground-secondary text-sm">
              {attachment.name}
            </div>

            {/* Full image */}
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={imageUrl}
              alt={attachment.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// File attachment with download
function FileAttachment({ attachment }: { attachment: MessageAttachment }) {
  const fileUrl = attachment.url || (attachment.data ? `data:${attachment.mimeType};base64,${attachment.data}` : '');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    const type = attachment.mimeType;
    if (type.includes('pdf')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    }
    if (type.includes('audio')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    }
    if (type.includes('video')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    }
    // Default file icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-glass-5 border border-glass-10 hover:bg-glass-10 transition-colors group"
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-glass-5">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">{attachment.name}</p>
        <p className="text-xs text-tertiary">{formatFileSize(attachment.size)}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex-shrink-0 p-2 text-tertiary hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Download"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </motion.div>
  );
}

// Simple text fallback while markdown loads
function MarkdownFallback({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="typing-dot [animation-delay:0ms]" />
      <div className="typing-dot [animation-delay:200ms]" />
      <div className="typing-dot [animation-delay:400ms]" />
    </div>
  );
}

function StreamingCursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
    />
  );
}

interface SystemMessageProps {
  content: string;
}

function SystemMessage({ content }: SystemMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center py-2"
    >
      <span className="text-xs text-tertiary glass-subtle px-3 py-1 rounded-full">
        {content}
      </span>
    </motion.div>
  );
}
