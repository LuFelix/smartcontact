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
        });
    }

    async validate(payload: any) {
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