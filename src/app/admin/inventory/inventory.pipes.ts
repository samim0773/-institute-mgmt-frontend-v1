import { Pipe, PipeTransform } from '@angular/core';

/** Returns the total amount for a given expense category from byCategory array */
@Pipe({ name: 'categoryTotal' })
export class CategoryTotalPipe implements PipeTransform {
    transform(byCategory: { _id: string; total: number }[] | null, category: string): number {
        if (!byCategory) return 0;
        return byCategory.find(c => c._id === category)?.total || 0;
    }
}

/** Returns the icon string for an inventory category */
@Pipe({ name: 'catIcon' })
export class CatIconPipe implements PipeTransform {
    private icons: Record<string, string> = {
        furniture:        'chair',
        electronics:      'devices',
        books_stationery: 'menu_book',
        sports:           'sports_soccer',
        lab_equipment:    'science',
        office_supplies:  'work',
        vehicle:          'directions_car',
        other:            'inventory_2',
    };

    transform(categories: { value: string; icon: string }[], catValue: string): string {
        return categories.find(c => c.value === catValue)?.icon || 'inventory_2';
    }
}
