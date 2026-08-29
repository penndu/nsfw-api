// Polyfill Node.js util APIs that @tensorflow/tfjs-node@4.22.0 still depends
// on (util.isNullOrUndefined, util.isArray). Fix is merged upstream (#8425)
// but no stable npm release exists yet (issue #8609). Safe to remove once
// @tensorflow/tfjs-node is bumped past 4.23.0.
//
// On Node 24 these APIs are removed (crash). On Node 22 they are deprecated
// but still present (DEP0051 / DEP0044 warnings every call). Either way we
// install our own implementation, so:
//   - Node 24: replaces the missing API
//   - Node 22: suppresses the deprecation warning at its source
//
// Both implementations match what Node itself recommends in the warning text:
//   isNullOrUndefined: v === null || v === undefined
//   isArray:           Array.isArray(v)
// So the swap is behaviorally identical and safe to apply unconditionally.
//
// MUST be imported before @tensorflow/tfjs-node to take effect — keep this as
// the very first import in entry points (e.g. src/index.ts).

import nodeUtil from 'util';

const utilRecord = nodeUtil as unknown as {
  isNullOrUndefined: (v: unknown) => boolean;
  isArray: (v: unknown) => boolean;
};

utilRecord.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
utilRecord.isArray = (v: unknown) => Array.isArray(v);