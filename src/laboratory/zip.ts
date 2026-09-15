import { crc32, deflateRawSync } from 'node:zlib';

/** A file to put in an archive, by its path inside it. */
export type ZipFile = { name: string; content: Uint8Array };

/** Past this, a size or offset needs ZIP64, which no Record copy comes near. */
const LIMIT = 0xffffffff;

/** An instant as MS-DOS date and time fields, in UTC, to two seconds. */
function dosDateTime(at: Date) {
  return {
    time:
      (at.getUTCHours() << 11) |
      (at.getUTCMinutes() << 5) |
      Math.floor(at.getUTCSeconds() / 2),
    date:
      ((at.getUTCFullYear() - 1980) << 9) |
      ((at.getUTCMonth() + 1) << 5) |
      at.getUTCDate(),
  };
}

/**
 * A ZIP archive (PKWARE APPNOTE 6.3) of the files in order, each deflated and
 * named in UTF-8, every entry dated `modifiedAt`. Any unzip tool opens it.
 */
export function zip(files: readonly ZipFile[], modifiedAt: Date): Uint8Array {
  const { time, date } = dosDateTime(modifiedAt);
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = deflateRawSync(file.content);
    const crc = crc32(file.content);
    if (file.content.byteLength > LIMIT || offset > LIMIT)
      throw new Error(`${file.name} is too large for a ZIP archive.`);
    // Version 2.0, UTF-8 names (bit 11), deflated.
    const common = (header: Buffer, at: number) => {
      header.writeUInt16LE(20, at);
      header.writeUInt16LE(0x0800, at + 2);
      header.writeUInt16LE(8, at + 4);
      header.writeUInt16LE(time, at + 6);
      header.writeUInt16LE(date, at + 8);
      header.writeUInt32LE(crc, at + 10);
      header.writeUInt32LE(data.byteLength, at + 14);
      header.writeUInt32LE(file.content.byteLength, at + 18);
      header.writeUInt16LE(name.byteLength, at + 22);
    };
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    common(local, 4);
    locals.push(local, name, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    common(entry, 6);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.byteLength + name.byteLength + data.byteLength;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
