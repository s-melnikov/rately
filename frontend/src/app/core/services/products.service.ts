import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  avgRating: number | null;
  reviewCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  getProducts(page = 1, limit = 10, category?: string) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (category) params = params.set('category', category);
    return this.http.get<PaginatedResult<Product>>(this.base, { params });
  }

  getProduct(id: string) {
    return this.http.get<ProductDetail>(`${this.base}/${id}`);
  }
}
