import { SetMetadata } from '@nestjs/common';

export const LIMITS_KEY = 'limits';

export interface LimitsOptions {
  resource: 'members' | 'tags' | 'leads';
  amount?: number;
}

export const Limits = (options: LimitsOptions) => SetMetadata(LIMITS_KEY, options);