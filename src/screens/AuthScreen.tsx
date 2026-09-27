import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
import { moderateScale, scale } from '../../lib/scaling';

type Props = {
  app: TcTrackerState;
  styles: AppStyles;
  theme: ThemeTokens;
};

function RadarPulse({ styles, theme }: { styles: AppStyles; theme: ThemeTokens }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnim.start();

    return () => {
      pulse.stopAnimation();
    };
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.92] });

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: scale(132),
        width: scale(132),
        marginBottom: scale(4),
        position: 'relative',
      }}
    >
      <Animated.View
        style={[
          styles.authPulseRing,
          {
            width: scale(124),
            height: scale(124),
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.authPulseRing,
          {
            width: scale(92),
            height: scale(92),
            opacity: 0.7,
          },
        ]}
      />

      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          width: scale(132),
          height: scale(132),
        }}
      >
        <MaterialCommunityIcons
          name="radar"
          size={scale(34)}
          color={theme.primary}
        />
      </View>
    </View>
  );
}

export function AuthScreen({ app, styles, theme }: Props) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.authWrap}>
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authCard}>
          <View style={styles.authGlow} />

          <View style={styles.radarWrap}>
            <RadarPulse styles={styles} theme={theme} />
          </View>

          <Text style={styles.authTitle}>SUS Among-US</Text>
          <Text style={styles.authSubtitle}>Live Crew Reports Across Every Station</Text>

          <View style={{ marginTop: scale(18) }}>
            <Text
              style={[
                styles.authInlineLabel,
                {
                  marginBottom: scale(2),
                  textAlign: 'center',
                  width: '100%',
                  fontWeight: '700',
                  letterSpacing: 1,
                },
              ]}
            >
              Choose Crew Option
            </Text>

            <View style={[styles.authTabs, { marginBottom: scale(18) }]}>
              {(
                [
                  ['login', 'Login'],
                  ['signup', 'Join'],
                  ['recovery', 'Recover'],
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    app.resetAuthForm(key);
                    app.setAuthMode(key);
                  }}
                  style={[styles.authTab, app.authMode === key && styles.authTabActive]}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.authTabText, app.authMode === key && styles.authTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.authField, { marginBottom: scale(14) }]}>
              <Ionicons name="mail-outline" size={scale(18)} color={theme.muted} />
              <TextInput
                value={app.email}
                onChangeText={app.setEmail}
                placeholder="Crew email"
                placeholderTextColor={theme.muted}
                style={styles.authInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={[styles.authField, { marginBottom: scale(16) }]}>
              <Ionicons name="lock-closed-outline" size={scale(18)} color={theme.muted} />
              <TextInput
                value={app.password}
                onChangeText={app.setPassword}
                placeholder={app.authMode === 'recovery' ? 'New password' : 'Password'}
                placeholderTextColor={theme.muted}
                style={styles.authInput}
                secureTextEntry={!app.showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => app.setShowPassword(!app.showPassword)}>
                <Ionicons
                  name={app.showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={scale(18)}
                  color={theme.muted}
                />
              </TouchableOpacity>
            </View>

            {app.showOtpInput && (
              <View style={[styles.authField, { marginBottom: scale(16) }]}>
                <Ionicons name="keypad-outline" size={scale(18)} color={theme.muted} />
                <TextInput
                  value={app.otp}
                  onChangeText={app.setOtp}
                  placeholder="6-digit code"
                  placeholderTextColor={theme.muted}
                  style={styles.authInput}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.authPrimaryBtn, { marginTop: scale(2) }]}
              onPress={() => {
                if (app.showOtpInput) {
                  app.handleVerifyOtp();
                  return;
                }

                if (app.authMode === 'login') {
                  app.handleLogin();
                } else if (app.authMode === 'signup') {
                  app.handleSignup();
                } else {
                  app.handleSendRecovery();
                }
              }}
              activeOpacity={0.9}
            >
              {app.authLoading ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={styles.authPrimaryBtnText}>
                  {app.showOtpInput
                    ? 'Verify Signal'
                    : app.authMode === 'login'
                      ? 'Enter Crew'
                      : app.authMode === 'signup'
                        ? 'Create Crew Access'
                        : 'Send Recovery Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text
              style={[
                styles.authInlineLabel,
                {
                  marginTop: scale(35),
                  marginBottom: scale(1),
                  textAlign: 'center',
                  width: '100%',
                  fontWeight: '700',
                  letterSpacing: 1,
                },
              ]}
            >
              Visitor Access
            </Text>

          <TouchableOpacity
            style={styles.authVisitorBtn}
            onPress={app.handleGuestContinue}
            activeOpacity={0.9}
          >
            {app.authLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="lock-open-outline" size={scale(18)} color={theme.text} />
                <Text style={styles.authVisitorBtnText}>Enter As Visitor</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.authHintText, { marginTop: scale(10) }]}>
            Visitors can view reports but cannot participate in Crew Chat.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}