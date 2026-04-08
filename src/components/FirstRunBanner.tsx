import Link from "next/link";

interface FirstRunBannerProps {
  show: boolean;
}

export default function FirstRunBanner({ show }: FirstRunBannerProps) {
  if (!show) return null;

  return (
    <div className="border border-gray-800 rounded px-4 py-3 mb-6">
      <p className="text-sm text-gray-400">
        Welcome! Set up your email to receive scheduled plan and review notifications.
      </p>
      <Link
        href="/settings"
        className="text-sm text-green-500 hover:text-green-400 mt-1 inline-block"
      >
        Go to Settings &rarr;
      </Link>
    </div>
  );
}
