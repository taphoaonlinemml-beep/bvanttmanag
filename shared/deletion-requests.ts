export type DeletionRequestStatus = "pending" | "rejected" | "executed";

export function canCreateDeletionRequest(existingStatuses: DeletionRequestStatus[]) {
  return !existingStatuses.includes("pending");
}

export function resolveDeletionRequest(status: DeletionRequestStatus, action: "reject" | "execute") {
  if (status !== "pending") throw new Error("Yêu cầu không còn ở trạng thái chờ xử lý");
  return action === "reject" ? "rejected" : "executed" as DeletionRequestStatus;
}
