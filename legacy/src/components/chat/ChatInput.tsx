'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MessageAttachment } from '@/types';

interface ChatInputProps {
  onSend: (message: string, attachments?: MessageAttachment[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  agentName?: string;
}

interface PendingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string; // For images
}

// Icons
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const AttachIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:mime/type;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get attachment type from mime type
function getAttachmentType(mimeType: string): MessageAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder,
  agentName,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    const allowedTypes = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats', 'audio/', 'video/'];

    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        console.warn(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
      if (!isAllowed) {
        console.warn(`File type ${file.type} is not supported`);
        return false;
      }
      return true;
    });

    const newPendingFiles: PendingFile[] = validFiles.map((file) => {
      const pending: PendingFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        pending.preview = URL.createObjectURL(file);
      }

      return pending;
    });

    if (newPendingFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording - simulate transcription
      setIsRecording(false);
      setMessage((prev) => prev + (prev ? ' ' : '') + '[Audio transcrito]');
    } else {
      setIsRecording(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    const hasContent = message.trim() || pendingFiles.length > 0;
    if (!hasContent || disabled || isProcessingFiles) return;

    setIsProcessingFiles(true);

    try {
      // Convert pending files to MessageAttachment format
      let attachments: MessageAttachment[] | undefined;

      if (pendingFiles.length > 0) {
        attachments = await Promise.all(
          pendingFiles.map(async (pf) => {
            const base64Data = await fileToBase64(pf.file);
            return {
              id: pf.id,
              name: pf.name,
              type: getAttachmentType(pf.type),
              mimeType: pf.type,
              size: pf.size,
              data: base64Data,
              url: pf.preview, // For images, this is a blob URL for immediate display
            };
          })
        );
      }

      // Send message with attachments
      onSend(message.trim(), attachments);

      // Clear state
      setMessage('');
      pendingFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setPendingFiles([]);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const defaultPlaceholder = agentName
    ? `Mensagem para ${agentName}...`
    : 'Digite sua mensagem...';

  return (
    <motion.div
      ref={dropZoneRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'glass-lg rounded-2xl p-2 transition-all duration-200 relative',
        isDragging && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent bg-blue-500/5'
      )}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-2 rounded-xl border-2 border-dashed border-blue-500/50 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <AttachIcon />
              </div>
              <p className="text-sm text-blue-500 font-medium">Solte os arquivos aqui</p>
              <p className="text-xs text-blue-400 mt-1">Imagens, PDFs, documentos (max 10MB)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden file input - keyboard accessible via attach button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        accept="image/*,.pdf,.doc,.docx,.txt,.md,audio/*,video/*"
        aria-label="Selecionar arquivos para anexar"
        tabIndex={-1}
      />

      {/* Attached Files Preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-2 pb-2"
          >
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border',
                    file.preview
                      ? 'w-20 h-20 border-glass-20'
                      : 'flex items-center gap-2 px-2 py-1.5 bg-blue-500/10 border-blue-500/20'
                  )}
                >
                  {file.preview ? (
                    // Image preview
                    <>
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeFile(file.id)}
                          aria-label={`Remover arquivo ${file.name}`}
                          className="p-1 bg-red-500/80 rounded-full text-foreground-primary hover:bg-red-500 transition-colors"
                        >
                          <CloseIcon aria-hidden="true" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-scrim-70 px-1 py-0.5">
                        <p className="text-[10px] text-foreground-primary truncate">{file.name}</p>
                      </div>
                    </>
                  ) : (
                    // File preview
                    <>
                      {file.type.startsWith('image/') ? (
                        <ImageIcon />
                      ) : (
                        <FileIcon />
                      )}
                      <span className="text-xs text-primary max-w-[120px] truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-tertiary">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        onClick={() => removeFile(file.id)}
                        aria-label={`Remover arquivo ${file.name}`}
                        className="text-tertiary hover:text-red-500 transition-colors p-0.5"
                      >
                        <CloseIcon aria-hidden="true" />
                      </button>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-2 pb-2"
          >
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="h-3 w-3 rounded-full bg-red-500"
                aria-hidden="true"
              />
              <span className="text-sm text-red-500 font-medium">
                Gravando...
              </span>
              <span className="text-sm text-red-400 font-mono">
                {formatTime(recordingTime)}
              </span>
              <div className="flex-1" />
              <span className="text-xs text-tertiary">
                Clique no botao para parar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader announcement for recording state */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isRecording && `Gravando audio: ${formatTime(recordingTime)}`}
      </div>

      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <Button
          variant="glass-ghost"
          size="icon"
          aria-label="Anexar arquivo"
          className={cn(
            'h-10 w-10 md:h-10 md:w-10 flex-shrink-0 touch-manipulation',
            pendingFiles.length > 0 && 'text-blue-500 bg-blue-500/10'
          )}
          disabled={disabled || isRecording}
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachIcon aria-hidden="true" />
        </Button>

        {/* Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled || isRecording}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent',
              'text-primary placeholder:text-tertiary',
              'focus:outline-none',
              'py-2.5 px-1',
              'text-sm leading-relaxed',
              'max-h-[200px]',
              (disabled || isRecording) && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Voice Button */}
        <Button
          variant="glass-ghost"
          size="icon"
          aria-label={isRecording ? 'Parar gravacao' : 'Gravar audio'}
          className={cn(
            'h-10 w-10 flex-shrink-0 touch-manipulation',
            isRecording && 'text-red-500 bg-red-500/10'
          )}
          disabled={disabled}
          onClick={toggleRecording}
        >
          {isRecording ? <StopIcon aria-hidden="true" /> : <MicIcon aria-hidden="true" />}
        </Button>

        {/* Send/Stop Button */}
        {isStreaming ? (
          <Button
            variant="glass-ghost"
            size="icon"
            aria-label="Parar geracao"
            className="h-10 w-10 flex-shrink-0 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all duration-200 touch-manipulation"
            onClick={onStop}
          >
            <StopIcon aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="glass-primary"
            size="icon"
            aria-label={isProcessingFiles ? 'Processando arquivos' : 'Enviar mensagem'}
            className={cn(
              'h-10 w-10 flex-shrink-0 transition-all duration-200 touch-manipulation',
              (!message.trim() && pendingFiles.length === 0) && 'opacity-50 scale-95',
              isProcessingFiles && 'opacity-50'
            )}
            onClick={handleSend}
            disabled={disabled || isRecording || isProcessingFiles || (!message.trim() && pendingFiles.length === 0)}
          >
            {isProcessingFiles ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
            ) : (
              <SendIcon aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      {/* Formatting hint */}
      <div className="hidden md:flex items-center justify-between px-2 pt-2 text-[10px] text-tertiary">
        <span>
          <kbd className="px-1 py-0.5 rounded bg-scrim-5 dark:bg-glass-5">Enter</kbd>
          {' '}para enviar ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-scrim-5 dark:bg-glass-5">Shift+Enter</kbd>
          {' '}para nova linha ·{' '}
          <span className="text-blue-400">**negrito**</span> <span className="text-purple-400">*italico*</span>
        </span>
        <span>{message.length}/4000</span>
      </div>
      {/* Mobile character count only */}
      <div className="flex md:hidden justify-end px-2 pt-1 text-[10px] text-tertiary">
        <span>{message.length}/4000</span>
      </div>
    </motion.div>
  );
}
