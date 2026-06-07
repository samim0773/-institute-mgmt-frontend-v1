import {
    Component, OnInit, OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog }   from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject }     from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import {
    InventoryService,
    Expense, ExpenseSummary, InventoryItem, InventoryStats,
} from './inventory.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExpenseDialogComponent } from './expense-dialog.component';
import { InventoryItemDialogComponent } from './inventory-item-dialog.component';

type Period = 'this-month' | 'this-year' | 'month' | 'all';

@Component({
    selector:    'app-inventory-dashboard',
    templateUrl: './inventory-dashboard.component.html',
    styleUrls:   ['./inventory-dashboard.component.scss'],
})
export class InventoryDashboardComponent implements OnInit, OnDestroy {

    activeTab = 0;

    // ── Expense summary ────────────────────────────────────────────────────────
    summary: ExpenseSummary | null = null;
    loadingSummary = false;
    period: Period = 'this-month';
    selectedMonth  = new Date().getMonth() + 1;
    selectedYear   = new Date().getFullYear();

    readonly MONTHS = [
        { v: 1, l: 'January'   }, { v: 2,  l: 'February'  }, { v: 3,  l: 'March'     },
        { v: 4, l: 'April'     }, { v: 5,  l: 'May'        }, { v: 6,  l: 'June'      },
        { v: 7, l: 'July'      }, { v: 8,  l: 'August'     }, { v: 9,  l: 'September' },
        { v: 10,l: 'October'   }, { v: 11, l: 'November'   }, { v: 12, l: 'December'  },
    ];

