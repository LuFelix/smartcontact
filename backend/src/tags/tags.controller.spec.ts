import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('TagsController', () => {
  let controller: TagsController;

  const mockTagsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findMyDelegated: vi.fn(),
    remove: vi.fn(),
    getDelegations: vi.fn(),
    grantAccess: vi.fn(),
    revokeAccess: vi.fn(),
    update: vi.fn(),
    resolveTag: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('RBAC / ABAC Restrictions', () => {
    it('should have Roles decorator with "administrador" and "owner" on the create method', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.create);
      expect(roles).toEqual(['administrador', 'owner']);
    });
  });
});
