/**
 * Service IPFS — CertiChain
 * Upload des fichiers PDF vers IPFS via Pinata (stockage décentralisé)
 * Fallback : simulation de CID déterministe si pas de JWT Pinata
 */

/**
 * Téléverse un fichier PDF sur IPFS via l'API Pinata
 * @param {Blob|File} file      Le fichier PDF à publier
 * @param {string}    fileName  Nom du fichier
 * @param {string}    pinataJwt JWT Bearer token Pinata (optionnel)
 * @returns {{ cid: string, url: string }}
 */
export async function uploadToIPFS(file, fileName = 'diplome.pdf', pinataJwt = '') {
  // ── Avec JWT Pinata → Upload réel sur le réseau IPFS mondial ─────────────
  if (pinataJwt && pinataJwt.trim().length > 10) {
    return await uploadViaPinata(file, fileName, pinataJwt.trim());
  }

  // ── Sans JWT → Simulation (CID déterministe basé sur le hash du contenu) ─
  return await generateSimulatedCID(file, fileName);
}

/**
 * Upload réel vers Pinata IPFS
 */
async function uploadViaPinata(file, fileName, jwt) {
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('pinataMetadata', JSON.stringify({
    name: fileName,
    keyvalues: {
      application: 'CertiChain',
      type: 'diplome_academique',
      timestamp: Date.now().toString()
    }
  }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata IPFS Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    pinned: true
  };
}

/**
 * Génère un CID IPFS simulé basé sur le contenu du fichier
 * Utilisé en mode démonstration sans compte Pinata
 */
async function generateSimulatedCID(file, fileName) {
  const buffer    = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  const hexHash    = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Format CIDv1 simulé (commence par bafybei...)
  const cid = `bafybei${hexHash.slice(0, 44)}certichain`;

  return {
    cid,
    url: `https://ipfs.io/ipfs/${cid}`,
    pinned: false // Simulation locale
  };
}

/**
 * Construit l'URL de passerelle IPFS pour afficher/télécharger un fichier
 */
export function getIPFSGatewayUrl(cid) {
  if (!cid) return '#';
  if (cid.startsWith('http')) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}