    readonly YEARS: number[] = (() => {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2, y - 3];
    })();

    // ── Expense list ───────────────────────────────────────────────────────────
    expenses:       Expense[] = [];
    totalExpenses   = 0;
    expensePages    = 1;
    expensePage     = 1;
    loadingExpenses = false;
    categoryFilter  = new FormControl('');
    deletingExpenseId: string | null = null;

    // ── Inventory list ─────────────────────────────────────────────────────────
    inventoryStats: InventoryStats | null = null;
    inventoryItems:       InventoryItem[] = [];
    totalInventory        = 0;
    inventoryPages        = 1;
    inventoryPage         = 1;
    loadingInventory      = false;
    loadingInventoryStats = false;
    invCategoryFilter  = new FormControl('');
    invConditionFilter = new FormControl('');
    searchCtrl         = new FormControl('');
    deletingItemId: string | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        public  inventorySvc: InventoryService,
        private notify:       NotificationService,
        private dialog:       MatDialog,
        private cdRef:        ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.loadSummary();
        this.loadInventoryStats();
    }

    ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

    // ── Period helpers ─────────────────────────────────────────────────────────
    onPeriodChange(p: Period): void {
        this.period = p;
        if (p !== 'month') this.loadSummary();
    }

    onMonthYearChange(): void {
        if (this.period === 'month') this.loadSummary();
    }

    get periodLabel(): string {
        const now = new Date();
        switch (this.period) {
            case 'this-month': return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            case 'this-year':  return String(now.getFullYear());
            case 'month':      return `${this.MONTHS[this.selectedMonth - 1]?.l} ${this.selectedYear}`;
            case 'all':        return 'All Time';
            default:           return '';
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    loadSummary(): void {
        this.loadingSummary = true;
        const params: any = { period: this.period };
        if (this.period === 'month') { params.month = this.selectedMonth; params.year = this.selectedYear; }

        this.inventorySvc.getExpenseSummary(params)
            .pipe(finalize(() => (this.loadingSummary = false)), takeUntil(this.destroy$))
            .subscribe({
                next: res => { this.summary = res.data ?? null; },
                error: () => this.notify.error('Failed to load expense summary'),
            });
    }

    // ── Expenses ───────────────────────────────────────────────────────────────
    loadExpenses(reset = false): void {
        if (reset) this.expensePage = 1;
        this.loadingExpenses = true;

        this.inventorySvc.getExpenses({
            category: this.categoryFilter.value || undefined,
            page:     this.expensePage,
            limit:    20,
        }).pipe(finalize(() => (this.loadingExpenses = false)), takeUntil(this.destroy$))
          .subscribe({
              next: res => {
                  this.expenses      = res.data || [];
                  this.totalExpenses = res.total || 0;
                  this.expensePages  = res.totalPages || 1;
              },
              error: () => this.notify.error('Failed to load expenses'),
          });
    }

    openExpenseDialog(expense?: Expense): void {
        const ref = this.dialog.open(ExpenseDialogComponent, {
            width:        '560px',
            disableClose: true,
            data:         { expense, svc: this.inventorySvc },
        });
        ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(saved => {
            if (saved) {
                this.loadSummary();
                if (this.expenses.length > 0 || this.expensePage > 1) this.loadExpenses();
            }
        });
    }

    deleteExpense(id: string): void {
        if (!confirm('Delete this expense? This cannot be undone.')) return;
        this.deletingExpenseId = id;
        this.inventorySvc.deleteExpense(id)
            .pipe(finalize(() => (this.deletingExpenseId = null)), takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.notify.success('Expense deleted');
                    this.loadSummary();
                    this.loadExpenses();
                },
                error: () => this.notify.error('Failed to delete expense'),
            });
    }

    // ── Inventory ──────────────────────────────────────────────────────────────
    loadInventoryStats(): void {
        this.loadingInventoryStats = true;
        this.inventorySvc.getInventoryStats()
            .pipe(finalize(() => (this.loadingInventoryStats = false)), takeUntil(this.destroy$))
            .subscribe({
                next: res => { this.inventoryStats = res.data ?? null; },
                error: () => this.notify.error('Failed to load inventory stats'),
            });
    }

    loadInventoryItems(reset = false): void {
        if (reset) this.inventoryPage = 1;
        this.loadingInventory = true;

        this.inventorySvc.getInventoryItems({
            category:  this.invCategoryFilter.value  || undefined,
            condition: this.invConditionFilter.value || undefined,
            search:    this.searchCtrl.value          || undefined,
            page:      this.inventoryPage,
            limit:     20,
        }).pipe(finalize(() => (this.loadingInventory = false)), takeUntil(this.destroy$))
          .subscribe({
              next: res => {
                  this.inventoryItems  = res.data || [];
                  this.totalInventory  = res.total || 0;
                  this.inventoryPages  = res.totalPages || 1;
              },
              error: () => this.notify.error('Failed to load inventory'),
          });
    }

    openItemDialog(item?: InventoryItem): void {
        const ref = this.dialog.open(InventoryItemDialogComponent, {
            width:        '600px',
            disableClose: true,
            data:         { item, svc: this.inventorySvc },
        });
        ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(saved => {
            if (saved) {
                this.loadInventoryStats();
                this.loadInventoryItems();
            }
        });
    }

    deleteItem(id: string): void {
        if (!confirm('Delete this inventory item? This cannot be undone.')) return;
        this.deletingItemId = id;
        this.inventorySvc.deleteInventoryItem(id)
            .pipe(finalize(() => (this.deletingItemId = null)), takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.notify.success('Item deleted');
                    this.loadInventoryStats();
                    this.loadInventoryItems();
                },
                error: () => this.notify.error('Failed to delete item'),
            });
    }

    // ── Tab change ─────────────────────────────────────────────────────────────
    onTabChange(index: number): void {
        this.activeTab = index;
        if (index === 1 && this.expenses.length === 0) this.loadExpenses();
        if (index === 2 && this.inventoryItems.length === 0) this.loadInventoryItems();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    fmt(n: number): string { return this.inventorySvc.formatCurrency(n); }
    catLabel(c: string): string { return this.inventorySvc.expenseCategoryLabel(c); }
    invCatLabel(c: string): string { return this.inventorySvc.inventoryCategoryLabel(c); }
    condLabel(c: string): string { return this.inventorySvc.conditionLabel(c); }

    catColor(cat: string): string {
        const map: Record<string, string> = {
            salary:      '#1565c0', utility:    '#6a1b9a', maintenance: '#e65100',
            purchase:    '#2e7d32', rent:        '#880e4f', transport:   '#00838f',
            event:       '#f57f17', stationery:  '#4e342e', other:       '#546e7a',
        };
        return map[cat] || '#546e7a';
    }

    condClass(cond: string): string {
        const map: Record<string, string> = {
            new: 'cond-new', good: 'cond-good', fair: 'cond-fair',
            poor: 'cond-poor', disposed: 'cond-disposed',
        };
        return map[cond] || '';
    }

    isLowStock(item: InventoryItem): boolean {
        return item.minStockLevel > 0 && item.quantity <= item.minStockLevel;
    }

    expensePrevPage(): void  { if (this.expensePage > 1)          { this.expensePage--;  this.loadExpenses(); } }
    expenseNextPage(): void  { if (this.expensePage < this.expensePages) { this.expensePage++;  this.loadExpenses(); } }
    invPrevPage(): void      { if (this.inventoryPage > 1)         { this.inventoryPage--; this.loadInventoryItems(); } }
    invNextPage(): void      { if (this.inventoryPage < this.inventoryPages) { this.inventoryPage++; this.loadInventoryItems(); } }

    formatDate(d: string | undefined): string {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    trackByExpId(_: number, e: Expense): string       { return e._id; }
    trackByItemId(_: number, i: InventoryItem): string { return i._id; }
}
