interface AvatarProps {
  src?: string | null;
  username: string;
  size?: number;
  className?: string;
}

const COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-600',
];

function getColor(username: string): string {
  const idx = username.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

export default function Avatar({ src, username, size = 36, className = '' }: AvatarProps) {
  const initials = username.slice(0, 2).toUpperCase();
  const color = getColor(username);

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to initials on error
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-full ${color} flex items-center justify-center flex-shrink-0 font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
