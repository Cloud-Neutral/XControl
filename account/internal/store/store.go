package store

type User struct {
	ID       int64
	Username string
	Password string
}

type Store interface {
	CreateUser(u *User) error
}
