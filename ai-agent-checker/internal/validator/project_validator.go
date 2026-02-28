package validator

import (
	"errors"
	"os"
	"path/filepath"
)

var ErrProjectNotFound = errors.New("project not found")

// ProjectValidator validates that a project exists under the projects directory.
type ProjectValidator struct {
	projectsDir string
}

// New creates a new ProjectValidator.
func New(projectsDir string) *ProjectValidator {
	return &ProjectValidator{projectsDir: projectsDir}
}

// Validate checks that project_name exists as a directory under projectsDir.
// Returns the full path if valid, or ErrProjectNotFound if not.
func (v *ProjectValidator) Validate(projectName string) (string, error) {
	if projectName == "" {
		return "", ErrProjectNotFound
	}
	// Prevent path traversal
	if filepath.Clean(projectName) != projectName || filepath.Base(projectName) != projectName {
		return "", ErrProjectNotFound
	}
	path := filepath.Join(v.projectsDir, projectName)
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", ErrProjectNotFound
		}
		return "", err
	}
	if !info.IsDir() {
		return "", ErrProjectNotFound
	}
	return path, nil
}
