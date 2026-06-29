import React from 'react';
import { ecraatConfig } from '../ecraat-config';
import { RelatedProgramEventCard } from './RelatedProgramEventCard';

type Props = {
    /** The org unit the current enrollment is being collected to */
    enrollmentOrgUnitId: string | undefined;
    /** The current (tracker) program id, used as back-navigation context in the read-only viewer */
    enrollmentProgramId: string | undefined;
};

/**
 * ECRAAT: read-only cards on the enrollment dashboard that list events from
 * separate event programs (configured in ecraatConfig.relatedEventPrograms).
 * One card per configured program, rendered in order.
 */
export const RelatedProgramEvents = ({ enrollmentOrgUnitId, enrollmentProgramId }: Props) => {
    const { enabled, programs } = ecraatConfig.relatedEventPrograms;

    if (!enabled) {
        return null;
    }

    return (
        <>
            {programs.map((program) => {
                const orgUnitId = program.orgUnitSource === 'fixed'
                    ? program.orgUnitId ?? undefined
                    : enrollmentOrgUnitId;

                return (
                    <RelatedProgramEventCard
                        key={program.programId}
                        programId={program.programId}
                        orgUnitId={orgUnitId}
                        navigationOrgUnitId={enrollmentOrgUnitId}
                        navigationProgramId={enrollmentProgramId}
                    />
                );
            })}
        </>
    );
};
