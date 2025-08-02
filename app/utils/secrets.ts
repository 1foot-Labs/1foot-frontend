import crypto from 'crypto';

export function generateSecret(): {
  secret: string;
  sha256: string;
} {
  const secret = Math.floor(Math.random() * 256 + 1).toString(); 

  const sha256 = crypto.createHash('sha256')
    .update(secret) // directly hash the string
    .digest('hex');

  return {
    secret,
    sha256
  };
}
