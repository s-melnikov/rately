import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Pagination">
        <button
          class="page-btn"
          [disabled]="currentPage() === 1"
          (click)="pageChange.emit(currentPage() - 1)"
        >&#8592; Prev</button>

        @for (page of pages(); track page) {
          <button
            class="page-btn"
            [class.active]="page === currentPage()"
            (click)="pageChange.emit(page)"
          >{{ page }}</button>
        }

        <button
          class="page-btn"
          [disabled]="currentPage() === totalPages()"
          (click)="pageChange.emit(currentPage() + 1)"
        >Next &#8594;</button>
      </nav>
    }
  `,
  styles: [`
    .pagination { display: flex; gap: 6px; align-items: center; justify-content: center; margin: 16px 0; }
    .page-btn {
      padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer;
      border-radius: 4px; font-size: 0.875rem;
    }
    .page-btn:disabled { opacity: 0.4; cursor: default; }
    .page-btn.active { background: #4f46e5; color: white; border-color: #4f46e5; }
    .page-btn:not(:disabled):hover:not(.active) { background: #f3f4f6; }
  `],
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    // Show at most 5 pages centered around current
    const delta = 2;
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}
