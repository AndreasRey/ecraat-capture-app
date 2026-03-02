/**
 * ECRAAT: Hook to fetch organisation units assigned to a given program
 * and accessible to the current user.
 *
 * Fetches org units from /api/programs/{id} (the program knows its assigned
 * org units) and then filters client-side to keep only level-3 (facilities).
 */
import { useState, useEffect, useCallback } from 'react';
import { useDataEngine } from '@dhis2/app-runtime';

export type OrgUnitRow = {
    id: string;
    name: string;
    parentName: string;
};

/**
 * Fetch org units assigned to the program and accessible to the current user.
 * Uses /api/programs/{programId} to get the assigned org units with level info,
 * then filters to level 3 client-side.
 */
export const useOrgUnitsForProgram = (programId: string, orgUnitLevel = 3) => {
    const engine = useDataEngine();
    const [orgUnits, setOrgUnits] = useState<OrgUnitRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result: any = await engine.query({
                program: {
                    resource: `programs/${programId}`,
                    params: {
                        fields: 'organisationUnits[id,displayName,level,parent[displayName]]',
                    },
                },
            });

            const allOrgUnits: Array<{
                id: string;
                displayName: string;
                level: number;
                parent?: { displayName: string };
            }> = result?.program?.organisationUnits || [];

            // Keep only org units at the desired level
            const filtered = orgUnitLevel
                ? allOrgUnits.filter(ou => ou.level === orgUnitLevel)
                : allOrgUnits;

            const rows: OrgUnitRow[] = filtered
                .map(ou => ({
                    id: ou.id,
                    name: ou.displayName,
                    parentName: ou.parent?.displayName || '—',
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            setOrgUnits(rows);
        } catch (e: any) {
            setError(e?.message || 'Failed to load organisation units');
        } finally {
            setLoading(false);
        }
    }, [engine, programId, orgUnitLevel]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { orgUnits, loading, error, refetch: fetchData };
};
