import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import { TrackTalkMessageRow } from '../types';

const TALK_ALIAS_POOL = [
  'Red Crewmate',
  'Blue Crewmate',
  'Green Crewmate',
  'Yellow Crewmate',
  'Purple Crewmate',
  'Orange Crewmate',
  'Pink Crewmate',
  'Cyan Crewmate',
  'Black Crewmate',
  'White Crewmate',
  'Brown Crewmate',
  'Lime Crewmate',
];

function pickTalkAlias(usedNames: Set<string>) {
  const available = TALK_ALIAS_POOL.filter((name) => !usedNames.has(name.toLowerCase()));

  const base =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : TALK_ALIAS_POOL[Math.floor(Math.random() * TALK_ALIAS_POOL.length)];

  let candidate = base;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base} ${suffix++}`;
  }

  return candidate;
}

export type TrackTalkState = {
  messages: TrackTalkMessageRow[];
  loading: boolean;
  refreshing: boolean;
  sending: boolean;
  messageText: string;
  canChat: boolean;
  displayName: string;
  setMessageText: (value: string) => void;
  loadMessages: () => Promise<void>;
  sendMessage: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

type Params = {
  session: Session | null;
  isGuest: boolean;
};

export function useTrackTalk({ session, isGuest }: Params): TrackTalkState {
  const [messages, setMessages] = useState<TrackTalkMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');

  const talkAliasRef = useRef<string | null>(null);
  const [talkAlias, setTalkAlias] = useState('');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const canChat = Boolean(session?.user?.id) && !isGuest;
  const displayName = useMemo(() => talkAlias || 'Crew Member', [talkAlias]);

  const claimTalkAlias = useCallback(() => {
    if (talkAliasRef.current) {
      return talkAliasRef.current;
    }

    const usedNames = new Set(
      messages
        .map((message) => (message.display_name ?? '').trim().toLowerCase())
        .filter(Boolean)
        .filter((name) => !name.includes('@')),
    );

    const nextAlias = pickTalkAlias(usedNames);
    talkAliasRef.current = nextAlias;
    setTalkAlias(nextAlias);

    return nextAlias;
  }, [messages]);

  useEffect(() => {
    talkAliasRef.current = null;
    setTalkAlias('');
  }, [session?.user?.id, isGuest]);

  useEffect(() => {
    if (session?.user?.id && !isGuest && !talkAliasRef.current) {
      claimTalkAlias();
    }
  }, [claimTalkAlias, isGuest, session?.user?.id]);

  const loadMessages = useCallback(async () => {
    if (!session?.user?.id) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('track_talk_messages')
        .select('id,created_at,user_id,display_name,message')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        Alert.alert('Crew Chat error', error.message);
        return;
      }

      setMessages((data ?? []) as TrackTalkMessageRow[]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!session?.user?.id) {
        setMessages([]);
        return;
      }

      await loadMessages();
      if (!active) return;

      const channel = supabase
        .channel(`track-talk-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'track_talk_messages' },
          (payload) => {
            const nextMessage = payload.new as TrackTalkMessageRow;
            setMessages((current) => {
              const exists = current.some((item) => item.id === nextMessage.id);
              if (exists) return current;

              return [...current, nextMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            });
          },
        )
        .subscribe();

      channelRef.current = channel;
    })();

    return () => {
      active = false;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadMessages, session?.user?.id]);

  const sendMessage = useCallback(async () => {
    if (!session?.user?.id) {
      Alert.alert('Crew access required', 'Please sign in before entering Crew Chat.');
      return;
    }

    if (isGuest) {
      Alert.alert('Visitor mode locked', 'Join the crew to access Crew Chat.');
      return;
    }

    const trimmed = messageText.trim();
    if (!trimmed) {
      Alert.alert('Empty transmission', 'Type a message before transmitting.');
      return;
    }

    if (trimmed.length > 240) {
      Alert.alert('Transmission too long', 'Keep Crew Chat messages under 240 characters.');
      return;
    }

    setSending(true);
    try {
      const alias = claimTalkAlias();

      const { data, error } = await supabase
        .from('track_talk_messages')
        .insert({
          user_id: session.user.id,
          display_name: alias,
          message: trimmed,
        })
        .select('id,created_at,user_id,display_name,message')
        .single();

      if (error) {
        Alert.alert('Transmission failed', error.message);
        return;
      }

      setMessageText('');

      if (data) {
        const nextMessage = data as TrackTalkMessageRow;
        setMessages((current) => {
          if (current.some((item) => item.id === nextMessage.id)) {
            return current;
          }

          return [...current, nextMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
        });
      } else {
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  }, [claimTalkAlias, isGuest, loadMessages, messageText, session?.user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  return {
    messages,
    loading,
    refreshing,
    sending,
    messageText,
    canChat,
    displayName,
    setMessageText,
    loadMessages,
    sendMessage,
    onRefresh,
  };
}