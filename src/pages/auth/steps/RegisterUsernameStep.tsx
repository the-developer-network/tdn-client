interface RegisterUsernameStepProps {
  identifier: string;
  username: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function RegisterUsernameStep({ identifier, username, isLoading, onChange, onNext }: RegisterUsernameStepProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-serif text-white text-center mb-2">Create an account</h2>
      <p className="text-white/50 text-sm text-center mb-8">{identifier}</p>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && username && onNext()}
          className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={onNext}
          disabled={isLoading || !username}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}