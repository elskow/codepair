package main

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
)

var (
	// TODO: Load these URLs from environment variables or a configuration file
	videochatURL = "ws://localhost:3000"
	editorURL    = "ws://localhost:8080"
)

func proxyRequest(target string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		url, err := url.Parse(target)
		if err != nil {
			return fmt.Errorf("error parsing target URL: %v", err)
		}

		req := c.Request()
		res := c.Response()

		proxyReq := fasthttp.AcquireRequest()
		defer fasthttp.ReleaseRequest(proxyReq)

		req.Header.VisitAll(func(key, value []byte) {
			proxyReq.Header.SetBytesKV(key, value)
		})

		proxyReq.SetRequestURI(fmt.Sprintf("%s%s", url, string(req.RequestURI())))
		proxyReq.Header.SetMethod(string(req.Header.Method()))

		proxyReq.Header.SetHost(url.Host)

		proxyReq.SetBody(req.Body())

		proxyRes := fasthttp.AcquireResponse()
		defer fasthttp.ReleaseResponse(proxyRes)

		client := &fasthttp.Client{}
		// TODO: Implement timeouts and retries for proxy requests
		if err := client.Do(proxyReq, proxyRes); err != nil {
			return fmt.Errorf("error proxying request: %v", err)
		}

		proxyRes.Header.VisitAll(func(key, value []byte) {
			res.Header.SetBytesKV(key, value)
		})

		res.SetStatusCode(proxyRes.StatusCode())

		res.SetBody(proxyRes.Body())

		return nil
	}
}

func isWebSocketUpgrade(c *fiber.Ctx) bool {
	return strings.EqualFold(c.Get("Connection"), "Upgrade") &&
		strings.EqualFold(c.Get("Upgrade"), "websocket")
}

// TODO: Implement WebSocket proxy functionality
