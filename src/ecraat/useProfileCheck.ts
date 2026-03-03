import { useEffect, useState, useRef, useCallback } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';

const TWENTY_MINUTES_MS = 20 * 60 * 1000;

const meQuery = {
    me: {
        resource: 'me',
        params: {
            fields: 'email,userCredentials[twoFA]',
        },
    },
};

/**
 * Hook that periodically checks whether the current user has configured
 * their email address and Two-Factor Authentication.
 *
 * - Runs immediately on mount (start of session).
 * - Re-runs automatically every 20 minutes.
 * - Returns a `showWarning` flag toggled to `true` when either setting is
 *   missing. The popup will re-appear on the next scheduled check if the
 *   settings are still not configured.
 */
export function useProfileCheck() {
    const [showWarning, setShowWarning] = useState(false);
    const [emailMissing, setEmailMissing] = useState(false);
    const [twoFAMissing, setTwoFAMissing] = useState(false);

    const { data, refetch } = useDataQuery(meQuery);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Evaluate the /api/me response and update warning state
    const evaluateProfile = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meData: any) => {
            if (!meData?.me) return;

            const email = meData.me.email;
            const twoFA = meData.me.userCredentials?.twoFA;

            const isEmailMissing = !email || email.trim() === '';
            // twoFA is explicitly false (or absent) → not enabled
            const isTwoFAMissing = twoFA !== true;

            setEmailMissing(isEmailMissing);
            setTwoFAMissing(isTwoFAMissing);

            if (isEmailMissing || isTwoFAMissing) {
                setShowWarning(true);
            }
        },
        [],
    );

    // React to new data from the query
    useEffect(() => {
        if (data) {
            evaluateProfile(data);
        }
    }, [data, evaluateProfile]);

    // Schedule re-checks every 20 minutes
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            refetch();
        }, TWENTY_MINUTES_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [refetch]);

    /** Close the popup. It may re-appear on the next 20-minute check. */
    const dismiss = useCallback(() => {
        setShowWarning(false);
    }, []);

    return { showWarning, emailMissing, twoFAMissing, dismiss };
}
