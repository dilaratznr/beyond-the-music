import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Base>
  );
}

export function IconGenre(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Base>
  );
}

export function IconArtist(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 2a4 4 0 0 0-4 4v4a4 4 0 1 0 8 0V6a4 4 0 0 0-4-4z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
    </Base>
  );
}

export function IconAlbum(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Base>
  );
}

export function IconSong(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9 17V4h10" />
      <circle cx="6" cy="17" r="3" />
    </Base>
  );
}

export function IconArchitect(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1" />
      <path d="M14 9h1" />
      <path d="M9 13h1" />
      <path d="M14 13h1" />
      <path d="M10 21v-4h4v4" />
    </Base>
  );
}

export function IconArticle(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </Base>
  );
}

export function IconPath(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M5 8v2a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4" />
    </Base>
  );
}

export function IconMedia(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </Base>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 18c0-2.2-1.8-4-4-4" />
    </Base>
  );
}

export function IconVideo(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </Base>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Base>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Base>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Base>
  );
}

export function IconUpload(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </Base>
  );
}

export function IconStar(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Base>
  );
}

export function IconReview(p: IconProps) {
  // İçi "check"li clipboard — "onay bekleyen içerikler" için.
  return (
    <Base {...p}>
      <path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z" />
      <path d="M8 6H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3" />
      <path d="M9 14l2 2 4-4" />
    </Base>
  );
}

export function IconExternal(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Base>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Base>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M15 18l-6-6 6-6" />
    </Base>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M9 18l6-6-6-6" />
    </Base>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  );
}

export function IconHeadphones(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </Base>
  );
}
