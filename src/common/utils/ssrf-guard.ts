import * as dns from 'dns';
import * as net from 'net';
import { BadRequestException } from '@nestjs/common';

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
  // V8 fix: normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) to IPv4
  const mappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) {
    return isBlockedIp(mappedMatch[1]);
  }
  if (ip === 'localhost' || ip === '::1') return true;
  return BLOCKED_RANGES.some((cidr) => ipInCidr(ip, cidr));
}

export async function validateWebhookUrl(urlStr: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Invalid webhook URL',
    });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must use HTTP or HTTPS',
    });
  }

  const hostname = parsed.hostname;

  if (isBlockedIp(hostname)) {
    throw new BadRequestException({
      code: 'SSRF_BLOCKED',
      message: 'Webhook URL resolves to a blocked private/loopback address',
    });
  }

  let resolvedIp: string;
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isBlockedIp(addr.address)) {
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
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: `Could not resolve webhook hostname: ${err.message}`,
    });
  }

  // A5 fix: rewrite URL to use the resolved IP, preventing DNS rebinding TOCTOU
  const port = parsed.port ? `:${parsed.port}` : '';
  const pinnedUrl = `${parsed.protocol}//${resolvedIp}${port}${parsed.pathname}${parsed.search}`;
  return pinnedUrl;
}
