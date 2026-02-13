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

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
