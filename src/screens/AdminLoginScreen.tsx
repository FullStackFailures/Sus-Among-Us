import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppStyles } from '../styles';
import { ThemeTokens } from '../types';
import { scale, moderateScale } from '../../lib/scaling';
import { FeedbackHubState } from '../hooks/useFeedbackHub';

type Props = {
  visible: boolean;
  feedback: FeedbackHubState;
  styles: AppStyles;
  theme: ThemeTokens;
  onClose: () => void;
};

export function AdminLoginScreen({ visible, feedback, styles, theme, onClose }: Props) {
  const [password, setPassword] = useState('');
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    if (visible) loop.start();
    return () => glow.stopAnimation();
  }, [glow, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlayModal, { justifyContent: 'center', padding: scale(16) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.authCard}>
          <Animated.View
            style={[
              styles.authGlow,
              {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                transform: [
                  {
                    scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.adminLockBadge}>
            <MaterialCommunityIcons name="shield-crown-outline" size={scale(34)} color={theme.primary} />
          </View>

          <Text style={styles.authTitle}>CONTROL ROOM</Text>
          <Text style={styles.authSubtitle}>Enter the mission password to review reports and requests.</Text>

          <View style={styles.authField}>
            <Ionicons name="lock-closed-outline" size={scale(18)} color={theme.muted} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Control room password"
              placeholderTextColor={theme.muted}
              style={styles.authInput}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.authPrimaryBtn}
            onPress={async () => {
              const ok = await feedback.verifyAdminPassword(password);
              if (ok) {
                setPassword('');
                onClose();
              }
            }}
            activeOpacity={0.9}
          >
            {feedback.adminLoading ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={styles.authPrimaryBtnText}>Open Control Room</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.authSecondaryTextBtn} onPress={onClose}>
            <Text style={styles.authSecondaryText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.authHintBox}>
            <Text style={styles.authHintTitle}>Protected access</Text>
            <Text style={styles.authHintText}>
              Mission control remains hidden unless the correct password is entered.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
