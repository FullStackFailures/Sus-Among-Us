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
import { ThemeTokens, ChangeRequestForm } from '../types';
import { scale } from '../../lib/scaling';
import { FeedbackHubState } from '../hooks/useFeedbackHub';
import { EMPTY_REQUEST_FORM, PRIORITIES, SUGGESTION_TYPES } from '../data/feedbackOptions';

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

export function SuggestionScreen({ visible, session, feedback, styles, theme, onClose }: Props) {
  const [form, setForm] = useState<ChangeRequestForm>(EMPTY_REQUEST_FORM);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlayModal}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Crew Ideas</Text>
            <Text style={styles.modalSubtitle}>Help improve the mission.</Text>
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
            <Text style={styles.reportFieldLabel}>Idea Title</Text>
            <View style={styles.authField}>
              <TextInput
                style={styles.authInput}
                value={form.requestTitle}
                onChangeText={(value) => setForm((prev) => ({ ...prev, requestTitle: value }))}
                placeholder="Suggestion title"
                placeholderTextColor={theme.muted}
              />
            </View>

            <Text style={styles.reportFieldLabel}>Idea Type</Text>
            <ChipRow
              values={SUGGESTION_TYPES}
              activeValue={form.suggestionType}
              onChange={(value) => setForm((prev) => ({ ...prev, suggestionType: value }))}
              styles={styles}
            />

            <Text style={styles.reportFieldLabel}>Priority</Text>
            <ChipRow
              values={PRIORITIES}
              activeValue={form.priority}
              onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
              styles={styles}
            />

            <Text style={styles.reportFieldLabel}>Short summary</Text>
            <TextInput
              value={form.summary}
              onChangeText={(value) => setForm((prev) => ({ ...prev, summary: value }))}
              placeholder="Short summary"
              placeholderTextColor={theme.muted}
              style={styles.noteInput}
              multiline
            />

            <Text style={styles.reportFieldLabel}>Describe the change and why it matters</Text>
            <TextInput
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Describe the change and why it matters"
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
              Include the problem, the desired outcome, and a concrete example.
            </Text>

            <TouchableOpacity
              style={styles.authPrimaryBtn}
              onPress={async () => {
                const ok = await feedback.submitChangeRequest(form, session);
                if (ok) {
                  setForm(EMPTY_REQUEST_FORM);
                  onClose();
                }
              }}
              activeOpacity={0.9}
            >
              {feedback.requestSubmitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={styles.authPrimaryBtnText}>Submit Idea</Text>
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
