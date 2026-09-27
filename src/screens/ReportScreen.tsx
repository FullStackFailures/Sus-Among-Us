import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { ThemeTokens } from '../types';
import { TcTrackerState } from '../hooks/useTcTracker';
import { humanDistance } from '../utils';
import { moderateScale, scale } from '../../lib/scaling';

type Props = {
  app: TcTrackerState;
  styles: AppStyles;
  theme: ThemeTokens;
  onScroll?: any;
};

export function ReportScreen({ app, styles, theme, onScroll }: Props) {
  const scrollRef = useRef<any>(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const radarSpin = useRef(new Animated.Value(0)).current;

  const currentStation = useMemo(() => app.selectedStation ?? null, [app.selectedStation]);

  useEffect(() => {
    if (!app.locationLoading) {
      radarSpin.stopAnimation();
      radarSpin.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(radarSpin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();

    return () => {
      loop.stop();
      radarSpin.stopAnimation();
    };
  }, [app.locationLoading, radarSpin]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.composerWrap, { paddingBottom: scale(20) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.reportHeroCard}>
          <Text style={styles.heroLabel}>Emergency Report</Text>
          <Text style={styles.reportHeroTitle}>Report Sighting</Text>
          <Text style={styles.reportHeroSubtitle}>Tell the crew what you observed.</Text>
        </View>

        <View style={styles.reportSection}>
          <Text style={styles.reportFieldLabel}>Where was the sighting?</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: scale(10),
            marginTop: scale(12),
          }}
        >
            <TouchableOpacity
              style={[styles.authField, { flex: 1 }]}
              onPress={() => setShowStationModal(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="locate-outline" size={scale(18)} color={theme.muted} />
              <Text
                style={[
                  styles.authInput,
                  {
                    flex: 1,
                    paddingVertical: 0,
                    color: currentStation ? theme.text : theme.muted,
                    lineHeight: moderateScale(53),
                  },
                ]}
              >
                {currentStation ? currentStation.name : 'Select a station'}
              </Text>
            </TouchableOpacity>



            <TouchableOpacity
              onPress={() => {
                if (app.nearestStationHint) {
                  Alert.alert(
                    'Station Already Found',
                    `${app.nearestStationHint.name} is already locked.\n\nTap “Select a station” if you want to choose a different one.`,
                  );
                  return;
                }

                app.requestNearestStation();
              }}
              activeOpacity={0.9}
              disabled={app.locationLoading}
              style={{
                width: scale(54),
                height: moderateScale(54),
                borderRadius: moderateScale(17),
                backgroundColor: theme.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: radarSpin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }}
              >
                <MaterialCommunityIcons
                  name="radar"
                  size={scale(26)}
                  color={theme.primary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {app.nearestStationHint ? (
            <View style={styles.helperCard}>
              <Ionicons name="sparkles-outline" size={scale(18)} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helperTitle}>Nearest station found</Text>
                <Text style={styles.helperText}>
                  {app.nearestStationHint.name} • about {humanDistance(app.nearestStationHint.distance)} away.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.helperCard}>
              <MaterialCommunityIcons name="radar" size={scale(18)} color={theme.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helperTitle}>Mission tip</Text>
                <Text style={styles.helperText}>Use the radar button to auto-pick the nearest station.</Text>
              </View>
            </View>
          )}

          <Text style={styles.reportFieldLabel}>Current Situation</Text>
          <View style={styles.statusChoiceRow}>
            <TouchableOpacity
              style={[styles.statusChoice, app.tcStatus === false && styles.statusChoiceActiveClear]}
              onPress={() => app.setTcStatus(false)}
            >
              <Text style={[styles.statusChoiceText, app.tcStatus === false && styles.statusChoiceTextActive]}>
                Sus Spotted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusChoice, app.tcStatus === true && styles.statusChoiceActiveSeen]}
              onPress={() => app.setTcStatus(true)}
            >
              <Text style={[styles.statusChoiceText, app.tcStatus === true && styles.statusChoiceTextActive]}>
                Area Clear
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.reportFieldLabel}>Crew Notes</Text>
          <TextInput
            value={app.note}
            onChangeText={app.setNote}
            placeholder="Describe what happened."
            placeholderTextColor={theme.muted}
            style={styles.noteInput}
            multiline
          />

          <Text style={styles.reportFieldLabel}>Attach Evidence</Text>
          {app.reportPhoto ? (
            <View style={styles.reportImageCard}>
              <Image
                source={{ uri: app.reportPhoto.uri }}
                style={styles.reportImagePreview}
                resizeMode="cover"
              />

              <View style={styles.reportImageActions}>
                <TouchableOpacity
                  style={styles.reportImageAction}
                  onPress={app.pickReportPhoto}
                >
                  <Text style={styles.reportImageActionText}>Replace Evidence</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportImageAction}
                  onPress={app.removeReportPhoto}
                >
                  <Text style={styles.reportImageActionText}>Remove Evidence</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                gap: scale(12),
              }}
            >
              <TouchableOpacity
                style={[styles.reportImageCard, { flex: 1 }]}
                onPress={app.pickReportPhoto}
                activeOpacity={0.9}
              >
                <View
                  style={{
                    padding: scale(16),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name="file-image-plus-outline"
                    size={scale(34)}
                    color={theme.muted}
                  />

                  <Text
                    style={[
                      styles.reportHeroSubtitle,
                      {
                        textAlign: 'center',
                        marginTop: scale(10),
                      },
                    ]}
                  >
                    Attach Image
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportImageCard, { flex: 1 }]}
                onPress={app.captureReportPhoto}
                activeOpacity={0.9}
              >
                <View
                  style={{
                    padding: scale(16),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={scale(34)}
                    color={theme.primary}
                  />

                  <Text
                    style={[
                      styles.reportHeroSubtitle,
                      {
                        textAlign: 'center',
                        marginTop: scale(10),
                      },
                    ]}
                  >
                    Capture Now
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.reportHintBadge}>
            <Ionicons name="shield-checkmark-outline" size={scale(16)} color={theme.primary} />
            <Text style={styles.reportHintText}>
              Reports go live instantly on the mission board and can be discussed by the crew.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reportPrimaryBtn}
            onPress={app.handleSubmit}
            activeOpacity={0.92}
          >
            {app.submitLoading ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={styles.reportPrimaryBtnText}>Submit Sighting</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={showStationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStationModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.72)', justifyContent: 'flex-end' }}>
          <View
            style={{
              maxHeight: '88%',
              backgroundColor: theme.background,
              borderTopLeftRadius: scale(24),
              borderTopRightRadius: scale(24),
              borderWidth: 1,
              borderColor: theme.border,
              padding: scale(16),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Station</Text>
                <Text style={styles.modalSubtitle}>Where was the sighting?</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowStationModal(false);
                  app.setStationSearchText('');
                }}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={scale(18)} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.authField, { marginTop: scale(12) }]}>
              <Ionicons name="search" size={scale(18)} color={theme.muted} />
              <TextInput
                value={app.stationSearchText}
                onChangeText={app.setStationSearchText}
                placeholder="Search a station"
                placeholderTextColor={theme.muted}
                style={styles.authInput}
                autoFocus
              />
            </View>

            <Text style={styles.stationCountBadge}>{app.filteredStations.length} stations</Text>

            <FlatList
              data={app.filteredStations}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: scale(20) }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stationRow}
                  onPress={() => {
                    app.setSelectedStationId(item.id);
                    setShowStationModal(false);
                    app.setStationSearchText('');
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.stationRowText}>{item.name}</Text>
                  <Text style={styles.stationRowSubtext}>Tap to select</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="card-search-outline" size={scale(48)} color={theme.muted} />
                  <Text style={styles.emptyTitle}>No stations found</Text>
                  <Text style={styles.emptySubtitle}>Try a shorter search term.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}