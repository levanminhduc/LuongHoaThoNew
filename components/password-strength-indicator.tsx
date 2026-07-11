"use client";

import { Progress } from "@/components/ui/progress";
import { checkPasswordStrength } from "@/lib/password-strength";

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, issues } = checkPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Độ mạnh:</span>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <Progress value={score} className="h-2" />
      {issues.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {issues.map((issue) => (
            <li key={issue} className="flex items-center gap-1">
              <span>•</span> {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
