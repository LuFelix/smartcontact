import { TestBed } from '@angular/core/testing';
import { TagService, TagResolutionResponse } from './tag.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Tag } from '../../features/shared/models/users.models';
import { firstValueFrom } from 'rxjs';

describe('TagService', () => {
  let service: TagService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TagService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(TagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('resolveTag', () => {
    it('should call resolve tag endpoint with source if provided', async () => {
      const mockResponse = { id: 'tag-1', redirectMode: 'profile' } as TagResolutionResponse;
      const promise = firstValueFrom(service.resolveTag('uuid-123', 'nfc'));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/resolve/uuid-123?source=nfc');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const res = await promise;
      expect(res).toEqual(mockResponse);
    });

    it('should call resolve tag endpoint without source if not provided', async () => {
      const mockResponse = { id: 'tag-1', redirectMode: 'profile' } as TagResolutionResponse;
      const promise = firstValueFrom(service.resolveTag('uuid-123'));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/resolve/uuid-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const res = await promise;
      expect(res).toEqual(mockResponse);
    });
  });

  describe('CRUD operations', () => {
    it('should find all tags', async () => {
      const mockTags: Tag[] = [{ id: 'tag-1', uid: 'uid-1' } as Tag];
      const promise = firstValueFrom(service.findAll());

      const req = httpMock.expectOne('http://localhost:3000/api/tags');
      expect(req.request.method).toBe('GET');
      req.flush(mockTags);

      const res = await promise;
      expect(res).toEqual(mockTags);
    });

    it('should get my delegated tags', async () => {
      const mockTags: Tag[] = [{ id: 'tag-2', uid: 'uid-2' } as Tag];
      const promise = firstValueFrom(service.getMyDelegated());

      const req = httpMock.expectOne('http://localhost:3000/api/tags/my-delegated');
      expect(req.request.method).toBe('GET');
      req.flush(mockTags);

      const res = await promise;
      expect(res).toEqual(mockTags);
    });

    it('should create a tag', async () => {
      const tagData: Partial<Tag> = { uid: 'uid-new', name: 'New Tag' };
      const createdTag: Tag = { id: 'tag-new', ...tagData } as Tag;
      const promise = firstValueFrom(service.create(tagData));

      const req = httpMock.expectOne('http://localhost:3000/api/tags');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(tagData);
      req.flush(createdTag);

      const res = await promise;
      expect(res).toEqual(createdTag);
    });

    it('should update a tag', async () => {
      const tagData: Partial<Tag> = { name: 'Updated Tag' };
      const updatedTag: Tag = { id: 'tag-1', name: 'Updated Tag' } as Tag;
      const promise = firstValueFrom(service.update('tag-1', tagData));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/tag-1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(tagData);
      req.flush(updatedTag);

      const res = await promise;
      expect(res).toEqual(updatedTag);
    });

    it('should delete a tag', async () => {
      const promise = firstValueFrom(service.delete('tag-1'));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/tag-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      const res = await promise;
      expect(res).toBeNull();
    });
  });

  describe('access delegation', () => {
    it('should grant access to user', async () => {
      const promise = firstValueFrom(service.grantAccess('tag-1', 'user-123'));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/tag-1/grant/user-123');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });

      const res = await promise;
      expect(res).toEqual({ success: true });
    });

    it('should revoke access from user', async () => {
      const promise = firstValueFrom(service.revokeAccess('tag-1', 'user-123'));

      const req = httpMock.expectOne('http://localhost:3000/api/tags/tag-1/revoke/user-123');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });

      const res = await promise;
      expect(res).toEqual({ success: true });
    });
  });
});
