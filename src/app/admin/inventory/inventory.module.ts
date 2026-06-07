import { NgModule }           from '@angular/core';
import { CommonModule }       from '@angular/common';
import { RouterModule }       from '@angular/router';
import { ReactiveFormsModule }from '@angular/forms';

// Angular Material
import { MatTabsModule }            from '@angular/material/tabs';
import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatButtonToggleModule }    from '@angular/material/button-toggle';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDividerModule }         from '@angular/material/divider';
import { MatSnackBarModule }        from '@angular/material/snack-bar';

// Components
import { InventoryDashboardComponent }  from './inventory-dashboard.component';
import { ExpenseDialogComponent }       from './expense-dialog.component';
import { InventoryItemDialogComponent } from './inventory-item-dialog.component';

// Pipes
import { CategoryTotalPipe, CatIconPipe } from './inventory.pipes';

@NgModule({
    declarations: [
        InventoryDashboardComponent,
        ExpenseDialogComponent,
        InventoryItemDialogComponent,
        CategoryTotalPipe,
        CatIconPipe,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forChild([
            { path: '', component: InventoryDashboardComponent },
        ]),
        MatTabsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatButtonToggleModule,
        MatTooltipModule,
        MatDividerModule,
        MatSnackBarModule,
    ],
})
export class InventoryModule {}
