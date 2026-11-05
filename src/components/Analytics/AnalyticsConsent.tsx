import type React from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  getAnalyticsStatus,
  setAnalyticsConsent,
  subscribeAnalytics,
} from '../../utils/analytics.utils';

/**
 * Consent-gated analytics UI. Renders only when analytics is explicitly
 * enabled; first visit offers an equal-prominence accept/refuse choice and a
 * compact settings button stays available to reopen or withdraw.
 */
export const AnalyticsConsent: React.FC = () => {
  const { t } = useTranslation();
  const status = useSyncExternalStore(subscribeAnalytics, getAnalyticsStatus);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const reopen = useCallback(() => {
    setOpen(true);
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    if (restoreFocus) restoreFocusRef.current = true;
    setOpen(false);
  }, []);

  const choose = useCallback((choice: 'accepted' | 'rejected') => {
    setAnalyticsConsent(choice);
    close(true);
  }, [close]);

  // A reopened settings panel is non-modal but moves focus into the panel and
  // restores it to the opener on Escape or choice; the first-visit banner is
  // left unfocused so normal browsing order is preserved.
  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        fabRef.current?.focus();
      }
      return;
    }
    const firstButton = panelRef.current?.querySelector('button');
    firstButton?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!status.enabled || status.privacyBlocked) return null;

  const showPanel = status.consent === 'pending' || open;

  return (
    <>
      {!showPanel && (
        <Button
          ref={fabRef}
          variant="ghost"
          type="button"
          onClick={reopen}
          aria-label={t('analytics.settings')}
          className="fixed bottom-4 right-4 z-40 flex h-10 min-h-0 w-10 items-center justify-center rounded-full border border-stone-300 bg-card p-0 text-stone-600 shadow-md transition-colors duration-150 hover:bg-muted hover:text-stone-600 focus-visible:ring-amber-500 active:scale-100 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-300"
        >
          <BarChart3 className="size-4" aria-hidden="true" />
        </Button>
      )}
      {showPanel && (
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-4 py-4 shadow-lg backdrop-blur sm:px-6 dark:bg-stone-900/95"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2
                id="analytics-consent-title"
                className="font-serif text-base font-medium text-foreground"
              >
                {t('analytics.title')}
              </h2>
              <p
                id="analytics-consent-description"
                className="mt-1 text-sm text-stone-600 dark:text-stone-300"
              >
                {t('analytics.description')}{' '}
                <Link
                  to="/privacy-policy"
                  className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  {t('analytics.privacyLink')}
                </Link>
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <Button
                type="button"
                onClick={() => choose('rejected')}
                className="h-auto flex-1 rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 sm:flex-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                {t('analytics.reject')}
              </Button>
              <Button
                type="button"
                onClick={() => choose('accepted')}
                className="h-auto flex-1 rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 sm:flex-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                {t('analytics.accept')}
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default AnalyticsConsent;
