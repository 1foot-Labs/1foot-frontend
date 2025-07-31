import crypto from 'crypto';

export function generateSecret(): { secret: string; hash: string } {
  const secret = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return { secret, hash };
}
