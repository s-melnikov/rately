import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ProductsService, Product, PaginatedResult } from '../../core/services/products.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { AlertComponent } from '../../shared/components/alert.component';
import { AuthService } from '../../core/services/auth.service';

const CATEGORIES = ['All', 'Electronics', 'Books', 'Office'];

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, SlicePipe,
    PaginationComponent, LoadingSpinnerComponent, AlertComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <h1 class="brand">Ratify</h1>
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
        <div class="filters">
          <h2 class="section-title">Products</h2>
          <div class="category-tabs">
            @for (cat of categories; track cat) {
              <button
                class="tab"
                [class.active]="selectedCategory() === cat"
                (click)="selectCategory(cat)"
              >{{ cat }}</button>
            }
          </div>
        </div>

        @if (loading()) {
          <app-loading-spinner />
        } @else if (error()) {
          <app-alert [message]="error()!" type="error" />
        } @else {
          <div class="product-grid">
            @for (product of result()?.items ?? []; track product.id) {
              <a class="product-card" [routerLink]="['/products', product.id]">
                <div class="card-image">
                  @if (product.imageUrl) {
                    <img [src]="product.imageUrl" [alt]="product.name" loading="lazy" />
                  } @else {
                    <div class="image-placeholder">📦</div>
                  }
                </div>
                <div class="card-body">
                  <span class="category-badge">{{ product.category }}</span>
                  <h3 class="card-title">{{ product.name }}</h3>
                  <p class="card-desc">{{ product.description | slice:0:100 }}...</p>
                </div>
              </a>
            }
            @empty {
              <p class="empty-state">No products found in this category.</p>
            }
          </div>

          @if (result(); as r) {
            <app-pagination
              [currentPage]="r.page"
              [totalPages]="r.totalPages"
              (pageChange)="loadPage($event)"
            />
          }
        }
      </main>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f9fafb; }
    .page-header { background: white; border-bottom: 1px solid #e5e7eb; padding: 0 24px; }
    .header-content { max-width: 1200px; margin: 0 auto; height: 64px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 1.5rem; font-weight: 800; color: #4f46e5; margin: 0; }
    .header-nav { display: flex; align-items: center; gap: 12px; }
    .user-name { font-size: 0.875rem; color: #6b7280; }
    .content { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .filters { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .section-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: #111827; }
    .category-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { padding: 6px 14px; border: 1px solid #e5e7eb; background: white; border-radius: 20px; cursor: pointer; font-size: 0.875rem; }
    .tab.active { background: #4f46e5; color: white; border-color: #4f46e5; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .product-card { display: block; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); text-decoration: none; color: inherit; transition: transform 0.15s, box-shadow 0.15s; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .card-image { height: 180px; overflow: hidden; background: #f3f4f6; }
    .card-image img { width: 100%; height: 100%; object-fit: cover; }
    .image-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
    .card-body { padding: 16px; }
    .category-badge { font-size: 0.75rem; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 10px; }
    .card-title { font-size: 1rem; font-weight: 600; margin: 8px 0 6px; color: #111827; }
    .card-desc { font-size: 0.875rem; color: #6b7280; margin: 0; line-height: 1.5; }
    .empty-state { color: #6b7280; text-align: center; padding: 48px; grid-column: 1/-1; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; display: inline-block; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-ghost { background: transparent; color: #6b7280; }
    .btn-ghost:hover { background: #f3f4f6; }
  `],
})
export class ProductListComponent implements OnInit {
  protected readonly productsService = inject(ProductsService);
  protected readonly auth = inject(AuthService);

  protected readonly categories = CATEGORIES;
  protected readonly selectedCategory = signal('All');
  protected readonly currentPage = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<PaginatedResult<Product> | null>(null);

  ngOnInit() {
    this.load();
  }

  selectCategory(cat: string) {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
    this.load();
  }

  loadPage(page: number) {
    this.currentPage.set(page);
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.error.set(null);
    const cat = this.selectedCategory() === 'All' ? undefined : this.selectedCategory();

    this.productsService.getProducts(this.currentPage(), 9, cat).subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
