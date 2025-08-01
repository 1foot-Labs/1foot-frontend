import crypto from 'crypto';
import { keccak256 } from 'js-sha3';

export function generateSecret(): {
  secret: string;
  hash160: string;
  sha3: string;
} {
  const secretInt = Math.floor(Math.random() * 256) + 1;
  const secret = secretInt.toString()

  const secretBuffer = Buffer.from([secretInt]);

  const sha256 = crypto.createHash('sha256').update(secretBuffer).digest();
  const hash160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
  const sha3 = keccak256(secretBuffer);

  return {
    secret,
    hash160,
    sha3
  };
}
