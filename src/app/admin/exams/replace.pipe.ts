import { Pipe, PipeTransform } from '@angular/core';

/** Simple string-replace pipe. Usage: {{ str | replace:'_':' ' }} */
@Pipe({ name: 'replace' })
export class ReplacePipe implements PipeTransform {
  transform(value: string, search: string, replacement: string): string {
    if (!value) return value;
    return value.split(search).join(replacement);
  }
}
