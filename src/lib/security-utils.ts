export function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000);
}

export function sanitizeEmail(email: string): string {
  if (!email) return '';
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  return sanitized;
}

export function sanitizeEnrollmentNumber(enrollment: string): string {
  if (!enrollment) return '';
  const sanitized = enrollment.trim();
  if (!/^\d{11}$/.test(sanitized)) {
    throw new Error('Enrollment number must be exactly 11 digits');
  }
  return sanitized;
}

export function validateObjectId(id: string): boolean {
  if (!id) return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .replace(/[<>${}]/g, '')
    .trim()
    .substring(0, 100);
}

export function validatePassword(password: string): void {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  if (password.length > 128) {
    throw new Error('Password is too long');
  }
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
