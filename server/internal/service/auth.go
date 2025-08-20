package service

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/MicahParks/keyfunc"
    "github.com/golang-jwt/jwt/v4"
    "github.com/google/uuid"
    "xcontrol/server/internal/model"
)

var (
    jwksURL       = "https://account.svc.plus/.well-known/jwks.json"
    jwks          *keyfunc.JWKS
    sessionSecret = []byte(os.Getenv("SESSION_SECRET"))
)

func init() {
    var err error
    jwks, err = keyfunc.Get(jwksURL, keyfunc.Options{})
    if err != nil {
        fmt.Printf("failed to get jwks: %v\n", err)
    }
    if len(sessionSecret) == 0 {
        sessionSecret = []byte("dev-secret")
    }
}

type oidcClaims struct {
    Email   string `json:"email"`
    Name    string `json:"name"`
    Picture string `json:"picture"`
    jwt.RegisteredClaims
}

func AuthenticateOIDC(ctx context.Context, token string) (*model.User, string, error) {
    parsed, err := jwt.ParseWithClaims(token, &oidcClaims{}, jwks.Keyfunc)
    if err != nil || !parsed.Valid {
        return nil, "", fmt.Errorf("invalid token: %w", err)
    }
    claims, ok := parsed.Claims.(*oidcClaims)
    if !ok {
        return nil, "", fmt.Errorf("invalid claims")
    }
    user := model.User{OIDCSubject: claims.Subject}
    attrs := model.User{ID: uuid.NewString()}
    assign := model.User{
        Email:     claims.Email,
        Name:      claims.Name,
        AvatarURL: claims.Picture,
        Active:    true,
    }
    if err := db.WithContext(ctx).
        Where(&model.User{OIDCSubject: claims.Subject}).
        Attrs(attrs).
        Assign(assign).
        FirstOrCreate(&user).Error; err != nil {
        return nil, "", err
    }
    session, err := issueSession(&user)
    if err != nil {
        return nil, "", err
    }
    return &user, session, nil
}

func issueSession(u *model.User) (string, error) {
    claims := jwt.RegisteredClaims{
        Subject:   u.ID,
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
    }
    t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return t.SignedString(sessionSecret)
}

