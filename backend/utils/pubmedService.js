const axios = require('axios');

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Search for a chemical/drug on PubMed and return top results
 * @param {string} searchTerm - Chemical name to search for
 * @returns {Promise<Array>} Array of search results with IDs
 */
const searchPubMed = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const response = await axios.get(`${PUBMED_BASE_URL}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: `${searchTerm}[Title/Abstract] AND (chemical OR drug OR compound)`,
        retmax: 5,
        rettype: 'json',
        tool: 'PharmLab',
        email: 'pharmalab@example.com',
      },
      timeout: 5000,
    });

    const ids = response.data?.esearchresult?.idlist || [];
    return ids;
  } catch (error) {
    console.error('PubMed search error:', error.message);
    return [];
  }
};

/**
 * Fetch abstract for a PubMed article by ID
 * @param {string} pmid - PubMed ID
 * @returns {Promise<Object>} Article with abstract
 */
const fetchAbstractByPmid = async (pmid) => {
  try {
    const response = await axios.get(`${PUBMED_BASE_URL}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: pmid,
        rettype: 'json',
        tool: 'PharmLab',
        email: 'pharmalab@example.com',
      },
      timeout: 5000,
    });

    const articles = response.data?.result?.uids
      ? response.data.result.uids.map((uid) => ({
          pmid: uid,
          title: response.data.result[uid]?.[0]?.title || '',
          abstract: response.data.result[uid]?.[0]?.abstract || '',
          authors: response.data.result[uid]?.[0]?.authors || [],
          pubDate: response.data.result[uid]?.[0]?.pubdate || '',
        }))
      : [];

    return articles[0] || null;
  } catch (error) {
    console.error('PubMed fetch error:', error.message);
    return null;
  }
};

/**
 * Get abstract for a chemical - searches PubMed and returns top result's abstract
 * @param {string} chemicalName - Name of the chemical
 * @returns {Promise<Object>} Contains abstract, pmid, and title
 */
const getChemicalAbstract = async (chemicalName) => {
  try {
    if (!chemicalName || chemicalName.trim().length === 0) {
      return { abstract: '', pmid: '', title: '', source: 'manual' };
    }

    // Search for the chemical
    const pmids = await searchPubMed(chemicalName);
    
    if (pmids.length === 0) {
      return { abstract: '', pmid: '', title: '', source: 'no_results' };
    }

    // Fetch the first result
    const article = await fetchAbstractByPmid(pmids[0]);
    
    if (!article) {
      return { abstract: '', pmid: '', title: '', source: 'fetch_failed' };
    }

    return {
      abstract: article.abstract || 'No abstract available',
      pmid: article.pmid,
      title: article.title,
      source: 'pubmed',
    };
  } catch (error) {
    console.error('Error getting chemical abstract:', error.message);
    return { abstract: '', pmid: '', title: '', source: 'error', error: error.message };
  }
};

module.exports = {
  searchPubMed,
  fetchAbstractByPmid,
  getChemicalAbstract,
};
