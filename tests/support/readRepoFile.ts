import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads a repository file as git stores it.
 *
 * **Why this is not just `readFileSync`.** Git on Windows with the default
 * `core.autocrlf=true` stores LF in the object database and checks out CRLF, so
 * the same file is bytes-different on disk depending on the machine. The
 * serializers in `lib/admin/` emit LF, because what they produce is committed
 * through the GitHub API — which is the repository's own representation, never a
 * working copy. That is correct, and it means a byte-for-byte assertion against
 * the file *on disk* passes on Linux and fails on Windows for a reason that has
 * nothing to do with the serializer.
 *
 * So the reference is normalised to LF here, once, and the tests assert against
 * the canonical form. The invariant being checked is "the serializer reproduces
 * what git stores", which is exactly what this returns.
 */
export function readRepoFile(...segments: string[]): string {
    return readFileSync(join(process.cwd(), ...segments), "utf8").replace(/\r\n/g, "\n");
}
