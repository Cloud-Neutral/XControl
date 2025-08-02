package ingest

import (
	"os"
	"path/filepath"

	git "github.com/go-git/go-git/v5"
)

// CloneOrPullRepo clones the repo if not exists or pulls the latest changes.
func CloneOrPullRepo(repoURL, localPath string) error {
	if _, err := os.Stat(filepath.Join(localPath, ".git")); os.IsNotExist(err) {
		_, err := git.PlainClone(localPath, false, &git.CloneOptions{URL: repoURL})
		return err
	}
	r, err := git.PlainOpen(localPath)
	if err != nil {
		return err
	}
	w, err := r.Worktree()
	if err != nil {
		return err
	}
	return w.Pull(&git.PullOptions{RemoteName: "origin"})
}
