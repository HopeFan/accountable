import { Search } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import {
  SEARCH_GROUPS,
  useSearch,
  type SearchHit,
  type SearchKind,
  type SearchResults,
} from "../lib/search";
import { cx } from "./ui";

interface Option {
  kind: SearchKind;
  hit: SearchHit;
  domId: string;
}

const optionsOf = (data: SearchResults | undefined, base: string): Option[] =>
  SEARCH_GROUPS.flatMap(({ kind }) =>
    (data?.[kind] ?? []).map((hit) => ({
      kind,
      hit,
      domId: `${base}-${kind}-${hit.id}`,
    })),
  );

function useSearchState() {
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const query = text.trim();
  const debounced = useDebouncedValue(query, 250);
  const { data } = useSearch(debounced);
  // Results only count once they belong to what is typed now.
  const ready = query !== "" && debounced === query ? data : undefined;
  return {
    text,
    setText,
    dismissed,
    setDismissed,
    active,
    setActive,
    query,
    ready,
  };
}

export function SearchBox() {
  const base = useId();
  const navigate = useNavigate();
  const s = useSearchState();
  const options = optionsOf(s.ready, base);
  const open = !s.dismissed && s.ready !== undefined;
  const listId = `${base}-list`;

  const choose = (o: Option) => {
    navigate(`/${o.kind}/${o.hit.id}`);
    s.setText("");
    s.setActive(-1);
  };
  const move = (step: number) => {
    if (options.length === 0) return;
    s.setDismissed(false);
    s.setActive((s.active + step + options.length) % options.length);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else if (e.key === "Escape") s.setDismissed(true);
    else if (e.key === "Enter" && open && options[s.active])
      choose(options[s.active]);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className="relative mr-auto w-full max-w-sm"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) s.setDismissed(true);
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open ? options[s.active]?.domId : undefined}
        aria-label="Search"
        placeholder="Search organizations, contacts and deals"
        autoComplete="off"
        value={s.text}
        onChange={(e) => {
          s.setText(e.target.value);
          s.setDismissed(false);
          s.setActive(-1);
        }}
        onFocus={() => s.setDismissed(false)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-full bg-page pr-4 pl-9 text-sm text-ink ring-1 ring-field-ring placeholder:text-muted"
      />
      {open && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 rounded-xl bg-panel p-1.5 shadow-[var(--shadow-lift)]">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">
              No results for {s.query}
            </p>
          ) : (
            <Results
              id={listId}
              data={s.ready!}
              options={options}
              active={s.active}
              onChoose={choose}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Results({
  id,
  data,
  options,
  active,
  onChoose,
}: {
  id: string;
  data: SearchResults;
  options: Option[];
  active: number;
  onChoose: (o: Option) => void;
}) {
  return (
    <div id={id} role="listbox" aria-label="Search results">
      {SEARCH_GROUPS.filter(({ kind }) => data[kind].length > 0).map(
        ({ kind, label }) => (
          <div key={kind} role="group" aria-labelledby={`${id}-${kind}`}>
            <div
              id={`${id}-${kind}`}
              className="px-3 pt-2 pb-1 text-xs font-semibold text-muted"
            >
              {label}
            </div>
            {options
              .filter((o) => o.kind === kind)
              .map((o) => (
                <div
                  key={o.domId}
                  id={o.domId}
                  role="option"
                  aria-selected={options[active] === o}
                  onMouseDown={(e) => e.preventDefault()}
                  tabIndex={-1}
                  onClick={() => onChoose(o)}
                  onKeyDown={(e) => e.key === "Enter" && onChoose(o)}
                  className={cx(
                    "cursor-pointer rounded-lg px-3 py-2 hover:bg-soft",
                    options[active] === o && "bg-soft",
                  )}
                >
                  <div className="text-sm text-ink">{o.hit.name}</div>
                  <div className="text-xs text-muted">{o.hit.context}</div>
                </div>
              ))}
          </div>
        ),
      )}
    </div>
  );
}
