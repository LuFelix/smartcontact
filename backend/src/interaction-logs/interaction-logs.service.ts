import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InteractionLog, InteractionType } from './entities/interaction-log.entity';
import { UserTagAccess } from 'src/tags/entities/user-tag-access.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

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
      const parsed = this.parseMetadata(metadata.ip, metadata.userAgent);
      parsedDevice = parsedDevice || parsed.device;
      parsedBrowser = parsedBrowser || parsed.browser;
    }

    const geo = this.getGeoData(metadata.ip);

    const log = this.interactionLogRepository.create({
      tagId,
      interactionType: InteractionType.VISIT,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType: parsedDevice,
      browser: parsedBrowser,
      country: geo.country,
      region: geo.region,
      city: geo.city,
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

      const parsed = this.parseMetadata(metadata.ip, metadata.userAgent);
      const geo = this.getGeoData(metadata.ip);

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
          country: geo.country,
          region: geo.region,
          city: geo.city,
          capturedByUserId: tag?.userId || null
      });
      return this.interactionLogRepository.save(log);
  }

  private parseMetadata(ip: string, uaString: string): { device: string; browser: string } {
    if (!uaString || uaString === 'unknown') {
      return { device: 'Desktop', browser: 'Outros' };
    }
    
    const parser = new UAParser(uaString);
    const browserName = parser.getBrowser().name || 'Outros';
    
    let deviceType = parser.getDevice().type;
    // ua-parser-js returns undefined for desktop usually, or 'mobile', 'tablet'
    if (!deviceType) {
      deviceType = 'Desktop';
    } else {
      deviceType = deviceType.charAt(0).toUpperCase() + deviceType.slice(1); // Mobile, Tablet
    }

    return { device: deviceType, browser: browserName };
  }

  private getGeoData(ip: string): { country: string | null; region: string | null; city: string | null } {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return { country: null, region: null, city: null };
    }
    const geo = geoip.lookup(ip);
    if (geo) {
      return {
        country: geo.country || null,
        region: geo.region || null,
        city: geo.city || null,
      };
    }
    return { country: null, region: null, city: null };
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
