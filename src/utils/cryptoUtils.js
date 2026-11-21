/**
 * Utilitaires cryptographiques — CertiChain
 * Calcul SHA-256 100% local dans le navigateur via Web Crypto API
 * Aucun fichier n'est envoyé à un serveur externe
 */

/**
 * Calcule l'empreinte SHA-256 d'un fichier (Blob / File / ArrayBuffer)
 * en utilisant l'API native crypto.subtle du navigateur
 */
export async function computeSHA256(fileOrBuffer) {
  let arrayBuffer;

  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (typeof fileOrBuffer === 'string') {
    const encoder = new TextEncoder();
    arrayBuffer = encoder.encode(fileOrBuffer).buffer;
  } else {
    throw new Error("Type d'entrée non supporté pour le hachage SHA-256");
  }

  // Calcul cryptographique via Web Crypto API (standard W3C)
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));

  // Format hexadécimal (64 caractères)
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Format bytes32 Solidity (préfixe 0x + 64 hex = 66 caractères)
  const bytes32Hash = '0x' + hexHash;

  return {
    hexHash,
    bytes32Hash,
    rawBytes: new Uint8Array(hashBuffer),
    fileSize: arrayBuffer.byteLength
  };
}

/**
 * Raccourcit un hash/adresse pour affichage compact
 * Ex: 0x9b3d8ed1...6ceaa
 */
export function shortenHash(hash, chars = 6) {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Raccourcit une adresse Ethereum (0x1234...5678)
 */
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formate une taille de fichier (octets → Ko/Mo)
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formate un timestamp Unix en date lisible
 */
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
