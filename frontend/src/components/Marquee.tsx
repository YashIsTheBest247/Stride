interface Props {
  items: string[];
}

export default function Marquee({ items }: Props) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee border-y border-white/[0.05] bg-white/[0.01] py-4">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-6 pr-10">
            <span className="h-1.5 w-1.5 rounded-full bg-sap-400" />
            <span className="display text-2xl text-sap-50 whitespace-nowrap">
              {item}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
