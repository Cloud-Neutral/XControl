package sync

import (
	"io/fs"
	"path/filepath"

	git "github.com/go-git/go-git/v5"
	"xcontrol/server/rag/config"
)

// Repo synchronizes the configured repository and returns markdown file paths.
func Repo(c config.Repo) ([]string, error) {
	if _, err := git.PlainOpen(c.Local); err != nil {
		if _, err := git.PlainClone(c.Local, false, &git.CloneOptions{URL: c.URL}); err != nil {
			return nil, err
		}
	} else {
		r, err := git.PlainOpen(c.Local)
		if err != nil {
			return nil, err
		}
		w, err := r.Worktree()
		if err != nil {
			return nil, err
		}
		_ = w.Pull(&git.PullOptions{RemoteName: "origin"})
	}
	var files []string
	for _, p := range c.Paths {
		root := filepath.Join(c.Local, p)
		filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				return nil
			}
			if filepath.Ext(path) == ".md" {
				files = append(files, path)
			}
			return nil
		})
	}
	return files, nil
}
