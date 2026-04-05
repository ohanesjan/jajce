import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminSessionMock = vi.fn();
const getAdminLanguageMock = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  loginAdminAction: vi.fn(),
}));

vi.mock("@/lib/admin-language", () => ({
  getAdminLanguage: getAdminLanguageMock,
}));

vi.mock("@/lib/services/admin-session", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSessionMock.mockResolvedValue(null);
    getAdminLanguageMock.mockResolvedValue("en");
  });

  it("renders English login copy when the admin language cookie is set to en", async () => {
    const { default: AdminLoginPage } = await import("@/app/admin/login/page");

    const markup = renderToStaticMarkup(
      await AdminLoginPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Admin sign in");
    expect(markup).toContain("This area is only for the jajce.mk admin dashboard.");
    expect(markup).toContain(">Sign in</button>");
    expect(markup).toContain(">Email</span>");
  });
});
