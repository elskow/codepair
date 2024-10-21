FROM golang:1.23.1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main .

FROM gcr.io/distroless/static

WORKDIR /app

COPY --from=builder /app/main .
COPY config.yaml .

USER nonroot:nonroot

CMD ["./main", "--config", "config.yaml"]
