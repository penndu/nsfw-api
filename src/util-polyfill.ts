// Polyfill Node 24-removed Node.js util APIs that @tensorflow/tfjs-node@4.22.0
// still depends on (util.isNullOrUndefined, util.isArray).
// Fix is merged upstream (#8425) but no stable npm release exists yet (issue #8609).
// Safe to remove once @tensorflow/tfjs-node is bumped past 4.23.0.
//
// MUST be imported before @tensorflow/tfjs-node to take effect — keep this as
// the very first import in entry points (e.g. src/index.ts).

import nodeUtil from 'util';

const utilRecord = nodeUtil as unknown as {
  isNullOrUndefined?: (v: unknown) => boolean;
  isArray?: <T>(v: unknown) => v is T[];
};

if (typeof utilRecord.isNullOrUndefined !== 'function') {
  utilRecord.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}

if (typeof utilRecord.isArray !== 'function') {
  utilRecord.isArray = <T>(v: unknown) => Array.isArray(v);
}