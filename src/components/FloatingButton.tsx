'use client';

interface FloatingButtonProps {
  onClick: () => void;
  label?: string;
}

export default function FloatingButton({ onClick, label }: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-gold-dim to-gold text-royal-bg rounded-full shadow-lg shadow-gold/30 hover:brightness-110 active:brightness-90 flex items-center justify-center transition-all z-40"
      aria-label={label || 'Add'}
    >
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
