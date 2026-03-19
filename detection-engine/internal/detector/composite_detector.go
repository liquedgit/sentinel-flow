package detector

import (
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// ViolationWithInfo wraps a violation with its type for easier handling.
type ViolationWithInfo struct {
	Violation     *repository.Violation
	ViolationType repository.ViolationType
}

// CompositeDetector combines RBAC and IDOR detectors.
type CompositeDetector struct {
	rbacDetector *Detector
	idorDetector *IDORDetector
}

// NewCompositeDetector creates a new CompositeDetector.
func NewCompositeDetector(rbac *Detector, idor *IDORDetector) *CompositeDetector {
	return &CompositeDetector{
		rbacDetector: rbac,
		idorDetector: idor,
	}
}

// DetectAll returns all violations found (RBAC and/or IDOR) for a request.
// A single request can trigger both RBAC and IDOR violations.
func (d *CompositeDetector) DetectAll(log *repository.RequestLog) []*ViolationWithInfo {
	var results []*ViolationWithInfo

	// Check RBAC
	if d.rbacDetector != nil && d.rbacDetector.ShouldAlert(log) {
		results = append(results, &ViolationWithInfo{
			Violation: &repository.Violation{
				Timestamp:      log.Timestamp,
				NormalizedPath: log.NormalizedPath,
				UserID:         log.UserID,
				Role:           log.Role,
				ExpectedRoles:  d.rbacDetector.ExpectedRoles(log.NormalizedPath),
				ViolationType:  repository.ViolationTypeVerticalIDOR,
				RequestLogID:   log.RequestLogID,
			},
			ViolationType: repository.ViolationTypeVerticalIDOR,
		})
	}

	// Check IDOR
	if d.idorDetector != nil && d.idorDetector.ShouldAlert(log) {
		owner := d.idorDetector.GetOwner(log)
		resourceID := d.idorDetector.GetResourceID(log)
		results = append(results, &ViolationWithInfo{
			Violation: &repository.Violation{
				Timestamp:      log.Timestamp,
				NormalizedPath: log.NormalizedPath,
				UserID:         log.UserID,
				Role:           log.Role,
				ExpectedUsers:  []string{owner},
				ResourceID:     resourceID,
				ViolationType:  repository.ViolationTypeHorizontalIDOR,
				RequestLogID:   log.RequestLogID,
			},
			ViolationType: repository.ViolationTypeHorizontalIDOR,
		})
	}

	return results
}

// HasAnyViolation returns true if the request triggers any violation (RBAC or IDOR).
func (d *CompositeDetector) HasAnyViolation(log *repository.RequestLog) bool {
	return len(d.DetectAll(log)) > 0
}
