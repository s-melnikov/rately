import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsService, ProductDetail } from '../../core/services/products.service';
import { ReviewsService, Review } from '../../core/services/reviews.service';
import type { PaginatedResult as PRType } from '../../core/services/products.service';
import { AuthService } from '../../core/services/auth.service';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { StarPickerComponent } from '../../shared/components/star-picker.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { AlertComponent } from '../../shared/components/alert.component';
import { DatePipe, DecimalPipe } from '@angular/common';

type SortOption = 'newest' | 'highest' | 'lowest';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe, DecimalPipe,
    StarRatingComponent, StarPickerComponent, PaginationComponent,
    LoadingSpinnerComponent, AlertComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly reviewsService = inject(ReviewsService);
  protected readonly auth = inject(AuthService);

  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly loadingProduct = signal(false);
  protected readonly reviewsResult = signal<PRType<Review> | null>(null);
  protected readonly loadingReviews = signal(false);
  protected readonly sort = signal<SortOption>('newest');
  protected readonly currentReviewsPage = signal(1);

  // Review form
  protected readonly reviewRating = signal(0);
  protected readonly reviewTitle = signal('');
  protected readonly reviewBody = signal('');
  protected readonly submitting = signal(false);
  protected readonly reviewSuccess = signal(false);
  protected readonly reviewError = signal<string | null>(null);

  // Whether the current user already has a review for this product
  protected readonly userHasReviewed = signal(false);

  // Edit state
  protected readonly editingId = signal<string | null>(null);
  protected readonly editRating = signal(0);
  protected readonly editTitle = signal('');
  protected readonly editBody = signal('');

  private get productId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit() {
    this.loadProduct();
    this.loadReviews(1);
  }

  private loadProduct() {
    this.loadingProduct.set(true);
    this.productsService.getProduct(this.productId).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loadingProduct.set(false);
      },
      error: () => this.loadingProduct.set(false),
    });
  }

  loadReviews(page: number) {
    this.currentReviewsPage.set(page);
    this.loadingReviews.set(true);
    this.reviewsService.getReviews(this.productId, page, 10, this.sort()).subscribe({
      next: (data) => {
        this.reviewsResult.set(data);
        this.loadingReviews.set(false);
        const email = this.auth.currentUser()?.email;
        if (email && data.items.some(r => r.email === email)) {
          this.userHasReviewed.set(true);
        }
      },
      error: () => this.loadingReviews.set(false),
    });
  }

  changeSort(sort: SortOption) {
    this.sort.set(sort);
    this.loadReviews(1);
  }

  submitReview() {
    if (this.reviewRating() === 0) return;
    this.submitting.set(true);
    this.reviewError.set(null);

    this.reviewsService.createReview(this.productId, {
      rating: this.reviewRating(),
      title: this.reviewTitle() || undefined,
      body: this.reviewBody() || undefined,
    }).subscribe({
      next: () => {
        this.reviewSuccess.set(true);
        this.userHasReviewed.set(true);
        this.reviewRating.set(0);
        this.reviewTitle.set('');
        this.reviewBody.set('');
        this.submitting.set(false);
        // Reload product (to refresh avgRating) and reviews
        this.loadProduct();
        this.loadReviews(1);
        setTimeout(() => this.reviewSuccess.set(false), 3000);
      },
      error: () => {
        this.reviewError.set('Failed to submit review. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  isOwnReview(review: Review): boolean {
    return this.auth.currentUser()?.email === review.email;
  }

  startEdit(review: Review) {
    this.editingId.set(review.id);
    this.editRating.set(review.rating);
    this.editTitle.set(review.title ?? '');
    this.editBody.set(review.body ?? '');
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(id: string) {
    this.reviewsService.updateReview(id, {
      rating: this.editRating(),
      title: this.editTitle() || undefined,
      body: this.editBody() || undefined,
    }).subscribe({
      next: () => {
        this.editingId.set(null);
        this.loadProduct();
        this.loadReviews(this.currentReviewsPage());
      },
    });
  }

  deleteReview(id: string, own: boolean) {
    if (!confirm('Delete this review?')) return;
    this.reviewsService.deleteReview(id).subscribe({
      next: () => {
        if (own) this.userHasReviewed.set(false);
        this.loadProduct();
        this.loadReviews(this.currentReviewsPage());
      },
    });
  }
}
