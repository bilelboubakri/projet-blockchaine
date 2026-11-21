import { jsPDF } from 'jspdf';
import { computeSHA256 } from './cryptoUtils';

/**
 * Génère un Diplôme Universitaire Officiel en PDF (format A4 paysage)
 * Design académique prestige avec bordures dorées et sceau officiel
 */
export function generateDiplomaPDF({
  nom           = '',
  prenom        = '',
  cin           = '',
  filiere       = 'Master Informatique & Cybersécurité',
  mention       = 'Très Bien',
  annee         = '2024-2025',
  nomUniversite = 'Université de Technologie & Blockchain',
  dateEmission  = new Date().toLocaleDateString('fr-FR'),
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  // Numéro de série unique pour garantir un hash différent à chaque génération
  const serial = `CRT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  // Fond légèrement crème
  doc.setFillColor(254, 253, 248);
  doc.rect(0, 0, W, H, 'F');

  // Bordure dorée extérieure
  doc.setDrawColor(180, 140, 30);
  doc.setLineWidth(3);
  doc.rect(8, 8, W - 16, H - 16);

  // Bordure intérieure fine
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, W - 26, H - 26);

  // Coins décoratifs
  doc.setDrawColor(180, 140, 30);
  doc.setLineWidth(1);
  const cs = 10;
  [[15, 15 + cs, 15, 15], [W - 15, W - 15 - cs, 15, 15],
   [15, 15 + cs, H - 15, H - 15], [W - 15, W - 15 - cs, H - 15, H - 15]
  ].forEach(([x1, x2, y1, y2]) => doc.line(x1, y1, x2, y2));

  // Nom de l'université
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text("MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE", W / 2, 24, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text(nomUniversite.toUpperCase(), W / 2, 33, { align: 'center' });

  // Séparateur doré
  doc.setDrawColor(180, 140, 30);
  doc.setLineWidth(0.7);
  doc.line(W / 2 - 60, 38, W / 2 + 60, 38);

  // Titre du diplôme
  doc.setFont('times', 'bolditalic');
  doc.setTextColor(160, 110, 20);
  doc.setFontSize(28);
  doc.text('DIPLÔME NATIONAL', W / 2, 52, { align: 'center' });

  doc.setDrawColor(180, 140, 30);
  doc.setLineWidth(0.7);
  doc.line(W / 2 - 60, 56, W / 2 + 60, 56);

  // Texte de remise
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10.5);
  doc.text('Vu les procès-verbaux des délibérations du jury, il est décerné à :', W / 2, 68, { align: 'center' });

  // Nom de l'étudiant
  doc.setFont('times', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  const nomComplet = `${prenom} ${nom}`.toUpperCase().trim();
  doc.text(nomComplet, W / 2, 81, { align: 'center' });

  // Numéro CIN / Identifiant (s'il est renseigné)
  if (cin && cin.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text(`N° Identité / CIN : ${cin.trim()}`, W / 2, 87, { align: 'center' });
  }

  doc.setDrawColor(200, 215, 230);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 70, 90, W / 2 + 70, 90);

  // Texte du cursus
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text('Le grade de qualification et certification académique en :', W / 2, 97, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.text(filiere, W / 2, 106, { align: 'center' });

  // Mention et année
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text(`Mention : ${mention}  |  Promotion : ${annee}`, W / 2, 116, { align: 'center' });

  doc.text(`Fait le ${dateEmission}`, W / 2, 124, { align: 'center' });

  // Signatures
  doc.setFont('times', 'bolditalic');
  doc.setTextColor(60, 80, 100);
  doc.setFontSize(10);
  doc.text('Le Président du Jury', 70, 148, { align: 'center' });
  doc.line(40, 142, 100, 142);

  doc.text('Le Président de l\'Université', W / 2, 148, { align: 'center' });
  doc.line(W / 2 - 35, 142, W / 2 + 35, 142);

  doc.text('Le Directeur des Études', W - 70, 148, { align: 'center' });
  doc.line(W - 100, 142, W - 40, 142);

  // Numéro de série et sceau
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 170, 180);
  doc.setFontSize(7);
  doc.text(`N° ${serial} — Document certifié sur Blockchain Ethereum / IPFS`, W / 2, 165, { align: 'center' });

  // Sceau blockchain
  doc.setDrawColor(30, 80, 160);
  doc.setLineWidth(0.5);
  doc.circle(W / 2, 180, 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 80, 160);
  doc.setFontSize(5.5);
  doc.text('CERTIFIÉ SUR BLOCKCHAIN', W / 2, 177, { align: 'center' });
  doc.text('ETHEREUM — IPFS — SHA-256', W / 2, 182, { align: 'center' });
  doc.setFontSize(5);
  doc.text('IMMUABLE ET VÉRIFIABLE', W / 2, 187, { align: 'center' });

  const pdfBlob     = doc.output('blob');
  const pdfDataUri  = doc.output('datauristring');
  const fileName    = `Diplome_${prenom}_${nom}_${serial}.pdf`;

  return { blob: pdfBlob, dataUri: pdfDataUri, fileName, serial };
}

/**
 * Fonction pratique générant un PDF avec calcul direct de son empreinte SHA-256 (bytes32)
 */
export async function generateAcademicPDF({
  nomEtudiant,
  nom,
  prenom,
  cin,
  filiere,
  annee,
  mention
}) {
  let nomFinal = nom || '';
  let prenomFinal = prenom || '';
  if (nomEtudiant && (!nom || !prenom)) {
    const parts = nomEtudiant.trim().split(' ');
    prenomFinal = parts[0] || 'Étudiant';
    nomFinal = parts.slice(1).join(' ') || 'Certifié';
  }

  const { blob, fileName, serial } = generateDiplomaPDF({
    nom: nomFinal,
    prenom: prenomFinal,
    cin: cin || '',
    filiere,
    annee,
    mention
  });

  const file = new File([blob], fileName, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const { bytes32Hash } = await computeSHA256(file);

  return {
    file,
    blob,
    blobUrl,
    bytes32Hash,
    fileName,
    serial
  };
}
