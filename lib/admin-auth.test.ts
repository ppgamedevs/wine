import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { cookies } from "next/headers";
import {
  clearAdminSession,
  createAdminSessionToken,
  isAdminAuthenticated,
  setAdminSession,
  validateAdminSessionToken,
  verifyAdminSecret,
} from "@/lib/admin-auth";

const NOW_MS = Date.UTC(2026, 7, 20, 8, 0, 0);
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const TEST_SECRET = "correct horse battery staple";
const TEST_NONCE = "fixed_nonce_for_deterministic_test";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function mockCookieStore(value?: string) {
  const set = vi.fn();
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(() => (value ? { name: "vinintel_admin", value } : undefined)),
    set,
  } as unknown as CookieStore);
  return { set };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("admin HMAC session", () => {
  it("creates a deterministic signed token and enforces expiry", () => {
    const token = createAdminSessionToken(
      TEST_SECRET,
      NOW_MS,
      TEST_NONCE,
    );

    expect(
      createAdminSessionToken(TEST_SECRET, NOW_MS, TEST_NONCE),
    ).toBe(token);
    expect(token).toMatch(
      /^v1\.\d+\.\d+\.fixed_nonce_for_deterministic_test\.[A-Za-z0-9_-]{43}$/,
    );
    expect(validateAdminSessionToken(token, TEST_SECRET, NOW_MS)).toBe(true);
    expect(
      validateAdminSessionToken(
        token,
        TEST_SECRET,
        NOW_MS + SESSION_SECONDS * 1000 - 1,
      ),
    ).toBe(true);
    expect(
      validateAdminSessionToken(
        token,
        TEST_SECRET,
        NOW_MS + SESSION_SECONDS * 1000,
      ),
    ).toBe(false);
  });

  it("rejects tampering, the wrong secret, and malformed tokens", () => {
    const token = createAdminSessionToken(
      TEST_SECRET,
      NOW_MS,
      TEST_NONCE,
    );
    const parts = token.split(".");
    const tamperedPayload = [...parts];
    tamperedPayload[3] = `${TEST_NONCE}x`;
    const tamperedSignature = `${token.slice(0, -1)}${
      token.endsWith("A") ? "B" : "A"
    }`;

    expect(
      validateAdminSessionToken(
        tamperedPayload.join("."),
        TEST_SECRET,
        NOW_MS,
      ),
    ).toBe(false);
    expect(
      validateAdminSessionToken(tamperedSignature, TEST_SECRET, NOW_MS),
    ).toBe(false);
    expect(validateAdminSessionToken(token, "wrong secret", NOW_MS)).toBe(
      false,
    );
    expect(validateAdminSessionToken("1", TEST_SECRET, NOW_MS)).toBe(false);
  });

  it("validates the admin secret and session cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", ` ${TEST_SECRET} `);
    const token = createAdminSessionToken(
      TEST_SECRET,
      NOW_MS,
      TEST_NONCE,
    );
    mockCookieStore(token);
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);

    expect(verifyAdminSecret(` ${TEST_SECRET} `)).toBe(true);
    expect(verifyAdminSecret("incorrect")).toBe(false);
    await expect(isAdminAuthenticated()).resolves.toBe(true);
  });

  it("sets and clears a restricted expiring cookie", async () => {
    vi.stubEnv("ADMIN_SECRET", TEST_SECRET);
    vi.stubEnv("NODE_ENV", "production");
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    const { set } = mockCookieStore();

    await setAdminSession();

    expect(set).toHaveBeenCalledTimes(1);
    const [name, token, options] = set.mock.calls[0] as [
      string,
      string,
      {
        expires: Date;
        httpOnly: boolean;
        maxAge: number;
        path: string;
        priority: string;
        sameSite: string;
        secure: boolean;
      },
    ];
    expect(name).toBe("vinintel_admin");
    expect(validateAdminSessionToken(token, TEST_SECRET, NOW_MS)).toBe(true);
    expect(options).toMatchObject({
      httpOnly: true,
      maxAge: SESSION_SECONDS,
      path: "/admin",
      priority: "high",
      sameSite: "strict",
      secure: true,
    });
    expect(options.expires.getTime()).toBe(
      NOW_MS + SESSION_SECONDS * 1000,
    );

    await clearAdminSession();
    expect(set).toHaveBeenLastCalledWith(
      "vinintel_admin",
      "",
      expect.objectContaining({
        maxAge: 0,
        path: "/admin",
        expires: new Date(0),
      }),
    );
  });

  it("uses constant time comparison instead of direct equality", async () => {
    const source = await readFile(
      new URL("./admin-auth.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("timingSafeEqual");
    expect(source).not.toMatch(/candidate\.trim\(\)\s*===/);
    expect(source).not.toContain('value === "1"');
  });
});
