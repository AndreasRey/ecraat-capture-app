import React, { Component } from 'react';
import { compose } from 'redux';
import { withStyles, type WithStyles } from 'capture-core-utils/styles';
import { colors, spacers } from '@dhis2/ui';
import { QuickSelector } from './QuickSelector/QuickSelector.component';
import { DiscardDialog } from '../Dialogs/DiscardDialog.component';
import { defaultDialogProps } from '../Dialogs/DiscardDialog.constants';
import type { Props, State } from './ScopeSelector.types';
import { withLoadingIndicator } from '../../HOC';
// ECRAAT: Import config to conditionally hide the scope selector
import { ecraatConfig } from '../../../../ecraat';

const styles = {
    stickyTopBar: {
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
    },
    // ECRAAT: Style for the org unit name header shown when scope selector is hidden
    ecraatOrgUnitHeader: {
        padding: `${spacers.dp12} ${spacers.dp16}`,
        fontSize: '15px',
        fontWeight: 500,
        color: colors.grey900,
        backgroundColor: colors.white,
        borderBottom: `1px solid ${colors.grey300}`,
        textAlign: 'center',
    },
} as const;

class ScopeSelectorClass extends Component<Props & WithStyles<typeof styles>, State> {
    constructor(props: Props & WithStyles<typeof styles>) {
        super(props);

        this.state = {
            openOrgUnitWarning: false,
            openProgramWarning: null,
            openCatComboWarning: false,
            openStartAgainWarning: false,
            categoryIdToReset: '',
        };
    }

    dontShowWarning = () => !this.props.isUserInteractionInProgress;

    handleOpenOrgUnitWarning = () => {
        if (this.dontShowWarning()) {
            this.props.onResetOrgUnitId();
            return;
        }
        this.setState({ openOrgUnitWarning: true });
    }

    handleOpenProgramWarning = (baseAction: any) => {
        if (this.dontShowWarning()) {
            this.props.onResetProgramId(baseAction);
            return;
        }
        this.setState({ openProgramWarning: baseAction });
    }

    handleOpenCatComboWarning = (categoryId: string) => {
        if (this.dontShowWarning()) {
            this.props.onResetCategoryOption && this.props.onResetCategoryOption(categoryId);
            return;
        }
        this.setState({ openCatComboWarning: true, categoryIdToReset: categoryId });
    }

    handleStartAgainWarning = () => {
        if (this.dontShowWarning()) {
            this.props.onStartAgain && this.props.onStartAgain();
            return;
        }
        this.setState({ openStartAgainWarning: true });
    }

    handleClose = () => {
        this.setState({
            openOrgUnitWarning: false,
            openProgramWarning: null,
            openCatComboWarning: false,
            openStartAgainWarning: false,
        });
    }

    handleAcceptOrgUnit = () => {
        this.props.onResetOrgUnitId();
        this.handleClose();
    }

    handleAcceptProgram = () => {
        if (this.state.openProgramWarning) {
            this.props.onResetProgramId(this.state.openProgramWarning);
        }
        this.handleClose();
    }

    handleAcceptCatCombo = () => {
        this.props.onResetCategoryOption && this.props.onResetCategoryOption(this.state.categoryIdToReset);
        this.handleClose();
    }

    handleAcceptStartAgain = () => {
        this.props.onStartAgain && this.props.onStartAgain();
        this.handleClose();
    }

    render() {
        const {
            onSetOrgUnit,
            onSetProgramId,
            onSetCategoryOption,
            onResetAllCategoryOptions,
        } = this.props;

        // ECRAAT: When scope selector is hidden, show only the org unit name
        if (ecraatConfig.mainPage.hideScopeSelector) {
            const orgUnitName = this.props.selectedOrgUnit?.name;
            return (
                <div
                    className={this.props.classes.stickyTopBar}
                    data-test={'scope-selector'}
                >
                    {orgUnitName && (
                        <div
                            className={this.props.classes.ecraatOrgUnitHeader}
                            data-test={'ecraat-org-unit-header'}
                        >
                            {orgUnitName}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                className={this.props.classes.stickyTopBar}
                data-test={'scope-selector'}
            >
                <QuickSelector
                    onSetOrgUnit={onSetOrgUnit}
                    onSetProgramId={onSetProgramId}
                    onSetCategoryOption={onSetCategoryOption}
                    onResetAllCategoryOptions={onResetAllCategoryOptions}
                    onResetOrgUnitId={this.handleOpenOrgUnitWarning}
                    onResetProgramId={this.handleOpenProgramWarning}
                    onResetCategoryOption={this.handleOpenCatComboWarning}
                    onStartAgain={this.handleStartAgainWarning}
                    previousOrgUnitId={this.props.previousOrgUnitId}
                    selectedOrgUnitId={this.props.selectedOrgUnitId}
                    selectedProgramId={this.props.selectedProgramId}
                    selectedOrgUnit={this.props.selectedOrgUnit}
                    selectedCategories={this.props.selectedCategories || {}}
                    isUserInteractionInProgress={this.props.isUserInteractionInProgress}
                    formIsOpen={this.props.formIsOpen}
                    isReadOnlyOrgUnit={this.props.isReadOnlyOrgUnit}
                    orgUnitTooltip={this.props.orgUnitTooltip}
                >
                    {this.props.children}
                </QuickSelector>
                <DiscardDialog
                    onDestroy={this.handleAcceptOrgUnit}
                    open={this.state.openOrgUnitWarning}
                    onCancel={this.handleClose}
                    {...defaultDialogProps}
                />
                <DiscardDialog
                    onDestroy={this.handleAcceptProgram}
                    open={!!this.state.openProgramWarning}
                    onCancel={this.handleClose}
                    {...defaultDialogProps}
                />
                <DiscardDialog
                    onDestroy={this.handleAcceptCatCombo}
                    open={this.state.openCatComboWarning}
                    onCancel={this.handleClose}
                    {...defaultDialogProps}
                />
                <DiscardDialog
                    onDestroy={this.handleAcceptStartAgain}
                    open={this.state.openStartAgainWarning}
                    onCancel={this.handleClose}
                    {...defaultDialogProps}
                />
            </div>
        );
    }
}

export const ScopeSelectorComponent = compose(
    withLoadingIndicator(() => ({ height: '100px' })),
    withStyles(styles),
)(ScopeSelectorClass) as any;
