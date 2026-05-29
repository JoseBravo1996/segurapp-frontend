export function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function findKeyword(transcript, keywords) {
  const text = normalize(transcript);
  if (!text) return null;

  for (const word of keywords) {
    const key = normalize(word);
    if (key && text.includes(key)) return word;
  }
  return null;
}
