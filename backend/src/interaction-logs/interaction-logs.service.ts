import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionLog, InteractionType } from './entities/interaction-log.entity';

@Injectable()
export class InteractionLogsService {
  constructor(
    @InjectRepository(InteractionLog)
    private readonly interactionLogRepository: Repository<InteractionLog>,
  ) {}

  /**
   * Registra uma visita simples a uma tag
   */
  async logVisit(tagId: string, metadata: { ip: string, userAgent: string, device?: string, browser?: string }) {
    const log = this.interactionLogRepository.create({
      tagId,
      interactionType: InteractionType.VISIT,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType: metadata.device,
      browser: metadata.browser,
    });
    return this.interactionLogRepository.save(log);
  }

  /**
   * Captura um lead (nome/email/telefone) vindo do perfil público
   */
  async captureLead(tagId: string, leadData: { name: string, email: string, phone?: string, note?: string }, metadata: any) {
      const log = this.interactionLogRepository.create({
          tagId,
          interactionType: InteractionType.LEAD,
          leadName: leadData.name,
          leadEmail: leadData.email,
          leadPhone: leadData.phone,
          leadNote: leadData.note,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent,
      });
      return this.interactionLogRepository.save(log);
  }

  /**
   * Retorna os leads de um usuário específico (dono das tags)
   */
  async findLeadsByOwner(userId: string): Promise<InteractionLog[]> {
      return this.interactionLogRepository.find({
          where: { 
              interactionType: InteractionType.LEAD,
              tag: { user: { id: userId } }
          },
          relations: ['tag'],
          order: { accessedAt: 'DESC' }
      });
  }
}
