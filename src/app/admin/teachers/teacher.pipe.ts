import { Pipe, PipeTransform } from '@angular/core';
import { Teacher }             from './teachers-list.component';

@Pipe({ name: 'teacherCount' })
export class TeacherCountPipe implements PipeTransform {
  transform(teachers: Teacher[], active: boolean): number {
    return teachers.filter(t => t.isActive === active).length;
  }
}
