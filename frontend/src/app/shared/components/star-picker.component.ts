import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-picker',
  standalone: true,
  templateUrl: './star-picker.component.html',
  styleUrl: './star-picker.component.scss',
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
