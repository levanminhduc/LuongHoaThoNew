const digitColumns = [
  ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ["8", "6", "4", "2", "0", "9", "7", "5", "3", "1"],
  ["1", "3", "5", "7", "9", "0", "2", "4", "6", "8"],
  ["5", "9", "2", "6", "0", "4", "8", "1", "7", "3"],
];

const coinPositions = [
  "left-[10%] top-[58%] animate-maintenance-money-rise",
  "left-[24%] top-[30%] animate-maintenance-money-rise [animation-delay:-1.1s]",
  "right-[18%] top-[34%] animate-maintenance-money-rise [animation-delay:-2.2s]",
  "right-[9%] top-[61%] animate-maintenance-money-rise [animation-delay:-3.3s]",
  "left-[44%] top-[18%] animate-maintenance-money-rise [animation-delay:-4.4s]",
];

export default function MaintenancePage() {
  return (
    <main className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-background px-4 py-10 text-foreground antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.42)_100%)]"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col items-center justify-center text-center">
        <div
          aria-hidden="true"
          className="relative mb-8 h-72 w-full max-w-md [perspective:900px] sm:mb-10 sm:h-80"
        >
          <div className="absolute inset-x-12 bottom-4 h-8 rounded-[50%] bg-primary/20 blur-2xl" />

          <div className="absolute left-1/2 top-[46%] h-44 w-72 -translate-x-1/2 -translate-y-1/2 animate-maintenance-ledger-tilt rounded-lg border border-primary/20 bg-card/90 p-5 shadow-[0_34px_80px_-28px_rgba(37,99,235,0.58),0_18px_42px_-32px_rgba(15,23,42,0.44)] backdrop-blur [transform-style:preserve-3d] motion-reduce:animate-none sm:h-48 sm:w-80">
            <div className="absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.65),transparent_42%,rgba(37,99,235,0.14))]" />
            <div className="absolute -inset-px rounded-lg bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.34),transparent)] opacity-70" />
            <div className="relative grid h-full grid-cols-4 gap-3 rounded-md border border-primary/15 bg-background/70 p-4 shadow-inner">
              {digitColumns.map((digits, columnIndex) => (
                <div
                  key={columnIndex}
                  className="relative overflow-hidden rounded-md border border-primary/10 bg-primary/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                >
                  <div
                    className={[
                      "grid animate-maintenance-digit-roll text-2xl font-black leading-[2.25rem] text-primary tabular-nums motion-reduce:animate-none sm:text-3xl sm:leading-[2.5rem]",
                      columnIndex === 1
                        ? "[animation-delay:-1.35s]"
                        : columnIndex === 2
                          ? "[animation-delay:-2.7s]"
                          : columnIndex === 3
                            ? "[animation-delay:-4.05s]"
                            : "",
                    ].join(" ")}
                  >
                    {digits.concat(digits).map((digit, digitIndex) => (
                      <span key={`${digit}-${digitIndex}`}>{digit}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute left-1/2 top-[48%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-maintenance-coin-spin rounded-full border border-amber-300/70 bg-[radial-gradient(circle_at_34%_28%,#fff7c2_0%,#fbbf24_38%,#b45309_100%)] shadow-[0_22px_44px_-18px_rgba(245,158,11,0.88),inset_0_2px_8px_rgba(255,255,255,0.72),inset_0_-10px_20px_rgba(120,53,15,0.26)] [transform-style:preserve-3d] motion-reduce:animate-none">
            <div className="absolute inset-3 rounded-full border border-amber-100/70" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-amber-950/80 tabular-nums">
              đ
            </div>
          </div>

          {coinPositions.map((position) => (
            <div
              key={position}
              className={`absolute flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/80 bg-[radial-gradient(circle_at_35%_28%,#fff7ad_0%,#facc15_42%,#c2410c_100%)] text-base font-black text-amber-950/75 shadow-[0_16px_26px_-16px_rgba(245,158,11,0.82)] motion-reduce:animate-none ${position}`}
            >
              đ
            </div>
          ))}

          <div className="absolute left-1/2 top-[48%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 animate-maintenance-orbit rounded-full border border-primary/15 motion-reduce:animate-none" />
          <div className="absolute left-1/2 top-[48%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-maintenance-orbit rounded-full border border-primary/10 [animation-direction:reverse] motion-reduce:animate-none" />
        </div>

        <div className="max-w-xl space-y-4">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dữ liệu lương đang được cập nhật
          </h1>
          <p className="text-pretty text-base font-medium leading-7 text-muted-foreground sm:text-lg">
            Vui lòng quay lại sau khi quá trình upload và kiểm tra hoàn tất.
          </p>
        </div>
      </section>
    </main>
  );
}
