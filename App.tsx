import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTcTracker } from './src/hooks/useTcTracker';
import { useFeedbackHub } from './src/hooks/useFeedbackHub';
import { useTrackTalk } from './src/hooks/useTrackTalk';
import { createStyles } from './src/styles';
import { THEMES } from './src/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { TrackTalkScreen } from './src/screens/TrackTalkScreen';
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { BugReportScreen } from './src/screens/BugReportScreen';
import { SuggestionScreen } from './src/screens/SuggestionScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { moderateScale, scale } from './lib/scaling';

function AppLoading({ styles, theme }: { styles: ReturnType<typeof createStyles>; theme: (typeof THEMES)['dark'] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    const lineAnim = Animated.loop(
      Animated.timing(line, { toValue: 1, duration: 1800, useNativeDriver: true }),
    );
    pulseAnim.start();
    lineAnim.start();
    return () => {
      pulse.stopAnimation();
      line.stopAnimation();
    };
  }, [line, pulse]);

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.centerLoader}>
        <View style={styles.loaderCard}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: scale(120), height: scale(120) }}>
            <Animated.View
              style={[
                styles.authPulseRing,
                {
                  width: scale(120),
                  height: scale(120),
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
                  transform: [
                    {
                      scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.authPulseScan,
                {
                  transform: [
                    {
                      rotate: line.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '325deg'] }),
                    },
                    { translateX: scale(24) },
                  ],
                },
              ]}
            />
            <View style={styles.authPulseCenter} />
          </View>
          <Text style={styles.loaderTitle}>SUS Among-US</Text>
          <Text style={styles.loaderSubtitle}>Scanning for suspicious activity...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function AppInner() {
  const insets = useSafeAreaInsets();
  const app = useTcTracker();
  const talk = useTrackTalk({ session: app.session, isGuest: app.guestMode });
  const feedback = useFeedbackHub();
  const theme = THEMES[app.themeName];
  const styles = createStyles(theme, insets.top, insets.bottom);

  const visibleCrewCount = useMemo(() => {
    const ids = new Set(app.updates.map((item) => item.user_id).filter(Boolean) as string[]);
    return Math.max(ids.size, 1);
  }, [app.updates]);

  const telemetry = useMemo(
    () => [
      { value: app.visibleUpdates.length, label: 'Active Sightings' },
      { value: app.stats.stationCount, label: 'Active Stations' },
      { value: visibleCrewCount, label: 'Crew Online' },
      { value: app.stats.reportCount, label: 'Recent Reports' },
    ],
    [app.stats.reportCount, app.stats.stationCount, app.visibleUpdates.length, visibleCrewCount],
  );

  const handleLogout = async () => {
    try {
      feedback.setShowAdminDashboard(false);
      feedback.setShowAdminLogin(false);
      app.toggleMenu(false);
      await app.handleLogout();
    } catch (error) {
      Alert.alert('Mission logout failed', error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  if (!app.themeReady || !app.sessionReady) {
    return <AppLoading styles={styles} theme={theme} />;
  }

  if (!app.session) {
    return (
      <>
        <StatusBar style="light" />
        <SafeAreaView style={styles.app}>
          <AuthScreen app={app} styles={styles} theme={theme} />
        </SafeAreaView>
      </>
    );
  }

  const menuItems = [
    {
      label: 'Sightings Board',
      icon: 'radar',
      action: () => {
        app.setCurrentTab('feed');
      },
    },
    {
      label: 'Report Sighting',
      icon: 'alert-circle-outline',
      action: () => {
        app.setCurrentTab('report');
      },
    },
    {
      label: 'Crew Chat',
      icon: 'chat-outline',
      action: () => {
        app.setCurrentTab('talk');
      },
    },
    {
      label: 'Crew Rules',
      icon: 'file-document-outline',
      action: () => {
        app.toggleMenu(false);
        app.setShowPolicy(true);
      },
    },
    {
      label: 'Report Sabotage',
      icon: 'bug-outline',
      action: () => {
        app.toggleMenu(false);
        feedback.openBugReport();
      },
    },
    {
      label: 'Crew Ideas',
      icon: 'lightbulb-outline',
      action: () => {
        app.toggleMenu(false);
        feedback.openSuggestion();
      },
    },
    {
      label: 'About Sus Among-US',
      icon: 'information-outline',
      action: () => {
        app.toggleMenu(false);
        app.setShowAbout(true);
      },
    },
    {
      label: 'Control Room',
      icon: 'shield-check-outline',
      action: () => {
        app.toggleMenu(false);
        feedback.openAdminLogin();
      },
    },
  ];

  return (
    <>
      <StatusBar style="light" />

      {app.isMenuOpen && (
        <Modal transparent visible={app.isMenuOpen} animationType="none" onRequestClose={() => app.toggleMenu(false)}>
          <View style={styles.menuOverlay}>
            <Pressable style={styles.menuBackdrop} onPress={() => app.toggleMenu(false)} />
            <Animated.View style={[styles.menuSheet, { transform: [{ translateX: app.slideAnim }] }]}>
              <View style={styles.menuHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>COMMAND CENTER</Text>
                  <Text style={styles.menuSubtitle}>Crew identity: {app.accountLabel}</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={() => app.toggleMenu(false)}>
                  <Ionicons name="close" size={scale(18)} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scale(24) }}>
                <View style={styles.menuBlock}>
                  {menuItems.map((item) => (
                    <TouchableOpacity key={item.label} style={styles.menuAction} onPress={() => {
                      app.toggleMenu(false);
                      item.action();
                    }}>
                      <MaterialCommunityIcons name={item.icon as any} size={scale(18)} color={theme.text} />
                      <Text style={styles.menuActionText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.menuAction}
                    onPress={() => {
                      Alert.alert(app.guestMode ? 'Leave Mission' : 'Sign Out', 'Do you want to log out now?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Leave Mission', style: 'destructive', onPress: handleLogout },
                      ]);
                    }}
                  >
                    <Ionicons name="log-out-outline" size={scale(18)} color={theme.danger} />
                    <Text style={[styles.menuActionText, styles.menuDangerText]}>
                      {app.guestMode ? 'Leave Mission' : 'Sign Out'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {app.showAbout && (
        <Modal visible animationType="slide" onRequestClose={() => app.setShowAbout(false)}>
          <SafeAreaView style={styles.overlayModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>About Sus Among-US</Text>
                <Text style={styles.modalSubtitle}>A live crew reporting network for suspicious activity across every station.</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => app.setShowAbout(false)}>
                <Ionicons name="close" size={scale(18)} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.contentPadding, { paddingBottom: scale(24) }]}>
              <View style={styles.adminCard}>
                <Text style={styles.sectionHeaderTitle}>Built for the crew</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                  Sus Among-US is a live community-driven crew reporting network.
                </Text>
                <Text style={[styles.noteText, { marginTop: scale(12) }]}>
                  Crew members submit sightings, upload evidence, discuss activity, and help keep stations informed.
                </Text>
                <Text style={styles.noteText}>
                  The platform is designed around rapid information sharing and collaborative verification.
                </Text>
              </View>

              <View style={styles.adminCard}>
                <View style={styles.adminGrid}>
                  {telemetry.map((item) => (
                    <View key={item.label} style={styles.adminMetricCard}>
                      <Text style={styles.adminMetricValue}>{item.value}</Text>
                      <Text style={styles.adminMetricLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {app.showPolicy && (
        <Modal visible animationType="slide" onRequestClose={() => app.setShowPolicy(false)}>
          <SafeAreaView style={styles.overlayModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Crew Rules</Text>
                <Text style={styles.modalSubtitle}>Keep the board accurate, respectful, and useful.</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => app.setShowPolicy(false)}>
                <Ionicons name="close" size={scale(18)} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.contentPadding, { paddingBottom: scale(24) }]}>
              <View style={styles.adminCard}>
                {[
                  'No fake sightings',
                  'No spam',
                  'No harassment',
                  'No personal information',
                  'Keep reports accurate',
                  'Upload evidence responsibly',
                  'Respect fellow crew members',
                ].map((rule) => (
                  <View key={rule} style={[styles.helperCard, { marginTop: scale(10) }]}>
                    <Ionicons name="checkmark-circle-outline" size={scale(18)} color={theme.success} />
                    <Text style={styles.helperText}>{rule}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      <AdminLoginScreen
        visible={feedback.showAdminLogin}
        feedback={feedback}
        styles={styles}
        theme={theme}
        onClose={() => feedback.setShowAdminLogin(false)}
      />

      <BugReportScreen
        visible={feedback.showBugReport}
        session={app.session}
        feedback={feedback}
        styles={styles}
        theme={theme}
        onClose={() => feedback.setShowBugReport(false)}
      />

      <SuggestionScreen
        visible={feedback.showSuggestion}
        session={app.session}
        feedback={feedback}
        styles={styles}
        theme={theme}
        onClose={() => feedback.setShowSuggestion(false)}
      />

      <AdminDashboardScreen
        visible={feedback.showAdminDashboard}
        feedback={feedback}
        styles={styles}
        theme={theme}
        onClose={() => feedback.setShowAdminDashboard(false)}
        onLogout={handleLogout}
      />

      <SafeAreaView style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.iconButton} onPress={() => app.toggleMenu(true)}>
              <Ionicons name="menu" size={scale(20)} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.appTitle}>SUS Among-US</Text>
              <Text style={styles.appSubtitle}>See a Sus. Report a Sus.</Text>
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => app.setThemeName(app.themeName === 'dark' ? 'light' : 'dark')}
            >
              <Ionicons
                name={app.themeName === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={scale(18)}
                color={theme.text}
              />
            </TouchableOpacity>

            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{app.accountLabel.slice(0, 1).toUpperCase()}</Text>
            </View>
          </View>

          {app.guestMode ? (
            <View style={styles.talkBanner}>
              <Ionicons name="lock-closed-outline" size={scale(18)} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.talkBannerTitle}>VISITOR MODE ACTIVE</Text>
                <Text style={styles.talkBannerText}>Visitors can observe sightings but cannot access Crew Chat.</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ zIndex: 10 }}>
          <View style={styles.segmented}>

            {/* REPORT FIRST */}
            <TouchableOpacity
              style={[styles.segmentedBtn, app.currentTab === 'report' && styles.segmentedBtnActive]}
              onPress={() => app.setCurrentTab('report')}
            >
              <MaterialCommunityIcons
                name="alert-octagon-outline"
                size={scale(18)}
                color={app.currentTab === 'report' ? theme.primaryText : theme.text}
              />
              <Text
                style={[
                  styles.segmentedText,
                  app.currentTab === 'report' && styles.segmentedTextActive,
                ]}
              >
                Report
              </Text>
            </TouchableOpacity>

            {/* SIGHTINGS SECOND */}
            <TouchableOpacity
              style={[styles.segmentedBtn, app.currentTab === 'feed' && styles.segmentedBtnActive]}
              onPress={() => app.setCurrentTab('feed')}
            >
              <MaterialCommunityIcons
                name="radar"
                size={scale(18)}
                color={app.currentTab === 'feed' ? theme.primaryText : theme.text}
              />
              <Text
                style={[
                  styles.segmentedText,
                  app.currentTab === 'feed' && styles.segmentedTextActive,
                ]}
              >
                Sightings
              </Text>
            </TouchableOpacity>

            {/* CHAT THIRD */}
            <TouchableOpacity
              style={[styles.segmentedBtn, app.currentTab === 'talk' && styles.segmentedBtnActive]}
              onPress={() => app.setCurrentTab('talk')}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={scale(18)}
                color={app.currentTab === 'talk' ? theme.primaryText : theme.text}
              />
              <Text
                style={[
                  styles.segmentedText,
                  app.currentTab === 'talk' && styles.segmentedTextActive,
                ]}
              >
                Crew Chat
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={[styles.body, { overflow: 'hidden' }]}>
          {app.currentTab === 'feed' ? (
            <FeedScreen app={app} styles={styles} theme={theme} />
          ) : app.currentTab === 'report' ? (
            <ReportScreen app={app} styles={styles} theme={theme} />
          ) : (
            <TrackTalkScreen app={app} talk={talk} styles={styles} theme={theme} />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}
