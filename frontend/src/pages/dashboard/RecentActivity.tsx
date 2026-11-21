import { Link } from "react-router-dom";
import { ActivityIcon } from "../../components/Timeline";
import { Panel } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import type { Activity } from "../../lib/types";

export function RecentActivity({ items }: { items: Activity[] }) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">Recent activity</h2>
      <p className="mt-0.5 mb-2 text-[13px] text-muted">Notes, calls, emails and stage changes</p>
      {items.length === 0 ? (
        <p className="py-6 text-center text-muted">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-soft/70" data-testid="recent-activity">
          {items.map((a) => {
            const link = a.deal_id
              ? { to: "/deals/" + a.deal_id, text: a.deal_name }
              : a.contact_id
                ? { to: "/contacts/" + a.contact_id, text: a.contact_name }
                : null;
            return (
              <li key={a.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-2.5">
                <ActivityIcon type={a.type} />
                <div className="min-w-0">
                  <p className="font-medium break-words">{a.description}</p>
                  {link && (
                    <Link to={link.to} className="text-[12.5px] font-semibold text-info-text hover:underline">
                      {link.text}
                    </Link>
                  )}
                </div>
                <span className="font-mono text-xs whitespace-nowrap text-muted">{formatDateTime(a.occurred_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
