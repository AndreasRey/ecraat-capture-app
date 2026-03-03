import React, { memo, type ComponentType } from 'react';
import { withStyles, type WithStyles } from 'capture-core-utils/styles';
import { FeedbackBar } from 'capture-core/components/FeedbackBar';
import { AppPagesLoader } from './AppPagesLoader.component';
// ECRAAT: Profile security check (email + 2FA)
import { useProfileCheck } from '../../ecraat/useProfileCheck';
import { ProfileSetupWarning } from '../../ecraat/ProfileSetupWarning';

const getStyles = (theme: any) => ({
    app: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.pxToRem(16),
    },
    // See https://dhis2.atlassian.net/browse/DHIS2-20078
    iOSWorkaround: {
        '@supports (-webkit-touch-callout: none)': {
            height: 100,
        },
    },
});

type PlainProps = Record<string, never>;

type Props = PlainProps & WithStyles<typeof getStyles>;

const Index = ({ classes }: Props) => {
    // ECRAAT: Block app navigation when profile security settings are missing
    const { showWarning, emailMissing, twoFAMissing } = useProfileCheck();

    if (showWarning) {
        return (
            <ProfileSetupWarning
                emailMissing={emailMissing}
                twoFAMissing={twoFAMissing}
            />
        );
    }

    return (
        <>
            <div
                className={classes.app}
            >
                <AppPagesLoader />
                <FeedbackBar />
            </div>
            <div className={classes.iOSWorkaround} />
        </>
    );
};
Index.displayName = 'AppContents';

export const AppContents = withStyles(getStyles)(memo(Index)) as ComponentType<PlainProps>;
