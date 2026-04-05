const CHEMICAL_CATEGORY_HINTS = [
  'chemical',
  'acid',
  'base',
  'solvent',
  'reagent',
  'drug',
  'antibiotic',
  'analgesic',
  'sedative',
  'iv fluid',
  'emergency',
  'pharmacology',
];

const looksChemical = (item = {}) => {
  const category = String(item.category || '').toLowerCase();
  const name = String(item.itemName || item.name || '').toLowerCase();
  const combined = `${category} ${name}`;
  return CHEMICAL_CATEGORY_HINTS.some((hint) => combined.includes(hint));
};

const generateAiAbstract = (item = {}) => {
  if (!looksChemical(item)) return '';

  const itemName = String(item.itemName || item.name || 'This chemical').trim();
  const category = String(item.category || 'laboratory chemical').trim();
  const storage = String(item.storageLocation || 'designated chemical storage').trim();
  const quantity = Number(item.quantity || 0);
  const quantityUnit = String(item.quantityUnit || 'units').trim();
  const lowerName = itemName.toLowerCase();

  let useCase = 'used for supervised teaching, formulation practice, and laboratory demonstration.';
  let precautions = 'Wear appropriate PPE, use it only under supervision, and keep the container closed when not in use.';
  let avoid = 'Avoid direct contact, inhalation of fumes or dust, and mixing with incompatible chemicals without authorization.';

  if (lowerName.includes('acid')) {
    useCase = 'used for pH adjustment, titration work, cleaning protocols, and controlled reaction studies.';
    precautions = 'Wear gloves, eye protection, and a lab coat; handle in a ventilated area and add acid to water, not the reverse.';
    avoid = 'Avoid contact with skin and eyes, incompatible bases, metals, and sudden dilution without proper procedure.';
  } else if (lowerName.includes('solvent') || lowerName.includes('ethanol')) {
    useCase = 'used as a solvent for preparation, extraction, cleaning, and sample handling in laboratory work.';
    precautions = 'Keep away from heat and ignition sources, and work in a well-ventilated area.';
    avoid = 'Avoid open flames, sparks, and mixing with strong oxidizers unless a protocol explicitly allows it.';
  } else if (lowerName.includes('antibiotic')) {
    useCase = 'used in laboratory and teaching settings to study antimicrobial handling, dosage, or formulation concepts.';
    precautions = 'Handle carefully, follow dosage or demonstration protocol, and use sterile technique where required.';
    avoid = 'Avoid unsupervised administration, contamination, and use outside approved teaching or clinical protocol.';
  } else if (lowerName.includes('sedative') || lowerName.includes('diazepam')) {
    useCase = 'used in pharmacology teaching to demonstrate controlled drug handling, dosing concepts, and safety procedures.';
    precautions = 'Treat as a controlled medicine, keep access restricted, and document every use.';
    avoid = 'Avoid unauthorized handling, sharing, or use outside approved supervision and recordkeeping.';
  }

  return [
    `AI-generated summary: ${itemName} is a ${category} item used in educational laboratory workflows.`,
    `It is ${useCase}`,
    `Current recorded stock is ${quantity} ${quantityUnit}, stored at ${storage}.`,
    `Precautions: ${precautions}`,
    `Avoid: ${avoid}`,
    `This summary is generated automatically because no admin or PubMed abstract is available; verify with official references before critical use.`
  ].join(' ');
};

const decorateInventoryAbstract = (item) => {
  const plain = typeof item?.toObject === 'function' ? item.toObject() : { ...item };
  const manualOrPubmedAbstract = String(plain.abstract || '').trim();
  const hasPubmedId = Boolean(String(plain.pubmedId || '').trim());

  if (manualOrPubmedAbstract) {
    return {
      ...plain,
      displayAbstract: manualOrPubmedAbstract,
      abstractSource: hasPubmedId ? 'pubmed' : 'manual',
      isAiGenerated: false,
    };
  }

  const aiAbstract = generateAiAbstract(plain);
  return {
    ...plain,
    displayAbstract: aiAbstract,
    abstractSource: aiAbstract ? 'ai-generated' : 'none',
    isAiGenerated: Boolean(aiAbstract),
  };
};

module.exports = {
  decorateInventoryAbstract,
};
