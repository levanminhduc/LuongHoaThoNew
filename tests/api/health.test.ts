import { GET } from "@/app/api/health/route";

describe("Health API", () => {
  it("should return healthy status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.timestamp).toBeDefined();
    expect(data.environment).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.memory).toBeDefined();
    expect(data.memory.used).toBeGreaterThan(0);
    expect(data.memory.total).toBeGreaterThan(0);
  });
});
