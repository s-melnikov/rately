import { Component, input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent {
  readonly message = input.required<string>();
  readonly type = input<'success' | 'error' | 'info'>('info');
}
