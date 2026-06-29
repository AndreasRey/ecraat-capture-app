import { ecraatConfig } from './ecraat-config';

/**
 * True when the given program is one of the read-only "related" event programs
 * surfaced on the enrollment dashboard (see ecraatConfig.relatedEventPrograms).
 * Used to keep their events read-only in the event viewer (no edit button, no notes).
 */
export const isRelatedEventProgram = (programId?: string | null): boolean =>
    !!programId
    && ecraatConfig.relatedEventPrograms.enabled
    && ecraatConfig.relatedEventPrograms.programs.some(program => program.programId === programId);
