import { pdfjs } from 'react-pdf';

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const GOTHIC_THEME = {
  bg: 'bg-[#0f0f0f]',
  card: 'bg-[#1a1a1a]',
  border: 'border-[#2a2a2a]',
  accent: 'text-[#8a0303]',
  gold: 'text-[#d4af37]',
  text: 'text-[#e0e0e0]',
  textMuted: 'text-[#a0a0a0]',
  button: 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#d4af37] border border-[#d4af37]/30 transition-all duration-300',
  buttonPrimary: 'bg-[#8a0303] hover:bg-[#a00404] text-white border border-[#ff0000]/20 shadow-[0_0_15px_rgba(138,3,3,0.4)] transition-all duration-300',
};
