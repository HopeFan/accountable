import { Link } from "react-router-dom";
import { PageHeader, Panel, buttonClass } from "../components/ui";

export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <>
      <PageHeader title="Not found" />
      <Panel>
        <div className="flex flex-col items-start gap-4">
          <p>This {what} doesn't exist. It may have been deleted.</p>
          <Link to="/" className={buttonClass.secondary}>
            Back to the dashboard
          </Link>
        </div>
      </Panel>
    </>
  );
}
