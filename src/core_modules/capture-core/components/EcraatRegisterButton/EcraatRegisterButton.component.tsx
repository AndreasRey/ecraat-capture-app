/**
 * ECRAAT: Standalone "Register new" button
 * =========================================
 * This button replicates the navigation logic from TopBarActions but is
 * rendered above the working list when the ScopeSelector top bar is hidden.
 *
 * It reads its label and icon settings from `ecraatConfig`.
 */
import React from 'react';
import { Button, IconAdd16, spacers, colors } from '@dhis2/ui';
import { ecraatConfig } from '../../../../ecraat';
import { useNavigate, buildUrlQueryString } from '../../utils/routing';

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        justifyContent: 'flex-start',
        padding: `${spacers.dp8} 0`,
    },
};

type Props = {
    programId: string;
    orgUnitId?: string;
};

export const EcraatRegisterButton = ({ programId, orgUnitId }: Props) => {
    const { navigate } = useNavigate();
    const { registerButtonLabel, registerButtonShowPlusIcon } = ecraatConfig.mainPage;

    const handleClick = () => {
        const queryArgs: Record<string, string> = {};
        if (orgUnitId) {
            queryArgs.orgUnitId = orgUnitId;
        }
        if (programId) {
            queryArgs.programId = programId;
        }
        navigate(`new?${buildUrlQueryString(queryArgs)}`);
    };

    return (
        <div style={styles.container}>
            <Button
                primary
                dataTest="ecraat-register-button"
                onClick={handleClick}
                icon={registerButtonShowPlusIcon ? <IconAdd16 /> : undefined}
            >
                {registerButtonLabel}
            </Button>
        </div>
    );
};
