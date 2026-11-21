import { useState } from "react";

/** State for the add/edit dialog and the delete confirmation of one kind of record. */
export function useRecordState<T>() {
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  return { editing, setEditing, deleting, setDeleting };
}
