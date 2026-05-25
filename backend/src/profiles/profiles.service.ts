import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(data: { 
    userId: string, 
    ownerId: string, 
    tenantId: string, 
    profilePictureUrl?: string 
  }): Promise<Profile> {
    const profile = this.profileRepository.create({
      userId: data.userId,
      ownerId: data.ownerId,
      tenantId: data.tenantId,
      profilePictureUrl: data.profilePictureUrl || null,
      theme: 'light',
      socialLinks: []
    });
    return this.profileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  async update(userId: string, data: Partial<Profile>): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    Object.assign(profile, data);
    return this.profileRepository.save(profile);
  }
}
