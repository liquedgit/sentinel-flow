FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /ai-agent-checker ./cmd/server

FROM ghcr.io/anomalyco/opencode

WORKDIR /app

COPY --from=builder /ai-agent-checker .
COPY prompts/prompt.dat /app/prompt.dat

ENTRYPOINT ["./ai-agent-checker"]
