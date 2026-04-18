package migrate

import (
	"context"
	"log/slog"
	"os"
	"testing"
)

func TestShouldSkip(t *testing.T) {
	tests := []struct {
		name string
		env  string
		want bool
	}{
		{name: "empty", env: "", want: false},
		{name: "one", env: "1", want: true},
		{name: "true", env: "true", want: true},
		{name: "TRUE uppercase", env: "TRUE", want: true},
		{name: "yes", env: "yes", want: true},
		{name: "YES uppercase", env: "YES", want: true},
		{name: "false", env: "false", want: false},
		{name: "zero", env: "0", want: false},
		{name: "random value", env: "foo", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.env != "" {
				os.Setenv("SKIP_MIGRATIONS", tt.env)
				defer os.Unsetenv("SKIP_MIGRATIONS")
			}

			got := ShouldSkip()
			if got != tt.want {
				t.Errorf("ShouldSkip() = %v, want %v (env=%q)", got, tt.want, tt.env)
			}
		})
	}
}

func TestCount(t *testing.T) {
	count, err := Count()
	if err != nil {
		t.Fatalf("Count() error = %v", err)
	}
	if count == 0 {
		t.Fatal("Count() = 0, want > 0")
	}
	t.Logf("Found %d migration files", count)
}

func TestListAllFiles(t *testing.T) {
	files, err := ListAllFiles()
	if err != nil {
		t.Fatalf("ListAllFiles() error = %v", err)
	}
	if len(files) == 0 {
		t.Fatal("ListAllFiles() returned no files")
	}

	// Verify ordering
	for i := 1; i < len(files); i++ {
		if files[i].Version < files[i-1].Version {
			t.Errorf("Files not sorted by version: %v before %v", files[i-1], files[i])
		}
		if files[i].Version == files[i-1].Version && files[i].Name < files[i-1].Name {
			t.Errorf("Files not sorted by name within same version: %v before %v", files[i-1], files[i])
		}
	}

	t.Logf("Found %d migration files", len(files))
}

func TestMigrationSource(t *testing.T) {
	src, err := MigrationSource()
	if err != nil {
		t.Fatalf("MigrationSource() returned error: %v", err)
	}
	if src == nil {
		t.Fatal("MigrationSource() returned nil")
	}
}

func TestReadMigrationFile(t *testing.T) {
	// Read the first migration file to verify content
	content, err := ReadMigrationFile("000001_init_schema.up.sql")
	if err != nil {
		t.Fatalf("ReadMigrationFile() error = %v", err)
	}
	if content == "" {
		t.Fatal("ReadMigrationFile() returned empty content")
	}
	if len(content) < 100 {
		t.Errorf("ReadMigrationFile() returned suspiciously short content (%d bytes)", len(content))
	}
}

func TestRunUp_Skip(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Should return immediately when skip=true
	err := RunUp(context.Background(), "postgres://test:123@localhost:5432/test?sslmode=disable", logger, true)
	if err != nil {
		t.Errorf("RunUp() with skip=true returned error: %v", err)
	}
}

func TestRunUp_InvalidDSN(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Should fail fast with invalid DSN
	err := RunUp(context.Background(), "invalid://bad-dsn", logger, false)
	if err == nil {
		t.Error("RunUp() with invalid DSN should return error")
	}
	t.Logf("RunUp() with invalid DSN returned: %v", err)
}
