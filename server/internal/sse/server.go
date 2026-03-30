package sse

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
)

// Client represents a connected SSE client.
type Client struct {
	envID  string
	events chan []byte
}

// Server manages SSE connections and broadcasts flag updates.
type Server struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]bool // envID -> set of clients
	logger  *slog.Logger
}

func NewServer(logger *slog.Logger) *Server {
	return &Server{
		clients: make(map[string]map[*Client]bool),
		logger:  logger,
	}
}

// ServeHTTP handles SSE connections. Expects envID in the URL path.
func (s *Server) HandleStream(w http.ResponseWriter, r *http.Request, envID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	client := &Client{
		envID:  envID,
		events: make(chan []byte, 64),
	}

	s.addClient(client)
	defer s.removeClient(client)

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: {\"env_id\":\"%s\"}\n\n", envID)
	flusher.Flush()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-client.events:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: flag-update\ndata: %s\n\n", event)
			flusher.Flush()
		}
	}
}

// BroadcastFlagUpdate sends a flag update to all clients connected to the given environment.
func (s *Server) BroadcastFlagUpdate(envID string, data interface{}) {
	payload, err := json.Marshal(data)
	if err != nil {
		s.logger.Error("failed to marshal SSE payload", "error", err)
		return
	}

	s.mu.RLock()
	clients := s.clients[envID]
	s.mu.RUnlock()

	for client := range clients {
		select {
		case client.events <- payload:
		default:
			s.logger.Warn("SSE client buffer full, dropping event", "env_id", envID)
		}
	}
}

// ClientCount returns the number of connected clients for an environment.
func (s *Server) ClientCount(envID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.clients[envID])
}

func (s *Server) addClient(c *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clients[c.envID] == nil {
		s.clients[c.envID] = make(map[*Client]bool)
	}
	s.clients[c.envID][c] = true
	s.logger.Info("SSE client connected", "env_id", c.envID, "total", len(s.clients[c.envID]))
}

func (s *Server) removeClient(c *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.clients[c.envID], c)
	close(c.events)
	s.logger.Info("SSE client disconnected", "env_id", c.envID, "total", len(s.clients[c.envID]))
}
