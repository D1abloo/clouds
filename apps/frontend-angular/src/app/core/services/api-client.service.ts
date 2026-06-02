import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = environment.apiUrl

  get<T>(path: string, params?: Record<string, string | undefined>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, {
      params: this.buildParams(params),
    })
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body ?? {})
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${path}`, body ?? {})
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${path}`, body ?? {})
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${path}`)
  }

  private buildParams(
    params?: Record<string, string | undefined>,
  ): HttpParams | undefined {
    if (!params) return undefined
    let httpParams = new HttpParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, value)
      }
    })
    return httpParams.keys().length ? httpParams : undefined
  }
}
