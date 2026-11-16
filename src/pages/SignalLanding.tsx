import { ArrowRight, ArrowUpRight, Boxes, Radio, Route, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";

const capabilities = [
  {
    number: "01",
    title: "Broadcast",
    description: "Compose, schedule and review campaigns from one controlled workspace.",
    icon: Radio,
  },
  {
    number: "02",
    title: "Audience",
    description: "Keep segments, forms and engagement signals close to the message.",
    icon: Boxes,
  },
  {
    number: "03",
    title: "Journeys",
    description: "Turn triggers and decisions into visible, inspectable customer flows.",
    icon: Route,
  },
] as const;

const signalRows = [
  { label: "Campaign", value: "Editorial release", status: "Ready" },
  { label: "Audience", value: "Qualified readers", status: "Synced" },
  { label: "Journey", value: "Welcome sequence", status: "Active" },
] as const;

export default function SignalLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0d0c0a] text-[#f0ece3]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0c0a]/94 px-5 backdrop-blur-md sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between py-5">
          <Link to="/" className="group flex items-baseline gap-1" aria-label="SIGNAL home">
            <span className="font-serif text-2xl font-black tracking-[-0.06em] sm:text-3xl">
              SIGNAL
            </span>
            <span className="h-1.5 w-1.5 bg-[#d62e2e] transition-transform group-hover:scale-150" />
          </Link>

          <nav aria-label="Public navigation" className="flex items-center gap-3 sm:gap-7">
            <a
              href="#capabilities"
              className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-white sm:block"
            >
              Capabilities
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 font-sans text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:border-[#d62e2e] hover:bg-[#d62e2e] sm:px-5"
            >
              Sign in <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[620px] max-w-[1500px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:px-12 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-12 bg-[#d62e2e]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff6b67]">
                Controlled technical pilot
              </span>
            </div>

            <h1 className="max-w-4xl font-serif text-[clamp(3.35rem,7.4vw,8.4rem)] font-medium leading-[0.84] tracking-[-0.065em]">
              Campaigns, audiences and automations
              <span className="block font-editorial italic text-white/42">under one signal.</span>
            </h1>

            <p className="mt-9 max-w-2xl font-body text-lg leading-relaxed text-white/66 sm:text-xl">
              A self-hosted operating surface for teams that want campaign production, audience
              intelligence and customer journeys to stay connected.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#9f1717] px-7 font-sans text-xs font-black uppercase tracking-[0.14em] text-[#fff] transition-colors hover:bg-[#bd2020]"
              >
                Enter workspace <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                href="https://github.com/hazarvolga/Signal"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/18 px-7 font-sans text-xs font-black uppercase tracking-[0.14em] transition-colors hover:border-white/50 hover:bg-white/5"
              >
                View source <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-xl lg:mx-0 lg:ml-auto"
            aria-label="SIGNAL operating surface preview"
          >
            <div className="absolute -inset-8 bg-[radial-gradient(circle_at_center,rgba(185,28,28,.2),transparent_68%)] blur-2xl" />
            <div className="relative border border-white/13 bg-[#15130f]/92 shadow-[0_36px_100px_rgba(0,0,0,.48)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
                  Signal control / Live surface
                </span>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Active
                </span>
              </div>

              <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr]">
                <div className="border-r border-white/10 px-3 py-6 sm:px-5">
                  <div className="space-y-6 font-mono text-[8px] uppercase tracking-[0.15em] text-white/35">
                    <p className="text-[#ff6b67]">Overview</p>
                    <p>Broadcasts</p>
                    <p>Audience</p>
                    <p>Journeys</p>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="mb-8 flex items-end justify-between gap-5">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/38">
                        Operating pulse
                      </p>
                      <p className="mt-2 font-editorial text-4xl italic tracking-tight sm:text-5xl">
                        Connected
                      </p>
                    </div>
                    <div className="hidden h-12 items-end gap-1 sm:flex" aria-hidden="true">
                      {[26, 41, 32, 54, 38, 64, 48, 72, 58].map((height, index) => (
                        <span
                          key={`${height}-${index}`}
                          className="w-1 bg-[#d62e2e]"
                          style={{ height: `${height}%`, opacity: 0.35 + index * 0.06 }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-white/9 border-y border-white/9">
                    {signalRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-4"
                      >
                        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
                          {row.label}
                        </span>
                        <span className="font-sans text-xs font-semibold text-white/82">
                          {row.value}
                        </span>
                        <span className="border border-emerald-500/40 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-emerald-400">
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.15em] text-white/32">
                    <span>Self-hosted stack</span>
                    <span>Postgres · Redis · Workers</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="capabilities" className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto grid max-w-[1500px] md:grid-cols-3">
            {capabilities.map(({ number, title, description, icon: Icon }) => (
              <article
                key={title}
                className="group border-b border-white/10 px-6 py-10 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:px-10 lg:py-12"
              >
                <div className="mb-9 flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/34">
                    {number}
                  </span>
                  <Icon
                    size={20}
                    strokeWidth={1.4}
                    className="text-[#ff6b67] transition-transform group-hover:rotate-6 group-hover:scale-110"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-editorial text-4xl italic">{title}</h2>
                <p className="mt-4 max-w-sm font-body text-sm leading-7 text-white/56">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-[#0a0908] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-white/34 sm:flex-row">
          <span>SIGNAL Broadcast Systems</span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={13} aria-hidden="true" /> Human-reviewed operations
          </span>
        </div>
      </footer>
    </div>
  );
}
