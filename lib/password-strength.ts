export interface PasswordStrength {
  score: number;
  label: string;
  issues: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  let score = 0;

  if (password.length < 8) {
    issues.push("Ít nhất 8 ký tự");
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    issues.push("Cần có chữ thường");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    issues.push("Cần có chữ hoa");
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    issues.push("Cần có số");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    issues.push("Nên có ký tự đặc biệt");
  } else {
    score += 1;
  }

  let label = "";
  if (score <= 2) {
    label = "Yếu";
  } else if (score === 3) {
    label = "Trung bình";
  } else if (score === 4) {
    label = "Tốt";
  } else {
    label = "Mạnh";
  }

  return { score: score * 20, label, issues };
}
