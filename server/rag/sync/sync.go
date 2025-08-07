package sync

import (
        "errors"
        "io/fs"
        "path/filepath"

        git "github.com/go-git/go-git/v5"
        "github.com/go-git/go-git/v5/plumbing"
        "xcontrol/server/rag/config"
)

// Repo synchronizes the configured repository and returns markdown file paths.
// The returned boolean indicates whether new commits were pulled.
func Repo(c config.Repo) ([]string, bool, error) {
        changed := false
        if _, err := git.PlainOpen(c.Local); err != nil {
                opts := &git.CloneOptions{URL: c.URL}
                if c.Branch != "" {
                        opts.ReferenceName = plumbing.NewBranchReferenceName(c.Branch)
                        opts.SingleBranch = true
                }
                if _, err := git.PlainClone(c.Local, false, opts); err != nil {
                        return nil, false, err
                }
                changed = true
        } else {
                r, err := git.PlainOpen(c.Local)
                if err != nil {
                        return nil, false, err
                }
                w, err := r.Worktree()
                if err != nil {
                        return nil, false, err
                }
                pullOpts := &git.PullOptions{RemoteName: "origin"}
                if c.Branch != "" {
                        pullOpts.ReferenceName = plumbing.NewBranchReferenceName(c.Branch)
                        pullOpts.SingleBranch = true
                }
                if err := w.Pull(pullOpts); err != nil {
                        if !errors.Is(err, git.NoErrAlreadyUpToDate) {
                                return nil, false, err
                        }
                } else {
                        changed = true
                }
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
	return files, changed, nil
}
