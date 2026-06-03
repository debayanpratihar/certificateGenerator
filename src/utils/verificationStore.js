const STORAGE_KEY = 'cert_verifications';

export const saveVerificationMapping = (map) => {
  const existing = getVerificationMappings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...map }));
};

export const getVerificationMappings = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

export const getVerificationData = (id) => getVerificationMappings()[id];

export const clearVerificationMappings = () => localStorage.removeItem(STORAGE_KEY);