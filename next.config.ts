import fs from "fs"
import path from "path"
import type { NextConfig } from "next"

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const readHomepageBasePath = () => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json")
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    if (!packageJson?.homepage) return ""
    const url = new URL(packageJson.homepage)
    const cleaned = url.pathname.replace(/\/+$/, "")
    return cleaned === "/" ? "" : cleaned
  } catch {
    return ""
  }
}

const resolvedBasePath = rawBasePath
  ? rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`
  : readHomepageBasePath()

const basePath =
  process.env.NODE_ENV === "development" ? "" : resolvedBasePath

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
}

export default nextConfig
