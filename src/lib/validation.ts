export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail = (value: string): "required" | "invalid" | null => {
  const v = value.trim();
  if (!v) return "required";
  return EMAIL_RE.test(v) ? null : "invalid";
};

export interface PasswordChecks {
  length: boolean;
  letter: boolean;
  number: boolean;
}
export const checkPassword = (value: string): PasswordChecks => ({
  length: value.length >= 8,
  letter: /[A-Za-z]/.test(value),
  number: /\d/.test(value),
});
export const isStrongPassword = (value: string) => Object.values(checkPassword(value)).every(Boolean);

export const validatePhone = (value: string) => !value.trim() || /^[+\d][\d\s-]{6,17}$/.test(value.trim());
