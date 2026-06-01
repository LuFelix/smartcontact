import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InteractionLog, InteractionType } from './entities/interaction-log.entity';
import { UserTagAccess } from 'src/tags/entities/user-tag-access.entity';
import { Tag } from 'src/tags/entities/tag.entity';

@Injectable()
export class InteractionLogsService {
  constructor(
    @InjectRepository(InteractionLog)
    private readonly interactionLogRepository: Repository<InteractionLog>,
    @InjectRepository(UserTagAccess)
    private readonly accessRepository: Repository<UserTagAccess>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
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
      // Buscar o dono da tag para registrar quem capturou o lead
      const tag = await this.tagRepository.findOne({ 
          where: { id: tagId },
          select: ['userId'] 
      });

      const log = this.interactionLogRepository.create({
          tagId,
          interactionType: InteractionType.LEAD,
          leadName: leadData.name,
          leadEmail: leadData.email,
          leadPhone: leadData.phone,
          leadNote: leadData.note,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent,
          capturedByUserId: tag?.userId || null
      });
      return this.interactionLogRepository.save(log);
  }

  /**
   * Retorna os leads considerando o controle de acesso ABAC.
   * - Admins vêem tudo do tenant.
   * - Outros (Tutores/Colaboradores) vêem leads das tags que criaram ou que foram delegadas.
   */
  async findLeadsByOwner(currentUser: any): Promise<InteractionLog[]> {
      const { sub: userId, tenantId, role, isSuperAdmin } = currentUser;

      // 1. Super Admin vê tudo
      if (isSuperAdmin) {
          return this.interactionLogRepository.find({
              where: { interactionType: InteractionType.LEAD },
              relations: ['tag', 'tag.user', 'capturedByUser', 'capturedByUser.profile'],
              order: { accessedAt: 'DESC' }
          });
      }

      // 2. Admin do Tenant vê todos os leads do seu tenant
      if (role === 'administrador') {
          return this.interactionLogRepository.find({
              where: { 
                  interactionType: InteractionType.LEAD,
                  tag: { tenantId } 
              },
              relations: ['tag', 'tag.user', 'capturedByUser', 'capturedByUser.profile'],
              order: { accessedAt: 'DESC' }
          });
      }

      // 3. Outros (Tutor/Colaborador): Visão restrita (ABAC)
      // Membros só vêem os leads que ELES mesmos capturaram ou de tags que eles possuem (ownerId)
      return this.interactionLogRepository.find({
          where: [
              { 
                  interactionType: InteractionType.LEAD,
                  capturedByUserId: userId
              },
              { 
                  interactionType: InteractionType.LEAD,
                  tag: { ownerId: userId } 
              }
          ],
          relations: ['tag', 'tag.user', 'capturedByUser', 'capturedByUser.profile'],
          order: { accessedAt: 'DESC' }
      });
  }
}
