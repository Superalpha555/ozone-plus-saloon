import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">{title}</h2>
      <div className={`gold-rule mt-5 ${align === "center" ? "mx-auto" : ""}`} />
      {subtitle ? <p className="mt-5 text-[0.95rem] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
    </Reveal>
  );
}
