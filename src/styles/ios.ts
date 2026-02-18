export const iosUi = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif',
  panel:
    'rounded-[24px] border border-black/10 dark:border-white/10 bg-[#f2f2f7] dark:bg-[#1c1c1e] shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.32)]',
  input:
    'w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] px-4 py-3 text-[15px] text-[#111827] dark:text-[#f2f2f7] placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/30 focus:border-[#0a84ff]/50 transition',
  inputCompact:
    'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] px-3 py-2 text-[14px] text-[#111827] dark:text-[#f2f2f7] placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/30 focus:border-[#0a84ff]/50 transition',
  label:
    'px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6b7280] dark:text-[#8e8e93]',
  primaryButton:
    'inline-flex items-center justify-center rounded-2xl bg-[#0a84ff] px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(10,132,255,0.3)] transition hover:bg-[#0077ed] disabled:opacity-50 disabled:shadow-none',
  primaryButtonLarge:
    'inline-flex items-center justify-center rounded-2xl bg-[#0a84ff] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(10,132,255,0.3)] transition hover:bg-[#0077ed] disabled:opacity-50 disabled:shadow-none',
  subtleButton:
    'inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] px-3 py-2 text-[13px] font-medium text-[#111827] dark:text-[#f2f2f7] transition hover:bg-[#f8f9ff] dark:hover:bg-[#343438] disabled:opacity-40',
  dangerButton:
    'inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2c2c2e] px-3 py-3 text-md font-400 text-[#ff3b30] transition hover:bg-[#e03229] active:scale-[0.99]',
} as const
