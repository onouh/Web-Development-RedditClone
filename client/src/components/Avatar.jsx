import { colorFor, initials } from '../lib/format.js';
import { mediaUrl } from '../lib/api.js';

export default function Avatar({ name = '?', src = '', size = 32, square = false, className = '' }) {
  const shape = square ? 'rounded-lg' : 'rounded-full';
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };

  if (src) {
    return (
      <img
        src={mediaUrl(src)}
        alt=""
        style={style}
        className={`${shape} shrink-0 object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <span
      style={{ ...style, backgroundColor: colorFor(name) }}
      className={`${shape} inline-flex shrink-0 items-center justify-center font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
