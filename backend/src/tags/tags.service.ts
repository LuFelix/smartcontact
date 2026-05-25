import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag, RedirectMode } from './entities/tag.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async createDefaultTag(userId: string, ownerId: string, tenantId: string): Promise<Tag> {
      const tag = this.tagRepository.create({
          uuid: uuidv4(),
          userId,
          ownerId,
          tenantId,
          redirectMode: RedirectMode.PROFILE,
          isActive: true
      });
      return this.tagRepository.save(tag);
  }

  async resolveTag(uuid: string) {
    const tag = await this.tagRepository.findOne({
      where: { uuid, isActive: true },
      relations: [
        'user',
        'user.profile',
        'user.phones',
        'user.addresses',
        'user.secondaryEmails',
        'user.links',
      ],
    });

    if (!tag) return null;

    // Filter sensitive data
    const { user } = tag;
    const publicUser = {
      name: user.name,
      email: user.email,
      profile: user.profile,
      phones: user.phones,
      addresses: user.addresses,
      secondaryEmails: user.secondaryEmails,
      links: user.links,
    };

    return {
      redirectMode: tag.redirectMode,
      customUrl: tag.customUrl,
      user: publicUser,
    };
  }
}
