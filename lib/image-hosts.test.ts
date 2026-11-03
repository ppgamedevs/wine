import { describe, expect, it } from "vitest";
import { isOptimizableImageHost } from "@/lib/image-hosts";
import {
  resolveWineImage,
  shouldUseUnoptimizedImage,
} from "@/lib/wine-images";

describe("isOptimizableImageHost", () => {
  it("matches exact allowlisted hosts", () => {
    expect(isOptimizableImageHost("cramelerecas.ro")).toBe(true);
    expect(isOptimizableImageHost("www.cramelerecas.ro")).toBe(true);
    expect(isOptimizableImageHost("CRAMELERECAS.RO")).toBe(true);
  });

  it("matches subdomain wildcards for the root host as well", () => {
    expect(isOptimizableImageHost("vinintel.ro")).toBe(true);
    expect(isOptimizableImageHost("images.vinintel.ro")).toBe(true);
    expect(isOptimizableImageHost("abc123.public.blob.vercel-storage.com")).toBe(true);
    expect(isOptimizableImageHost("www.emag.ro")).toBe(true);
  });

  it("does not match lookalike or unknown hosts", () => {
    expect(isOptimizableImageHost("evil-vinintel.ro")).toBe(false);
    expect(isOptimizableImageHost("vinintel.ro.example.com")).toBe(false);
    expect(isOptimizableImageHost("cdn.cramelerecas.ro")).toBe(false);
    expect(isOptimizableImageHost("example.com")).toBe(false);
    expect(isOptimizableImageHost("")).toBe(false);
  });
});

describe("shouldUseUnoptimizedImage", () => {
  it("lets allowlisted external images go through the optimizer", () => {
    expect(
      shouldUseUnoptimizedImage(
        "https://cramelerecas.ro/wp-content/uploads/2022/08/selene.jpg",
      ),
    ).toBe(false);
    expect(
      shouldUseUnoptimizedImage("https://www.emag.ro/product/photo.jpg"),
    ).toBe(false);
  });

  it("keeps unknown hosts on the original file", () => {
    expect(
      shouldUseUnoptimizedImage("https://unknown-retailer.example/photo.jpg"),
    ).toBe(true);
  });

  it("fails safe on malformed URLs", () => {
    expect(shouldUseUnoptimizedImage("not a url")).toBe(true);
  });
});

describe("resolveWineImage", () => {
  const base = {
    slug: "selene-feteasca-neagra-2024",
    name: "Selene Feteasca Neagra 2024",
    type: "red" as const,
    vintage: 2024,
  };

  it("optimizes an external-source image when the host is allowlisted", () => {
    const image = resolveWineImage({
      ...base,
      imageUrl:
        "https://cramelerecas.ro/wp-content/uploads/2022/08/Selene-Feteasca-Neagra_Cramele-Recas.jpg",
      imageSource: "cramelerecas",
    });
    expect(image.fromExternalSource).toBe(true);
    expect(image.unoptimized).toBe(false);
  });

  it("keeps unknown external hosts unoptimized", () => {
    const image = resolveWineImage({
      ...base,
      imageUrl: "https://unknown-retailer.example/bottle.jpg",
      imageSource: "retailer",
    });
    expect(image.unoptimized).toBe(true);
  });

  it("drops placeholder stock images", () => {
    const image = resolveWineImage({
      ...base,
      imageUrl: "https://images.unsplash.com/photo-123",
    });
    expect(image.src).toBeNull();
  });
});
