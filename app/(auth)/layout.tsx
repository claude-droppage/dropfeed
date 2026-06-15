export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-bg-void px-5 py-10">
      <div className="mb-8">
        <span className="font-mono text-lg font-medium text-text-hi">
          dropfeed<span className="text-heat">_</span>
        </span>
      </div>
      {children}
    </div>
  )
}
