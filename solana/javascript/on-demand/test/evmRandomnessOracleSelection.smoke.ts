import {
  evaluateRandomnessOracleCandidate,
  type OracleHealthData,
  type OracleInfo,
} from '@switchboard-xyz/common';
import assert from 'node:assert/strict';

import {
  buildEvmRandomnessOracleCandidate,
  deriveEvmAddressFromSecp256k1Key,
  resolveEvmOracleSigningAddress,
  selectStrictEvmRandomnessOracleCandidate,
} from '../src/evm/index.ts';

const GENERATOR_PUBLIC_KEY =
  '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' +
  '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
const GENERATOR_ETH_ADDRESS = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';

function oracleInfo(overrides: Partial<OracleInfo> = {}): OracleInfo {
  return {
    pubkey: 'oracle-pubkey',
    secp256k1Key: GENERATOR_PUBLIC_KEY,
    authority: 'oracle-authority',
    queue: 'oracle-queue',
    mrEnclave: '0x00',
    expirationTime: Math.floor(Date.now() / 1000) - 3600,
    gatewayUrl: 'https://gateway.example.com',
    restricted: false,
    version: 'test',
    ...overrides,
  };
}

const oldCrossbarCandidate = buildEvmRandomnessOracleCandidate(
  oracleInfo({ signingAddress: undefined })
);
assert.equal(oldCrossbarCandidate.signingAddress, GENERATOR_ETH_ADDRESS);
assert.equal(oldCrossbarCandidate.oracleId, GENERATOR_ETH_ADDRESS);

assert.equal(
  deriveEvmAddressFromSecp256k1Key(`0x04${GENERATOR_PUBLIC_KEY}`),
  GENERATOR_ETH_ADDRESS
);

const explicitSigningAddress = '0xABCDEF0000000000000000000000000000000000';
const explicitCandidate = buildEvmRandomnessOracleCandidate(
  oracleInfo({
    secp256k1Key: 'not-a-public-key',
    signingAddress: explicitSigningAddress,
  })
);
assert.equal(
  explicitCandidate.signingAddress,
  explicitSigningAddress.toLowerCase()
);
assert.equal(explicitCandidate.oracleId, explicitSigningAddress.toLowerCase());

const malformedWithoutExplicit = oracleInfo({
  secp256k1Key: 'not-a-public-key',
  signingAddress: undefined,
});
assert.equal(
  resolveEvmOracleSigningAddress(malformedWithoutExplicit),
  undefined
);
assert.equal(
  buildEvmRandomnessOracleCandidate(malformedWithoutExplicit).signingAddress,
  ''
);

const inventoryOnlyCandidate = buildEvmRandomnessOracleCandidate(
  oracleInfo({
    signingAddress: '0x1111111111111111111111111111111111111111',
  })
);
const inventoryOnlyEvaluation = evaluateRandomnessOracleCandidate(
  inventoryOnlyCandidate
);
assert.equal(inventoryOnlyCandidate.quoteFresh, true);
assert.equal(inventoryOnlyCandidate.validUntilUnix, undefined);
assert.equal(inventoryOnlyCandidate.liveHealthy, false);
assert.equal(
  inventoryOnlyEvaluation.rejectionReasons.includes('quote-expired'),
  false
);
assert.equal(
  inventoryOnlyEvaluation.rejectionReasons.includes('health-data-unavailable'),
  true
);

assert.throws(
  () => selectStrictEvmRandomnessOracleCandidate([inventoryOnlyCandidate]),
  /No eligible randomness oracle candidates were found/
);

const liveHealth: OracleHealthData = {
  oracle_url: 'https://oracle.example.com',
  active_connections: 1,
  unique_ips: 1,
  total_subscriptions: 2,
  active_monitors: 1,
  total_symbols: 3,
  total_feeds: 4,
  oracle_config: {
    pull_oracle: inventoryOnlyCandidate.pubkey,
    secp256k1_pubkey: inventoryOnlyCandidate.secp256k1Key,
    version: inventoryOnlyCandidate.version,
    system_time: Math.floor(Date.now() / 1000),
    enable_gateway: 0,
    enable_pull_oracle: 1,
    gateway_ingress: inventoryOnlyCandidate.gatewayUrl,
    restricted: false,
  },
};

const liveCandidate = buildEvmRandomnessOracleCandidate(
  oracleInfo({
    signingAddress: '0x1111111111111111111111111111111111111111',
  }),
  liveHealth
);
assert.equal(liveCandidate.quoteFresh, true);
assert.equal(liveCandidate.validUntilUnix, undefined);
assert.equal(liveCandidate.liveHealthy, true);
assert.equal(liveCandidate.gatewayEnabled, true);
assert.equal(liveCandidate.pullOracleEnabled, true);

const selection = selectStrictEvmRandomnessOracleCandidate([liveCandidate]);
assert.equal(selection.candidate.oracleId, liveCandidate.oracleId);
assert.equal(selection.metadata.tier, 'live');
assert.equal(selection.metadata.liveHealthyCandidateCount, 1);
assert.equal(selection.metadata.fallbackCandidateCount, 0);
assert.deepEqual(selection.metadata.evaluations[0]?.rejectionReasons, []);

const disabledPullOracleCandidate = buildEvmRandomnessOracleCandidate(
  oracleInfo({
    signingAddress: '0x2222222222222222222222222222222222222222',
  }),
  {
    ...liveHealth,
    oracle_config: {
      ...liveHealth.oracle_config,
      enable_gateway: 1,
      enable_pull_oracle: 0,
    },
  }
);
const disabledPullOracleEvaluation = evaluateRandomnessOracleCandidate(
  disabledPullOracleCandidate
);
assert.equal(disabledPullOracleCandidate.gatewayEnabled, true);
assert.equal(disabledPullOracleCandidate.pullOracleEnabled, false);
assert.equal(
  disabledPullOracleEvaluation.rejectionReasons.includes(
    'pull-oracle-disabled'
  ),
  true
);
assert.throws(
  () => selectStrictEvmRandomnessOracleCandidate([disabledPullOracleCandidate]),
  /No eligible randomness oracle candidates were found/
);

console.log('evm randomness oracle selection smoke test passed');
