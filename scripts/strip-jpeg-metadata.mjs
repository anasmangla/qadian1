import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const photoDir = path.join(projectDir, "assets", "photos", "personal");

function stripPrivateMetadata(input) {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
    throw new Error("Expected a JPEG file.");
  }

  const chunks = [input.subarray(0, 2)];
  let offset = 2;

  while (offset < input.length) {
    if (input[offset] !== 0xff) throw new Error(`Invalid JPEG marker at byte ${offset}.`);

    const markerStart = offset;
    while (input[offset] === 0xff) offset += 1;
    const marker = input[offset];
    offset += 1;

    if (marker === 0xda) {
      chunks.push(input.subarray(markerStart));
      return Buffer.concat(chunks);
    }

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(input.subarray(markerStart, offset));
      continue;
    }

    if (offset + 2 > input.length) throw new Error("Truncated JPEG segment length.");
    const segmentLength = input.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > input.length) {
      throw new Error("Invalid JPEG segment length.");
    }

    const segmentEnd = offset + segmentLength;
    const isPrivateMetadata = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!isPrivateMetadata) chunks.push(input.subarray(markerStart, segmentEnd));
    offset = segmentEnd;
  }

  throw new Error("JPEG is missing a start-of-scan marker.");
}

function jpegFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return jpegFiles(entryPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith(".jpg") ? [entryPath] : [];
    })
    .sort();
}

const files = jpegFiles(photoDir);
if (!files.length) throw new Error("No personal JPEG files found.");

for (const filePath of files) {
  const stripped = stripPrivateMetadata(fs.readFileSync(filePath));
  const tempPath = `${filePath}.metadata-stripped`;
  fs.writeFileSync(tempPath, stripped);
  fs.renameSync(tempPath, filePath);
}

console.log(`Stripped private metadata from ${files.length} personal JPEG files, including responsive subdirectories.`);
