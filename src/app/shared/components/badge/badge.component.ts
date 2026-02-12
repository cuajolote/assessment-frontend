import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span [class]="'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + colorClass()">
    {{ label() }}
  </span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  label = input.required<string>();
  colorClass = input<string>('bg-gray-100 text-gray-800');
}
