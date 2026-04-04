export enum ViolationType {
  VerticalIDOR = "vertical_idor",   // RBAC violation - role-based access control bypass
  HorizontalIDOR = "horizontal_idor", // IDOR violation - resource ownership bypass
}

export function getViolationTypeLabel(violationType?: string | null): string {
  switch (violationType) {
    case ViolationType.VerticalIDOR:
      return "Vertical IDOR";
    case ViolationType.HorizontalIDOR:
      return "Horizontal IDOR";
    default:
      return "Unknown Violation";
  }
}

/** User-facing category: vertical_idor ≈ RBAC bypass, horizontal_idor ≈ IDOR. */
export type ViolationCategory = "RBAC" | "IDOR" | "Unknown";

export function getViolationCategory(
  violationType?: string | null
): ViolationCategory {
  switch (violationType) {
    case ViolationType.VerticalIDOR:
      return "RBAC";
    case ViolationType.HorizontalIDOR:
      return "IDOR";
    default:
      return "Unknown";
  }
}