import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionLog } from './entities/interaction-log.entity';

@Injectable()
export class InteractionLogsService {
  constructor(
    @InjectRepository(InteractionLog)
    private readonly interactionLogRepository: Repository<InteractionLog>,
  ) {}
}
