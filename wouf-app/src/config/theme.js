/**
 * WOUF — Theme System
 * Design tokens for dark and light modes
 */

export const DARK = {
  bg: '#060C17',
  bg2: '#0C1525',
  bg3: '#101D30',
  card: '#0F1B2D',
  p: '#00F0C0',    // Primary (turquoise)
  pD: '#00C89E',   // Primary dark
  pG: 'rgba(0,240,192,0.08)',
  a: '#FF5A6E',    // Accent/Error (rouge)
  aG: 'rgba(255,90,110,0.08)',
  g: '#FFD640',    // Gold
  gG: 'rgba(255,214,64,0.08)',
  b: '#58C4FF',    // Blue
  bG: 'rgba(88,196,255,0.08)',
  pu: '#A78BFA',   // Purple
  pk: '#FF7EB3',   // Pink
  o: '#FF9F43',    // Orange
  tx: '#E8EDF5',   // Text primary
  ts: '#8494AA',   // Text secondary
  td: '#3E5068',   // Text disabled
  bd: '#1C2E46',   // Border
  w: '#FFFFFF',
  overlay: 'rgba(6,12,23,0.85)',
};

export const LIGHT = {
  bg: '#F5F7FA',
  bg2: '#FFFFFF',
  bg3: '#EDF0F5',
  card: '#FFFFFF',
  p: '#00B894',
  pD: '#009B7D',
  pG: 'rgba(0,184,148,0.08)',
  a: '#E05265',
  aG: 'rgba(224,82,101,0.06)',
  g: '#E6A800',
  gG: 'rgba(230,168,0,0.06)',
  b: '#2D9CDB',
  bG: 'rgba(45,156,219,0.06)',
  pu: '#7C5CFC',
  pk: '#E84393',
  o: '#E67E22',
  tx: '#1A1A2E',
  ts: '#5E6E82',
  td: '#B0BEC5',
  bd: '#DDE3EA',
  w: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

export const FONTS = {
  heading: 'System', // Remplacer par 'Outfit' après chargement custom font
  body: 'System',    // Remplacer par 'Quicksand'
};

export const SIZES = {
  r: 14,   // Border radius large
  rs: 10,  // Border radius small
  paddingH: 16,
  paddingV: 14,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#00F0C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
};
