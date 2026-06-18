interface Props {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  sublabel?: string;
}

export function BottomActionBar({ label, onClick, disabled, loading, sublabel }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-50"
         style={{ height: '72px' }}>
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 h-full">
        {sublabel && <span className="text-sm text-[#404942]">{sublabel}</span>}
        <button
          onClick={onClick}
          disabled={disabled || loading}
          className="ml-auto flex items-center gap-2 bg-[#1b5e3b] text-white font-semibold px-6 py-2.5 rounded-[10px] text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#004527] transition-colors"
        >
          {loading ? 'Please wait…' : label}
          {!loading && <span>›</span>}
        </button>
      </div>
    </div>
  );
}
