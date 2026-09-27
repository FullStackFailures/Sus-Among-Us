import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { Session } from '@supabase/supabase-js';
import { ThemeTokens, BugReportForm } from '../types';
import { scale, moderateScale } from '../../lib/scaling';
import { FeedbackHubState } from '../hooks/useFeedbackHub';
import { BUG_AREAS, BUG_SEVERITIES, BUG_TYPES, EMPTY_BUG_FORM } from '../data/feedbackOptions';

type Props = {
  visible: boolean;
  session: Session | null;
  feedback: FeedbackHubState;
  styles: AppStyles;
  theme: ThemeTokens;
  onClose: () => void;
};

function ChipRow({
  values,
  activeValue,
  onChange,
  styles,
}: {
  values: readonly string[];
  activeValue: string;
  onChange: (value: string) => void;
  styles: AppStyles;
}) {
  return (
    <View style={styles.filterRow}>
      {values.map((value) => (
        <TouchableOpacity
          key={value}
          onPress={() => onChange(value)}
          style={[styles.chip, activeValue === value && styles.chipActive]}
        >
          <Text style={[styles.chipText, activeValue === value && styles.chipTextActive]}>{value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function BugReportScreen({ visible, session, feedback, styles, theme, onClose }: Props) {
  const [form, setForm] = useState<BugReportForm>(EMPTY_BUG_FORM);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlayModal}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Report Sabotage</Text>
            <Text style={styles.modalSubtitle}>Something broken on the ship? Let Mission Control know.</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <Ionicons name="close" size={scale(18)} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.contentPadding, { paddingBottom: scale(24) }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authCard}>
            <Text style={styles.reportFieldLabel}>Sabotage Title</Text>
            <View style={styles.authField}>
              <TextInput
                style={styles.authInput}
                value={form.issueTitle}
                onChangeText={(value) => setForm((prev) => ({ ...prev, issueTitle: value }))}
                placeholder="Short issue title"
                placeholderTextColor={theme.muted}
              />
            </View>

            <Text style={styles.reportFieldLabel}>Signal Type</Text>
            <ChipRow
              values={BUG_TYPES}
              activeValue={form.issueType}
              onChange={(value) => setForm((prev) => ({ ...prev, issueType: value }))}
              styles={styles}
            />

            <Text style={styles.reportFieldLabel}>Area of the ship</Text>
            <ChipRow
              values={BUG_AREAS}
              activeValue={form.area}
              onChange={(value) => setForm((prev) => ({ ...prev, area: value }))}
              styles={styles}
            />

            <Text style={styles.reportFieldLabel}>Severity</Text>
            <ChipRow
              values={BUG_SEVERITIES}
              activeValue={form.severity}
              onChange={(value) => setForm((prev) => ({ ...prev, severity: value }))}
              styles={styles}
            />

            <Text style={styles.reportFieldLabel}>What happened?</Text>
            <TextInput
              value={form.problem}
              onChangeText={(value) => setForm((prev) => ({ ...prev, problem: value }))}
              placeholder="Describe the issue"
              placeholderTextColor={theme.muted}
              style={styles.noteInput}
              multiline
            />

            <Text style={styles.reportFieldLabel}>Expected behavior</Text>
            <TextInput
              value={form.expectedBehavior}
              onChangeText={(value) => setForm((prev) => ({ ...prev, expectedBehavior: value }))}
              placeholder="What should happen?"
              placeholderTextColor={theme.muted}
              style={styles.noteInput}
              multiline
            />

            <Text style={styles.reportFieldLabel}>Actual behavior</Text>
            <TextInput
              value={form.actualBehavior}
              onChangeText={(value) => setForm((prev) => ({ ...prev, actualBehavior: value }))}
              placeholder="What actually happened?"
              placeholderTextColor={theme.muted}
              style={styles.noteInput}
              multiline
            />

            <Text style={styles.reportFieldLabel}>Device details</Text>
            <TextInput
              value={form.deviceDetails}
              onChangeText={(value) => setForm((prev) => ({ ...prev, deviceDetails: value }))}
              placeholder="Android / iPhone / Expo Go..."
              placeholderTextColor={theme.muted}
              style={styles.noteInput}
              multiline
            />

            <Text style={styles.reportFieldLabel}>Optional contact email</Text>
            <View style={styles.authField}>
              <Ionicons name="mail-outline" size={scale(18)} color={theme.muted} />
              <TextInput
                style={styles.authInput}
                value={form.contactEmail}
                onChangeText={(value) => setForm((prev) => ({ ...prev, contactEmail: value }))}
                placeholder="Email"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Text style={styles.authHintText}>
              Keep it specific. Good reports include the page name, exact action, and what went wrong.
            </Text>

            <TouchableOpacity
              style={styles.authPrimaryBtn}
              onPress={async () => {
                const ok = await feedback.submitBugReport(form, session);
                if (ok) {
                  setForm(EMPTY_BUG_FORM);
                  onClose();
                }
              }}
              activeOpacity={0.9}
            >
              {feedback.bugSubmitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={styles.authPrimaryBtnText}>Transmit Sabotage Report</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.authSecondaryTextBtn} onPress={onClose}>
              <Text style={styles.authSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
