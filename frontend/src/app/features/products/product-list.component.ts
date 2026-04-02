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
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
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
