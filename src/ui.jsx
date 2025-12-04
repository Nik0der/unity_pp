import React from 'react';
export const Card = ({className="", children}) => (
  <div className={`bg-neutral-900/60 border border-neutral-800 rounded-2xl shadow-soft ${className}`}>{children}</div>
);

export const Button = ({variant="primary", className="", ...props}) => {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white active:translate-y-[0.5px]",
    ghost: "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800",
    subtle: "bg-neutral-800/60 hover:bg-neutral-800 text-neutral-100",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
};

export const Section = ({title, right, children}) => (
  <section className="mb-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-100">{title}</h2>
      {right}
    </div>
    <Card className="p-4">{children}</Card>
  </section>
);

export const Skeleton = ({className=""}) => (
  <div className={`animate-pulse rounded-md bg-neutral-800/80 ${className}`} />
);
