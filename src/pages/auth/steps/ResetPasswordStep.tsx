interface ResetPasswordStepProps {
  identifier: string;
  otp: string;
  newPassword: string;
  isLoading: boolean;
  onOtpChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export default function ResetPasswordStep({
  identifier,
  otp,
  newPassword,
  isLoading,
  onOtpChange,
  onPasswordChange,
  onSubmit,
}: ResetPasswordStepProps) {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-serif text-white text-center mb-2">Reset Password</h2>
      <p className="text-white/50 text-sm text-center mb-8">
        We sent an 8-digit code to <span className="text-white/70">{identifier}</span>
      </p>

      <div className="space-y-4">
        <input
          type="text"
          maxLength={8}
          placeholder="8-digit code"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newPassword && onSubmit()}
          className="w-full bg-[#121212] border border-white/10 text-white text-center tracking-[0.5em] rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
          autoFocus
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || otp.length !== 8 || !newPassword}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}