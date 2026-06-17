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
  async logVisit(tagId: string, metadata: { ip: string; userAgent: string; source?: string; tenantId?: string; device?: string; browser?: string }) {
    const log = this.interactionLogRepository.create({
      tagId,
      interactionType: InteractionType.VISIT,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType: metadata.device,
      browser: metadata.browser,
      source: metadata.source || null,
      tenantId: metadata.tenantId || null,
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

      console.log(`[InteractionLogsService] Buscando leads. Tenant Context: ${tenantId}. User: ${userId}. SuperAdmin: ${isSuperAdmin}`);

      const queryBuilder = this.interactionLogRepository.createQueryBuilder('log')
          .leftJoinAndSelect('log.tag', 'tag')
          .leftJoinAndSelect('tag.user', 'tagUser')
          .leftJoinAndSelect('log.capturedByUser', 'capturedByUser')
          .leftJoinAndSelect('capturedByUser.profiles', 'capturedProfile', 'capturedProfile.tenantId = :tenantId', { tenantId })
          .where('log.interaction_type = :type', { type: InteractionType.LEAD })
          .orderBy('log.accessedAt', 'DESC');

      // 1. Filtro OBRIGATÓRIO de Tenant (Contexto)
      // Mesmo para SuperAdmin, a interface deve respeitar o workspace selecionado no Header.
      if (tenantId) {
          queryBuilder.andWhere('tag.tenantId = :tId', { tId: tenantId });
      } else if (!isSuperAdmin) {
          // Se não tem tenant E não é SuperAdmin, bloqueia por segurança
          return [];
      }

      // 2. Filtro de Segurança ABAC (Se não for Admin do Tenant nem SuperAdmin)
      if (!isSuperAdmin && role !== 'administrador') {
          queryBuilder.andWhere(qb => {
              return '(log.capturedByUserId = :userId OR tag.ownerId = :userId)';
          }, { userId });
      }

      return queryBuilder.getMany();
  }
}
