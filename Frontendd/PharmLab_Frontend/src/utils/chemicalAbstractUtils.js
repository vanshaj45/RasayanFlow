/**
 * Chemical Abstract Management Utilities
 * Helps fetch and display PubMed abstracts for chemical items in the store
 */

/**
 * Format abstract text to show truncated version
 * @param {string} abstract - Full abstract text
 * @param {number} maxLength - Maximum characters to display (default 300)
 * @returns {string} Truncated abstract with ellipsis
 */
export const truncateAbstract = (abstract, maxLength = 300) => {
  if (!abstract || abstract.length <= maxLength) {
    return abstract;
  }
  return abstract.substring(0, maxLength) + '...';
};

/**
 * Get PubMed URL for a given PubMed ID
 * @param {string} pmid - PubMed ID
 * @returns {string} Full URL to PubMed article
 */
export const getPubmedUrl = (pmid) => {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}`;
};

/**
 * Format chemical info for display
 * @param {Object} item - Store item object
 * @returns {Object} Formatted object with display data
 */
export const formatChemicalInfo = (item) => {
  return {
    name: item.itemName || 'Unnamed Chemical',
    code: item.itemCode || '',
    category: item.category || '',
    subCategory: item.subCategory || '',
    description: item.description || '',
    abstract: item.abstract || '',
    pubmedId: item.pubmedId || '',
    hasAbstract: Boolean(item.abstract && item.abstract.trim().length > 0),
    pubmedUrl: item.pubmedId ? getPubmedUrl(item.pubmedId) : '',
  };
};

/**
 * Validate if a chemical should have an abstract
 * (only chemicals, not glassware)
 * @param {Object} item - Store item object
 * @returns {boolean} True if item is a chemical
 */
export const isChemical = (item) => {
  return item && item.category === 'Chemical';
};

/**
 * Extract key information from PubMed response
 * @param {Object} abstractData - Response from fetchChemicalAbstract API
 * @returns {Object} Cleaned data
 */
export const extractAbstractInfo = (abstractData) => {
  if (!abstractData) {
    return { abstract: '', pmid: '', hasError: true };
  }

  return {
    abstract: abstractData.abstract || 'No abstract available',
    pmid: abstractData.pmid || '',
    title: abstractData.title || '',
    source: abstractData.source || 'unknown',
    hasError: abstractData.source === 'error',
    errorMessage: abstractData.error || '',
  };
};
