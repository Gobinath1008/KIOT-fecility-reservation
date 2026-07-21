// Helper function to extract key department stems
export function matchDepartment(deptA, deptB) {
  const cleanA = (deptA || '').toUpperCase();
  const cleanB = (deptB || '').toUpperCase();

  if (!cleanA || !cleanB) return false;

  // Exact match
  if (cleanA === cleanB) return true;

  // Direct substring matches
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  // Extract core keywords (e.g., MECHANICAL, COMPUTER, ELECTRONICS, CIVIL, ELECTRICAL, INFORMATION, MBA, MCA)
  const getKeywords = (str) => {
    const list = [];
    if (str.includes('MECHANICAL') || str.includes('MECH')) list.push('MECHANICAL');
    if (str.includes('COMPUTER SCIENCE') || str.includes('CSE') || str.includes('SOFTWARE')) list.push('COMPUTER');
    if (str.includes('INFORMATION TECHNOLOGY') || str.includes('IT')) list.push('INFORMATION_TECH');
    if (str.includes('CIVIL')) list.push('CIVIL');
    if (str.includes('ELECTRICAL') || str.includes('EEE')) list.push('ELECTRICAL');
    if (str.includes('ELECTRONICS') || str.includes('ECE') || str.includes('VLSI')) list.push('ELECTRONICS');
    if (str.includes('MBA') || str.includes('BUSINESS') || str.includes('ENTREPRENEURSHIP')) list.push('MBA');
    if (str.includes('MCA') || str.includes('APPLICATIONS')) list.push('MCA');
    if (str.includes('SAFETY') || str.includes('INDUSTRIAL')) list.push('SAFETY');
    return list;
  };

  const keywordsA = getKeywords(cleanA);
  const keywordsB = getKeywords(cleanB);

  // Check if they share any matching primary subject area keyword
  return keywordsA.some(keyword => keywordsB.includes(keyword));
}
