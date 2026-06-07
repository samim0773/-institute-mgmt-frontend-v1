import { Injectable }            from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }            from 'rxjs';
import { environment }           from '../../../environments/environment';
import { ApiResponse }           from '../../core/models';

// ─── Expense types ────────────────────────────────────────────────────────────

export type ExpenseCategory =
    'salary' | 'utility' | 'maintenance' | 'purchase' |
    'rent'   | 'transport' | 'event' | 'stationery'   | 'other';

export interface Expense {
    _id:         string;
    category:    ExpenseCategory;
    title:       string;
    amount:      number;
    date:        string;
    paidTo?:     string;
    paymentMode: string;
    referenceNo?: string;
    description?: string;
    teacherId?:   string;
    salaryMonth?: string;
    createdAt:   string;
}

export interface ExpenseSummary {
    total:      number;
    count:      number;
    byCategory: { _id: ExpenseCategory; total: number; count: number }[];
    recent:     Expense[];
}

export interface ExpenseListResponse {
    data:       Expense[];
    total:      number;
    totalPages: number;
}

// ─── Inventory types ──────────────────────────────────────────────────────────

export type InventoryCategory =
    'furniture' | 'electronics' | 'books_stationery' |
    'sports'    | 'lab_equipment' | 'office_supplies' | 'vehicle' | 'other';

export type ItemCondition = 'new' | 'good' | 'fair' | 'poor' | 'disposed';

export interface InventoryItem {
    _id:           string;
    name:          string;
    category:      InventoryCategory;
    quantity:      number;
    unit:          string;
    purchasePrice?: number;
    currentValue?:  number;
    purchaseDate?:  string;
    condition:     ItemCondition;
    location?:     string;
    supplier?:     string;
    warrantyUntil?: string;
    minStockLevel: number;
    notes?:        string;
    updatedAt:     string;
}

export interface InventoryStats {
    totalItems: number;
    totalQty:   number;
    totalValue: number;
    byCategory: { _id: InventoryCategory; count: number; qty: number; value: number }[];
    lowStockItems: InventoryItem[];
}

export interface InventoryListResponse {
    data:       InventoryItem[];
    total:      number;
    totalPages: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InventoryService {

    private base = environment.apiUrl;

    // ── Category display helpers ───────────────────────────────────────────────

    readonly EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
        { value: 'salary',      label: 'Salary',       icon: 'payments'        },
        { value: 'utility',     label: 'Utility',      icon: 'bolt'            },
        { value: 'maintenance', label: 'Maintenance',  icon: 'build'           },
        { value: 'purchase',    label: 'Purchase',     icon: 'shopping_cart'   },
        { value: 'rent',        label: 'Rent',         icon: 'home'            },
        { value: 'transport',   label: 'Transport',    icon: 'directions_bus'  },
        { value: 'event',       label: 'Event',        icon: 'event'           },
        { value: 'stationery',  label: 'Stationery',   icon: 'edit'            },
        { value: 'other',       label: 'Other',        icon: 'more_horiz'      },
    ];

    readonly INVENTORY_CATEGORIES: { value: InventoryCategory; label: string; icon: string }[] = [
        { value: 'furniture',        label: 'Furniture',         icon: 'chair'           },
        { value: 'electronics',      label: 'Electronics',       icon: 'devices'         },
        { value: 'books_stationery', label: 'Books & Stationery',icon: 'menu_book'       },
        { value: 'sports',           label: 'Sports Equipment',  icon: 'sports_soccer'   },
        { value: 'lab_equipment',    label: 'Lab Equipment',     icon: 'science'         },
        { value: 'office_supplies',  label: 'Office Supplies',   icon: 'work'            },
        { value: 'vehicle',          label: 'Vehicle',           icon: 'directions_car'  },
        { value: 'other',            label: 'Other',             icon: 'inventory_2'     },
    ];

    readonly CONDITIONS: { value: ItemCondition; label: string }[] = [
        { value: 'new',      label: 'New'      },
        { value: 'good',     label: 'Good'     },
        { value: 'fair',     label: 'Fair'     },
        { value: 'poor',     label: 'Poor'     },
        { value: 'disposed', label: 'Disposed' },
    ];

