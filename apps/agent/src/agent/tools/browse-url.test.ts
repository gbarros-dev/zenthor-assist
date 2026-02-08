import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browseUrl } from "./browse-url";

// Helper to invoke the tool's execute function directly
async function exec(url: string): Promise<string> {
  // oxlint-disable-next-line typescript-eslint/no-explicit-any -- accessing internal execute for testing
  return (browseUrl as any).execute({ url });
}

// Mock fetch globally
const mockFetch = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeResponse(body: string, init?: { status?: number; headers?: Record<string, string> }) {
  return new Response(body, {
    status: init?.status ?? 200,
    headers: { "content-type": "text/html", ...init?.headers },
  });
}

describe("browseUrl", () => {
  describe("protocol validation", () => {
    it("blocks file: protocol", async () => {
      const result = await exec("file:///etc/passwd");
      expect(result).toContain("Protocol not allowed");
    });

    it("blocks data: protocol", async () => {
      const result = await exec("data:text/html,<h1>Hi</h1>");
      expect(result).toContain("Protocol not allowed");
    });

    it("blocks javascript: protocol", async () => {
      const result = await exec("javascript:alert(1)");
      expect(result).toContain("Protocol not allowed");
    });

    it("blocks blob: protocol", async () => {
      const result = await exec("blob:http://example.com/abc");
      expect(result).toContain("Protocol not allowed");
    });
  });

  describe("HTML extraction", () => {
    it("extracts text from simple HTML", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse("<html><body><h1>Hello World</h1><p>Some content here.</p></body></html>"),
      );
      const result = await exec("https://example.com");
      expect(result.toLowerCase()).toContain("hello world");
      expect(result.toLowerCase()).toContain("some content here");
    });

    it("strips nav/header/footer", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse(
          "<html><body><nav>Menu items</nav><main><p>Main content</p></main><footer>Footer text</footer></body></html>",
        ),
      );
      const result = await exec("https://example.com");
      expect(result).toContain("Main content");
      expect(result).not.toContain("Menu items");
      expect(result).not.toContain("Footer text");
    });
  });

  describe("plain text and JSON", () => {
    it("returns plain text directly", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse("Hello plain text", { headers: { "content-type": "text/plain" } }),
      );
      const result = await exec("https://example.com/data.txt");
      expect(result).toBe("Hello plain text");
    });

    it("returns JSON directly", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse('{"key":"value"}', { headers: { "content-type": "application/json" } }),
      );
      const result = await exec("https://example.com/api.json");
      expect(result).toBe('{"key":"value"}');
    });
  });

  describe("error handling", () => {
    it("returns error for non-OK status", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse("Not Found", { status: 404 }));
      const result = await exec("https://example.com/missing");
      expect(result).toContain("HTTP 404");
    });

    it("returns error for binary content type", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse("binary data", { headers: { "content-type": "image/png" } }),
      );
      const result = await exec("https://example.com/image.png");
      expect(result).toContain("Cannot extract text from binary content");
    });

    it("returns error for too-large content-length", async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse("", { headers: { "content-length": "10000000" } }),
      );
      const result = await exec("https://example.com/huge");
      expect(result).toContain("Response too large");
    });

    it("handles fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await exec("https://example.com/down");
      expect(result).toContain("Error fetching URL");
      expect(result).toContain("Network error");
    });

    it("handles timeout errors", async () => {
      const err = new DOMException("The operation was aborted", "TimeoutError");
      mockFetch.mockRejectedValueOnce(err);
      const result = await exec("https://example.com/slow");
      expect(result).toContain("timed out");
    });
  });

  describe("truncation", () => {
    it("truncates long output", async () => {
      const longContent = "x".repeat(200_000);
      mockFetch.mockResolvedValueOnce(
        makeResponse(longContent, { headers: { "content-type": "text/plain" } }),
      );
      const result = await exec("https://example.com/long");
      expect(result).toContain("[Truncated");
      expect(result.length).toBeLessThan(200_000);
    });
  });
});
