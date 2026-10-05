import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { UPLINK_SHA, validateUplinkBundle } from '../src/data/uplink-bundle.ts';
const bytes = readFileSync(new URL('../game_data/uplink_controller_ollvm_bcf_v1.json', import.meta.url));
if (createHash('sha256').update(bytes).digest('hex') !== UPLINK_SHA) throw new Error('UPLINK bundle byte hash differs from the verified Windows export');
const b = validateUplinkBundle(JSON.parse(bytes.toString()));
console.log(`Validated ${b.specimen_id}: ${b.state_table.length} states, ${b.traces.length} traces; SHA-256 ${UPLINK_SHA}`);
