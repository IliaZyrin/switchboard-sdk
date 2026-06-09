import {
  evaluateRandomnessOracleCandidate,
  isRandomnessOracleCandidateEligible,
  type OracleHealthData,
} from '@switchboard-xyz/common';
import assert from 'node:assert/strict';

import { buildSolanaRandomnessOracleCandidate } from '../src/accounts/queue.ts';

import { BN, web3 } from '@coral-xyz/anchor-31';

const nowUnix = Math.floor(Date.now() / 1000);
const oraclePubkey = new web3.PublicKey(new Uint8Array(32).fill(1));
const gatewayUrl = 'https://gateway.example.com/mainnet';

function createHealth(enablePullOracle: number): OracleHealthData {
  return {
    oracle_url: gatewayUrl,
    active_connections: 1,
    unique_ips: 1,
    total_subscriptions: 2,
    active_monitors: 1,
    total_symbols: 3,
    total_feeds: 4,
    oracle_config: {
      pull_oracle: oraclePubkey.toBase58(),
      secp256k1_pubkey: 'secp256k1-pubkey',
      version: 'test',
      system_time: nowUnix,
      enable_gateway: 0,
      enable_pull_oracle: enablePullOracle,
      gateway_ingress: gatewayUrl,
      restricted: false,
    },
  };
}

function buildCandidate(enablePullOracle: number) {
  return buildSolanaRandomnessOracleCandidate({
    data: {
      gatewayUri: Buffer.from(gatewayUrl),
      isOnQueue: true,
      enclave: {
        verificationStatus: 4,
        validUntil: new BN(nowUnix + 3600),
      },
      lastHeartbeat: new BN(nowUnix),
    } as any,
    liveOracleHealth: createHealth(enablePullOracle),
    oracle: { pubkey: oraclePubkey } as any,
    queueData: { nodeTimeout: new BN(300) } as any,
  });
}

const enabledPullOracleCandidate = buildCandidate(1);
const enabledPullOracleEvaluation = evaluateRandomnessOracleCandidate(
  enabledPullOracleCandidate
);

assert.equal(enabledPullOracleCandidate.liveHealthy, true);
assert.equal(enabledPullOracleCandidate.gatewayEnabled, true);
assert.equal(enabledPullOracleCandidate.pullOracleEnabled, true);
assert.equal(
  isRandomnessOracleCandidateEligible(enabledPullOracleCandidate),
  true
);
assert.deepEqual(enabledPullOracleEvaluation.rejectionReasons, []);

const disabledPullOracleCandidate = buildCandidate(0);
const disabledPullOracleEvaluation = evaluateRandomnessOracleCandidate(
  disabledPullOracleCandidate
);

assert.equal(disabledPullOracleCandidate.liveHealthy, true);
assert.equal(disabledPullOracleCandidate.gatewayEnabled, true);
assert.equal(disabledPullOracleCandidate.pullOracleEnabled, false);
assert.equal(
  isRandomnessOracleCandidateEligible(disabledPullOracleCandidate),
  false
);
assert.equal(
  disabledPullOracleEvaluation.rejectionReasons.includes(
    'pull-oracle-disabled'
  ),
  true
);

console.log('solana randomness oracle selection smoke test passed');
