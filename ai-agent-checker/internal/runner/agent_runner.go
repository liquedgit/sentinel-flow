package runner

import (
	"bytes"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
)

// RunParams holds parameters for an agent security review run.
type RunParams struct {
	ProjectPath     string
	Endpoint        string
	ProhibitedRoles []string
}

// AgentRunner executes the configured agent CLI (e.g. OpenCode) with a security prompt.
type AgentRunner struct {
	promptFile string
	agentCmd   string
}

// New creates a new AgentRunner.
func New(promptFile, agentCmd string) *AgentRunner {
	return &AgentRunner{promptFile: promptFile, agentCmd: agentCmd}
}

// Run loads the prompt template, substitutes placeholders, and executes the agent CLI.
func (r *AgentRunner) Run(params RunParams) error {
	tmplBytes, err := os.ReadFile(r.promptFile)
	if err != nil {
		return fmt.Errorf("read prompt file: %w", err)
	}

	tmpl, err := template.New("prompt").Parse(string(tmplBytes))
	if err != nil {
		return fmt.Errorf("parse prompt template: %w", err)
	}

	// Format prohibited roles for template
	prohibitedRolesStr := strings.Join(params.ProhibitedRoles, ", ")
	data := struct {
		Endpoint        string
		ProhibitedRoles string
	}{
		Endpoint:        params.Endpoint,
		ProhibitedRoles: prohibitedRolesStr,
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("render prompt: %w", err)
	}

	tmpFile, err := os.CreateTemp("", "agent-checker-prompt-*.txt")
	if err != nil {
		return fmt.Errorf("create temp prompt file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(buf.Bytes()); err != nil {
		tmpFile.Close()
		return fmt.Errorf("write temp prompt file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("close temp prompt file: %w", err)
	}

	userPrompt := "Perform a security review of the API endpoint. Analyze the codebase for broken access control (RBAC) and report findings."

	// Run from project directory; agent CLI expects to be in project context
	cmd := exec.Command(r.agentCmd, "run", "--file", tmpFile.Name(), userPrompt)
	cmd.Dir = params.ProjectPath
	cmd.Env = os.Environ()

	stdout, stderr := &bytes.Buffer{}, &bytes.Buffer{}
	cmd.Stdout = stdout
	cmd.Stderr = stderr

	slog.Info("running agent", "project", filepath.Base(params.ProjectPath), "endpoint", params.Endpoint)
	if err := cmd.Run(); err != nil {
		slog.Error("agent run failed", "error", err, "stderr", stderr.String())
		return fmt.Errorf("agent execution: %w", err)
	}

	if stdout.Len() > 0 {
		slog.Info("agent output", "stdout", stdout.String())
	}
	return nil
}
