
/**
 * Padronização de Data e Hora do Sistema
 */
export const formatDateStandard = (isoString: string) => {
  if (!isoString) return { weekDay: '-', dateTime: '-' };

  const date = new Date(isoString);
  const weekDayRaw = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekDay = weekDayRaw
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return {
    weekDay,
    dateTime: `${day}/${month}/${year} às ${hours}:${minutes}`,
    fullDisplay: `${weekDay}, ${day}/${month}/${year} às ${hours}:${minutes}`
  };
};

/**
 * Helper para formatar o ID visual do produto: DECOTY-{ui_id}
 */
export const formatProductId = (product: { ui_id?: number | string, marca?: string } | undefined | null) => {
  if (!product) return '-';
  const idValue = product.ui_id;
  if (!idValue) return 'DECOTY-?';
  return `DECOTY-${idValue}`;
};

/**
 * Implementação compacta de SHA-256 para ambientes sem Crypto API (não-HTTPS)
 */
const sha256Fallback = (ascii: string) => {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const result = [];
  const words: number[] = [];
  const asciiLength = ascii.length * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let i, j;
  let asciiFull = ascii + '\x80';
  while (asciiFull.length % 64 - 56) asciiFull += '\x00';
  
  for (i = 0; i < asciiFull.length; i++) {
    j = asciiFull.charCodeAt(i);
    if (j >> 8) return ""; // non-ASCII
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  
  words[words.length] = ((asciiLength / maxWord) | 0);
  words[words.length] = (asciiLength | 0);

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w16 = w[i - 16], w15 = w[i - 15], w7 = w[i - 7], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const t1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w16 + s0 + w7 + s1) | 0);
      const t2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      
      hash[7] = hash[6]; hash[6] = hash[5]; hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2]; hash[2] = hash[1]; hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }

    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push((b < 16 ? '0' : '') + b.toString(16));
    }
  }
  return result.join('');
};

/**
 * Gera um hash seguro SHA-256.
 * Usa Web Crypto API se disponível, senão usa fallback consistente.
 */
export const generateHash = async (message: string): Promise<string> => {
  const cleanMsg = message.trim();
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(cleanMsg);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (e) {
      console.warn("Falha no Crypto API, usando fallback JS...");
    }
  }

  // Fallback para ambientes não-HTTPS ou onde Crypto API falhar
  return sha256Fallback(cleanMsg).toLowerCase();
};
