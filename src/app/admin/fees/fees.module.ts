import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular Material
import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatButtonToggleModule }    from '@angular/material/button-toggle';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

// Components
import { FeesListComponent }             from './fees-list.component';
import { RecordPaymentDialogComponent }  from './record-payment.component';
import { PaymentHistoryComponent }       from './payment-history.component';
import { GenerateFeeComponent }          from './generate-fee.component';
import { FeeSlipComponent }              from './fee-slip.component';
import { FeeBulkPrintComponent }         from './fee-bulk-print.component';

const routes: Routes = [
  { path: '',                   component: FeesListComponent,      title: 'Fees'                },
  { path: 'generate',           component: GenerateFeeComponent,   title: 'Generate Fees'       },
  { path: 'bulk-print',         component: FeeBulkPrintComponent,  title: 'Bulk Print Fee Slips'},
  { path: 'student/:studentId', component: PaymentHistoryComponent, title: 'Payment History'    },
  { path: 'bill/:billId',       component: FeeSlipComponent,       title: 'Fee Receipt'         },
];

@NgModule({
  declarations: [
    FeesListComponent,
    RecordPaymentDialogComponent,
    PaymentHistoryComponent,
    GenerateFeeComponent,
    FeeSlipComponent,
    FeeBulkPrintComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatPaginatorModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatChipsModule,
    MatDialogModule, MatExpansionModule, MatButtonToggleModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
})
export class FeesModule {}
