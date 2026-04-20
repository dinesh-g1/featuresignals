package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

type ScanResult struct {
	FlagKey    string      `json:"flag_key"`
	Status     string      `json:"status"`
	References []Reference `json:"references,omitempty"`
}

type Reference struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Text string `json:"text"`
}

var defaultSkipDirs = map[string]bool{
	"node_modules": true, ".git": true, "vendor": true, "dist": true,
	"build": true, ".next": true, "__pycache__": true, ".docusaurus": true,
	"target": true, ".idea": true, ".vscode": true,
}

var defaultExtensions = map[string]bool{
	".go": true, ".ts": true, ".tsx": true, ".js": true, ".jsx": true,
	".py": true, ".java": true, ".kt": true, ".swift": true, ".rs": true,
	".rb": true, ".php": true, ".cs": true, ".dart": true, ".vue": true,
}

func main() {
	apiURL := flag.String("api", "http://localhost:8080", "FeatureSignals API URL")
	token := flag.String("token", "", "JWT bearer token for the management API")
	projectID := flag.String("project", "", "Project ID to scan flags for")
	scanDir := flag.String("dir", ".", "Directory to scan for flag references")
	outputFmt := flag.String("format", "table", "Output format: table, json")
	ciMode := flag.Bool("ci", false, "CI mode: exit 1 if stale flags found")
	flag.Parse()

	if *token == "" || *projectID == "" {
		fmt.Fprintln(os.Stderr, "Usage: stalescan -token <jwt> -project <id> -dir <path> [-api url] [-format table|json] [-ci]")
		os.Exit(2)
	}

	flags, err := fetchFlags(*apiURL, *token, *projectID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error fetching flags: %v\n", err)
		os.Exit(1)
	}

	if len(flags) == 0 {
		fmt.Println("No flags found in project.")
		return
	}

	flagKeys := make([]string, 0, len(flags))
	for _, f := range flags {
		flagKeys = append(flagKeys, f.Key)
	}

	refMap := scanDirectory(*scanDir, flagKeys)

	results := buildResults(flagKeys, refMap)

	switch *outputFmt {
	case "json":
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(results)
	default:
		printTable(results)
	}

	if *ciMode {
		staleCount := 0
		for _, r := range results {
			if r.Status == "STALE" {
				staleCount++
			}
		}
		if staleCount > 0 {
			fmt.Fprintf(os.Stderr, "\n%d stale flag(s) found with no code references.\n", staleCount)
			os.Exit(1)
		}
	}
}

type flagDTO struct {
	Key string `json:"key"`
}

func fetchFlags(apiURL, token, projectID string) ([]flagDTO, error) {
	url := fmt.Sprintf("%s/v1/projects/%s/flags", apiURL, projectID)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned %d", resp.StatusCode)
	}

	var flags []flagDTO
	if err := json.NewDecoder(resp.Body).Decode(&flags); err != nil {
		return nil, err
	}
	return flags, nil
}

func scanDirectory(root string, flagKeys []string) map[string][]Reference {
	refMap := make(map[string][]Reference)

	patterns := make(map[string]*regexp.Regexp, len(flagKeys))
	for _, key := range flagKeys {
		patterns[key] = regexp.MustCompile(regexp.QuoteMeta(key))
	}

	filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			if defaultSkipDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		ext := filepath.Ext(path)
		if !defaultExtensions[ext] {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineNum := 0
		for scanner.Scan() {
			lineNum++
			line := scanner.Text()
			for key, re := range patterns {
				if re.MatchString(line) {
					relPath, _ := filepath.Rel(root, path)
					if relPath == "" {
						relPath = path
					}
					text := strings.TrimSpace(line)
					if len(text) > 120 {
						text = text[:120] + "..."
					}
					refMap[key] = append(refMap[key], Reference{
						File: relPath,
						Line: lineNum,
						Text: text,
					})
				}
			}
		}
		return nil
	})

	return refMap
}

func buildResults(flagKeys []string, refMap map[string][]Reference) []ScanResult {
	results := make([]ScanResult, 0, len(flagKeys))
	for _, key := range flagKeys {
		refs := refMap[key]
		status := "ACTIVE"
		if len(refs) == 0 {
			status = "STALE"
		}
		results = append(results, ScanResult{
			FlagKey:    key,
			Status:     status,
			References: refs,
		})
	}
	sort.Slice(results, func(i, j int) bool {
		if results[i].Status != results[j].Status {
			return results[i].Status == "STALE"
		}
		return results[i].FlagKey < results[j].FlagKey
	})
	return results
}

func printTable(results []ScanResult) {
	stale := 0
	active := 0
	for _, r := range results {
		if r.Status == "STALE" {
			stale++
		} else {
			active++
		}
	}

	fmt.Printf("\nFeatureSignals Stale Flag Scan\n")
	fmt.Printf("==============================\n")
	fmt.Printf("Total flags: %d | Active: %d | Stale: %d\n\n", len(results), active, stale)

	fmt.Printf("%-40s %-8s %s\n", "FLAG KEY", "STATUS", "REFERENCES")
	fmt.Printf("%-40s %-8s %s\n", strings.Repeat("-", 40), strings.Repeat("-", 8), strings.Repeat("-", 30))

	for _, r := range results {
		statusColor := "\033[32m"
		if r.Status == "STALE" {
			statusColor = "\033[31m"
		}
		refCount := fmt.Sprintf("%d file(s)", len(r.References))
		if len(r.References) == 0 {
			refCount = "none"
		}
		fmt.Printf("%-40s %s%-8s\033[0m %s\n", r.FlagKey, statusColor, r.Status, refCount)

		for _, ref := range r.References {
			fmt.Printf("  %s:%d  %s\n", ref.File, ref.Line, ref.Text)
		}
	}
	fmt.Println()
}
