// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DiplomaRegistry
 * @author CertiChain — Projet Académique Blockchain
 * @notice Registre décentralisé et infalsifiable de diplômes universitaires
 * @dev Déployé sur Ethereum Sepolia Testnet (ou Polygon Amoy)
 *
 * Chaque diplôme est identifié par l'empreinte SHA-256 de son fichier PDF.
 * Seul le déployeur du contrat (l'université / owner) peut émettre ou révoquer.
 * N'importe qui peut vérifier gratuitement (fonction view, sans gas).
 */
contract DiplomaRegistry {

    // ─────────────────────────────────────────────────────────────────────────
    // STRUCTURES DE DONNÉES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Représente un diplôme certifié sur la blockchain
     * @param hashPdf     Empreinte SHA-256 du fichier PDF (32 octets = bytes32)
     * @param nomEtudiant Nom complet de l'étudiant diplômé
     * @param filiere     Intitulé complet du cursus / spécialité
     * @param annee       Année académique (ex: "2024-2025")
     * @param dateEmission Horodatage immuable de la transaction (block.timestamp)
     * @param ipfsCid     CID IPFS du fichier PDF scellé (stockage décentralisé)
     * @param valide      Statut légal : true = valide, false = révoqué
     * @param existe      Sentinelle d'existence pour éviter les itérations coûteuses
     */
    struct Diplome {
        bytes32 hashPdf;
        string  nomEtudiant;
        string  filiere;
        string  annee;
        uint256 dateEmission;
        string  ipfsCid;
        bool    valide;
        bool    existe;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAT DU CONTRAT (STOCKAGE ON-CHAIN)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Adresse du propriétaire du contrat (l'université)
    address public owner;

    /// @notice Nom de l'établissement universitaire
    string public nomEtablissement;

    /// @notice Registre principal : empreinte SHA-256 → Diplôme
    mapping(bytes32 => Diplome) public diplomes;

    /// @notice Liste de tous les hashes pour permettre l'itération
    bytes32[] public tousLesHashes;

    // ─────────────────────────────────────────────────────────────────────────
    // ÉVÉNEMENTS (Indexés sur la blockchain pour recherche facile)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Émis chaque fois qu'un nouveau diplôme est ancré
     * @param hashPdf      Empreinte SHA-256 du PDF
     * @param nomEtudiant  Nom du diplômé
     * @param filiere      Spécialité académique
     * @param ipfsCid      CID IPFS du document
     * @param dateEmission Horodatage blockchain (Unix timestamp)
     */
    event DiplomeEmis(
        bytes32 indexed hashPdf,
        string  nomEtudiant,
        string  filiere,
        string  ipfsCid,
        uint256 dateEmission
    );

    /**
     * @notice Émis lors de la révocation officielle d'un diplôme
     * @param hashPdf        Empreinte SHA-256 du PDF révoqué
     * @param dateRevocation Horodatage de la révocation
     */
    event DiplomeRevoque(
        bytes32 indexed hashPdf,
        uint256 dateRevocation
    );

    /**
     * @notice Émis lors de la réactivation d'un diplôme précédemment révoqué
     * @param hashPdf          Empreinte SHA-256 du PDF réactivé
     * @param dateReactivation Horodatage de la réactivation
     */
    event DiplomeReactive(
        bytes32 indexed hashPdf,
        uint256 dateReactivation
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODIFICATEURS (Contrôle d'Accès)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Restreint l'exécution au seul propriétaire du contrat (l'université)
     * @dev Toute tentative par un compte tiers déclenche un revert immédiat
     */
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "DiplomaRegistry: Seule l'universite (owner) peut effectuer cette action"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTEUR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Déploie le contrat et enregistre l'université comme owner
     * @param _nomEtablissement Nom officiel de l'université
     */
    constructor(string memory _nomEtablissement) {
        owner = msg.sender;
        nomEtablissement = _nomEtablissement;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FONCTIONS D'ÉCRITURE (onlyOwner — coûtent du gas)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Émet et ancre un diplôme de manière permanente sur la blockchain
     * @dev Seul l'owner (université) peut appeler cette fonction
     * @param _hashPdf      Empreinte SHA-256 du PDF au format bytes32 (0x...)
     * @param _nomEtudiant  Nom complet de l'étudiant
     * @param _filiere      Intitulé du cursus académique
     * @param _annee        Année académique (ex: "2024-2025")
     * @param _ipfsCid      CID IPFS du fichier PDF décentralisé
     */
    function emettreDiplome(
        bytes32 _hashPdf,
        string  memory _nomEtudiant,
        string  memory _filiere,
        string  memory _annee,
        string  memory _ipfsCid
    ) external onlyOwner {
        require(_hashPdf != bytes32(0),          "Hash PDF invalide (ne peut pas etre zero)");
        require(!diplomes[_hashPdf].existe,      "Ce diplome est deja enregistre dans le registre");
        require(bytes(_nomEtudiant).length > 0,  "Le nom de l'etudiant est requis");
        require(bytes(_filiere).length > 0,      "La filiere est requise");

        diplomes[_hashPdf] = Diplome({
            hashPdf:      _hashPdf,
            nomEtudiant:  _nomEtudiant,
            filiere:      _filiere,
            annee:        _annee,
            dateEmission: block.timestamp,
            ipfsCid:      _ipfsCid,
            valide:       true,
            existe:       true
        });

        tousLesHashes.push(_hashPdf);
        emit DiplomeEmis(_hashPdf, _nomEtudiant, _filiere, _ipfsCid, block.timestamp);
    }

    /**
     * @notice Révoque officiellement un diplôme (fraude, erreur de délibération)
     * @dev L'enregistrement reste sur la blockchain, seul le statut change
     * @param _hashPdf Empreinte SHA-256 du diplôme à révoquer
     */
    function revoquerDiplome(bytes32 _hashPdf) external onlyOwner {
        require(diplomes[_hashPdf].existe,  "Diplome introuvable dans le registre");
        require(diplomes[_hashPdf].valide,  "Ce diplome est deja revoque");

        diplomes[_hashPdf].valide = false;
        emit DiplomeRevoque(_hashPdf, block.timestamp);
    }

    /**
     * @notice Réactive un diplôme précédemment révoqué
     * @param _hashPdf Empreinte SHA-256 du diplôme à réactiver
     */
    function reactiverDiplome(bytes32 _hashPdf) external onlyOwner {
        require(diplomes[_hashPdf].existe,   "Diplome introuvable dans le registre");
        require(!diplomes[_hashPdf].valide,  "Ce diplome est deja valide");

        diplomes[_hashPdf].valide = true;
        emit DiplomeReactive(_hashPdf, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FONCTIONS DE LECTURE (view — 100% GRATUITES, sans gas)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Vérifie l'authenticité d'un diplôme à partir de son empreinte SHA-256
     * @dev Fonction view = lecture seule, aucune transaction, aucun frais de gas
     * @param _hashPdf Empreinte SHA-256 du PDF à vérifier (calculée localement en JS)
     * @return existe       true si le diplôme est enregistré dans le contrat
     * @return nomEtudiant  Nom du titulaire
     * @return filiere      Cursus académique
     * @return annee        Année d'obtention
     * @return dateEmission Horodatage de certification (Unix timestamp)
     * @return ipfsCid      CID IPFS du document original scellé
     * @return valide       true = valide, false = révoqué officiellement
     */
    function verifierDiplome(bytes32 _hashPdf)
        external
        view
        returns (
            bool    existe,
            string  memory nomEtudiant,
            string  memory filiere,
            string  memory annee,
            uint256 dateEmission,
            string  memory ipfsCid,
            bool    valide
        )
    {
        Diplome memory d = diplomes[_hashPdf];
        return (
            d.existe,
            d.nomEtudiant,
            d.filiere,
            d.annee,
            d.dateEmission,
            d.ipfsCid,
            d.valide
        );
    }

    /**
     * @notice Retourne le nombre total de diplômes enregistrés
     */
    function getNombreDiplomes() external view returns (uint256) {
        return tousLesHashes.length;
    }

    /**
     * @notice Retourne tous les diplômes du registre
     * @dev Attention : coûteux en gas si utilisé en écriture, gratuit en lecture
     */
    function getTousDiplomes() external view returns (Diplome[] memory) {
        uint256 total = tousLesHashes.length;
        Diplome[] memory liste = new Diplome[](total);
        for (uint256 i = 0; i < total; i++) {
            liste[i] = diplomes[tousLesHashes[i]];
        }
        return liste;
    }

    /**
     * @notice Transfert de propriété du contrat vers une nouvelle adresse
     * @param _newOwner Nouvelle adresse propriétaire
     */
    function transfererPropriete(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nouvelle adresse invalide");
        owner = _newOwner;
    }
}
