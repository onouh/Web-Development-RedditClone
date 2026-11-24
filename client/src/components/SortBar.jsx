import { useRef, useState } from 'react';
import { ChevronDown, Flame, Sparkles, Clock3, TrendingUp } from 'lucide-react';
import useClickOutside from '../hooks/useClickOutside.js';

const TIME_LABELS = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

export default function SortBar({ sort, time, onChange, right = null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => onChange({ sort: 'hot', time: 'all' })}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            sort === 'hot' ? 'bg-chip text-ink' : 'text-muted hover:bg-hover'
          }`}
        >
          <Flame size={15} /> Hot
        </button>
        <button
          type="button"
          onClick={() => onChange({ sort: 'new', time: 'all' })}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            sort === 'new' ? 'bg-chip text-ink' : 'text-muted hover:bg-hover'
          }`}
        >
          <Sparkles size={15} /> New
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value);
              if (sort !== 'top') onChange({ sort: 'top', time: 'week' });
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              sort === 'top' ? 'bg-chip text-ink' : 'text-muted hover:bg-hover'
            }`}
          >
            <TrendingUp size={15} /> Top <ChevronDown size={13} />
          </button>
          {open && (
            <div className="absolute left-0 top-full z-30 mt-2 w-40 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated py-1 shadow-pop">
              {Object.entries(TIME_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onChange({ sort: 'top', time: value });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-hover ${
                    time === value && sort === 'top' ? 'font-semibold text-accent' : ''
                  }`}
                >
                  <Clock3 size={14} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ml-auto">{right}</div>
    </div>
  );
}
