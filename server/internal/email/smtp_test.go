package email

import (
	"context"
	"log/slog"
	"net"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

// fakeSMTPServer accepts one SMTP conversation and captures the DATA payload.
// It returns the listener address and a channel that delivers the received
// message body (or empty string on error/timeout).
func fakeSMTPServer(t *testing.T) (string, <-chan string) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	ch := make(chan string, 1)
	go func() {
		defer ln.Close()
		conn, err := ln.Accept()
		if err != nil {
			ch <- ""
			return
		}
		defer conn.Close()
		conn.SetDeadline(time.Now().Add(5 * time.Second))

		write := func(s string) { conn.Write([]byte(s + "\r\n")) }
		read := func() string {
			buf := make([]byte, 4096)
			n, _ := conn.Read(buf)
			return string(buf[:n])
		}

		write("220 localhost ESMTP fake")
		read() // EHLO/HELO
		write("250 OK")
		read() // MAIL FROM
		write("250 OK")
		read() // RCPT TO
		write("250 OK")
		read() // DATA
		write("354 Start mail input")

		var dataBuilder strings.Builder
		for {
			line := read()
			if strings.Contains(line, "\r\n.\r\n") {
				dataBuilder.WriteString(strings.TrimSuffix(line, "\r\n.\r\n"))
				break
			}
			dataBuilder.WriteString(line)
		}
		write("250 OK")
		read() // QUIT
		write("221 Bye")

		ch <- dataBuilder.String()
	}()

	return ln.Addr().String(), ch
}

func TestSMTPSender_SendOTP_Success(t *testing.T) {
	addr, dataCh := fakeSMTPServer(t)
	host, portStr, _ := net.SplitHostPort(addr)
	port := 0
	for _, c := range portStr {
		port = port*10 + int(c-'0')
	}

	sender := NewSMTPSender(host, port, "", "", "noreply@test.com", "FeatureSignals", testLogger())
	err := sender.SendOTP(context.Background(), "user@example.com", "Alice", "123456")
	if err != nil {
		t.Fatalf("SendOTP() error: %v", err)
	}

	select {
	case data := <-dataCh:
		if !strings.Contains(data, "123456") {
			t.Errorf("expected OTP in message body, got: %s", data)
		}
		if !strings.Contains(data, "Alice") {
			t.Errorf("expected recipient name in message body, got: %s", data)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timeout waiting for SMTP data")
	}
}

func TestSMTPSender_SendOTP_DialFailure(t *testing.T) {
	sender := NewSMTPSender("127.0.0.1", 1, "", "", "noreply@test.com", "Test", testLogger())
	err := sender.SendOTP(context.Background(), "user@example.com", "User", "000000")
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
	if !strings.Contains(err.Error(), "smtp") {
		t.Errorf("expected smtp-related error, got: %v", err)
	}
}

func TestSMTPSender_SendOTP_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	sender := NewSMTPSender("127.0.0.1", 1, "", "", "noreply@test.com", "Test", testLogger())
	err := sender.SendOTP(ctx, "user@example.com", "User", "000000")
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestSMTPSender_InterfaceCompliance(t *testing.T) {
	var _ domain.OTPSender = (*SMTPSender)(nil)
}
