"use client";

import React from "react";

/* Domani design system primitives.
   Colour discipline: cyan appears on action, active state, and focus only.
   Hierarchy is carried by type size and weight, not by colour. */

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[#1F1E1B] bg-[#111110] ${className}`}>{children}</div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.18em] text-[#6B665C]">
      {children}
    </p>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const base =
    "text-sm rounded-lg px-4 py-2 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080706]";
  const variants = {
    primary: "bg-[#B8F0FF] text-[#080706] hover:bg-[#CFF5FF] font-medium",
    secondary: "border border-[#2A2825] text-[#EDE9E2] hover:border-[#3A3833] hover:bg-[#161513]",
    ghost: "text-[#948E80] hover:text-[#EDE9E2]",
    danger: "border border-[#4A2B26] text-[#E88B7D] hover:bg-[#1D1310]",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] px-3 py-2 text-sm text-[#EDE9E2] placeholder:text-[#6B665C] transition-colors focus:border-[#2A2825] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F0FF]/40 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] px-3 py-2 text-sm text-[#EDE9E2] placeholder:text-[#6B665C] transition-colors focus:border-[#2A2825] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F0FF]/40 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] px-3 py-2 text-sm text-[#EDE9E2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F0FF]/40 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

const STATUS_TONES: Record<string, string> = {
  completed: "text-[#7FD1A8] bg-[#7FD1A8]/10 border-[#7FD1A8]/20",
  accepted: "text-[#7FD1A8] bg-[#7FD1A8]/10 border-[#7FD1A8]/20",
  approved: "text-[#7FD1A8] bg-[#7FD1A8]/10 border-[#7FD1A8]/20",
  paid: "text-[#7FD1A8] bg-[#7FD1A8]/10 border-[#7FD1A8]/20",
  done: "text-[#7FD1A8] bg-[#7FD1A8]/10 border-[#7FD1A8]/20",
  in_progress: "text-[#B8F0FF] bg-[#B8F0FF]/10 border-[#B8F0FF]/20",
  review: "text-[#B8F0FF] bg-[#B8F0FF]/10 border-[#B8F0FF]/20",
  pending: "text-[#E8C07D] bg-[#E8C07D]/10 border-[#E8C07D]/20",
  planning: "text-[#E8C07D] bg-[#E8C07D]/10 border-[#E8C07D]/20",
  blocked: "text-[#E88B7D] bg-[#E88B7D]/10 border-[#E88B7D]/20",
  overdue: "text-[#E88B7D] bg-[#E88B7D]/10 border-[#E88B7D]/20",
};

export function StatusChip({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "text-[#948E80] bg-[#948E80]/10 border-[#948E80]/20";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.1em] ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#1F1E1B]">
      <div
        className="h-full rounded-full bg-[#B8F0FF] transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ProgressRing({ value, size = 88 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1F1E1B" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#B8F0FF"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-[family-name:var(--font-dm-mono)] text-lg tabular-nums text-[#EDE9E2]">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-[#948E80]">{title}</p>
      {hint && <p className="mt-1 text-xs text-[#6B665C]">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#161513] ${className}`} />;
}
