/**
 * ECRAAT: Home page component
 * ============================
 * Replaces the default "Get started with Capture app" splash screen.
 * Shows a filterable, sortable, searchable table of organisation units
 * assigned to the configured program and accessible to the current user.
 *
 * Columns:
 *   1. Organisation unit name
 *   2. Parent organisation unit (region)
 *   3. Link → enrollment working list page for that org unit
 */
import React, { useMemo, useState, useCallback } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    DataTableFoot,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Button,
    IconArrowRight16,
    CircularLoader,
    NoticeBox,
    colors,
    spacers,
    Pagination,
} from '@dhis2/ui';
import { useNavigate, buildUrlQueryString } from '../../utils/routing';
import { useOrgUnitsForProgram, type OrgUnitRow } from './useOrgUnitsForProgram';
import { ecraatConfig } from '../../../../ecraat';

type SortDirection = 'asc' | 'desc' | 'default';
type SortColumn = 'name' | 'parentName' | null;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '24px',
        maxWidth: 1000,
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacers.dp16,
        flexWrap: 'wrap',
        gap: spacers.dp8,
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: 500,
        color: colors.grey900,
        margin: 0,
    },
    searchWrapper: {
        minWidth: 280,
    },
    filtersRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: spacers.dp16,
        marginBottom: spacers.dp16,
        flexWrap: 'wrap' as const,
    },
    filterItem: {
        minWidth: 220,
        flex: '1 1 220px',
        maxWidth: 320,
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '64px 0',
    },
    linkCell: {
        cursor: 'pointer',
    },
};

