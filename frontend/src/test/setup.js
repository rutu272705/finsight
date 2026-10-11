import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

// jsdom has no layout, so give Recharts' ResponsiveContainer a fixed size.
vi.mock("recharts", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => React.cloneElement(children, { width: 600, height: 300 }),
  };
});
