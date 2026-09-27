import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Appearance, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import { STATIONS } from '../../lib/stations';
import { THEMES, THEME_STORAGE_KEY } from '../theme';
import {
  AuthMode,
  ReportPhotoAttachment,
  SortMode,
  Station,
  StatusFilter,
  ThemeName,
  ThemeTokens,
  UpdateItem,
} from '../types';
import { getDisplayName, humanDistance, netScore, stationDistanceKm, uniqueStationCount } from '../utils';

const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
const GUEST_ACCESS_MS = 30 * 60 * 1000;
const IST_TIME_ZONE = 'Asia/Kolkata';
const GUEST_MODE_KEY = 'tc_tracker_guest_mode_v3';
const GUEST_EXPIRES_AT_KEY = 'tc_tracker_guest_expires_at_v3';
const REPORT_IMAGES_BUCKET = (process.env.EXPO_PUBLIC_REPORT_IMAGES_BUCKET ?? 'report-images').trim();

function dateKeyInIST(value: string | Date) {
  return new Date(value).toLocaleDateString('en-CA', {
    timeZone: IST_TIME_ZONE,
  });
}

function isExpiredUpdate(value: string) {
  return Date.now() - new Date(value).getTime() >= TEN_HOURS_MS;
}

function makeStorageKeyExt(photo: ReportPhotoAttachment) {
  const mime = photo.mimeType?.toLowerCase().trim();
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  if (mime?.includes('heic')) return 'heic';
  if (mime?.includes('jpg') || mime?.includes('jpeg')) return 'jpg';

  const name = photo.fileName?.trim() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase();
  }

  return 'jpg';
}

async function setStoredGuestLease(expiresAt: number) {
  await AsyncStorage.multiSet([
    [GUEST_MODE_KEY, '1'],
    [GUEST_EXPIRES_AT_KEY, String(expiresAt)],
  ]);
}

async function clearStoredGuestLease() {
  await AsyncStorage.multiRemove([GUEST_MODE_KEY, GUEST_EXPIRES_AT_KEY]);
}

export type TcTrackerState = {
  session: Session | null;
  sessionReady: boolean;
  themeReady: boolean;
  themeName: ThemeName;
  theme: ThemeTokens;

  authMode: AuthMode;
  showPassword: boolean;
  showOtpInput: boolean;
  email: string;
  password: string;
  otp: string;
  authLoading: boolean;

  guestMode: boolean;
  guestExpiresAt: number | null;
  guestTimeLeftLabel: string;
  accountLabel: string;

  feedLoading: boolean;
  refreshing: boolean;
  submitLoading: boolean;
  locationLoading: boolean;

  updates: UpdateItem[];
  currentTab: 'feed' | 'report' | 'talk';
  searchText: string;
  statusFilter: StatusFilter;
  sortMode: SortMode;

  selectedStationId: number | '';
  tcStatus: boolean | null;
  note: string;
  reportPhoto: ReportPhotoAttachment | null;
  reportPhotoUploading: boolean;

  showStationModal: boolean;
  stationSearchText: string;
  showAbout: boolean;
  showPolicy: boolean;
  isMenuOpen: boolean;
  nearestStationHint: { name: string; distance: number } | null;

  slideAnim: Animated.Value;

  filteredStations: Station[];
  selectedStation?: Station;
  visibleUpdates: UpdateItem[];
  stats: {
    reportCount: number;
    seenCount: number;
    stationCount: number;
  };
  recentNote: string;

  setThemeName: (theme: ThemeName) => void;
  setAuthMode: (mode: AuthMode) => void;
  setShowPassword: (value: boolean) => void;
  setShowOtpInput: (value: boolean) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setOtp: (value: string) => void;
  setCurrentTab: (value: 'feed' | 'report' | 'talk') => void;
  setSearchText: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setSortMode: (value: SortMode) => void;
  setSelectedStationId: (value: number | '') => void;
  setTcStatus: (value: boolean | null) => void;
  setNote: (value: string) => void;
  setShowStationModal: (value: boolean) => void;
  setStationSearchText: (value: string) => void;
  setShowAbout: (value: boolean) => void;
  setShowPolicy: (value: boolean) => void;

  resetAuthForm: (nextMode?: AuthMode) => void;
  toggleMenu: (open: boolean) => void;
  loadFeed: (showSpinner?: boolean) => Promise<void>;
  requestNearestStation: () => Promise<void>;
  handleLogin: () => Promise<void>;
  handleSignup: () => Promise<void>;
  handleSendRecovery: () => Promise<void>;
  handleVerifyOtp: () => Promise<void>;
  handleGuestContinue: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleVote: (updateId: string, type: 'up' | 'down') => Promise<void>;
  handleDelete: (updateId: string) => void;
  onRefresh: () => Promise<void>;
  openAbout: () => void;
  openPolicy: () => void;
  pickReportPhoto: () => Promise<void>;
  captureReportPhoto: () => Promise<void>;
  removeReportPhoto: () => void;
  handleLogout: () => Promise<void>;
};

