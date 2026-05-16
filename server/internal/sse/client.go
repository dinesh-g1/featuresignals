package sse

import (
	"bufio"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"
)

// ─── Errors ───────────────────────────────────────────────────────────────

var (
	errBadUpgrade        = errors.New("websocket: not a valid upgrade request")
	errHijackUnsupported = errors.New("websocket: hijack not supported")
	errConnClosed        = errors.New("websocket: connection closed")
)

// ─── WebSocket Protocol Constants ─────────────────────────────────────────

const (
	wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

	// Frame types
	wsTextFrame   = 1
	wsBinaryFrame = 2
	wsCloseFrame  = 8
	wsPingFrame   = 9
	wsPongFrame   = 10

	// Close status codes
	wsCloseNormal    = 1000
	wsCloseGoingAway = 1001
	wsCloseError     = 1002

	// Write deadline for ping/pong and writes.
	wsWriteTimeout = 10 * time.Second

	// Maximum message size (256 KiB).
	wsMaxMessageSize = 256 * 1024
)

// ─── WebSocket Connection ─────────────────────────────────────────────────

// wsConn wraps a raw TCP connection with WebSocket frame reading/writing.
// It implements a minimal but correct subset of RFC 6455 sufficient for
// server-to-client text messaging with ping/pong keepalive.
type wsConn struct {
	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex // protects writes
	closed bool
}

func newWSConn(conn net.Conn) *wsConn {
	return &wsConn{
		conn:   conn,
		reader: bufio.NewReaderSize(conn, 4096),
	}
}

// ReadMessage reads a complete WebSocket message. It handles control
// frames (ping/pong/close) internally. Returns the message type and
// payload. For text messages, the type is wsTextFrame.
func (c *wsConn) ReadMessage() (int, []byte, error) {
	for {
		opcode, payload, err := c.readFrame()
		if err != nil {
			return 0, nil, err
		}

		switch opcode {
		case wsTextFrame, wsBinaryFrame:
			return opcode, payload, nil

		case wsPingFrame:
			if err := c.writeControl(wsPongFrame, payload); err != nil {
				return 0, nil, err
			}

		case wsPongFrame:
			// Ignore pongs — the writePump handles ping timeout.

		case wsCloseFrame:
			// Echo the close frame back.
			_ = c.writeControl(wsCloseFrame, payload)
			return 0, nil, errConnClosed

		default:
			// Unknown frame types are ignored.
		}
	}
}

// WriteMessage writes a text message to the connection.
func (c *wsConn) WriteMessage(data []byte) error {
	return c.writeFrame(wsTextFrame, data)
}

// WritePing sends a ping control frame.
func (c *wsConn) WritePing() error {
	return c.writeControl(wsPingFrame, nil)
}

// Close sends a close frame and shuts down the connection.
func (c *wsConn) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	_ = c.writeFrameLocked(wsCloseFrame, formatCloseCode(wsCloseNormal))
	return c.conn.Close()
}

// SetReadDeadline sets the deadline for read operations.
func (c *wsConn) SetReadDeadline(t time.Time) error {
	return c.conn.SetReadDeadline(t)
}

// ─── Frame Reading ────────────────────────────────────────────────────────

func (c *wsConn) readFrame() (int, []byte, error) {
	// Read the first two bytes (opcode + flags, mask + length).
	header := make([]byte, 2)
	if _, err := io.ReadFull(c.reader, header); err != nil {
		return 0, nil, fmt.Errorf("websocket: read header: %w", err)
	}

	opcode := int(header[0] & 0x0F)
	_ = header[0] & 0x80 // FIN bit (we don't support fragmentation)
	masked := header[1]&0x80 != 0

	length := uint64(header[1] & 0x7F)

	switch {
	case length == 126:
		ext := make([]byte, 2)
		if _, err := io.ReadFull(c.reader, ext); err != nil {
			return 0, nil, err
		}
		length = uint64(binary.BigEndian.Uint16(ext))
	case length == 127:
		ext := make([]byte, 8)
		if _, err := io.ReadFull(c.reader, ext); err != nil {
			return 0, nil, err
		}
		length = binary.BigEndian.Uint64(ext)
	}

	if length > wsMaxMessageSize {
		return 0, nil, fmt.Errorf("websocket: message too large (%d bytes)", length)
	}

	var maskKey [4]byte
	if masked {
		if _, err := io.ReadFull(c.reader, maskKey[:]); err != nil {
			return 0, nil, err
		}
	}

	payload := make([]byte, length)
	if _, err := io.ReadFull(c.reader, payload); err != nil {
		return 0, nil, err
	}

	if masked {
		maskBytes(payload, maskKey)
	}

	return opcode, payload, nil
}

// ─── Frame Writing ────────────────────────────────────────────────────────

func (c *wsConn) writeFrame(opcode int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.writeFrameLocked(opcode, data)
}

func (c *wsConn) writeFrameLocked(opcode int, data []byte) error {
	if c.closed {
		return errConnClosed
	}
	_ = c.conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
	return writeFrame(c.conn, opcode, data)
}

func (c *wsConn) writeControl(opcode int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return errConnClosed
	}
	_ = c.conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
	return writeFrame(c.conn, opcode, data)
}

