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
    let parsedDevice = metadata.device;
    let parsedBrowser = metadata.browser;

    if (!parsedDevice || !parsedBrowser) {
      const parsed = this.parseUA(metadata.userAgent);
      parsedDevice = parsedDevice || parsed.device;
      parsedBrowser = parsedBrowser || parsed.browser;
    }

    const log = this.interactionLogRepository.create({
      tagId,
      interactionType: InteractionType.VISIT,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType: parsedDevice,
      browser: parsedBrowser,
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

      const parsed = this.parseUA(metadata.userAgent);

      const log = this.interactionLogRepository.create({
          tagId,
          interactionType: InteractionType.LEAD,
          leadName: leadData.name,
          leadEmail: leadData.email,
          leadPhone: leadData.phone,
          leadNote: leadData.note,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent,
          deviceType: parsed.device,
          browser: parsed.browser,
          capturedByUserId: tag?.userId || null
      });
      return this.interactionLogRepository.save(log);
  }

  private parseUA(ua: string): { device: string; browser: string } {
    if (!ua || ua === 'unknown') {
      return { device: 'Desktop', browser: 'Outros' };
    }
    const uaLower = ua.toLowerCase();
    
    // Device detection
    let device = 'Desktop';
    if (uaLower.includes('mobi') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipad')) {
      device = 'Mobile';
    }

    // Browser detection
    let browser = 'Chrome';
    if (uaLower.includes('edg/')) {
      browser = 'Edge';
    } else if (uaLower.includes('firefox') || uaLower.includes('fxios')) {
      browser = 'Firefox';
    } else if (uaLower.includes('chrome') || uaLower.includes('crios')) {
      browser = 'Chrome';
    } else if (uaLower.includes('safari') && !uaLower.includes('android')) {
      browser = 'Safari';
    } else {
      browser = 'Outros';
    }

    return { device, browser };
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
