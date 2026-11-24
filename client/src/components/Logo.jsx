import { Link } from 'react-router-dom';

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#FF4500" />
      <circle cx="29.5" cy="9" r="3.2" fill="#fff" />
      <path d="M20 13.6c-5.3 0-9.8 1.9-11.4 4.5-1 .3-1.8 1.2-1.8 2.3 0 .9.5 1.6 1.3 2 .4 4.1 5.4 7.4 11.9 7.4s11.5-3.3 11.9-7.4c.8-.4 1.3-1.1 1.3-2 0-1.1-.8-2-1.8-2.3-1.6-2.6-6.1-4.5-11.4-4.5Z" fill="#fff" />
      <circle cx="15.9" cy="21.1" r="2" fill="#0B1416" />
      <circle cx="24.1" cy="21.1" r="2" fill="#0B1416" />
      <path d="M14.6 25.4c1 .9 2.6 1.4 5.4 1.4s4.4-.5 5.4-1.4" stroke="#0B1416" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M20 13.9 21.9 6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Threadit home">
      <LogoMark />
      {!compact && (
        <span className="hidden text-[22px] font-bold tracking-tight text-ink sm:block">
          thread<span className="text-accent">it</span>
        </span>
      )}
    </Link>
  );
}
