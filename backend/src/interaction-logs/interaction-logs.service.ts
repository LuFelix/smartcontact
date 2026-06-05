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

      console.log(`[InteractionLogsService] Buscando leads. Tenant Context: ${tenantId}. User: ${userId}`);

      const queryBuilder = this.interactionLogRepository.createQueryBuilder('log')
          .leftJoinAndSelect('log.tag', 'tag')
          .leftJoinAndSelect('tag.user', 'tagUser')
          .leftJoinAndSelect('log.capturedByUser', 'capturedByUser')
          .leftJoinAndSelect('capturedByUser.profile', 'capturedProfile')
          .where('log.interaction_type = :type', { type: InteractionType.LEAD })
          .orderBy('log.accessedAt', 'DESC');

      // 1. Super Admin vê tudo (Global)
      if (isSuperAdmin) {
          return queryBuilder.getMany();
      }

      // 2. Filtro obrigatório de Tenant para todos os outros casos
      if (!tenantId) {
          return []; // Sem tenant no contexto, não retorna nada por segurança
      }

      queryBuilder.andWhere('tag.tenantId = :tId', { tId: tenantId });

      // 3. Se for Admin do Tenant, vê tudo do tenant (já filtrado acima)
      if (role === 'administrador') {
          return queryBuilder.getMany();
      }

      // 4. Outros (Tutor/Colaborador): Visão restrita ABAC dentro do tenant
      queryBuilder.andWhere(qb => {
          return '(log.capturedByUserId = :userId OR tag.ownerId = :userId)';
      }, { userId });

      return queryBuilder.getMany();
  }
}
