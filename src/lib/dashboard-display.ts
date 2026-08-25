export function calendarMonthKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function depositActiveStage(status: string) {
  if (status === "completed") return 3;
  if (["pending", "confirming", "partially_paid"].includes(status)) return 1;
  return status === "waiting" ? 0 : -1;
}

export function withdrawalActiveStage(status: string) {
  if (status === "completed") return 2;
  if (["pending", "approved", "processing"].includes(status)) return 1;
  return status === "requested" ? 0 : -1;
}
