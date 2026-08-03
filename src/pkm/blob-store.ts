import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface StoredBlob {
  key: string;
  sha256: string;
  bytes: number;
}

export interface BlobStore {
  putText(content: string): Promise<StoredBlob>;
  getText(key: string): Promise<string>;
}

const digest = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");

export class FileSystemBlobStore implements BlobStore {
  constructor(private readonly rootDirectory: string) {}

  async putText(content: string): Promise<StoredBlob> {
    const sha256 = digest(content);
    const key = join(sha256.slice(0, 2), `${sha256}.txt`);
    const absolutePath = join(this.rootDirectory, key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, { encoding: "utf8", flag: "wx" }).catch((error: unknown) => {
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      if (code !== "EEXIST") throw error;
    });
    return { key, sha256, bytes: Buffer.byteLength(content, "utf8") };
  }

  async getText(key: string): Promise<string> {
    if (key.includes("..") || key.startsWith("/") || key.startsWith("\\")) {
      throw new Error("Invalid blob key");
    }
    return readFile(join(this.rootDirectory, key), "utf8");
  }
}

export class InMemoryBlobStore implements BlobStore {
  private readonly blobs = new Map<string, string>();

  async putText(content: string): Promise<StoredBlob> {
    const sha256 = digest(content);
    const key = `${sha256}.txt`;
    this.blobs.set(key, content);
    return { key, sha256, bytes: Buffer.byteLength(content, "utf8") };
  }

  async getText(key: string): Promise<string> {
    const value = this.blobs.get(key);
    if (value === undefined) throw new Error(`Blob ${key} not found`);
    return value;
  }
}
