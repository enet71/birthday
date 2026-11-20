import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BirthdayDto,
  CreateInviteSubmissionRequest,
  InviteLinkDto,
  InviteLinkResponse,
  InviteSubmissionDto,
  PublicInviteDto,
  SaveInviteLinkRequest,
} from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';

// Invite links through the API: the owner's link and submissions, and the guest side of a link.
@Injectable({ providedIn: 'root' })
export class InvitesApiService extends ApiService {
  private readonly url = `${this.baseUrl}/invites`;

  // Emits `null` until the user creates a link.
  public getLink(): Observable<InviteLinkDto | null> {
    return this.httpClient.get<InviteLinkResponse>(`${this.url}/link`).pipe(map((response: InviteLinkResponse) => response.link));
  }

  public saveLink(request: SaveInviteLinkRequest): Observable<InviteLinkDto> {
    return this.httpClient.put<InviteLinkDto>(`${this.url}/link`, request);
  }

  // The old link stops working.
  public reissueLink(): Observable<InviteLinkDto> {
    return this.httpClient.post<InviteLinkDto>(`${this.url}/link/token`, null);
  }

  public getSubmissions(): Observable<InviteSubmissionDto[]> {
    return this.httpClient.get<InviteSubmissionDto[]>(`${this.url}/submissions`);
  }

  // Emits the birthday the submission became.
  public approveSubmission(id: string): Observable<BirthdayDto> {
    return this.httpClient.post<BirthdayDto>(`${this.url}/submissions/${id}/approve`, null);
  }

  public rejectSubmission(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.url}/submissions/${id}`);
  }

  // Fails with 404 for a disabled, reissued, or unknown link.
  public getPublicInvite(token: string): Observable<PublicInviteDto> {
    return this.httpClient.get<PublicInviteDto>(`${this.url}/public/${encodeURIComponent(token)}`);
  }

  // Fails with 409 when the owner has too many pending submissions and with 429 when this device sends too many.
  public submit(token: string, request: CreateInviteSubmissionRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.url}/public/${encodeURIComponent(token)}/submissions`, request);
  }
}
