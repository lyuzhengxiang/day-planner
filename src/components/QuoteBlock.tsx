interface QuoteBlockProps {
  quote: string;
}

export default function QuoteBlock({ quote }: QuoteBlockProps) {
  return (
    <div className="border-l-2 border-gray-700 pl-4 my-4">
      <p className="text-gray-400 text-sm italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
