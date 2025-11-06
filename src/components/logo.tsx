import Link from 'next/link';

const LogoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L4 5V11C4 16.5 7.5 21.5 12 23C16.5 21.5 20 16.5 20 11V5L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path 
      d="M8 17L11 14L13 16L16 13L16 7L10 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);


export function Logo({ large = false, href = "/dashboard" }: { large?: boolean, href?: string }) {
  return (
    <Link href={href} className="flex items-center justify-center gap-2 text-logo focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm">
      <LogoIcon className={large ? "h-10 w-10" : "h-8 w-8"} />
      <div className="flex flex-col items-center">
        <span className={`font-headline font-bold leading-none ${large ? 'text-xl' : 'text-lg'}`}>
            GIAG LINK
        </span>
      </div>
    </Link>
  );
}
