package main

import (
	"fmt"
	"log/slog"
	"net"
	"strings"
)

// DNSServer is a simple authoritative DNS server for future multi-region use
type DNSServer struct {
	config *Config
}

func NewDNSServer(cfg *Config) *DNSServer {
	return &DNSServer{config: cfg}
}

func (d *DNSServer) Start() error {
	if !d.config.Router.DNS.Enabled {
		slog.Info("DNS server disabled")
		return nil
	}

	addr := fmt.Sprintf(":%d", d.config.Router.DNS.Port)
	udpAddr, err := net.ResolveUDPAddr("udp", addr)
	if err != nil {
		return fmt.Errorf("failed to resolve DNS address: %w", err)
	}

	conn, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		return fmt.Errorf("failed to listen for DNS: %w", err)
	}
	defer conn.Close()

	slog.Info("DNS server listening", "addr", addr)

	buf := make([]byte, 512)
	for {
		n, addr, err := conn.ReadFromUDP(buf)
		if err != nil {
			slog.Warn("DNS read error", "error", err)
			continue
		}

		response := d.handleQuery(buf[:n])
		if response != nil {
			conn.WriteToUDP(response, addr)
		}
	}
}

func (d *DNSServer) handleQuery(query []byte) []byte {
	if len(query) < 12 {
		return nil
	}

	// Parse the question
	// Simple parser that extracts the domain name
	var domainParts []string
	pos := 12
	for pos < len(query) {
		length := int(query[pos])
		if length == 0 {
			pos++
			break
		}
		pos++
		if pos+length > len(query) {
			return nil
		}
		domainParts = append(domainParts, string(query[pos:pos+length]))
		pos += length
	}
	_ = strings.Join(domainParts, ".")

	// Check if we have this domain
	ip := d.config.Router.Cluster.PublicIP
	if ip == "" {
		ip = "127.0.0.1"
	}

	// Build minimal DNS response
	// TODO: full DNS implementation for multi-region
	response := make([]byte, len(query)+16)
	copy(response, query[:2]) // Transaction ID
	response[2] = 0x81        // Flags: standard response, no error
	response[3] = 0x80
	response[4] = 0x00 // Questions
	response[5] = 0x01
	response[6] = 0x00 // Answers
	response[7] = 0x01
	copy(response[8:], query[12:pos]) // Copy the question

	// Answer: type A record
	ans := response[len(query):]
	ans[0] = 0xC0 // Name pointer
	ans[1] = 0x0C
	ans[2] = 0x00 // Type A
	ans[3] = 0x01
	ans[4] = 0x00 // Class IN
	ans[5] = 0x01
	ans[6] = 0x00 // TTL
	ans[7] = 0x00
	ans[8] = 0x00
	ans[9] = 0x3C // 60 seconds
	ans[10] = 0x00 // Data length
	ans[11] = 0x04
	ipParts := net.ParseIP(ip).To4()
	if ipParts != nil {
		ans[12] = ipParts[0]
		ans[13] = ipParts[1]
		ans[14] = ipParts[2]
		ans[15] = ipParts[3]
	}

	return response[:len(query)+16]
}