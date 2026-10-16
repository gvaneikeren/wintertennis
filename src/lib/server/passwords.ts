import bcrypt from "bcryptjs";

const COMMON = new Set([
  "1234567890", "12345678910", "0123456789", "qwertyuiop", "password12", "password123", "wachtwoord",
  "wachtwoord1", "wachtwoord123", "welkom1234", "welkom123", "iloveyou12", "1q2w3e4r5t", "qwerty1234",
  "abcdefghij", "aaaaaaaaaa", "1111111111", "tennis1234", "tennis123", "wintertennis", "letmein123",
  "football12", "voetbal123", "zaterdag12", "admin12345", "administrator", "passw0rd12", "changeme12",
]);

export const MIN_PASSWORD_LENGTH = 10;

export function passwordProblem(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) return `Wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens zijn`;
  if (pw.length > 200) return "Wachtwoord is te lang";
  if (COMMON.has(pw.toLowerCase())) return "Dit wachtwoord is te makkelijk te raden";
  return null;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

let dummy: Promise<string> | null = null;
/** A real bcrypt hash used to keep timing equal when the account does not exist. */
export const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));
