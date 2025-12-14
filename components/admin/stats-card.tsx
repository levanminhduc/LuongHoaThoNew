"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type GradientVariant = "blue" | "green" | "purple" | "orange" | "cyan" | "rose";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: GradientVariant;
  progress?: number;
  badge?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const gradientMap: Record<GradientVariant, string> = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600",
  cyan: "from-cyan-500 to-cyan-600",
  rose: "from-rose-500 to-rose-600",
};

const subtleTextMap: Record<GradientVariant, string> = {
  blue: "text-blue-100",
  green: "text-green-100",
  purple: "text-purple-100",
  orange: "text-orange-100",
  cyan: "text-cyan-100",
  rose: "text-rose-100",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "blue",
  progress,
  badge,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl transition-shadow",
        gradientMap[variant],
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2 p-4 lg:p-6">
        <div className="space-y-1">
          <p
            className={cn(
              "text-xs sm:text-sm font-medium",
              subtleTextMap[variant],
            )}
          >
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {value}
          </h3>
        </div>
        <div className="p-2 sm:p-3 bg-white/20 rounded-lg shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 pt-0">
        <div className="flex flex-col gap-2">
          {subtitle && (
            <p
              className={cn(
                "text-xs sm:text-sm truncate",
                subtleTextMap[variant],
              )}
            >
              {subtitle}
            </p>
          )}
          {badge && (
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-0 text-[10px] sm:text-xs w-fit"
            >
              {badge}
            </Badge>
          )}
          {progress !== undefined && (
            <Progress
              value={progress}
              className="h-1.5 bg-white/20 [&>div]:bg-white"
            />
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-200" : "text-red-200",
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {trend.value}%
              </span>
              <span className={cn("text-xs", subtleTextMap[variant])}>
                so với tháng trước
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