func writeFrame(w io.Writer, opcode int, data []byte) error {
	// FIN bit set, opcode in lower 4 bits.
	header := make([]byte, 2)
	header[0] = 0x80 | byte(opcode&0x0F)

	length := len(data)
	switch {
	case length <= 125:
		header[1] = byte(length)
		header = append(header, data...)
	case length <= 65535:
		header[1] = 126
		ext := make([]byte, 2)
		binary.BigEndian.PutUint16(ext, uint16(length))
		header = append(header, ext...)
		header = append(header, data...)
	default:
		header[1] = 127
		ext := make([]byte, 8)
		binary.BigEndian.PutUint64(ext, uint64(length))
		header = append(header, ext...)
		header = append(header, data...)
	}

	_, err := w.Write(header)
	return err
}

// ─── Close Frame Helpers ──────────────────────────────────────────────────

func formatCloseCode(code int) []byte {
	buf := make([]byte, 2)
	binary.BigEndian.PutUint16(buf, uint16(code))
	return buf
}

// ─── Masking ──────────────────────────────────────────────────────────────

func maskBytes(data []byte, key [4]byte) {
	for i := range data {
		data[i] ^= key[i%4]
	}
}

// ─── Accept Key Computation ───────────────────────────────────────────────

func computeAcceptKey(key string) string {
	h := sha1.New()
	h.Write([]byte(key))
	h.Write([]byte(wsGUID))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// ─── WSClient — Per-Connection Handler ────────────────────────────────────

// WSClient represents a single authenticated WebSocket connection.
// It runs two goroutines: a read pump (reading from the connection,
// handling control frames) and a write pump (writing messages from
// the send channel to the connection).
type WSClient struct {
	hub    *WSHub
	conn   *wsConn
	orgID  string
	userID string
	send   chan []byte
	logger *slog.Logger

	// pingTicker drives periodic pings.
	pingTicker *time.Ticker
	// pingTimeout is the duration to wait for a pong before closing.
	pingTimeout time.Duration
}

// writePump reads messages from the send channel and writes them to
// the WebSocket connection. It also sends periodic pings.
func (c *WSClient) writePump() {
	defer func() {
		c.hub.removeClient(c)
		c.conn.Close()
	}()

	c.pingTicker = time.NewTicker(c.hub.pingFreq)
	defer c.pingTicker.Stop()
	c.pingTimeout = 10 * time.Second

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				// Channel closed — send close frame and exit.
				_ = c.conn.Close()
				return
			}
			if err := c.conn.WriteMessage(msg); err != nil {
				c.logger.Warn("ws write error", "error", err)
				return
			}

		case <-c.pingTicker.C:
			if err := c.conn.WritePing(); err != nil {
				c.logger.Warn("ws ping error", "error", err)
				return
			}
			// Set a read deadline to detect pong timeout.
			// The readPump resets this on any successful read.
			_ = c.conn.SetReadDeadline(time.Now().Add(c.pingTimeout))
		}
	}
}

// readPump reads messages from the WebSocket connection. It handles
// control frames (pong resets the ping timeout) and closes the
// connection on any read error or close frame.
func (c *WSClient) readPump() {
	defer func() {
		// Signal the write pump to exit by closing the send channel.
		close(c.send)
	}()

	for {
		// Reset read deadline — no timeout for normal reads.
		// The deadline is only set by the write pump after a ping.
		_ = c.conn.SetReadDeadline(time.Time{})

		opcode, payload, err := c.conn.ReadMessage()
		if err != nil {
			if !errors.Is(err, errConnClosed) {
				c.logger.Debug("ws read error", "error", err)
			}
			return
		}

		// For text messages from the client, we currently ignore them.
		// Future: handle client→server messages (e.g., subscribe/unsubscribe).
		_ = opcode
		_ = payload
	}
}

// close gracefully closes the client connection.
func (c *WSClient) close() {
	_ = c.conn.Close()
}

// ─── Generate Mask Key ────────────────────────────────────────────────────

// generateMaskKey creates a random 4-byte masking key. Used for testing
// and for client-side WebSocket frames. Server-to-client frames are
// never masked per RFC 6455.
func generateMaskKey() [4]byte {
	var key [4]byte
	_, _ = rand.Read(key[:])
	return key
}

// ─── WebSocket Upgrade Handler Interface ──────────────────────────────────

// WSUpgrader defines the contract for upgrading HTTP connections to
// WebSocket. This is the narrow interface that handlers depend on.
type WSUpgrader interface {
	Upgrade(w http.ResponseWriter, r *http.Request, orgID, userID string) (*WSClient, error)
}

// Compile-time interface satisfaction check.
var _ WSUpgrader = (*WSHub)(nil)

// ─── Test Helpers ─────────────────────────────────────────────────────────

// wsConnForTesting returns a wsConn and a net.Pipe for testing.
// The caller is responsible for closing both ends.
func wsConnForTesting() (*wsConn, net.Conn) {
	server, client := net.Pipe()
	return newWSConn(server), client
}

// NoopWSHub returns a WSHub suitable for testing (no real connections).
func NoopWSHub() *WSHub {
	return NewWSHub(slog.New(slog.NewTextHandler(io.Discard, nil)))
}