    readonly PAYMENT_MODES = [
        { value: 'cash',         label: 'Cash'          },
        { value: 'cheque',       label: 'Cheque'        },
        { value: 'upi',          label: 'UPI'           },
        { value: 'bank_transfer',label: 'Bank Transfer' },
        { value: 'other',        label: 'Other'         },
    ];

    expenseCategoryLabel(cat: string): string {
        return this.EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat;
    }

    inventoryCategoryLabel(cat: string): string {
        return this.INVENTORY_CATEGORIES.find(c => c.value === cat)?.label || cat;
    }

    conditionLabel(cond: string): string {
        return this.CONDITIONS.find(c => c.value === cond)?.label || cond;
    }

    formatCurrency(n: number): string {
        return '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    constructor(private http: HttpClient) {}

    // ── Expense API ────────────────────────────────────────────────────────────

    getExpenseSummary(params: { period?: string; month?: number; year?: number } = {}): Observable<ApiResponse<ExpenseSummary>> {
        let p = new HttpParams();
        if (params.period) p = p.set('period', params.period);
        if (params.month)  p = p.set('month',  String(params.month));
        if (params.year)   p = p.set('year',   String(params.year));
        return this.http.get<ApiResponse<ExpenseSummary>>(`${this.base}/expenses/summary`, { params: p });
    }

    getExpenses(params: {
        category?: string;
        from?:     string;
        to?:       string;
        page?:     number;
        limit?:    number;
    } = {}): Observable<ApiResponse<Expense[]> & { total: number; totalPages: number }> {
        let p = new HttpParams();
        if (params.category) p = p.set('category', params.category);
        if (params.from)     p = p.set('from',     params.from);
        if (params.to)       p = p.set('to',       params.to);
        if (params.page)     p = p.set('page',     String(params.page));
        if (params.limit)    p = p.set('limit',    String(params.limit));
        return this.http.get<ApiResponse<Expense[]> & { total: number; totalPages: number }>(
            `${this.base}/expenses`, { params: p }
        );
    }

    createExpense(payload: Partial<Expense>): Observable<ApiResponse<Expense>> {
        return this.http.post<ApiResponse<Expense>>(`${this.base}/expenses`, payload);
    }

    updateExpense(id: string, payload: Partial<Expense>): Observable<ApiResponse<Expense>> {
        return this.http.put<ApiResponse<Expense>>(`${this.base}/expenses/${id}`, payload);
    }

    deleteExpense(id: string): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.base}/expenses/${id}`);
    }

    // ── Inventory API ──────────────────────────────────────────────────────────

    getInventoryStats(): Observable<ApiResponse<InventoryStats>> {
        return this.http.get<ApiResponse<InventoryStats>>(`${this.base}/inventory/stats`);
    }

    getInventoryItems(params: {
        category?:  string;
        condition?: string;
        search?:    string;
        page?:      number;
        limit?:     number;
    } = {}): Observable<ApiResponse<InventoryItem[]> & { total: number; totalPages: number }> {
        let p = new HttpParams();
        if (params.category)  p = p.set('category',  params.category);
        if (params.condition) p = p.set('condition', params.condition);
        if (params.search)    p = p.set('search',    params.search);
        if (params.page)      p = p.set('page',      String(params.page));
        if (params.limit)     p = p.set('limit',     String(params.limit));
        return this.http.get<ApiResponse<InventoryItem[]> & { total: number; totalPages: number }>(
            `${this.base}/inventory`, { params: p }
        );
    }

    createInventoryItem(payload: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
        return this.http.post<ApiResponse<InventoryItem>>(`${this.base}/inventory`, payload);
    }

    updateInventoryItem(id: string, payload: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
        return this.http.put<ApiResponse<InventoryItem>>(`${this.base}/inventory/${id}`, payload);
    }

    deleteInventoryItem(id: string): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.base}/inventory/${id}`);
    }
}
