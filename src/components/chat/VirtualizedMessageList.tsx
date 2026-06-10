'use no memo';

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

interface VirtualizedMessageListProps {
  messages: Message[];
  className?: string;
}

export function VirtualizedMessageList({ messages, className }: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is safe to use; skipping compiler memoization
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height per message
    overscan: 5, // Render 5 extra items outside viewport
    measureElement: (el) => {
      // Measure actual element height for accurate scrolling
      return el.getBoundingClientRect().height + 16; // Add gap
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && !scrollingRef.current) {
      // Small delay to allow render
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
      });
    }
  }, [messages.length, virtualizer]);

  // Track user scrolling
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      scrollingRef.current = !isAtBottom;
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto glass-scrollbar ${className || ''}`}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {items.map((virtualRow) => {
              const message = messages[virtualRow.index];
              const prevMessage = messages[virtualRow.index - 1];
              const nextMessage = messages[virtualRow.index + 1];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="pb-4"
                >
                  <MessageBubble
                    message={message}
                    showAvatar={
                      virtualRow.index === 0 ||
                      prevMessage?.role !== message.role
                    }
                    showTimestamp={
                      virtualRow.index === messages.length - 1 ||
                      nextMessage?.role !== message.role
                    }
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Simple non-virtualized list for small message counts
// Uses virtualization only when needed
interface SmartMessageListProps {
  messages: Message[];
  className?: string;
  virtualizationThreshold?: number;
}

export function SmartMessageList({
  messages,
  className,
  virtualizationThreshold = 50,
}: SmartMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages (for non-virtualized list)
  useEffect(() => {
    if (messages.length > 0 && messages.length < virtualizationThreshold) {
      // Small delay to allow render
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length, virtualizationThreshold]);

  // Use simple list for small message counts
  if (messages.length < virtualizationThreshold) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={
                index === 0 ||
                messages[index - 1]?.role !== message.role
              }
              showTimestamp={
                index === messages.length - 1 ||
                messages[index + 1]?.role !== message.role
              }
            />
          ))}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>
    );
  }

  // Use virtualization for large lists
  return (
    <VirtualizedMessageList messages={messages} className={className} />
  );
}
