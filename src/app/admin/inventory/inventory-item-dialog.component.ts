import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }     from '@angular/material/dialog';
import { finalize }                           from 'rxjs/operators';

import { InventoryService, InventoryItem } from './inventory.service';
import { NotificationService }             from '../../core/services/notification.service';

@Component({
    selector: 'app-inventory-item-dialog',
    template: `
<h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} Inventory Item</h2>

<mat-dialog-content>
  <form [formGroup]="form" class="item-form">

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-name">
        <mat-label>Item Name *</mat-label>
        <input matInput formControlName="name" placeholder="e.g. Wooden Chair">
        <mat-error>Required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-cat">
        <mat-label>Category *</mat-label>
        <mat-select formControlName="category">
          <mat-option *ngFor="let c of svc.INVENTORY_CATEGORIES" [value]="c.value">
            {{ c.label }}
          </mat-option>
        </mat-select>
        <mat-error>Required</mat-error>
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-qty">
        <mat-label>Quantity *</mat-label>
        <input matInput type="number" min="0" formControlName="quantity">
        <mat-error>Required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-unit">
        <mat-label>Unit</mat-label>
        <input matInput formControlName="unit" placeholder="pcs / kg / ltr…">
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-cond">
        <mat-label>Condition</mat-label>
        <mat-select formControlName="condition">
          <mat-option *ngFor="let c of svc.CONDITIONS" [value]="c.value">{{ c.label }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Purchase Price (₹)</mat-label>
        <input matInput type="number" min="0" formControlName="purchasePrice">
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Current Value (₹)</mat-label>
        <input matInput type="number" min="0" formControlName="currentValue">
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Purchase Date</mat-label>
        <input matInput type="date" formControlName="purchaseDate">
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Warranty Until</mat-label>
        <input matInput type="date" formControlName="warrantyUntil">
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Location (Room/Lab)</mat-label>
        <input matInput formControlName="location" placeholder="e.g. Lab 3, Library">
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Supplier</mat-label>
        <input matInput formControlName="supplier" placeholder="Vendor / supplier name">
      </mat-form-field>
    </div>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Min Stock Level (alert threshold)</mat-label>
      <input matInput type="number" min="0" formControlName="minStockLevel">
      <mat-hint>Set to 0 to disable low-stock alerts</mat-hint>
    </mat-form-field>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Notes</mat-label>
      <textarea matInput formControlName="notes" rows="2"></textarea>
    </mat-form-field>

  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Cancel</button>
  <button mat-raised-button color="primary" [disabled]="saving" (click)="save()">
    <mat-spinner *ngIf="saving" diameter="18" style="display:inline-block; margin-right:8px"></mat-spinner>
    {{ isEdit ? 'Update' : 'Add' }} Item
  </button>
</mat-dialog-actions>
    `,
    styles: [`
        .item-form  { display: flex; flex-direction: column; gap: 0; padding-top: 8px; }
        .full-width { width: 100%; }
        .form-row   { display: flex; gap: 12px; }
        .field-name { flex: 2; }
        .field-cat  { flex: 1.5; }
        .field-qty  { flex: 1; }
        .field-unit { flex: 1; }
        .field-cond { flex: 1; }
        .field-half { flex: 1; }
        mat-dialog-content { min-width: 540px; max-width: 580px; }
        @media (max-width: 600px) {
            mat-dialog-content { min-width: unset; }
            .form-row { flex-direction: column; }
        }
    `],
})
export class InventoryItemDialogComponent implements OnInit {

    form!:   FormGroup;
    saving = false;
    isEdit = false;

    get svc(): InventoryService { return this.data.svc; }

    constructor(
        private fb:        FormBuilder,
        private dialogRef: MatDialogRef<InventoryItemDialogComponent>,
        private notify:    NotificationService,
        @Inject(MAT_DIALOG_DATA) public data: { item?: InventoryItem; svc: InventoryService },
    ) {}

    ngOnInit(): void {
        this.isEdit = !!this.data.item;
        const it = this.data.item;

        this.form = this.fb.group({
            name:          [it?.name          || '',      Validators.required],
            category:      [it?.category      || '',      Validators.required],
            quantity:      [it?.quantity       ?? 0,      [Validators.required, Validators.min(0)]],
            unit:          [it?.unit           || 'pcs'],
            condition:     [it?.condition      || 'new'],
            purchasePrice: [it?.purchasePrice  ?? null],
            currentValue:  [it?.currentValue   ?? null],
            purchaseDate:  [this.toDateStr(it?.purchaseDate)],
            warrantyUntil: [this.toDateStr(it?.warrantyUntil)],
            location:      [it?.location       || ''],
            supplier:      [it?.supplier       || ''],
            minStockLevel: [it?.minStockLevel   ?? 0],
            notes:         [it?.notes           || ''],
        });
    }

    private toDateStr(d?: string): string {
        if (!d) return '';
        return new Date(d).toISOString().slice(0, 10);
    }

    save(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.saving = true;

        const payload = { ...this.form.value };
        // Remove empty date strings so backend doesn't reject them
        if (!payload.purchaseDate)  delete payload.purchaseDate;
        if (!payload.warrantyUntil) delete payload.warrantyUntil;

        const obs = this.isEdit
            ? this.svc.updateInventoryItem(this.data.item!._id, payload)
            : this.svc.createInventoryItem(payload);

        obs.pipe(finalize(() => (this.saving = false))).subscribe({
            next: () => {
                this.notify.success(this.isEdit ? 'Item updated' : 'Item added');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(err?.error?.message || 'Failed to save item'),
        });
    }
}