export const EcraatHomePage = () => {
    const { programId, defaultTemplateId } = ecraatConfig.homePage;
    const { orgUnits, loading, error } = useOrgUnitsForProgram(programId);
    const { navigate } = useNavigate();

    // Search by name
    const [searchTerm, setSearchTerm] = useState('');

    // Region filter
    const [selectedRegion, setSelectedRegion] = useState('');

    // Sorting
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Unique regions for the dropdown
    const regions = useMemo(() => {
        const names = [...new Set(orgUnits.map(ou => ou.parentName))].filter(n => n !== '—');
        return names.sort((a, b) => a.localeCompare(b));
    }, [orgUnits]);

    // Filter by name search + region dropdown
    const filtered = useMemo(() => {
        let result = orgUnits;
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase().trim();
            result = result.filter(ou => ou.name.toLowerCase().includes(lower));
        }
        if (selectedRegion) {
            result = result.filter(ou => ou.parentName === selectedRegion);
        }
        return result;
    }, [orgUnits, searchTerm, selectedRegion]);

    // Sort
    const sorted = useMemo(() => {
        if (!sortColumn || sortDirection === 'default') return filtered;
        const dir = sortDirection === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const valA = a[sortColumn].toLowerCase();
            const valB = b[sortColumn].toLowerCase();
            if (valA < valB) return -dir;
            if (valA > valB) return dir;
            return 0;
        });
    }, [filtered, sortColumn, sortDirection]);

    // Paginate
    const totalPages = Math.ceil(sorted.length / pageSize);
    const paged = useMemo(
        () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [sorted, currentPage, pageSize],
    );

    // Reset to page 1 when search term or region changes
    const handleSearch = useCallback((e: { value?: string }) => {
        setSearchTerm(e.value || '');
        setCurrentPage(1);
    }, []);

    const handleRegionChange = useCallback((e: { selected: string }) => {
        setSelectedRegion(e.selected);
        setCurrentPage(1);
    }, []);

    // Sort handler
    const handleSort = useCallback((column: SortColumn) => {
        setSortColumn((prev) => {
            if (prev === column) {
                // Cycle direction: asc → desc → default → asc
                setSortDirection((d) => {
                    if (d === 'asc') return 'desc';
                    if (d === 'desc') return 'default';
                    return 'asc';
                });
                return column;
            }
            setSortDirection('asc');
            return column;
        });
        setCurrentPage(1);
    }, []);

    const getSortProps = (column: SortColumn) => ({
        sortDirection: sortColumn === column ? sortDirection : 'default' as const,
        onSortIconClick: () => handleSort(column),
    });

    // Navigation
    const handleOpen = useCallback(
        (orgUnitId: string) => {
            const queryArgs: Record<string, string> = {
                orgUnitId,
                programId,
            };
            if (defaultTemplateId) {
                queryArgs.selectedTemplateId = defaultTemplateId;
            }
            navigate(`?${buildUrlQueryString(queryArgs)}`);
        },
        [navigate, programId, defaultTemplateId],
    );

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <NoticeBox error title={i18n.t('Error loading organisation units')}>
                    {error}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div style={styles.container} data-test="ecraat-home-page">
            <div style={styles.header}>
                <h2 style={styles.title}>
                    {i18n.t('Detention places')}
                </h2>
            </div>

            <div style={styles.filtersRow}>
                <div style={styles.filterItem}>
                    <InputField
                        label={i18n.t('Search by name')}
                        placeholder={i18n.t('Type to search…')}
                        value={searchTerm}
                        onChange={handleSearch}
                        type="text"
                        dense
                        dataTest="ecraat-home-search"
                    />
                </div>
                <div style={styles.filterItem}>
                    <SingleSelectField
                        label={i18n.t('Filter by region')}
                        selected={selectedRegion}
                        onChange={handleRegionChange}
                        placeholder={i18n.t('All regions')}
                        clearable
                        dense
                        dataTest="ecraat-home-region-filter"
                    >
                        {regions.map(region => (
                            <SingleSelectOption
                                key={region}
                                label={region}
                                value={region}
                            />
                        ))}
                    </SingleSelectField>
                </div>
            </div>

            <DataTable dataTest="ecraat-home-table">
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader
                            {...getSortProps('name')}
                            sortIconTitle={i18n.t('Sort by name')}
                        >
                            {i18n.t('Organisation unit')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader
                            {...getSortProps('parentName')}
                            sortIconTitle={i18n.t('Sort by region')}
                        >
                            {i18n.t('Region')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>
                            {/* Actions column — no sort */}
                        </DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {paged.length === 0 && (
                        <DataTableRow>
                            <DataTableCell colSpan="3" align="center">
                                {(searchTerm || selectedRegion)
                                    ? i18n.t('No organisation units match your filters')
                                    : i18n.t('No organisation units found')}
                            </DataTableCell>
                        </DataTableRow>
                    )}
                    {paged.map((ou: OrgUnitRow) => (
                        <DataTableRow key={ou.id}>
                            <DataTableCell>
                                {ou.name}
                            </DataTableCell>
                            <DataTableCell>
                                {ou.parentName}
                            </DataTableCell>
                            <DataTableCell>
                                <Button
                                    small
                                    secondary
                                    icon={<IconArrowRight16 />}
                                    onClick={() => handleOpen(ou.id)}
                                    dataTest={`ecraat-home-open-${ou.id}`}
                                >
                                    {i18n.t('Open')}
                                </Button>
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
                {sorted.length > pageSize && (
                    <DataTableFoot>
                        <DataTableRow>
                            <DataTableCell colSpan="3">
                                <Pagination
                                    page={currentPage}
                                    pageSize={pageSize}
                                    onPageChange={setCurrentPage}
                                    onPageSizeChange={(size: number) => {
                                        setPageSize(size);
                                        setCurrentPage(1);
                                    }}
                                    isLastPage={currentPage >= totalPages}
                                    pageSizes={PAGE_SIZE_OPTIONS.map(String)}
                                />
                            </DataTableCell>
                        </DataTableRow>
                    </DataTableFoot>
                )}
            </DataTable>

            <div style={{ paddingTop: spacers.dp8, color: colors.grey600, fontSize: '0.85rem' }}>
                {i18n.t('Showing {{count}} of {{total}} organisation units', {
                    count: paged.length,
                    total: sorted.length,
                })}
            </div>
        </div>
    );
};
