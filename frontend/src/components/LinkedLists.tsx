import { Link } from "react-router-dom";
import { money } from "../lib/format";
import type { Contact, Deal } from "../lib/types";
import { CloseDate } from "../pages/Deals";
import { StageTag, StatusTag } from "./ui";

const th = "h-9 px-6 text-left text-xs font-semibold text-muted";
const td = "h-11 px-6 border-t border-soft/80";

export function LinkedContacts({ contacts, showOrganization }: { contacts: Contact[]; showOrganization?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Name</th>
          {showOrganization && <th className={th}>Organization</th>}
          <th className={th}>Job title</th>
          <th className={th}>Email</th>
          <th className={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id}>
            <td className={td}>
              <Link to={`/contacts/${c.id}`} className="font-semibold hover:underline">
                {c.name}
              </Link>
            </td>
            {showOrganization && <td className={td}>{c.organization_name}</td>}
            <td className={td}>{c.job_title}</td>
            <td className={td}>{c.email}</td>
            <td className={td}>
              <StatusTag status={c.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LinkedDeals({ deals, showOrganization }: { deals: Deal[]; showOrganization?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Name</th>
          {showOrganization && <th className={th}>Organization</th>}
          <th className={th}>Stage</th>
          <th className={`${th} text-right`}>Value</th>
          <th className={th}>Close date</th>
        </tr>
      </thead>
      <tbody>
        {deals.map((d) => (
          <tr key={d.id}>
            <td className={td}>
              <Link to={`/deals/${d.id}`} className="font-semibold hover:underline">
                {d.name}
              </Link>
            </td>
            {showOrganization && <td className={td}>{d.organization_name}</td>}
            <td className={td}>
              <StageTag stage={d.stage} />
            </td>
            <td className={`${td} text-right font-mono text-[13px]`}>{money(d.value)}</td>
            <td className={`${td} font-mono text-[13px]`}>
              <CloseDate deal={d} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
