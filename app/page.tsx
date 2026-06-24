import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (
    <div className="relative">
      {/* Ambient depth: two soft accent fields, fixed and non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 18% 0%, rgba(52,211,153,0.08), transparent 60%), radial-gradient(55% 45% at 85% 15%, rgba(96,165,250,0.07), transparent 60%)",
        }}
      />
      <Dashboard />
    </div>
  );
}
