import { SearchBox } from "./SearchBox";
import { UserMenu } from "./UserMenu";

export function TopBar() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <SearchBox />
      <UserMenu />
    </div>
  );
}
