import React from 'react';
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    NoticeBox,
    ButtonStrip,
} from '@dhis2/ui';
import { useConfig } from '@dhis2/app-runtime';
import classes from './ProfileSetupWarning.module.css';

type Props = {
    emailMissing: boolean;
    twoFAMissing: boolean;
};

/**
 * Modal popup shown when the current user has not yet configured their
 * email address and/or Two-Factor Authentication.
 * Blocks all app navigation until the user configures the missing settings
 * and refreshes the page.
 */
export const ProfileSetupWarning = ({ emailMissing, twoFAMissing }: Props) => {
    const { baseUrl } = useConfig();

    // Normalise base URL: strip trailing slash
    const base = (baseUrl || '').replace(/\/$/, '');

    const profileUrl = `${base}/dhis-web-user-profile/#/profile`;
    const twoFaUrl = `${base}/dhis-web-user-profile/#/twoFactor`;

    return (
        <Modal small>
            <ModalTitle>Account Security Setup</ModalTitle>
            <ModalContent>
                <div className={classes.appTitle}>
                    ECRAAT Detention Facility Risk Assessment
                </div>
                <p className={classes.intro}>
                    Your account is missing one or more important security settings.
                    Please configure the items below to improve your account security,
                    then refresh the page.
                </p>

                {emailMissing && (
                    <div className={classes.noticeWrap}>
                        <NoticeBox warning title="Email address not configured">
                            {'Your account does not have a valid email address. '}
                            {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
                            <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={classes.settingsLink}
                                aria-label="Configure your email in Profile Settings"
                            >
                                Configure your email in Profile Settings ↗
                            </a>
                        </NoticeBox>
                    </div>
                )}

                {twoFAMissing && (
                    <div className={classes.noticeWrap}>
                        <NoticeBox warning title="Two-Factor Authentication not enabled">
                            {'Two-Factor Authentication (2FA) is not active on your account. '}
                            {'You can use an authenticator app such as Microsoft Authenticator '}
                            {'or Google Authenticator to configure the 2FA. '}
                            {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
                            <a
                                href={twoFaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={classes.settingsLink}
                                aria-label="Enable Two-Factor Authentication"
                            >
                                Enable Two-Factor Authentication ↗
                            </a>
                        </NoticeBox>
                    </div>
                )}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button primary onClick={() => window.location.reload()}>
                        Refresh Page
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};
