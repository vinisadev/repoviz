package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	ignore "github.com/sabhiram/go-gitignore"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type FileInfo struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []*FileInfo `json:"children,omitempty"`
}

type FileConnection struct {
	From     string `json:"from"`
	To       string `json:"to"`
	FromFile string `json:"fromFile"`
	ToFile   string `json:"toFile"`
	Type     string `json:"type"`
}

type IgnoreMatcher interface {
	MatchesPath(path string) bool
}

type NoOpMatcher struct{}

func (m *NoOpMatcher) MatchesPath(path string) bool {
	return false
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SelectDirectory opens a directory picker dialog
func (a *App) SelectDirectory() (string, error) {
	dialog, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Repository Directory",
	})
	if err != nil {
		return "", err
	}
	return dialog, nil
}

// ScanRepository scans the repository directory and returns a file tree
func (a *App) ScanRepository(dirPath string) (*FileInfo, error) {
	absPath, err := filepath.Abs(dirPath)
	if err != nil {
		return nil, err
	}

	gitignorePath := filepath.Join(absPath, ".gitignore")
	var matcher IgnoreMatcher
	if _, err := os.Stat(gitignorePath); err == nil {
		gitignoreObj, err := ignore.CompileIgnoreFile(gitignorePath)
		if err == nil {
			matcher = gitignoreObj
		} else {
			matcher = &NoOpMatcher{}
		}
	} else {
		matcher = &NoOpMatcher{}
	}

	return a.buildFileTree(absPath, "", matcher)
}

func (a *App) buildFileTree(basePath string, relativePath string, matcher IgnoreMatcher) (*FileInfo, error) {
	fullPath := filepath.Join(basePath, relativePath)

	file, err := os.Stat(fullPath)
	if err != nil {
		return nil, err
	}

	info := &FileInfo{
		Name:  file.Name(),
		Path:  relativePath,
		IsDir: file.IsDir(),
	}

	if !file.IsDir() {
		return info, nil
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return info, nil
	}

	var children []*FileInfo
	for _, entry := range entries {
		entryName := entry.Name()

		if strings.HasPrefix(entryName, ".") {
			continue
		}

		entryRelativePath := filepath.Join(relativePath, entryName)

		if matcher.MatchesPath(entryRelativePath) {
			continue
		}

		child, err := a.buildFileTree(basePath, entryRelativePath, matcher)
		if err != nil {
			continue
		}
		children = append(children, child)
	}

	info.Children = children
	return info, nil
}

// GetFileConnections analyzes the repository and returns all file connections
func (a *App) GetFileConnections(dirPath string) ([]FileConnection, error) {
	absPath, err := filepath.Abs(dirPath)
	if err != nil {
		return nil, err
	}

	gitignorePath := filepath.Join(absPath, ".gitignore")
	var matcher IgnoreMatcher
	if _, err := os.Stat(gitignorePath); err == nil {
		gitignoreObj, err := ignore.CompileIgnoreFile(gitignorePath)
		if err == nil {
			matcher = gitignoreObj
		} else {
			matcher = &NoOpMatcher{}
		}
	} else {
		matcher = &NoOpMatcher{}
	}

	return a.analyzeConnections(absPath, "", matcher)
}

func (a *App) analyzeConnections(basePath string, relativePath string, matcher IgnoreMatcher) ([]FileConnection, error) {
	fullPath := filepath.Join(basePath, relativePath)

	file, err := os.Stat(fullPath)
	if err != nil {
		return nil, err
	}

	if !file.IsDir() {
		connections, err := a.extractFileConnections(basePath, relativePath)
		if err != nil {
			return nil, err
		}
		return connections, nil
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	var allConnections []FileConnection
	for _, entry := range entries {
		entryName := entry.Name()

		if strings.HasPrefix(entryName, ".") {
			continue
		}

		entryRelativePath := filepath.Join(relativePath, entryName)

		if matcher.MatchesPath(entryRelativePath) {
			continue
		}

		connections, err := a.analyzeConnections(basePath, entryRelativePath, matcher)
		if err != nil {
			continue
		}
		allConnections = append(allConnections, connections...)
	}

	return allConnections, nil
}

func (a *App) extractFileConnections(basePath string, relativePath string) ([]FileConnection, error) {
	fullPath := filepath.Join(basePath, relativePath)
	ext := strings.ToLower(filepath.Ext(relativePath))

	if ext != ".go" && ext != ".ts" && ext != ".tsx" && ext != ".js" && ext != ".jsx" && ext != ".py" {
		return []FileConnection{}, nil
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, err
	}

	var connections []FileConnection
	contentStr := string(content)
	lines := strings.Split(contentStr, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)

		var importPatterns []string
		var connectionType string

		switch ext {
		case ".go":
			if strings.HasPrefix(line, `import "`) || strings.HasPrefix(line, `import . "`) {
				importPatterns = []string{`import "`, `import . "`}
				connectionType = "import"
			} else if strings.Contains(line, `" `) && strings.Contains(line, `github.com/`) {
				importPatterns = []string{`" `}
				connectionType = "external"
			}
		case ".ts", ".tsx", ".js", ".jsx":
			if strings.HasPrefix(line, `import `) && strings.Contains(line, `from`) {
				importPatterns = []string{`from "`, `from '`}
				connectionType = "import"
			}
		case ".py":
			if strings.HasPrefix(line, `import `) || strings.HasPrefix(line, `from `) {
				importPatterns = []string{`import `, `from `}
				connectionType = "import"
			}
		}

		for _, pattern := range importPatterns {
			if strings.Contains(line, pattern) {
				target := a.extractTarget(line, pattern)
				if target != "" {
					connections = append(connections, FileConnection{
						From:     relativePath,
						To:       target,
						FromFile: filepath.Base(relativePath),
						ToFile:   filepath.Base(target),
						Type:     connectionType,
					})
				}
			}
		}
	}

	return connections, nil
}

func (a *App) extractTarget(line, pattern string) string {
	idx := strings.Index(line, pattern)
	if idx == -1 {
		return ""
	}

	start := idx + len(pattern)
	end := strings.IndexAny(line[start:], `"'`)
	if end == -1 {
		return ""
	}

	target := line[start : start+end]

	if strings.Contains(target, " ") {
		parts := strings.Split(target, " ")
		for _, part := range parts {
			if strings.Contains(part, `"`) || strings.Contains(part, `'`) {
				return a.cleanTarget(part)
			}
		}
	}

	return a.cleanTarget(target)
}

func (a *App) cleanTarget(target string) string {
	target = strings.TrimSpace(target)
	target = strings.Trim(target, `'"`)
	target = strings.Split(target, " ")[0]
	return target
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
