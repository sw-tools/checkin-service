import { crc64 } from 'crc64-ecma';

export function computeCrc64Base16(str: string) {
  const crc = crc64(str);
  return crc.toString(16);
}
