import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { ThemeTokens, TrackTalkMessageRow } from '../types';
import { TcTrackerState } from '../hooks/useTcTracker';
import { TrackTalkState } from '../hooks/useTrackTalk';
import { formatDateTime, getInitialLabel, pickCrewAlias } from '../utils';
import { scale } from '../../lib/scaling';

type Props = {
  app: TcTrackerState;
  talk: TrackTalkState;
  styles: AppStyles;
  theme: ThemeTokens;
  onScroll?: any;
};

const CREW_POOL = [
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
] as const;

export function TrackTalkScreen({ app, talk, styles, theme, onScroll }: Props) {
  const flatListRef = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const aliasByUserIdRef = useRef<Map<string, string>>(new Map());

  const isNearBottomRef = useRef(true);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    aliasByUserIdRef.current.clear();
  }, [app.session?.user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (app.currentTab !== 'talk') {
      hasAutoScrolledRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
      hasAutoScrolledRef.current = true;
      isNearBottomRef.current = true;
    }, 80);

    return () => clearTimeout(timer);
  }, [app.currentTab]);

  useEffect(() => {
    if (app.currentTab !== 'talk') return;
    if (!hasAutoScrolledRef.current) return;
    if (!isNearBottomRef.current) return;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(timer);
  }, [app.currentTab, talk.messages.length]);

  function getAliasForUser(userId?: string | null) {
    const uid = userId?.trim();
    if (!uid) return 'Crew Member';

    const existing = aliasByUserIdRef.current.get(uid);
    if (existing) return existing;

    const used = new Set(aliasByUserIdRef.current.values().map((value) => value.toLowerCase()));
    const nextAlias = pickCrewAlias(used);
    aliasByUserIdRef.current.set(uid, nextAlias);
    return nextAlias;
  }

  const renderMessage = ({ item }: { item: TrackTalkMessageRow }) => {
    const mine = Boolean(item.user_id && app.session?.user?.id && item.user_id === app.session.user.id);
    const author = mine ? (talk.displayName || 'You') : (item.display_name?.trim() || getAliasForUser(item.user_id));

    return (
      <View
        style={{
          width: '100%',
          alignItems: mine ? 'flex-end' : 'flex-start',
          paddingHorizontal: scale(2),
          marginVertical: scale(1),
        }}
      >
        <View
          style={[
            styles.talkBubble,
            mine && styles.talkBubbleMine,
            {
              maxWidth: '74%',
              minWidth: scale(96),
              alignSelf: mine ? 'flex-end' : 'flex-start',
              paddingHorizontal: scale(12),
              paddingVertical: scale(10),
              borderRadius: scale(18),
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: scale(6),
            }}
          >
            {mine ? (
              <View
                style={{
                  width: scale(24),
                  height: scale(24),
                  borderRadius: scale(12),
                  marginRight: scale(8),
                  opacity: 0,
                }}
              />
            ) : (
              <View
                style={[
                  styles.talkAvatar,
                  {
                    width: scale(24),
                    height: scale(24),
                    borderRadius: scale(12),
                    marginRight: scale(8),
                  },
                ]}
              >
                <Text style={[styles.talkAvatarText, { fontSize: scale(10) }]}>
                  {getInitialLabel(author)}
                </Text>
              </View>
            )}

            <Text
              style={[
                styles.talkBubbleName,
                {
                  flex: 1,
                  fontSize: scale(12),
                  lineHeight: scale(16),
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {author}
            </Text>

            <Text
              style={[
                styles.talkBubbleTime,
                {
                  marginLeft: scale(8),
                  fontSize: scale(10),
                  lineHeight: scale(14),
                  textAlign: 'right',
                },
              ]}
              numberOfLines={1}
            >
              {formatDateTime(item.created_at)}
            </Text>
          </View>

          <Text
            style={[
              styles.talkBubbleText,
              {
                fontSize: scale(13),
                lineHeight: scale(18),
              },
            ]}
          >
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  const composerOffset = Platform.OS === 'android' ? keyboardHeight : 0;

  const handleListScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isNearBottomRef.current = distanceFromBottom < scale(120);

    if (onScroll) onScroll(e);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.talkShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, minHeight: 0 }}>
          <View style={styles.talkHeader}>
            <Text style={[styles.talkHeaderTitle, { fontSize: scale(20), lineHeight: scale(24) }]}>
              Crew Chat
            </Text>
            <Text style={[styles.talkHeaderSubtitle, { fontSize: scale(12), lineHeight: scale(16) }]}>
              Live communications channel
            </Text>

            {app.guestMode ? (
              <View style={styles.talkBanner}>
                <Ionicons name="lock-closed-outline" size={scale(16)} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.talkBannerTitle, { fontSize: scale(11) }]}>VISITOR MODE ACTIVE</Text>
                  <Text style={[styles.talkBannerText, { fontSize: scale(11), lineHeight: scale(15) }]}>
                    Visitors can observe sightings but cannot access Crew Chat.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <Animated.FlatList
            ref={flatListRef}
            style={{ flex: 1, minHeight: 0 }}
            data={talk.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: scale(14),
              paddingTop: scale(10),
              paddingBottom: scale(12),
            }}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={talk.refreshing}
                onRefresh={talk.onRefresh}
                tintColor={theme.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: scale(8) }} />}
            ListEmptyComponent={
              talk.loading ? (
                <View style={styles.talkEmptyWrap}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.talkEmptyTitle, { fontSize: scale(16) }]}>
                    Scanning for crew chatter...
                  </Text>
                  <Text style={[styles.talkEmptySubtitle, { fontSize: scale(12), lineHeight: scale(16) }]}>
                    Messages will appear here once the crew starts talking.
                  </Text>
                </View>
              ) : (
                <View style={styles.talkEmptyWrap}>
                  <MaterialCommunityIcons name="message-badge-outline" size={scale(44)} color={theme.muted} />
                  <Text style={[styles.talkEmptyTitle, { fontSize: scale(16) }]}>
                    No Crew Messages Yet
                  </Text>
                  <Text style={[styles.talkEmptySubtitle, { fontSize: scale(12), lineHeight: scale(16) }]}>
                    Start the conversation and help the crew stay informed.
                  </Text>
                </View>
              )
            }
            renderItem={renderMessage}
          />

          <View
            style={[
              styles.talkComposer,
              {
                marginBottom: composerOffset,
                paddingHorizontal: scale(10),
                paddingVertical: scale(10),
              },
            ]}
          >
            <View style={[styles.talkComposerField, { borderRadius: scale(18) }]}>
              <TextInput
                value={talk.messageText}
                onChangeText={talk.setMessageText}
                placeholder={app.guestMode ? 'Visitor mode locked' : 'Send a message to the crew...'}
                placeholderTextColor={theme.muted}
                style={[styles.talkComposerInput, { fontSize: scale(13), lineHeight: scale(18) }]}
                multiline
                blurOnSubmit={false}
                textAlignVertical="center"
                editable={talk.canChat}
                maxLength={240}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.talkSendBtn,
                (!talk.canChat || talk.sending) && styles.talkSendBtnDisabled,
                {
                  minHeight: scale(42),
                  paddingHorizontal: scale(12),
                  borderRadius: scale(18),
                },
              ]}
              onPress={talk.canChat ? talk.sendMessage : undefined}
              activeOpacity={0.92}
            >
              {talk.sending ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={[styles.talkSendBtnText, { fontSize: scale(12) }]}>
                  {talk.canChat ? 'Transmit' : 'Locked'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}