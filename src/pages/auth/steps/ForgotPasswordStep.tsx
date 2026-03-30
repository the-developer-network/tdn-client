interface ForgotPasswordStepProps {
  identifier: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function ForgotPasswordStep({ identifier, isLoading, onChange, onSubmit }: ForgotPasswordStepProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-serif text-white text-center mb-2">Reset Password</h2>
      <p className="text-white/50 text-sm text-center mb-8">Enter your email to receive a reset link.</p>

      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email address"
          value={identifier}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !identifier.includes('@')}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>
    </div>
  );
}