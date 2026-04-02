import { Component, input } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  readonly rating = input<number | null>(null);
  readonly maxStars = input<number>(5);

  get stars(): number[] {
    return Array.from({ length: this.maxStars() }, (_, i) => i + 1);
  }
}
