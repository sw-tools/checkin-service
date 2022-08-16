import Crc32 from 'crc-32';

export function computeCrc32Hex(str: string) {
  const crc = Crc32.str(str);
  return numberToTwosComplementHex(crc);
}

function numberToTwosComplementHex(num: number) {
  const str = Uint32Array.of(num)[0].toString(16);
  if (str.length % 2 === 0) return str;
  return `0${str}`;
}
