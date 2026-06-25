// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { MembershipsService } from "src/memberships/memberships.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly membershipsService: MembershipsService
    ) {
        const secret = configService.get<string>('JWT_SECRET')!;
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        // 1. Identificar o Tenant Ativo (Prioridade para o Header)
        const headerTenantId = req.headers['x-tenant-id'];
        const tenantId = headerTenantId || payload.tenantId;

        console.log(`[JwtStrategy] Validando req: ${req.url}. Header Tenant: ${headerTenantId}. Payload Tenant: ${payload.tenantId}`);

        // 2. Se for Super Admin, ele ignora as travas de role por tenant
        if (payload.isSuperAdmin) {
            console.log(`[JwtStrategy] Usuário é SuperAdmin: ${payload.sub}`);
            return { 
                sub: payload.sub, 
                name: payload.name, 
                username: payload.username,
                role: payload.role, // Mantém a role do token (admin)
                tenantId: tenantId,
                ownerId: payload.ownerId,
                isSuperAdmin: true,
                picture: payload.picture
            };
        }

        // 3. Para usuários normais, buscamos o cargo REAL dele NESTE workspace
        if (tenantId) {
            const membership = await this.membershipsService.findByUserAndTenant(payload.sub, tenantId);
            
            if (!membership) {
                // Self-ownership bypass: usuário sempre pode acessar o próprio perfil
                // mesmo sem vínculo com o tenant ativo (ex: foi removido de uma organização)
                const isOwnProfile = req.url?.includes(`/users/${payload.sub}`);
                if (isOwnProfile) {
                    console.log(`[JwtStrategy] Auto-acesso ao próprio perfil: ${payload.sub}. Usando tenant do payload.`);
                    return {
                        sub: payload.sub,
                        name: payload.name,
                        username: payload.username,
                        role: payload.role,
                        tenantId: payload.tenantId,
                        ownerId: payload.ownerId,
                        isSuperAdmin: false,
                        picture: payload.picture
                    };
                }
                console.warn(`[JwtStrategy] Acesso negado: Usuário ${payload.sub} sem vínculo com tenant ${tenantId}`);
                throw new UnauthorizedException('Você não tem acesso a este Workspace.');
            }

            console.log(`[JwtStrategy] Usuário ${payload.sub} no Tenant ${tenantId} resolvido como: ${membership.role?.name}`);

            return { 
                sub: payload.sub, 
                name: payload.name, 
                username: payload.username,
                role: membership.role?.name || 'usuario', // Cargo dinâmico!
                tenantId: tenantId,
                ownerId: payload.ownerId,
                isSuperAdmin: false,
                picture: payload.picture
            };
        }

        return { 
            sub: payload.sub, 
            name: payload.name, 
            username: payload.username,
            role: payload.role,
            tenantId: payload.tenantId,
            ownerId: payload.ownerId,
            isSuperAdmin: payload.isSuperAdmin,
            picture: payload.picture
        };
    }
}
