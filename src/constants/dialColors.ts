// Standardized dial color options
export const DIAL_COLORS = [
  "Black",
  "Blue",
  "White",
  "Silver",
  "Gray",
  "Green",
  "Red",
  "Orange",
  "Gold",
  "Bronze",
  "Brown",
  "Beige",
  "Champagne",
  "Cream",
  "Navy",
  "Teal",
  "Burgundy",
  "Yellow",
  "Pink",
  "Purple",
  "Salmon",
  "Anthracite",
  "Mother of Pearl",
  "Skeleton",
] as const;

export type DialColor = (typeof DIAL_COLORS)[number];
