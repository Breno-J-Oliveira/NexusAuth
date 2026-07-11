import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const CACHE_TTL = 24 * 60 * 60; // 24h

/**
 * Threat intelligence service.
 *
 * Aggregates reputation data from multiple sources to score
 * incoming IPs against known malicious activity (TOR exit nodes,
 * public proxies, datacenters, abuse reports).
 *
 * In production, integrate with:
 *  - AbuseIPDB
 *  - MaxMind GeoIP2
 *  - Project Honeypot
 *  - AlienVault OTX
 *  - Spamhaus DROP list
 */
@Injectable()
export class ThreatIntelService {
  private readonly logger = new Logger(ThreatIntelService.name);

  // Known TOR exit node ranges (sample — production should use
  // an up-to-date feed like https://check.torproject.org/torbulkexitlist)
  private readonly torExitNodes = new Set<string>([
    // Populated dynamically from external feed
  ]);

  // Known datacenter/cloud provider IP ranges (RFC1918 + public clouds)
  private readonly datacenterAsns = new Set<string>([
    'AS16276', // OVH
    'AS14061', // DigitalOcean
    'AS16509', // AWS
    'AS15169', // Google Cloud
    'AS8075', // Microsoft Azure
  ]);

  constructor(private redisService: RedisService) {}

  /**
   * Score an IP address from 0 (clean) to 100 (highly malicious).
   * Used by AdaptiveAuth to decide whether to require additional
   * authentication or block the request entirely.
   */
  async scoreIp(ipAddress: string): Promise<{
    score: number;
    reasons: string[];
    blocked: boolean;
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check local cache
    const cacheKey = `threat:${ipAddress}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through to fresh check
      }
    }

    // Check 1: TOR exit node
    if (this.torExitNodes.has(ipAddress)) {
      reasons.push('tor_exit_node');
      score += 50;
    }

    // Check 2: Local / private IP (shouldn't reach public API)
    if (this.isPrivateIp(ipAddress)) {
      reasons.push('private_ip');
      score += 80;
    }

    // Check 3: Known bad reputation (would call AbuseIPDB in production)
    // For demo, simulate based on a hash of the IP
    const hash = this.simpleHash(ipAddress);
    if (hash % 100 < 5) {
      reasons.push('abuse_reports');
      score += 70;
    }

    // Check 4: Datacenter (bots/scripts often come from these)
    // (would require ASN lookup via MaxMind or IP2Location)
    // if (asnLookup(ip) in datacenterAsns) {
    //   reasons.push('datacenter');
    //   score += 30;
    // }

    // Cap at 100
    score = Math.min(score, 100);

    const result = {
      score,
      reasons,
      blocked: score >= 80,
    };

    // Cache result
    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL);

    if (result.blocked) {
      this.logger.warn(
        `IP ${ipAddress} scored ${score} (${reasons.join(', ')}) — blocked`,
      );
    }

    return result;
  }

  /**
   * Determine if an IP is in a private/reserved range.
   */
  private isPrivateIp(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const [a, b] = parts.map(Number);
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) // link-local / cloud metadata
    );
  }

  private simpleHash(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
