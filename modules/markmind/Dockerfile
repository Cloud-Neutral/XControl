# Build XControl API including markmind module
FROM golang:1.21 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /markmind ./cmd/api

FROM gcr.io/distroless/base-debian12
WORKDIR /
COPY --from=builder /markmind /markmind
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/markmind"]
