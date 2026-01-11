import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TableSkeleton({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="border rounded-lg">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>

        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4">
              <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-8 w-[300px]" />
      </div>
    </div>
  );
}

export function CardSkeleton({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <Card>
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[80%]" />
        <div className="flex gap-2 mt-6">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-7 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[120px] mb-2" />
            <Skeleton className="h-3 w-[180px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PayrollTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}

export function EmployeeListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-[80px]" />
              <Skeleton className="h-9 w-[80px]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ImportProgressSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-[180px]" />
        <Skeleton className="h-4 w-[250px]" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsWithTableSkeleton({
  statsCount = 4,
  rows = 8,
  columns = 6,
}: {
  statsCount?: number;
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <DashboardCardsSkeleton cards={statsCount} />

      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

export function TabsLayoutSkeleton({
  tabsCount = 3,
  contentVariant = "table",
}: {
  tabsCount?: number;
  contentVariant?: "table" | "form" | "cards";
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[280px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>

      <div className="flex items-center gap-1 border-b pb-2">
        {Array.from({ length: tabsCount }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-[100px] rounded-md" />
        ))}
      </div>

      <div className="pt-2">
        {contentVariant === "table" && <TableSkeleton rows={6} columns={5} />}
        {contentVariant === "form" && <FormSkeleton fields={4} />}
        {contentVariant === "cards" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

export function GridCardsSkeleton({
  statsCount = 3,
  cardsCount = 6,
  columns = 3,
}: {
  statsCount?: number;
  cardsCount?: number;
  columns?: 2 | 3 | 4;
}) {
  const gridClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[220px]" />
        <Skeleton className="h-4 w-[320px]" />
      </div>

      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: statsCount }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: cardsCount }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-[140px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-[70px]" />
                <Skeleton className="h-8 w-[70px]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FormLayoutSkeleton({
  hasSearch = true,
  hasFilters = true,
  formFields = 0,
}: {
  hasSearch?: boolean;
  hasFilters?: boolean;
  formFields?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {(hasSearch || hasFilters) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {hasSearch && <Skeleton className="h-10 w-[280px]" />}
              {hasFilters && (
                <>
                  <Skeleton className="h-10 w-[150px]" />
                  <Skeleton className="h-10 w-[150px]" />
                </>
              )}
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </CardContent>
        </Card>
      )}

      {formFields > 0 && <FormSkeleton fields={formFields} />}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[180px]" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-[80px]" />
                <Skeleton className="h-9 w-[80px]" />
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[220px]" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-[80px]" />
                <Skeleton className="h-9 w-[80px]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type PageLoadingVariant = "dashboard" | "table" | "form" | "cards";

export function PageLoading({
  variant = "dashboard",
}: {
  variant?: PageLoadingVariant;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>

      {variant === "dashboard" && (
        <>
          <DashboardCardsSkeleton cards={4} />
          <TableSkeleton rows={5} columns={6} />
        </>
      )}

      {variant === "table" && <TableSkeleton rows={8} columns={6} />}

      {variant === "form" && <FormSkeleton fields={5} />}

      {variant === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
    </div>
  );
}
