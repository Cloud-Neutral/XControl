package auth

// Provider defines a generic authentication provider.
type Provider interface {
	Authenticate(username, password string) (string, error)
}
