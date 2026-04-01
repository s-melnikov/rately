import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { PaginatedResult } from './products.service';

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  username: string;
  email: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  rating: number;
  title?: string;
  body?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  body?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getReviews(productId: string, page = 1, limit = 10, sort: 'newest' | 'highest' | 'lowest' = 'newest') {
    const params = new HttpParams().set('page', page).set('limit', limit).set('sort', sort);
    return this.http.get<PaginatedResult<Review>>(
      `${this.base}/products/${productId}/reviews`,
      { params },
    );
  }

  createReview(productId: string, dto: CreateReviewDto) {
    return this.http.post<Review>(`${this.base}/products/${productId}/reviews`, dto);
  }

  updateReview(id: string, dto: UpdateReviewDto) {
    return this.http.patch<Review>(`${this.base}/reviews/${id}`, dto);
  }

  deleteReview(id: string) {
    return this.http.delete<void>(`${this.base}/reviews/${id}`);
  }
}
