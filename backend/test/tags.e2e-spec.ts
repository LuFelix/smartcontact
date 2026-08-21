import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { TagsController } from './../src/tags/tags.controller';
import { TagsService } from './../src/tags/tags.service';

describe('TagsController (e2e)', () => {
  let app: INestApplication;

  const mockTagsService = {
    resolveTag: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        { provide: TagsService, useValue: mockTagsService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('GET /tags/resolve/:identifier', () => {
    it('should return tag data and public user info if resolution succeeds', async () => {
      const mockResult = {
        id: 'tag-123',
        handle: 'johndoe',
        redirectMode: 'profile',
        user: { name: 'John Doe', email: 'john@email.com' },
      };
      mockTagsService.resolveTag.mockResolvedValueOnce(mockResult);

      const response = await request(app.getHttpServer())
        .get('/tags/resolve/uuid-abc')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockTagsService.resolveTag).toHaveBeenCalledWith(
        'uuid-abc',
        undefined,
        expect.objectContaining({ ip: expect.any(String), userAgent: expect.any(String) })
      );
    });

    it('should return 404 if tag is not found', async () => {
      mockTagsService.resolveTag.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/tags/resolve/invalid-uuid')
        .expect(404);
    });
  });
});
