export function resolveLoginPath(pathname: string | null | undefined): string {
  const path =
    pathname && typeof pathname === "string"
      ? pathname
      : typeof window !== "undefined"
        ? window.location.pathname
        : "/admin";

  if (path.startsWith("/admin")) {
    return "/admin/login";
  }

  return "/admin/login";
}
