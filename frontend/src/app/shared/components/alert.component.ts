import { Component, input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    <div class="alert" [class]="'alert-' + type()" role="alert">
      {{ message() }}
    </div>
  `,
  styles: [`
    .alert { padding: 12px 16px; border-radius: 6px; margin: 8px 0; font-size: 0.875rem; }
    .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .alert-info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  `],
})
export class AlertComponent {
  readonly message = input.required<string>();
  readonly type = input<'success' | 'error' | 'info'>('info');
}
