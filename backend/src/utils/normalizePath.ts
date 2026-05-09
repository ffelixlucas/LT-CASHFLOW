import path from "node:path";

export interface NormalizedPath {
  /** Path relativo, sempre com separador POSIX (`/`). */
  relative: string;
  /** Path absoluto resolvido contra `root`. */
  absolute: string;
}

export interface NormalizeOptions {
  /** Diretório raiz absoluto onde o arquivo deve viver. */
  root: string;
  /** Extensões permitidas (lowercase, com ponto). Default: `['.md']`. */
  allowedExtensions?: string[];
  /** Tamanho máximo do path (chars). Default: 500. */
  maxLength?: number;
}

export class InvalidPathError extends Error {
  constructor(public readonly reason: string) {
    super(`invalid_path: ${reason}`);
    this.name = "InvalidPathError";
  }
}

/**
 * Normaliza e valida um path relativo destinado ao Doc Engine.
 *
 * Garantias:
 * - apenas paths relativos POSIX (sem `..`, sem `\\0`, sem path absoluto);
 * - resolução final tem que estar **dentro** de `root`;
 * - extensão tem que estar em `allowedExtensions` (default: `.md`).
 */
export function normalizePath(
  rawInput: unknown,
  options: NormalizeOptions
): NormalizedPath {
  const allowed = (options.allowedExtensions ?? [".md"]).map((e) =>
    e.toLowerCase()
  );
  const maxLength = options.maxLength ?? 500;

  if (typeof rawInput !== "string") {
    throw new InvalidPathError("path_must_be_string");
  }

  const trimmed = rawInput.trim();
  if (!trimmed) throw new InvalidPathError("path_empty");
  if (trimmed.length > maxLength) throw new InvalidPathError("path_too_long");
  if (trimmed.includes("\0")) throw new InvalidPathError("path_has_nul_byte");

  const posixified = trimmed.replace(/\\+/g, "/");
  if (path.isAbsolute(posixified)) {
    throw new InvalidPathError("path_must_be_relative");
  }

  const normalized = path.posix.normalize(posixified);
  if (
    normalized.startsWith("..") ||
    normalized.split("/").some((seg) => seg === "..")
  ) {
    throw new InvalidPathError("path_traversal_detected");
  }

  const ext = path.posix.extname(normalized).toLowerCase();
  if (!allowed.includes(ext)) {
    throw new InvalidPathError(`extension_not_allowed:${ext || "none"}`);
  }

  const absolute = path.resolve(options.root, normalized);
  const rootAbsolute = path.resolve(options.root);
  const relativeFromRoot = path.relative(rootAbsolute, absolute);

  if (
    relativeFromRoot.startsWith("..") ||
    path.isAbsolute(relativeFromRoot)
  ) {
    throw new InvalidPathError("escapes_root");
  }

  return {
    relative: relativeFromRoot.split(path.sep).join("/"),
    absolute,
  };
}
