package main

import (
	"bytes"
	"context"
	"os/exec"
	"time"
)

type ExecutionRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
}

type ExecutionResponse struct {
	Output string `json:"output"`
	Error  string `json:"error"`
}

func executeCode(req ExecutionRequest) ExecutionResponse {
	var cmd *exec.Cmd
	switch req.Language {
	case "go":
		cmd = exec.Command("docker", "run", "--rm", "golang:latest", "go", "run", "-")
	case "python":
		cmd = exec.Command("docker", "run", "--rm", "python:latest", "python", "-c")
	case "java":
		cmd = exec.Command("docker", "run", "--rm", "openjdk:latest", "java", "-")
	default:
		return ExecutionResponse{Error: "Unsupported language"}
	}

	cmd.Stdin = bytes.NewBufferString(req.Code)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case <-ctx.Done():
		if err := cmd.Process.Kill(); err != nil {
			return ExecutionResponse{Error: "failed to kill process: " + err.Error()}
		}
		<-done
		return ExecutionResponse{Error: "process killed as timeout reached"}
	case err := <-done:
		if err != nil {
			return ExecutionResponse{Error: stderr.String()}
		}
		return ExecutionResponse{Output: out.String()}
	}
}
