const axios = require('axios');

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const parseAbstractFromText = (text) => {
  if (!text) return '';

  const lines = String(text).split(/\r?\n/);
  const abstractLines = [];
  let collecting = false;

  for (const line of lines) {
    if (line.startsWith('AB  - ')) {
      collecting = true;
      abstractLines.push(line.replace('AB  - ', '').trim());
      continue;
    }

    if (collecting) {
      if (/^[A-Z]{2,4}\s+-\s+/.test(line)) {
        break;
      }

      if (line.trim().length === 0) {
        continue;
      }

      abstractLines.push(line.trim());
    }
  }

  return abstractLines.join(' ').replace(/\s+/g, ' ').trim();
};

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
    const [summaryResponse, abstractResponse] = await Promise.all([
      axios.get(`${PUBMED_BASE_URL}/esummary.fcgi`, {
        params: {
          db: 'pubmed',
          id: pmid,
          retmode: 'json',
          tool: 'PharmLab',
          email: 'pharmalab@example.com',
        },
        timeout: 5000,
      }),
      axios.get(`${PUBMED_BASE_URL}/efetch.fcgi`, {
        params: {
          db: 'pubmed',
          id: pmid,
          rettype: 'abstract',
          retmode: 'text',
          tool: 'PharmLab',
          email: 'pharmalab@example.com',
        },
        timeout: 5000,
      })
    ]);

    const uid = String(pmid);
    const summary = summaryResponse.data?.result?.[uid] || {};
    const abstract = parseAbstractFromText(abstractResponse.data);

    return {
      pmid: uid,
      title: summary.title || '',
      abstract,
      authors: summary.authors || [],
      pubDate: summary.pubdate || '',
    };
  } catch (error) {
    console.error('PubMed fetch error:', error.message);

    try {
      const fallbackResponse = await axios.get(`${PUBMED_BASE_URL}/esummary.fcgi`, {
      params: {
        db: 'pubmed',
        id: pmid,
        retmode: 'json',
        tool: 'PharmLab',
        email: 'pharmalab@example.com',
      },
      timeout: 5000,
    });

      const uid = String(pmid);
      const summary = fallbackResponse.data?.result?.[uid];

      if (!summary) return null;

      return {
        pmid: uid,
        title: summary.title || '',
        abstract: '',
        authors: summary.authors || [],
        pubDate: summary.pubdate || '',
      };
    } catch (fallbackError) {
      console.error('PubMed fallback fetch error:', fallbackError.message);
      return null;
    }
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
