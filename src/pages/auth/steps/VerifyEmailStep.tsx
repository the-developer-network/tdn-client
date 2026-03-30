interface VerifyEmailStepProps {
  identifier: string;
  otp: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export default function VerifyEmailStep({ identifier, otp, isLoading, onChange, onSubmit, onSkip }: VerifyEmailStepProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-serif text-white text-center mb-2">Verify your email</h2>
      <p className="text-white/50 text-sm text-center mb-8">
        We sent an 8-digit code to <span className="text-white/70">{identifier}</span>
      </p>

      <div className="space-y-4">
        <input
          type="text"
          maxLength={8}
          placeholder="8-digit code"
          value={otp}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className="w-full bg-[#121212] border border-white/10 text-white text-center tracking-[0.5em] rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
          autoFocus
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || otp.length !== 8}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      <button
        onClick={onSkip}
        disabled={isLoading}
        className="w-full text-white/50 hover:text-white text-sm mt-6 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}