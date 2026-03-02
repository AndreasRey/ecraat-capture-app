export type Props = {
    teiId: string;
    programId: string;
    orgUnitId: string;
    readOnlyMode?: boolean;
    actionsOnly?: boolean; // ECRAAT: render only Edit + overflow buttons, no card
    onUpdateTeiAttributeValues?: (attributes: Array<{ [key: string]: string }>, teiDisplayName: string) => void;
    onDeleteSuccess?: () => void;
};
