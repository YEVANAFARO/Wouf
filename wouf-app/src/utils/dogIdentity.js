const DOG_COLORS = ['#FF6B6B', '#00F0C0', '#58C4FF', '#A78BFA', '#FFD640', '#FF9F43', '#FF7EB3'];

function hashDogKey(value) {
  const raw = String(value || '');
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDogAccentColor(dog) {
  const key = dog?.id || dog?.name || 'default';
  return DOG_COLORS[hashDogKey(key) % DOG_COLORS.length];
}

