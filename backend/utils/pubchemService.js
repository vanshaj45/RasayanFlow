const axios = require('axios');

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

const normalizeCasNumber = (casNumber = '') => String(casNumber).trim();

const fetchFirstCidByCas = async (casNumber) => {
  const normalizedCas = normalizeCasNumber(casNumber);
  if (!normalizedCas) return '';

  const response = await axios.get(`${PUBCHEM_BASE_URL}/compound/xref/RegistryID/${encodeURIComponent(normalizedCas)}/cids/JSON`, {
    timeout: 8000,
  });

  const cid = response.data?.IdentifierList?.CID?.[0];
  return cid ? String(cid) : '';
};

const fetchCompoundProperties = async (cid) => {
  if (!cid) return null;

  const response = await axios.get(
    `${PUBCHEM_BASE_URL}/compound/cid/${encodeURIComponent(cid)}/property/Title,MolecularFormula,SMILES,ConnectivitySMILES,InChI,IUPACName/JSON`,
    { timeout: 8000 }
  );

  return response.data?.PropertyTable?.Properties?.[0] || null;
};

const fetchCompoundSynonyms = async (cid) => {
  if (!cid) return [];

  const response = await axios.get(`${PUBCHEM_BASE_URL}/compound/cid/${encodeURIComponent(cid)}/synonyms/JSON`, {
    timeout: 8000,
  });

  return response.data?.InformationList?.Information?.[0]?.Synonym || [];
};

const pickChemicalName = (properties, synonyms = []) => {
  const preferred = [
    properties?.Title,
    properties?.IUPACName,
    ...synonyms,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);

  return preferred ? preferred.trim() : '';
};

const fetchChemicalDataByCas = async (casNumber) => {
  const normalizedCas = normalizeCasNumber(casNumber);
  if (!normalizedCas) {
    return { found: false, source: 'pubchem', message: 'CAS number is required.' };
  }

  try {
    const cid = await fetchFirstCidByCas(normalizedCas);
    if (!cid) {
      return { found: false, source: 'pubchem', message: 'No PubChem record found for this CAS number.' };
    }

    const [properties, synonyms] = await Promise.all([
      fetchCompoundProperties(cid),
      fetchCompoundSynonyms(cid),
    ]);

    if (!properties) {
      return { found: false, source: 'pubchem', message: 'PubChem record was found, but no properties were returned.' };
    }

    return {
      found: true,
      source: 'pubchem',
      cid,
      data: {
        chemicalName: pickChemicalName(properties, synonyms),
        casNumber: normalizedCas,
        chemicalFormula: properties.MolecularFormula || '',
        smiles: properties.SMILES || properties.ConnectivitySMILES || '',
        inchi: properties.InChI || '',
        pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      },
    };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) {
      return { found: false, source: 'pubchem', message: 'No PubChem record found for this CAS number.' };
    }

    throw new Error(`PubChem lookup failed: ${error.message}`);
  }
};

module.exports = {
  fetchChemicalDataByCas,
};
