// auth/strategies/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET')!;
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        // Pega o tenantId do header se existir, caso contrário mantém o do token
        const headerTenantId = req.headers['x-tenant-id'];
        
        if (headerTenantId) {
            console.log(`[JwtStrategy] Tenant detectado no Header: ${headerTenantId}`);
        }

        return { 
            sub: payload.sub, 
            name: payload.name, 
            username: payload.username,
            role: payload.role,
            tenantId: headerTenantId || payload.tenantId,
            ownerId: payload.ownerId,
            isSuperAdmin: payload.isSuperAdmin,
            picture: payload.picture
        };
    }
}