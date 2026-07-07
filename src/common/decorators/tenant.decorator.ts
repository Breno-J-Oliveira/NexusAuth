import { SetMetadata } from '@nestjs/common';

export const TENANT_KEY = 'tenant';
export const Tenant = () => SetMetadata(TENANT_KEY, true);
