interface QuoteSectionProps {
  quote: string;
  author?: string;
  role?: string;
}

export default function QuoteSection({ quote, author, role }: QuoteSectionProps) {
  return (
    <section className="flex min-h-[40vh] w-full items-center justify-center bg-[#0a0a0a] px-6 py-16 md:py-20">
      <div className="max-w-6xl text-center">
        <h2 className="font-serif text-3xl font-normal leading-snug text-[#ededed] md:text-5xl lg:text-6xl">
          {quote}
        </h2>
        {author && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="font-medium text-lg text-[#ededed]">{author}</div>
            {role && <div className="text-sm text-gray-400">{role}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
