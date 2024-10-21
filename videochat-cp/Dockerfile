FROM golang:1.23.1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main .

FROM alpine:3.18

RUN adduser -D appuser

WORKDIR /app

COPY --from=builder /app/main .
COPY config.yaml .
COPY scripts/entrypoint.sh .

RUN chown -R appuser:appuser /app && \
    chmod +x entrypoint.sh

USER appuser

ENTRYPOINT ["./entrypoint.sh"]
CMD ["./main", "--config", "config.yaml"]
