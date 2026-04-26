package provision

import (
	"context"
	"fmt"
	"net"
	"os"
	"time"

	"golang.org/x/crypto/ssh"
)

// SSHAccess holds the configuration for SSH connections to a remote host.
type SSHAccess struct {
	PrivateKey []byte
	User       string
	Timeout    time.Duration
}

// SSHOption is a functional option for configuring SSHAccess.
type SSHOption func(*SSHAccess)

// WithSSHUser sets the SSH user (default: "root").
func WithSSHUser(user string) SSHOption {
	return func(s *SSHAccess) { s.User = user }
}

// WithSSHTimeout sets the maximum time to wait for SSH to become available.
func WithSSHTimeout(timeout time.Duration) SSHOption {
	return func(s *SSHAccess) { s.Timeout = timeout }
}

// NewSSHAccess creates a new SSHAccess from a private key file path.
func NewSSHAccess(privateKeyPath string, opts ...SSHOption) (*SSHAccess, error) {
	keyBytes, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("read private key: %w", err)
	}
	s := &SSHAccess{
		PrivateKey: keyBytes,
		User:       "root",
		Timeout:    60 * time.Second,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s, nil
}

// NewSSHAccessFromBytes creates SSHAccess from raw key bytes.
func NewSSHAccessFromBytes(keyBytes []byte, opts ...SSHOption) (*SSHAccess, error) {
	s := &SSHAccess{
		PrivateKey: keyBytes,
		User:       "root",
		Timeout:    60 * time.Second,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s, nil
}

func (s *SSHAccess) dial(host string) (*ssh.Client, error) {
	signer, err := ssh.ParsePrivateKey(s.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	config := &ssh.ClientConfig{
		User:            s.User,
		Auth:            []ssh.AuthMethod{ssh.PublicKeys(signer)},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}
	return ssh.Dial("tcp", net.JoinHostPort(host, "22"), config)
}

// WaitForSSH polls port 22 until SSH becomes available or timeout.
func (s *SSHAccess) WaitForSSH(ctx context.Context, host string) error {
	deadline := time.Now().Add(s.Timeout)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, "22"), 5*time.Second)
		if err == nil {
			conn.Close()
			// Now try SSH handshake
			client, err := s.dial(host)
			if err == nil {
				client.Close()
				return nil
			}
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("ssh wait timeout after %s for %s", s.Timeout, host)
}

// Execute runs a command via SSH and returns combined output.
func (s *SSHAccess) Execute(ctx context.Context, host, command string) (string, error) {
	client, err := s.dial(host)
	if err != nil {
		return "", fmt.Errorf("ssh dial: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return "", fmt.Errorf("ssh session: %w", err)
	}
	defer session.Close()

	output, err := session.CombinedOutput(command)
	if err != nil {
		return string(output), fmt.Errorf("ssh exec: %w\noutput: %s", err, string(output))
	}
	return string(output), nil
}

// ExecuteScript uploads and runs a script via SSH.
func (s *SSHAccess) ExecuteScript(ctx context.Context, host string, script []byte) (string, error) {
	return s.Execute(ctx, host, fmt.Sprintf("cat > /tmp/bootstrap.sh << 'SCRIPTEOF'\n%s\nSCRIPTEOF\nchmod +x /tmp/bootstrap.sh\n/tmp/bootstrap.sh 2>&1", string(script)))
}