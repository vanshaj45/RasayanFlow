const styles = ['fun-emoji', 'notionists', 'pixel-art', 'bottts-neutral'];

const hashString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getUserAvatarUrl = (user) => {
  const seedBase = user?.id || user?._id || user?.email || user?.name || 'pharmlab-user';
  const hash = hashString(seedBase);
  const style = styles[hash % styles.length];
  const seed = encodeURIComponent(`${seedBase}-${hash % 1000}`);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
};
