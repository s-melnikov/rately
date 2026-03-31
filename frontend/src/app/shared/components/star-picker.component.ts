import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-picker',
  standalone: true,
  template: `
    <span class="star-picker" role="group" aria-label="Pick a rating">
      @for (star of stars; track star) {
        <button
          type="button"
          class="star"
          [class.filled]="star <= (hovered() || value())"
          (mouseenter)="hovered.set(star)"
          (mouseleave)="hovered.set(0)"
          (click)="select(star)"
          [attr.aria-label]="'Rate ' + star + ' stars'"
        >★</button>
      }
    </span>
  `,
  styles: [`
    .star-picker { display: inline-flex; gap: 2px; }
    .star {
      background: none; border: none; cursor: pointer; padding: 0;
      color: #ddd; font-size: 1.5rem; line-height: 1;
      transition: color 0.1s;
    }
    .star.filled { color: #f5a623; }
  `],
})
export class StarPickerComponent {
  readonly maxStars = input<number>(5);
  readonly value = input<number>(0);
  readonly valueChange = output<number>();

  protected readonly hovered = signal(0);

  get stars(): number[] {
    return Array.from({ length: this.maxStars() }, (_, i) => i + 1);
  }

  select(star: number) {
    this.valueChange.emit(star);
  }
}
