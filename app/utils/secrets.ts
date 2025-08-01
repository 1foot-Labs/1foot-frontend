import crypto from 'crypto';
import { keccak256 } from 'js-sha3';

export function generateSecret(): {
  secret: number;
  sha256: string;
  hash160: string;
  sha3: string;
} {
  const secret = Math.floor(Math.random() * 256) + 1;

  const secretBuffer = Buffer.from([secret]);

  const sha256 = crypto.createHash('sha256').update(secretBuffer).digest();
  const hash160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
  const sha3 = keccak256(secretBuffer);

  return {
    secret,
    sha256: sha256.toString('hex'),
    hash160,
    sha3
  };
}
