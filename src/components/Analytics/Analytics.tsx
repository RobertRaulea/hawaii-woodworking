import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

import {
  getAnalyticsStatus,
  identifyAnalytics,
  initializeAnalytics,
  resetAnalyticsIdentity,
  subscribeAnalytics,
  trackAnalytics,
  trackAnalyticsPage,
} from '../../utils/analytics.utils';

/**
 * Analytics observer mounted once inside the Router. Initializes the consent
 * state machine, emits sanitized $pageview events on pathname transitions and
 * bridges Clerk subject identity without inventing sign-in events.
 */
export const Analytics: React.FC = () => {
  const location = useLocation();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const locationRef = useRef(location);
  locationRef.current = location;
  const authRef = useRef<{ seen: boolean; userId: string | null }>({ seen: false, userId: null });

  useEffect(() => {
    void initializeAnalytics();

    const onWindowError = () =>
      trackAnalytics('application_error', { error_code: 'window_error' });
    const onUnhandledRejection = () =>
      trackAnalytics('application_error', { error_code: 'unhandled_rejection' });
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  // When the SDK becomes ready after consent, capture the page currently shown
  // and identify the signed-in user, so the first page is not missed.
  useEffect(
    () =>
      subscribeAnalytics(() => {
        const status = getAnalyticsStatus();
        if (!status.ready) return;
        const current = locationRef.current;
        trackAnalyticsPage(current.pathname, current.search);
        const id = authRef.current.userId;
        if (id) identifyAnalytics(id);
      }),
    [],
  );

  useEffect(() => {
    trackAnalyticsPage(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isLoaded) return;
    const prev = authRef.current;
    const current = isSignedIn && userId ? userId : null;
    if (!prev.seen) {
      // Already signed in on load: identify only, never a login event.
      authRef.current = { seen: true, userId: current };
      if (current) identifyAnalytics(current);
      return;
    }
    if (current === prev.userId) return;
    if (prev.userId && current) {
      // Account switch A -> B: reset the pseudonymous identity first.
      resetAnalyticsIdentity();
      identifyAnalytics(current);
    } else if (!prev.userId && current) {
      // Observed signed-out -> signed-in transition.
      identifyAnalytics(current);
      trackAnalytics('login_completed', { method: 'clerk' });
    } else if (prev.userId && !current) {
      resetAnalyticsIdentity();
    }
    authRef.current = { seen: true, userId: current };
  }, [isLoaded, isSignedIn, userId]);

  return null;
};

export default Analytics;
