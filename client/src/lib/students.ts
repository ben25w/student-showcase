// Student list — edit names here to match your actual class roster
// Names are displayed in alphabetical order on the home page
export const STUDENT_NAMES: string[] = [
  "Aden",
  "Armani",
  "Chertam",
  "Davin",
  "EE",
  "Ellie",
  "Insea",
  "Kris",
  "Mr Ben",
  "Ni Ni",
  "Patty",
  "Porsche",
  "Pun",
  "Punn",
  "Skylar",
  "Tisha",
  "Tongfah",
  "Yang Yang",
].sort();

// 20 distinct soft watercolor pastels — one per student slot
// Each is a pair: [light center, deeper edge] for radial gradient
export const PASTEL_PALETTE: Array<{ light: string; deep: string; text: string }> = [
  { light: "#FFF0F3", deep: "#FFB3C1", text: "#7a2d3e" }, // blush rose
  { light: "#FFF4E6", deep: "#FFCA8A", text: "#7a4a10" }, // warm peach
  { light: "#FFFBE6", deep: "#FFE566", text: "#6b5800" }, // butter yellow
  { light: "#F0FFF4", deep: "#86EFAC", text: "#166534" }, // mint green
  { light: "#F0F9FF", deep: "#7DD3FC", text: "#0c4a6e" }, // sky blue
  { light: "#F5F3FF", deep: "#C4B5FD", text: "#3b0764" }, // soft lavender
  { light: "#FFF0FB", deep: "#F0ABFC", text: "#6b21a8" }, // lilac pink
  { light: "#F0FDFA", deep: "#5EEAD4", text: "#134e4a" }, // aqua teal
  { light: "#FFF7ED", deep: "#FDBA74", text: "#7c2d12" }, // apricot
  { light: "#F0FFF0", deep: "#86EFAC", text: "#14532d" }, // sage
  { light: "#FDF4FF", deep: "#E879F9", text: "#701a75" }, // orchid
  { light: "#ECFDF5", deep: "#6EE7B7", text: "#064e3b" }, // seafoam
  { light: "#FEF9C3", deep: "#FDE047", text: "#713f12" }, // lemon
  { light: "#EFF6FF", deep: "#93C5FD", text: "#1e3a5f" }, // periwinkle
  { light: "#FFF1F2", deep: "#FDA4AF", text: "#881337" }, // coral
  { light: "#F7FEE7", deep: "#BEF264", text: "#3a5c0a" }, // lime
  { light: "#FEFCE8", deep: "#FCD34D", text: "#78350f" }, // golden
  { light: "#F0F4FF", deep: "#A5B4FC", text: "#1e1b4b" }, // iris
  { light: "#FFF8F0", deep: "#FCA5A5", text: "#7f1d1d" }, // salmon
  { light: "#F0FEFF", deep: "#67E8F9", text: "#164e63" }, // cyan
];

/**
 * Returns a shuffled version of the palette indices, seeded per page load.
 * Students always appear alphabetically; only the color assignment shuffles.
 */
export function getShuffledPaletteIndices(): number[] {
  const indices = Array.from({ length: PASTEL_PALETTE.length }, (_, i) => i);
  // Fisher-Yates with Math.random (changes each page load)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
