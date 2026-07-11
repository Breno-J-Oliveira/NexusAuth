import * as dns from 'dns';
import * as net from 'net';
import { BadRequestException, Logger } from '@nestjs/common';

const logger = new Logger('SSRFGuard');

const BLOCKED_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '0.0.0.0/8',
  '100.64.0.0/10',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];

// SECURITY: Block metadata service endpoints (cloud provider attack vector)
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata
  'metadata.azure.com',
  '100.100.100.200', // Alibaba metadata
];

// SECURITY: Block dangerous protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// SECURITY: Maximum URL length to prevent DoS
const MAX_URL_LENGTH = 2048;

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (net.isIPv4(ip) && net.isIPv4(range)) {
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    const maskInt = mask === 32 ? 0xffffffff : (0xffffffff << (32 - mask)) >>> 0;
    return (ipInt & maskInt) === (rangeInt & maskInt);
  }

  if (net.isIPv6(ip) && net.isIPv6(range)) {
    const ipBig = BigInt(`0x${ipToHex(ip)}`);
    const rangeBig = BigInt(`0x${ipToHex(range)}`);
    const maskBig = mask === 128
      ? (BigInt(1) << BigInt(128)) - BigInt(1)
      : ((BigInt(1) << BigInt(128)) - BigInt(1)) ^ ((BigInt(1) << BigInt(128 - mask)) - BigInt(1));
    return (ipBig & maskBig) === (rangeBig & maskBig);
  }

  return false;
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipToHex(ip: string): string {
  return ip.split(':').map((h) => h.padStart(4, '0')).join('').padEnd(32, '0');
}

function isBlockedIp(ip: string): boolean {
  // M4 fix: normalize IPv6 addresses by removing brackets (Node URL returns [::1] format)
  const normalizedIp = ip.replace(/^\[|\]$/g, '');

  // V8 fix: normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) to IPv4
  const mappedMatch = normalizedIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) {
    return isBlockedIp(mappedMatch[1]);
  }
  if (normalizedIp === 'localhost' || normalizedIp === '::1') return true;
  return BLOCKED_RANGES.some((cidr) => ipInCidr(normalizedIp, cidr));
}

export async function validateWebhookUrl(urlStr: string): Promise<string> {
  // SECURITY: Validate URL length
  if (!urlStr || urlStr.length > MAX_URL_LENGTH) {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL is too long or empty',
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Invalid webhook URL format',
    });
  }

  // SECURITY: Protocol validation
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    logger.warn(`Blocked webhook with dangerous protocol: ${parsed.protocol}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must use HTTP or HTTPS',
    });
  }

  const hostname = parsed.hostname.toLowerCase();

  // SECURITY: Block known metadata service hostnames
  if (BLOCKED_HOSTNAMES.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
    logger.warn(`Blocked webhook to metadata service: ${hostname}`);
    throw new BadRequestException({
      code: 'SSRF_BLOCKED',
      message: 'Webhook URL points to a blocked metadata service',
    });
  }

  // SECURITY: Block URLs with credentials
  if (parsed.username || parsed.password) {
    logger.warn(`Blocked webhook with embedded credentials`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must not contain credentials',
    });
  }

  // SECURITY: Block URLs with non-standard ports (except 80, 443, 8080, 8443)
  const port = parsed.port ? parseInt(parsed.port, 10) : null;
  if (port && ![80, 443, 8080, 8443].includes(port)) {
    logger.warn(`Blocked webhook with non-standard port: ${port}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must use standard ports (80, 443, 8080, 8443)',
    });
  }

  if (isBlockedIp(hostname)) {
    logger.warn(`Blocked webhook to private IP: ${hostname}`);
    throw new BadRequestException({
      code: 'SSRF_BLOCKED',
      message: 'Webhook URL resolves to a blocked private/loopback address',
    });
  }

  let resolvedIp: string;
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    
    // SECURITY: Ensure at least one address resolved
    if (!addresses || addresses.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK_URL',
        message: 'Could not resolve webhook hostname',
      });
    }
    
    for (const addr of addresses) {
      if (isBlockedIp(addr.address)) {
        logger.warn(`Blocked webhook resolving to private IP: ${addr.address}`);
        throw new BadRequestException({
          code: 'SSRF_BLOCKED',
          message: `Webhook URL resolves to a blocked private/loopback address (${addr.address})`,
        });
      }
    }
    // A5 fix: return the first resolved IP to pin it and prevent DNS rebinding
    resolvedIp = addresses[0].address;
  } catch (err: any) {
    if (err instanceof BadRequestException) throw err;
    logger.warn(`DNS resolution failed for webhook: ${hostname}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: `Could not resolve webhook hostname`,
    });
  }

  // A5 fix: rewrite URL to use the resolved IP, preventing DNS rebinding TOCTOU
  const portSuffix = parsed.port ? `:${parsed.port}` : '';
  const pinnedUrl = `${parsed.protocol}//${resolvedIp}${portSuffix}${parsed.pathname}${parsed.search}`;
  
  // SECURITY: Log successful validation (without full URL for privacy)
  logger.debug(`Webhook URL validated: ${parsed.protocol}//${hostname}/*`);
  
  return pinnedUrl;
}
