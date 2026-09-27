import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import { BugReportForm, BugReportRow, ChangeRequestForm, ChangeRequestRow } from '../types';

export type FeedbackHubState = {
  showBugReport: boolean;
  showSuggestion: boolean;
  showAdminLogin: boolean;
  showAdminDashboard: boolean;

  bugReports: BugReportRow[];
  changeRequests: ChangeRequestRow[];

  adminLoading: boolean;
  bugSubmitting: boolean;
  requestSubmitting: boolean;

  openBugReport: () => void;
  openSuggestion: () => void;
  openAdminLogin: () => void;

  setShowBugReport: (value: boolean) => void;
  setShowSuggestion: (value: boolean) => void;
  setShowAdminLogin: (value: boolean) => void;
  setShowAdminDashboard: (value: boolean) => void;

  loadAdminData: () => Promise<void>;
  submitBugReport: (payload: BugReportForm, session: Session | null) => Promise<boolean>;
  submitChangeRequest: (payload: ChangeRequestForm, session: Session | null) => Promise<boolean>;
  verifyAdminPassword: (password: string) => Promise<boolean>;
};

export function useFeedbackHub(): FeedbackHubState {
  const [showBugReport, setShowBugReport] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const [bugReports, setBugReports] = useState<BugReportRow[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestRow[]>([]);

  const [adminLoading, setAdminLoading] = useState(false);
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const openBugReport = useCallback(() => {
    setShowBugReport(true);
    setShowSuggestion(false);
    setShowAdminLogin(false);
    setShowAdminDashboard(false);
  }, []);

  const openSuggestion = useCallback(() => {
    setShowSuggestion(true);
    setShowBugReport(false);
    setShowAdminLogin(false);
    setShowAdminDashboard(false);
  }, []);

  const openAdminLogin = useCallback(() => {
    setShowAdminLogin(true);
    setShowBugReport(false);
    setShowSuggestion(false);
    setShowAdminDashboard(false);
  }, []);

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [bugsResult, changesResult] = await Promise.all([
        supabase.from('bug_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('change_requests').select('*').order('created_at', { ascending: false }),
      ]);

      if (bugsResult.error) {
        Alert.alert('Control room load failed', bugsResult.error.message);
      } else {
        setBugReports((bugsResult.data ?? []) as BugReportRow[]);
      }

      if (changesResult.error) {
        Alert.alert('Control room load failed', changesResult.error.message);
      } else {
        setChangeRequests((changesResult.data ?? []) as ChangeRequestRow[]);
      }
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAdminDashboard) {
      void loadAdminData();
    }
  }, [loadAdminData, showAdminDashboard]);

  const submitBugReport = useCallback(
    async (payload: BugReportForm, session: Session | null) => {
      if (!session?.user?.id) {
        Alert.alert('Crew access required', 'Please sign in before reporting sabotage.');
        return false;
      }

      if (!payload.issueTitle.trim() || !payload.area.trim() || !payload.severity.trim() || !payload.problem.trim()) {
        Alert.alert('Missing details', 'Complete the title, area, severity, and issue details.');
        return false;
      }

      setBugSubmitting(true);
      try {
        const { error } = await supabase.from('bug_reports').insert({
          user_id: session.user.id,
          issue_title: payload.issueTitle.trim(),
          issue_type: payload.issueType.trim() || null,
          area: payload.area.trim(),
          severity: payload.severity.trim(),
          problem: payload.problem.trim(),
          expected_behavior: payload.expectedBehavior.trim() || null,
          actual_behavior: payload.actualBehavior.trim() || null,
          device_details: payload.deviceDetails.trim() || null,
          contact_email: payload.contactEmail.trim() || null,
        });

        if (error) {
          Alert.alert('Sabotage report failed', error.message);
          return false;
        }

        Alert.alert('Mission received', 'Your sabotage report has been sent successfully.');
        return true;
      } finally {
        setBugSubmitting(false);
      }
    },
    [],
  );

  const submitChangeRequest = useCallback(
    async (payload: ChangeRequestForm, session: Session | null) => {
      if (!session?.user?.id) {
        Alert.alert('Crew access required', 'Please sign in before submitting a crew idea.');
        return false;
      }

      if (!payload.requestTitle.trim() || !payload.suggestionType.trim() || !payload.priority.trim()) {
        Alert.alert('Missing details', 'Complete the title, type, and priority.');
        return false;
      }

      setRequestSubmitting(true);
      try {
        const { error } = await supabase.from('change_requests').insert({
          user_id: session.user.id,
          request_title: payload.requestTitle.trim(),
          suggestion_type: payload.suggestionType.trim(),
          priority: payload.priority.trim(),
          summary: payload.summary.trim() || null,
          description: payload.description.trim() || null,
          contact_email: payload.contactEmail.trim() || null,
        });

        if (error) {
          Alert.alert('Crew idea failed', error.message);
          return false;
        }

        Alert.alert('Mission received', 'Your crew idea has been sent successfully.');
        return true;
      } finally {
        setRequestSubmitting(false);
      }
    },
    [],
  );

  const verifyAdminPassword = useCallback(
    async (password: string) => {
      const adminPass = (process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? '').trim();

      if (!adminPass) {
        Alert.alert(
          'Configuration Error',
          'Control room password is not configured in this build.'
        );
        return false;
      }

      if (password.trim() !== adminPass) {
        Alert.alert(
          'Access denied',
          'Incorrect control room password.'
        );
        return false;
      }

      setShowAdminLogin(false);
      setShowAdminDashboard(true);
      return true;
    },
    [],
  );

  return {
    showBugReport,
    showSuggestion,
    showAdminLogin,
    showAdminDashboard,
    bugReports,
    changeRequests,
    adminLoading,
    bugSubmitting,
    requestSubmitting,
    openBugReport,
    openSuggestion,
    openAdminLogin,
    setShowBugReport,
    setShowSuggestion,
    setShowAdminLogin,
    setShowAdminDashboard,
    loadAdminData,
    submitBugReport,
    submitChangeRequest,
    verifyAdminPassword,
  };
}
