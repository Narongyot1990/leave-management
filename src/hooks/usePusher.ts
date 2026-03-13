'use client';

import { useEffect, useRef, useMemo } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { debounce } from '@/lib/debounce';
import type { Channel } from 'pusher-js';

interface PusherBinding {
  event: string;
  callback: (data: any) => void;
}

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Subscribe to one or more Pusher channels and bind events.
 * Callbacks are debounced by default (400ms) so rapid Pusher events
 * don't cause excessive re-fetches.
 *
 * @param channelName  - channel to subscribe to
 * @param bindings     - array of { event, callback }
 * @param enabled      - set false to skip (e.g. while user is loading)
 * @param debounceMs   - debounce delay in ms (0 to disable)
 */
export function usePusher(
  channelName: string,
  bindings: PusherBinding[],
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const channelRef = useRef<Channel | null>(null);

  // Memoize debounced wrappers keyed by event name
  const debouncedBindings = useMemo(
    () =>
      bindings.map(({ event, callback }) => ({
        event,
        callback: debounceMs > 0 ? debounce(callback, debounceMs) : callback,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounceMs, ...bindings.map((b) => b.event)],
  );

  useEffect(() => {
    if (!enabled) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    for (const { event, callback } of debouncedBindings) {
      channel.bind(event, callback);
    }

    return () => {
      for (const { event, callback } of debouncedBindings) {
        channel.unbind(event, callback);
      }
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, debouncedBindings]);
}

/**
 * Subscribe to multiple channels at once.
 * Callbacks are debounced by default (400ms).
 */
export function usePusherMulti(
  subscriptions: Array<{ channel: string; bindings: PusherBinding[] }>,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const debouncedSubs = useMemo(
    () =>
      subscriptions.map((sub) => ({
        channel: sub.channel,
        bindings: sub.bindings.map(({ event, callback }) => ({
          event,
          callback: debounceMs > 0 ? debounce(callback, debounceMs) : callback,
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounceMs, ...subscriptions.map((s) => s.channel)],
  );

  useEffect(() => {
    if (!enabled) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channels: Channel[] = [];

    for (const sub of debouncedSubs) {
      const channel = pusher.subscribe(sub.channel);
      channels.push(channel);
      for (const { event, callback } of sub.bindings) {
        channel.bind(event, callback);
      }
    }

    return () => {
      for (let i = 0; i < debouncedSubs.length; i++) {
        const sub = debouncedSubs[i];
        const channel = channels[i];
        for (const { event, callback } of sub.bindings) {
          channel.unbind(event, callback);
        }
        pusher.unsubscribe(sub.channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedSubs]);
}