export function useTcTracker(): TcTrackerState {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [themeName, setThemeName] = useState<ThemeName>('light');
  const [themeReady, setThemeReady] = useState(false);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [guestMode, setGuestMode] = useState(false);
  const [guestExpiresAt, setGuestExpiresAt] = useState<number | null>(null);
  const [guestNow, setGuestNow] = useState(Date.now());

  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [reportPhotoUploading, setReportPhotoUploading] = useState(false);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);

  const [currentTab, setCurrentTab] = useState<'feed' | 'report' | 'talk'>('feed');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  const [selectedStationId, setSelectedStationId] = useState<number | ''>('');
  const [tcStatus, setTcStatus] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [reportPhoto, setReportPhoto] = useState<ReportPhotoAttachment | null>(null);

  const [showStationModal, setShowStationModal] = useState(false);
  const [stationSearchText, setStationSearchText] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [nearestStationHint, setNearestStationHint] = useState<{ name: string; distance: number } | null>(null);

  const slideAnim = useRef(new Animated.Value(-420)).current;
  const guestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = THEMES[themeName];

  const clearGuestTimer = useCallback(() => {
    if (guestTimerRef.current) {
      clearTimeout(guestTimerRef.current);
      guestTimerRef.current = null;
    }
  }, []);

  const clearGuestLease = useCallback(async () => {
    clearGuestTimer();
    setGuestMode(false);
    setGuestExpiresAt(null);
    await clearStoredGuestLease().catch(() => undefined);
  }, [clearGuestTimer]);

  const endGuestSession = useCallback(
    async (showAlert = true) => {
      clearGuestTimer();
      setGuestMode(false);
      setGuestExpiresAt(null);

      try {
        await clearStoredGuestLease();
      } catch {
        // ignore storage errors
      }

      try {
        await supabase.auth.signOut();
      } catch {
        // ignore logout errors; session will be nulled by auth listener on the next state change
      }

      setSession(null);

      if (showAlert) {
        Alert.alert('Guest access ended', 'Guest sessions last 30 minutes. Sign in again to continue.');
      }
    },
    [clearGuestTimer],
  );

  const scheduleGuestTimer = useCallback(
    (expiresAt: number) => {
      clearGuestTimer();

      const delay = Math.max(0, expiresAt - Date.now());
      guestTimerRef.current = setTimeout(() => {
        void endGuestSession(true);
      }, delay);
    },
    [clearGuestTimer, endGuestSession],
  );

  const beginGuestSession = useCallback(
    async (expiresAt?: number) => {
      const nextExpiresAt = expiresAt ?? Date.now() + GUEST_ACCESS_MS;

      try {
        await setStoredGuestLease(nextExpiresAt);
      } catch {
        // storage failure should not block the guest login flow
      }

      setGuestMode(true);
      setGuestExpiresAt(nextExpiresAt);
      setGuestNow(Date.now());
      scheduleGuestTimer(nextExpiresAt);
    },
    [scheduleGuestTimer],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) return;

        if (stored === 'light' || stored === 'dark') {
          setThemeName(stored);
        } else {
          const system = Appearance.getColorScheme();
          setThemeName(system === 'dark' ? 'dark' : 'light');
        }
      } catch {
        const system = Appearance.getColorScheme();
        if (mounted) setThemeName(system === 'dark' ? 'dark' : 'light');
      } finally {
        if (mounted) setThemeReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, themeName).catch(() => undefined);
  }, [themeName, themeReady]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [{ data }, guestModeRaw, guestExpiresRaw] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem(GUEST_MODE_KEY),
          AsyncStorage.getItem(GUEST_EXPIRES_AT_KEY),
        ]);

        if (!active) return;

        let currentSession = data.session;
        const guestExpires = guestExpiresRaw ? Number(guestExpiresRaw) : null;
        const guestStillValid =
          guestModeRaw === '1' && typeof guestExpires === 'number' && Number.isFinite(guestExpires) && guestExpires > Date.now();

        if (guestModeRaw === '1' && guestExpires && guestExpires <= Date.now()) {
          await clearStoredGuestLease().catch(() => undefined);
          if (currentSession) {
            await supabase.auth.signOut().catch(() => undefined);
            currentSession = null;
          }
        }

        if (!currentSession && guestStillValid) {
          try {
            const anonResult = await (supabase.auth as unknown as {
              signInAnonymously: () => Promise<{ data?: { session: Session | null }; error?: { message: string } | null }>;
            }).signInAnonymously();

            if (anonResult.error) {
              Alert.alert('Visitor access unavailable', anonResult.error.message);
            } else {
              const restoredSession =
                anonResult.data?.session ?? (await supabase.auth.getSession()).data.session ?? null;
              setSession(restoredSession);
              setGuestMode(true);
              setGuestExpiresAt(guestExpires);
              scheduleGuestTimer(guestExpires);
            }
          } catch (error) {
            Alert.alert('Visitor access unavailable', error instanceof Error ? error.message : 'Could not restore guest access.');
          } finally {
            if (active) setSessionReady(true);
          }
          return;
        }

        setSession(currentSession);
        setGuestMode(guestStillValid);
        setGuestExpiresAt(guestStillValid ? guestExpires : null);

        if (guestStillValid && guestExpires) {
          scheduleGuestTimer(guestExpires);
        } else {
          clearGuestTimer();
        }
      } catch {
        const system = Appearance.getColorScheme();
        setThemeName(system === 'dark' ? 'dark' : 'light');
      } finally {
        if (active) setSessionReady(true);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      clearGuestTimer();
    };
  }, [clearGuestTimer, scheduleGuestTimer]);

  useEffect(() => {
    if (!guestMode || !guestExpiresAt) return;

    const id = setInterval(() => setGuestNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [guestExpiresAt, guestMode]);

  useEffect(() => {
    if (guestMode && guestExpiresAt && Date.now() >= guestExpiresAt) {
      void endGuestSession(true);
    }
  }, [endGuestSession, guestExpiresAt, guestMode, guestNow]);

  const guestTimeLeftLabel = useMemo(() => {
    if (!guestMode || !guestExpiresAt) return '';
    const remaining = Math.max(0, guestExpiresAt - guestNow);
    const minutes = Math.ceil(remaining / 60000);

    if (minutes <= 1) return 'less than 1 minute left';
    if (minutes < 60) return `${minutes} minutes left`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  }, [guestExpiresAt, guestMode, guestNow]);

  const accountLabel = useMemo(() => getDisplayName(session, guestMode), [guestMode, session]);

  const filteredStations = useMemo(() => {
    const term = stationSearchText.trim().toLowerCase();
    return STATIONS.filter((station) => station.name.toLowerCase().includes(term));
  }, [stationSearchText]);

  const selectedStation = useMemo<Station | undefined>(
    () => STATIONS.find((station) => station.id === selectedStationId),
    [selectedStationId],
  );

  const liveUpdates = useMemo(() => updates.filter((item) => !isExpiredUpdate(item.created_at)), [updates]);

  const todayKey = dateKeyInIST(new Date());

  const todayUpdates = useMemo(
    () => liveUpdates.filter((item) => dateKeyInIST(item.created_at) === todayKey),
    [liveUpdates, todayKey],
  );

  const visibleUpdates = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const sessionUserId = session?.user?.id ?? '';

    let list = liveUpdates.filter((item) => {
      const name = item.stations?.name ?? '';
      const noteValue = item.platform_note ?? '';
      const matchesSearch =
        !query || name.toLowerCase().includes(query) || noteValue.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'available'
            ? item.tc_status === true
            : statusFilter === 'not_seen'
              ? item.tc_status === false
              : item.user_id === sessionUserId;

      return matchesSearch && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortMode === 'top') {
        return netScore(b) - netScore(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [liveUpdates, searchText, session?.user?.id, sortMode, statusFilter]);

  const stats = useMemo(() => {
    const reportCount = todayUpdates.length;
    const seenCount = todayUpdates.filter((item) => item.tc_status === true).length;
    const stationCount = uniqueStationCount(todayUpdates);
    return { reportCount, seenCount, stationCount };
  }, [todayUpdates]);

  const recentNote = useMemo(() => {
    const topUpdate = todayUpdates[0];
    return topUpdate ? `${topUpdate.stations?.name ?? 'Station'} • ${topUpdate.created_at}` : 'No live reports yet';
  }, [todayUpdates]);

  const toggleMenu = useCallback(
    (open: boolean) => {
      if (open) {
        setIsMenuOpen(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        return;
      }

      Animated.timing(slideAnim, {
        toValue: -420,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    },
    [slideAnim],
  );

  const resetAuthForm = useCallback((nextMode?: AuthMode) => {
    setShowOtpInput(false);
    setOtp('');
    setPassword('');
    setShowPassword(false);
    setAuthLoading(false);
    if (nextMode) setAuthMode(nextMode);
  }, []);

  const loadFeed = useCallback(async (showSpinner = true) => {
    if (showSpinner) setFeedLoading(true);

    const cutoffIso = new Date(Date.now() - TEN_HOURS_MS).toISOString();

    const { data, error } = await supabase
      .from('tc_updates')
      .select('id,user_id,created_at,tc_status,platform_note,upvotes,downvotes,photo_url,photo_path,stations!inner(name)')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Signal load failed', error.message);
      setUpdates([]);
    } else {
      setUpdates((data ?? []) as UpdateItem[]);
    }

    if (showSpinner) setFeedLoading(false);
  }, []);

  useEffect(() => {
    if (session && currentTab === 'feed') {
      loadFeed(true);
    }
  }, [currentTab, loadFeed, session]);

  const requestNearestStation = useCallback(async () => {
    setLocationLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Radar access needed', 'Allow location access to lock the nearest station.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      const nearest = STATIONS.reduce<{ station: Station; distance: number } | null>((best, station) => {
        const distance = stationDistanceKm(station, position.coords);
        if (!best || distance < best.distance) return { station, distance };
        return best;
      }, null);

      if (!nearest) {
        Alert.alert('No station match', 'Could not match your current location to a station.');
        return;
      }

      setSelectedStationId(nearest.station.id);
      setNearestStationHint({ name: nearest.station.name, distance: nearest.distance });
      Alert.alert('Nearest station locked', `${nearest.station.name} is about ${humanDistance(nearest.distance)} away.`);
    } catch {
      Alert.alert('Location error', 'Could not get your location. Turn on GPS and try again.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Missing crew details', 'Enter both email and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Crew login failed', error.message);
        return;
      }

      if (data.session) {
        await clearGuestLease().catch(() => undefined);
        setSession(data.session);
      }
    } finally {
      setAuthLoading(false);
    }
  }, [clearGuestLease, email, password]);

  const handleSignup = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Missing crew details', 'Enter both email and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Crew access creation failed', error.message);
        return;
      }

      setShowOtpInput(true);
      Alert.alert('Verify crew access', 'A 6-digit code was sent to your crew email.');
    } finally {
      setAuthLoading(false);
    }
  }, [email, password]);

  const handleSendRecovery = useCallback(async () => {
    if (!email) {
      Alert.alert('Missing crew email', 'Enter your crew email address first.');
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Recovery failed', error.message);
        return;
      }

      setShowOtpInput(true);
      Alert.alert('Recovery code sent', 'Check your crew email for the reset code.');
    } finally {
      setAuthLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    if (!email || !otp) {
      Alert.alert('Missing signal code', 'Enter the email and verification code.');
      return;
    }

    setAuthLoading(true);
    try {
      const verifyType: 'signup' | 'recovery' | 'email' =
        authMode === 'signup' ? 'signup' : authMode === 'recovery' ? 'recovery' : 'email';

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: verifyType,
      });

      if (error) {
        Alert.alert('Verification failed', error.message);
        return;
      }

      if (authMode === 'recovery') {
        if (!password) {
          Alert.alert('Missing password', 'Enter your new password before verifying the code.');
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          Alert.alert('Password update failed', updateError.message);
          return;
        }

        await clearGuestLease().catch(() => undefined);
        Alert.alert('Password updated', 'Your new password is now active.');
      } else if (data.session) {
        await clearGuestLease().catch(() => undefined);
        setSession(data.session);
        Alert.alert('Welcome aboard', authMode === 'signup' ? 'Crew access created successfully.' : 'Logged in successfully.');
      }

      setShowOtpInput(false);
      setOtp('');
      if (authMode !== 'recovery') setPassword('');
    } finally {
      setAuthLoading(false);
    }
  }, [authMode, clearGuestLease, email, otp, password]);

  const handleGuestContinue = useCallback(async () => {
    setAuthLoading(true);
    try {
      const authApi = supabase.auth as unknown as {
        signInAnonymously?: () => Promise<{ data?: { session: Session | null }; error?: { message: string } | null }>;
      };

      if (!authApi.signInAnonymously) {
        Alert.alert('Visitor access unavailable', 'This build cannot start a visitor session.');
        return;
      }

      const { data, error } = await authApi.signInAnonymously();
      if (error) {
        Alert.alert('Visitor access unavailable', error.message);
        return;
      }

      const expiry = Date.now() + GUEST_ACCESS_MS;
      await beginGuestSession(expiry);
      const restoredSession = data?.session ?? (await supabase.auth.getSession()).data.session ?? null;
      setSession(restoredSession);

      Alert.alert('Visitor access active', 'You can use the full app for 30 minutes.');
    } catch (error) {
      Alert.alert('Visitor access unavailable', error instanceof Error ? error.message : 'Could not start visitor access.');
    } finally {
      setAuthLoading(false);
    }
  }, [beginGuestSession]);


  const uploadReportPhoto = useCallback(
    async (photo: ReportPhotoAttachment, userId: string) => {
      if (!REPORT_IMAGES_BUCKET) {
        throw new Error('Evidence image bucket is not configured.');
      }

      const arraybuffer = await fetch(photo.uri).then((res) => res.arrayBuffer());

      const ext = makeStorageKeyExt(photo);
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).upload(fileName, arraybuffer, {
        contentType: photo.mimeType ?? `image/${ext}`,
        upsert: false,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(fileName);
      return {
        path: fileName,
        url: data.publicUrl,
      };
    },
    [],
  );

  const pickReportPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Evidence access needed', 'Allow gallery access to attach evidence.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setReportPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      });
    } catch (error) {
      Alert.alert('Evidence selection failed', error instanceof Error ? error.message : 'Could not open the evidence library.');
    }
  }, []);

  const removeReportPhoto = useCallback(() => {
    setReportPhoto(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session?.user?.id) {
      Alert.alert('Crew access required', 'Please sign in before submitting a sighting.');
      return;
    }
    if (!selectedStationId || tcStatus === null) {
      Alert.alert('Missing sighting details', 'Select a station and current situation first.');
      return;
    }

    setSubmitLoading(true);
    let uploadedPhoto: { path: string; url: string } | null = null;

    try {
      if (reportPhoto) {
        setReportPhotoUploading(true);
        uploadedPhoto = await uploadReportPhoto(reportPhoto, session.user.id);
      }

      const { error } = await supabase.from('tc_updates').insert({
        user_id: session.user.id,
        station_id: selectedStationId,
        tc_status: tcStatus,
        platform_note: note.trim() || null,
        photo_url: uploadedPhoto?.url ?? null,
        photo_path: uploadedPhoto?.path ?? null,
      });

      if (error) {
        if (uploadedPhoto?.path) {
          await supabase.storage.from(REPORT_IMAGES_BUCKET).remove([uploadedPhoto.path]).catch(() => undefined);
        }
        Alert.alert('Sighting transmission failed', error.message);
        return;
      }

      Alert.alert('Sighting transmitted', 'Your sighting has been shared with the crew.');
      setNote('');
      setTcStatus(null);
      setSelectedStationId('');
      setNearestStationHint(null);
      setReportPhoto(null);
      setCurrentTab('feed');
      await loadFeed(false);
    } catch (error) {
      Alert.alert('Sighting transmission failed', error instanceof Error ? error.message : 'Could not submit the sighting.');
    } finally {
      setReportPhotoUploading(false);
      setSubmitLoading(false);
    }
  }, [loadFeed, note, reportPhoto, selectedStationId, session?.user?.id, tcStatus, uploadReportPhoto]);

  const captureReportPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera Permission',
          'Please allow camera access to capture evidence.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      setReportPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      });
    } catch (error) {
      Alert.alert(
        'Camera Error',
        error instanceof Error
          ? error.message
          : 'Unable to open the camera.',
      );
    }
  }, []);

  const handleVote = useCallback(
    async (updateId: string, type: 'up' | 'down') => {
      if (!session?.user?.id) {
        Alert.alert('Crew access required', 'Please sign in before voting.');
        return;
      }

      const { error } = await supabase.rpc('handle_vote_v2', {
        target_update_id: updateId,
        target_user_id: session.user.id,
        new_vote_type: type,
      });

      if (error) {
        Alert.alert('Signal vote failed', error.message);
        return;
      }

      await loadFeed(false);
    },
    [loadFeed, session?.user?.id],
  );

  const handleDelete = useCallback(
    (updateId: string) => {
      Alert.alert('Delete sighting', 'Remove your sighting from the board?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('tc_updates').delete().eq('id', updateId);
            if (error) {
              Alert.alert('Delete failed', error.message);
              return;
            }
            await loadFeed(false);
          },
        },
      ]);
    },
    [loadFeed],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(false);
    setRefreshing(false);
  }, [loadFeed]);

  const openAbout = useCallback(() => {
    toggleMenu(false);
    setShowAbout(true);
  }, [toggleMenu]);

  const openPolicy = useCallback(() => {
    toggleMenu(false);
    setShowPolicy(true);
  }, [toggleMenu]);

  const handleLogout = useCallback(async () => {
    await clearGuestLease().catch(() => undefined);
    setGuestNow(Date.now());
    setReportPhoto(null);
    setNearestStationHint(null);
    setNote('');
    setTcStatus(null);
    setSelectedStationId('');
    setCurrentTab('feed');

    try {
      await supabase.auth.signOut();
    } catch {
      // keep going; auth listener will eventually clear the session if signOut succeeded server-side
    }

    setSession(null);
  }, [clearGuestLease]);

  return {
    session,
    sessionReady,
    themeReady,
    themeName,
    theme,

    authMode,
    showPassword,
    showOtpInput,
    email,
    password,
    otp,
    authLoading,

    guestMode,
    guestExpiresAt,
    guestTimeLeftLabel,
    accountLabel,

    feedLoading,
    refreshing,
    submitLoading,
    locationLoading,

    updates,
    currentTab,
    searchText,
    statusFilter,
    sortMode,

    selectedStationId,
    tcStatus,
    note,
    reportPhoto,
    reportPhotoUploading,

    showStationModal,
    stationSearchText,
    showAbout,
    showPolicy,
    isMenuOpen,
    nearestStationHint,

    slideAnim,

    filteredStations,
    selectedStation,
    visibleUpdates,
    stats,
    recentNote,

    setThemeName,
    setAuthMode,
    setShowPassword,
    setShowOtpInput,
    setEmail,
    setPassword,
    setOtp,
    setCurrentTab,
    setSearchText,
    setStatusFilter,
    setSortMode,
    setSelectedStationId,
    setTcStatus,
    setNote,
    setShowStationModal,
    setStationSearchText,
    setShowAbout,
    setShowPolicy,

    resetAuthForm,
    toggleMenu,
    loadFeed,
    requestNearestStation,
    handleLogin,
    handleSignup,
    handleSendRecovery,
    handleVerifyOtp,
    handleGuestContinue,
    handleSubmit,
    handleVote,
    handleDelete,
    onRefresh,
    openAbout,
    openPolicy,
    pickReportPhoto,
    captureReportPhoto,
    removeReportPhoto,
    handleLogout,
  };
}
