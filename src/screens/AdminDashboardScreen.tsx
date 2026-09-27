import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { ThemeTokens } from '../types';
import { scale } from '../../lib/scaling';
import { FeedbackHubState } from '../hooks/useFeedbackHub';
import { formatDateTime } from '../utils';

type Props = {
  visible: boolean;
  feedback: FeedbackHubState;
  styles: AppStyles;
  theme: ThemeTokens;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
};

function SectionTitle({ title, subtitle, theme }: { title: string; subtitle: string; theme: ThemeTokens }) {
  return (
    <View style={{ marginBottom: scale(8) }}>
      <Text style={{ color: theme.text, fontSize: scale(18), fontWeight: '900' }}>{title}</Text>
      <Text style={{ color: theme.muted, marginTop: scale(2), fontSize: scale(12), lineHeight: scale(18) }}>
        {subtitle}
      </Text>
    </View>
  );
}

function MissionTag({ label, theme }: { label: string; theme: ThemeTokens }) {
  return (
    <View
      style={{
        minHeight: scale(30),
        paddingHorizontal: scale(10),
        borderRadius: scale(999),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.text, fontSize: scale(12), fontWeight: '900' }}>{label}</Text>
    </View>
  );
}

export function AdminDashboardScreen({ visible, feedback, styles, theme, onClose, onLogout }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlayModal}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>CONTROL ROOM</Text>
            <Text style={styles.modalSubtitle}>Review reports and requests from the crew.</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={async () => {
              onClose();
              await onLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={scale(18)} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.contentPadding, { paddingBottom: scale(24) }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.adminCard}>
            <View style={styles.adminGrid}>
              <View style={styles.adminMetricCard}>
                <Text style={styles.adminMetricValue}>{feedback.bugReports.length}</Text>
                <Text style={styles.adminMetricLabel}>Sabotage Reports</Text>
              </View>
              <View style={styles.adminMetricCard}>
                <Text style={styles.adminMetricValue}>{feedback.changeRequests.length}</Text>
                <Text style={styles.adminMetricLabel}>Crew Ideas</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) }}>
              <SectionTitle
                title={`Sabotage Reports (${feedback.bugReports.length})`}
                subtitle={feedback.bugReports.length ? 'Recent issues from the mission board.' : 'No sabotage reports yet.'}
                theme={theme}
              />

              <TouchableOpacity style={styles.iconButton} onPress={() => void feedback.loadAdminData()}>
                {feedback.adminLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Ionicons name="refresh-outline" size={scale(18)} color={theme.text} />
                )}
              </TouchableOpacity>
            </View>

            {feedback.bugReports.length === 0 ? (
              <View style={styles.adminEmptyCard}>
                <MaterialCommunityIcons name="shield-off-outline" size={scale(36)} color={theme.muted} />
                <Text style={styles.emptyTitle}>No Reports Submitted</Text>
                <Text style={styles.emptySubtitle}>The control room has not received any sabotage reports yet.</Text>
              </View>
            ) : (
              feedback.bugReports.map((item) => (
                <View key={item.id} style={styles.adminEntryCard}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminEntryTitle}>{item.issue_title}</Text>
                      <Text style={styles.adminEntryTime}>{formatDateTime(item.created_at)}</Text>
                    </View>
                    <MissionTag label={item.severity ?? 'OPEN'} theme={theme} />
                  </View>

                  <View style={styles.adminEntryTagRow}>
                    {item.area ? <MissionTag label={item.area} theme={theme} /> : null}
                    {item.issue_type ? <MissionTag label={item.issue_type} theme={theme} /> : null}
                    {item.status ? <MissionTag label={item.status} theme={theme} /> : null}
                  </View>

                  <Text style={styles.adminEntryBody}>{item.problem}</Text>
                  {item.expected_behavior ? <Text style={styles.adminEntryBody}>Expected: {item.expected_behavior}</Text> : null}
                  {item.actual_behavior ? <Text style={styles.adminEntryBody}>Actual: {item.actual_behavior}</Text> : null}
                  {item.device_details ? <Text style={styles.adminEntryBody}>Device: {item.device_details}</Text> : null}
                </View>
              ))
            )}

            <View style={styles.divider} />

            <SectionTitle
              title={`Crew Ideas (${feedback.changeRequests.length})`}
              subtitle={feedback.changeRequests.length ? 'Feature ideas, improvements, and workflow requests.' : 'No crew ideas yet.'}
              theme={theme}
            />

            {feedback.changeRequests.length === 0 ? (
              <View style={styles.adminEmptyCard}>
                <MaterialCommunityIcons name="lightbulb-outline" size={scale(36)} color={theme.muted} />
                <Text style={styles.emptyTitle}>No Crew Ideas Yet</Text>
                <Text style={styles.emptySubtitle}>Fresh ideas will appear here as soon as crew members submit them.</Text>
              </View>
            ) : (
              feedback.changeRequests.map((item) => (
                <View key={item.id} style={styles.adminEntryCard}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminEntryTitle}>{item.request_title}</Text>
                      <Text style={styles.adminEntryTime}>{formatDateTime(item.created_at)}</Text>
                    </View>
                    <MissionTag label={item.priority ?? 'OPEN'} theme={theme} />
                  </View>

                  <View style={styles.adminEntryTagRow}>
                    {item.suggestion_type ? <MissionTag label={item.suggestion_type} theme={theme} /> : null}
                    {item.status ? <MissionTag label={item.status} theme={theme} /> : null}
                  </View>

                  {item.summary ? <Text style={styles.adminEntryBody}>{item.summary}</Text> : null}
                  {item.description ? <Text style={styles.adminEntryBody}>{item.description}</Text> : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
