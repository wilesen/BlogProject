/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// import MAX_SIGNED_31_BIT_INT from './maxSigned31BitInt';

const MAX_SIGNED_31_BIT_INT = 1073741823

// type ExpirationTime = number;

const NoWork = 0
const Sync = 1
const Never = MAX_SIGNED_31_BIT_INT

const UNIT_SIZE = 10
const MAGIC_NUMBER_OFFSET = 2

// 1 unit of expiration time represents 10ms.
function msToExpirationTime(ms) {
  // Always add an offset so that we don't clash with the magic number for NoWork.
  return  MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0)
}

function expirationTimeToMs(expirationTime) {
  return (MAGIC_NUMBER_OFFSET - expirationTime) * UNIT_SIZE;
}

function ceiling(num, precision) {
  return (((num / precision) | 0) + 1) * precision
}

function computeExpirationBucket(currentTime, expirationInMs, bucketSizeMs) {
  return (
    MAGIC_NUMBER_OFFSET +
    ceiling(
      MAGIC_NUMBER_OFFSET - currentTime + expirationInMs / UNIT_SIZE,
      bucketSizeMs / UNIT_SIZE,
    )
  )
}
// -4995   25

const LOW_PRIORITY_EXPIRATION = 5000
const LOW_PRIORITY_BATCH_SIZE = 250

function computeAsyncExpiration(currentTime) {
  return computeExpirationBucket(
    currentTime,
    LOW_PRIORITY_EXPIRATION,
    LOW_PRIORITY_BATCH_SIZE,
  )
}

const HIGH_PRIORITY_EXPIRATION = 500
const HIGH_PRIORITY_BATCH_SIZE = 100

function computeInteractiveExpiration(currentTime) {
  return computeExpirationBucket(
    currentTime,
    HIGH_PRIORITY_EXPIRATION,
    HIGH_PRIORITY_BATCH_SIZE,
  )
}

const TEST_NUM = 10000
console.log(computeInteractiveExpiration(TEST_NUM))
console.log(computeAsyncExpiration(TEST_NUM))
console.log('=======')
console.log(computeInteractiveExpiration(10010))
console.log(computeAsyncExpiration(10010))
console.log('=======')
console.log(computeInteractiveExpiration(10020))
console.log(computeAsyncExpiration(10020))
console.log('=======')
console.log(computeInteractiveExpiration(10030))
console.log(computeAsyncExpiration(10030))