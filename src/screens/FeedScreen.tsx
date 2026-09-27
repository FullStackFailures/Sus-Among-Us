import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { ThemeTokens } from '../types';
import { TcTrackerState } from '../hooks/useTcTracker';
import { netScore, timeAgo, formatDateTime } from '../utils';
import { moderateScale, scale } from '../../lib/scaling';

type Props = {
  app: TcTrackerState;
  styles: AppStyles;
  theme: ThemeTokens;
  onScroll?: any;
};

function StatusChip({ seen, styles, theme }: { seen: boolean; styles: AppStyles; theme: ThemeTokens }) {
  return (
    <View
      style={[
        styles.scorePill,
        {
          backgroundColor: seen ? 'rgba(74,222,128,0.10)' : 'rgba(255,92,92,0.14)',
          borderColor: seen ? 'rgba(74,222,128,0.22)' : 'rgba(255,92,92,0.26)',
        },
      ]}
    >
      <Text style={[styles.scoreText, { color: seen ? theme.success : theme.primary }]}>
        {seen ? 'AREA CLEAR' : 'SUS SPOTTED'}
      </Text>
    </View>
  );
}

export function FeedScreen({ app, styles, theme, onScroll }: Props) {
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const statusFilters: Array<{ key: typeof app.statusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'not_seen', label: 'Sus Spotted' },
    { key: 'available', label: 'Area Clear' },
    { key: 'mine', label: 'Mine' },
  ];

  return (
    <Animated.FlatList
      data={app.visibleUpdates}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: scale(16), paddingTop: scale(10), paddingBottom: scale(24) }}
      refreshControl={<RefreshControl refreshing={app.refreshing} onRefresh={app.onRefresh} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Sightings Board</Text>
            <Text style={styles.sectionHeaderSubtitle}>Reports submitted by crew members.</Text>
          </View>

          <View style={styles.composerCard}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: scale(10),
              }}
            >
              <View style={[styles.authField, { flex: 1, marginTop: 0 }]}>
                <Ionicons name="search" size={scale(18)} color={theme.muted} />
                <TextInput
                  value={app.searchText}
                  onChangeText={app.setSearchText}
                  placeholder="Search station or note"
                  placeholderTextColor={theme.muted}
                  style={styles.authInput}
                />
              </View>

              <TouchableOpacity
                onPress={() => setShowFilters((prev) => !prev)}
                activeOpacity={0.9}
                style={{
                  width: scale(54),
                  height: scale(54),
                  borderRadius: scale(18),
                  backgroundColor: theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: showFilters ? theme.border : theme.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 0,
                }}
              >
                <Ionicons
                  name={showFilters ? 'options' : 'options-outline'}
                  size={scale(22)}
                  color={showFilters ? theme.muted : theme.primary}
                />
              </TouchableOpacity>
            </View>

            {showFilters ? (
              <>
                <View style={[styles.filterRow, { marginTop: scale(12) }]}>
                  {statusFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      onPress={() => app.setStatusFilter(filter.key)}
                      style={[styles.chip, app.statusFilter === filter.key && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, app.statusFilter === filter.key && styles.chipTextActive]}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.filterRow, { marginTop: scale(12) }]}>
                  {(
                    [
                      ['latest', 'Latest'],
                      ['top', 'Most Discussed'],
                    ] as const
                  ).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => app.setSortMode(key)}
                      style={[styles.chip, app.sortMode === key && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, app.sortMode === key && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="radar" size={scale(54)} color={theme.muted} />
          <Text style={styles.emptyTitle}>No Sightings Yet</Text>
          <Text style={styles.emptySubtitle}>The board is quiet. Be the first to file a signal from the crew.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const seen = item.tc_status === true;
        const score = netScore(item);
        const hasPhoto = Boolean(item.photo_url);
        const station = item.stations?.name ?? 'Unknown Station';

        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stationName}>{station}</Text>
                <Text style={styles.timeText}>
                  {timeAgo(item.created_at)} • {formatDateTime(item.created_at)}
                </Text>
              </View>
              <StatusChip seen={seen} styles={styles} theme={theme} />
            </View>

            <View style={styles.reportHintBadge}>
              <Ionicons
                name={hasPhoto ? 'attach' : 'radio-outline'}
                size={scale(16)}
                color={hasPhoto ? theme.success : theme.muted}
              />
              <Text style={styles.reportHintText}>
                {hasPhoto ? 'Evidence packet attached.' : 'No evidence packet attached.'}
              </Text>
            </View>

            {item.platform_note ? <Text style={styles.noteText}>{item.platform_note}</Text> : null}

            {hasPhoto ? (
              <>
                <TouchableOpacity
                  style={[styles.reportImageAction, { marginTop: scale(12), alignSelf: 'flex-start' }]}
                  onPress={() => setExpandedPhotoId((prev) => (prev === item.id ? null : item.id))}
                >
                  <Text style={styles.reportImageActionText}>
                    {expandedPhotoId === item.id ? 'Hide Evidence' : 'View Evidence'}
                  </Text>
                </TouchableOpacity>

                {expandedPhotoId === item.id ? (
                  <View style={styles.feedPhotoWrap}>
                    <Image source={{ uri: item.photo_url ?? undefined }} style={styles.feedPhoto} resizeMode="cover" />
                    <Text style={styles.feedPhotoCaption}>Evidence preview from the report.</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={styles.voteRow}>
              <TouchableOpacity style={styles.voteBtn} onPress={() => app.handleVote(item.id, 'up')} activeOpacity={0.85}>
                <Ionicons name="arrow-up" size={scale(16)} color={theme.success} />
                <Text style={styles.voteValue}>{item.upvotes ?? 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.voteBtn} onPress={() => app.handleVote(item.id, 'down')} activeOpacity={0.85}>
                <Ionicons name="arrow-down" size={scale(16)} color={theme.danger} />
                <Text style={styles.voteValue}>{item.downvotes ?? 0}</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{score >= 0 ? `+${score}` : `${score}`}</Text>
              </View>

              {item.user_id === app.session?.user?.id ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => app.handleDelete(item.id)} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={scale(17)} color={theme.danger} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}