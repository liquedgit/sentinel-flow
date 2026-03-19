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