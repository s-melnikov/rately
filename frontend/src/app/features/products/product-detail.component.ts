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
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <a routerLink="/products" class="brand">← Ratify</a>
          <nav class="header-nav">
            @if (auth.isLoggedIn()) {
              <span class="user-name">{{ auth.currentUser()?.username }}</span>
              <button class="btn btn-ghost" (click)="auth.logout()">Sign Out</button>
            } @else {
              <a routerLink="/login" class="btn btn-primary">Sign In</a>
            }
          </nav>
        </div>
      </header>

      <main class="content">
        @if (loadingProduct()) {
          <app-loading-spinner />
        } @else if (product(); as p) {
          <div class="product-header">
            <div class="product-info">
              <span class="category-badge">{{ p.category }}</span>
              <h1 class="product-title">{{ p.name }}</h1>
              <p class="product-desc">{{ p.description }}</p>
              <div class="rating-summary">
                <app-star-rating [rating]="p.avgRating" />
                <span class="rating-text">
                  @if (p.avgRating) {
                    {{ p.avgRating | number:'1.1-1' }} / 5
                  } @else {
                    No ratings yet
                  }
                </span>
                <span class="review-count">({{ p.reviewCount }} {{ p.reviewCount === 1 ? 'review' : 'reviews' }})</span>
              </div>
            </div>
            @if (p.imageUrl) {
              <img class="product-image" [src]="p.imageUrl" [alt]="p.name" />
            }
          </div>

          <!-- Write Review -->
          @if (auth.isLoggedIn()) {
            <section class="review-form-section">
              @if (userHasReviewed()) {
                <div class="already-reviewed">
                  <span class="already-reviewed-icon">✓</span>
                  <div>
                    <strong>You've already reviewed this product.</strong>
                    <p>You can edit or delete your review below.</p>
                  </div>
                </div>
              } @else {
                <h2>Write a Review</h2>
                @if (reviewSuccess()) {
                  <app-alert message="Review submitted successfully!" type="success" />
                }
                @if (reviewError()) {
                  <app-alert [message]="reviewError()!" type="error" />
                }
                <form (ngSubmit)="submitReview()" class="review-form">
                  <div class="form-group">
                    <label>Your Rating</label>
                    <app-star-picker [value]="reviewRating()" (valueChange)="reviewRating.set($event)" />
                  </div>
                  <div class="form-group">
                    <label for="rtitle">Review Title</label>
                    <input
                      id="rtitle"
                      type="text"
                      [value]="reviewTitle()"
                      (input)="reviewTitle.set($any($event.target).value)"
                      placeholder="Summarize your experience"
                      maxlength="100"
                    />
                  </div>
                  <div class="form-group">
                    <label for="rbody">Review</label>
                    <textarea
                      id="rbody"
                      [value]="reviewBody()"
                      (input)="reviewBody.set($any($event.target).value)"
                      placeholder="Share your detailed experience..."
                      rows="4"
                      maxlength="2000"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="submitting() || reviewRating() === 0"
                  >{{ submitting() ? 'Submitting...' : 'Submit Review' }}</button>
                </form>
              }
            </section>
          }

          <!-- Reviews List -->
          <section class="reviews-section">
            <div class="reviews-header">
              <h2>Reviews</h2>
              <select class="sort-select" [value]="sort()" (change)="changeSort($any($event.target).value)">
                <option value="newest">Newest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>

            @if (loadingReviews()) {
              <app-loading-spinner />
            } @else {
              <div class="reviews-list">
                @for (review of reviewsResult()?.items ?? []; track review.id) {
                  <div class="review-card">
                    <div class="review-header">
                      <div>
                        <app-star-rating [rating]="review.rating" />
                        <strong class="review-title">{{ review.title }}</strong>
                      </div>
                      <div class="review-meta">
                        <span class="reviewer">{{ review.username }}</span>
                        <span class="review-date">{{ review.createdAt | date:'mediumDate' }}</span>
                      </div>
                    </div>
                    <p class="review-body">{{ review.body }}</p>
                    @if (isOwnReview(review)) {
                      <div class="review-actions">
                        <button class="btn btn-sm btn-ghost" (click)="startEdit(review)">Edit</button>
                        <button class="btn btn-sm btn-danger" (click)="deleteReview(review.id, true)">Delete</button>
                      </div>
                    }

                    <!-- Inline Edit Form -->
                    @if (editingId() === review.id) {
                      <div class="edit-form">
                        <app-star-picker [value]="editRating()" (valueChange)="editRating.set($event)" />
                        <input type="text" [value]="editTitle()" (input)="editTitle.set($any($event.target).value)" placeholder="Title" />
                        <textarea [value]="editBody()" (input)="editBody.set($any($event.target).value)" rows="3" placeholder="Body"></textarea>
                        <div class="edit-actions">
                          <button class="btn btn-sm btn-primary" (click)="saveEdit(review.id)">Save</button>
                          <button class="btn btn-sm btn-ghost" (click)="cancelEdit()">Cancel</button>
                        </div>
                      </div>
                    }
                  </div>
                }
                @empty {
                  <p class="empty-state">No reviews yet. Be the first to review!</p>
                }
              </div>

              @if (reviewsResult(); as r) {
                <app-pagination
                  [currentPage]="r.page"
                  [totalPages]="r.totalPages"
                  (pageChange)="loadReviews($event)"
                />
              }
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f9fafb; }
    .page-header { background: white; border-bottom: 1px solid #e5e7eb; padding: 0 24px; }
    .header-content { max-width: 1200px; margin: 0 auto; height: 64px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 1.25rem; font-weight: 700; color: #4f46e5; text-decoration: none; }
    .header-nav { display: flex; align-items: center; gap: 12px; }
    .user-name { font-size: 0.875rem; color: #6b7280; }
    .content { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .product-header { display: flex; gap: 32px; background: white; padding: 32px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .product-info { flex: 1; }
    .category-badge { font-size: 0.75rem; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 10px; }
    .product-title { font-size: 1.75rem; font-weight: 700; margin: 8px 0; color: #111827; }
    .product-desc { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
    .rating-summary { display: flex; align-items: center; gap: 8px; }
    .rating-text { font-size: 1rem; font-weight: 600; color: #374151; }
    .review-count { font-size: 0.875rem; color: #6b7280; }
    .product-image { width: 200px; height: 200px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .review-form-section, .reviews-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 16px; color: #111827; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; color: #374151; }
    input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; box-sizing: border-box; outline: none; font-family: inherit; }
    input:focus, textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .reviews-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .sort-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; }
    .review-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .review-title { display: block; font-size: 1rem; color: #111827; margin-top: 4px; }
    .review-meta { text-align: right; }
    .reviewer { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; }
    .review-date { font-size: 0.8rem; color: #9ca3af; }
    .review-body { color: #4b5563; line-height: 1.6; margin: 8px 0; }
    .review-actions { display: flex; gap: 8px; margin-top: 8px; }
    .edit-form { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .edit-actions { display: flex; gap: 8px; }
    .empty-state { color: #6b7280; text-align: center; padding: 32px; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; display: inline-block; }
    .btn-sm { padding: 5px 12px; font-size: 0.8rem; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-ghost { background: transparent; color: #6b7280; border: 1px solid #e5e7eb; }
    .btn-ghost:hover { background: #f3f4f6; }
    .btn-danger { background: #fee2e2; color: #dc2626; }
    .btn-danger:hover { background: #fecaca; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .already-reviewed { display: flex; align-items: flex-start; gap: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; }
    .already-reviewed-icon { font-size: 1.25rem; color: #16a34a; flex-shrink: 0; margin-top: 2px; }
    .already-reviewed strong { color: #15803d; display: block; margin-bottom: 2px; }
    .already-reviewed p { color: #4b5563; font-size: 0.875rem; margin: 0; }
  `],
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
