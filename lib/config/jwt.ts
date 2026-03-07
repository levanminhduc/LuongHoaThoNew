// Lazy evaluation - chỉ đọc env var khi thực sự cần, không throw lúc build
export const JWT_SECRET: string = process.env.JWT_SECRET || "";
