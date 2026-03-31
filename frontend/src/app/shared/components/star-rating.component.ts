import { Component, input } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [],
  template: `
    <span class="star-rating" [attr.aria-label]="rating() + ' out of ' + maxStars() + ' stars'">
      @for (star of stars; track star) {
        <span class="star" [class.filled]="star <= (rating() ?? 0)">★</span>
      }
    </span>
  `,
  styles: [`
    .star-rating { display: inline-flex; gap: 2px; }
    .star { color: #ddd; font-size: 1.2rem; }
    .star.filled { color: #f5a623; }
  `],
})
export class StarRatingComponent {
  readonly rating = input<number | null>(null);
  readonly maxStars = input<number>(5);

  get stars(): number[] {
    return Array.from({ length: this.maxStars() }, (_, i) => i + 1);
  }
}
