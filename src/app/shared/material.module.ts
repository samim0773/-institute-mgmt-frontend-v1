import { NgModule } from '@angular/core';

// Layout
import { MatSidenavModule }    from '@angular/material/sidenav';
import { MatToolbarModule }    from '@angular/material/toolbar';
import { MatListModule }       from '@angular/material/list';
import { MatGridListModule }   from '@angular/material/grid-list';
import { MatCardModule }       from '@angular/material/card';
import { MatTabsModule }       from '@angular/material/tabs';
import { MatExpansionModule }  from '@angular/material/expansion';
import { MatDividerModule }    from '@angular/material/divider';

// Form controls
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatSelectModule }     from '@angular/material/select';
import { MatCheckboxModule }   from '@angular/material/checkbox';
import { MatRadioModule }      from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

// Buttons & indicators
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatBadgeModule }        from '@angular/material/badge';
import { MatProgressBarModule }  from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule }        from '@angular/material/chips';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { MatMenuModule }         from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Popups & modals
import { MatDialogModule }   from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';

// Data table
import { MatTableModule }      from '@angular/material/table';
import { MatSortModule }       from '@angular/material/sort';
import { MatPaginatorModule }  from '@angular/material/paginator';

const MATERIAL_MODULES = [
  MatSidenavModule, MatToolbarModule, MatListModule, MatGridListModule,
  MatCardModule, MatTabsModule, MatExpansionModule, MatDividerModule,
  MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
  MatRadioModule, MatDatepickerModule, MatNativeDateModule, MatAutocompleteModule,
  MatButtonModule, MatIconModule, MatBadgeModule, MatProgressBarModule,
  MatProgressSpinnerModule, MatChipsModule, MatTooltipModule, MatMenuModule,
  MatButtonToggleModule, MatDialogModule, MatSnackBarModule, MatBottomSheetModule,
  MatTableModule, MatSortModule, MatPaginatorModule,
];

@NgModule({
  imports: MATERIAL_MODULES,
  exports: MATERIAL_MODULES,
})
export class MaterialModule {}
