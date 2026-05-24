import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

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
