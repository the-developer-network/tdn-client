interface LoginStepProps {
  identifier: string;
  password: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
}

export default function LoginStep({ identifier, password, isLoading, onChange, onSubmit, onForgotPassword }: LoginStepProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-serif text-white text-center mb-2">Welcome back</h2>
      <p className="text-white/50 text-sm text-center mb-8">{identifier}</p>

      <div className="space-y-4">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !password}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

      <button
        onClick={onForgotPassword}
        className="w-full text-white/50 hover:text-white text-sm mt-6 transition-colors"
      >
        Forgot password?
      </button>
    </div>
  );
}