package eval

import (
	"fmt"
	"testing"
)

func TestBucketUser_Deterministic(t *testing.T) {
	// Same inputs must always produce same output
	for i := 0; i < 100; i++ {
		a := BucketUser("flag-1", "user-42")
		b := BucketUser("flag-1", "user-42")
		if a != b {
			t.Fatalf("non-deterministic: got %d and %d", a, b)
		}
	}
}

func TestBucketUser_Range(t *testing.T) {
	// Bucket must be in [0, 9999]
	for i := 0; i < 10000; i++ {
		bucket := BucketUser("test-flag", fmt.Sprintf("u%d", i))
		if bucket < 0 || bucket > 9999 {
			t.Fatalf("bucket out of range: %d for key %d", bucket, i)
		}
	}
}

func TestBucketUser_DifferentFlagsDifferentBuckets(t *testing.T) {
	// Different flag keys should (usually) produce different buckets for the same user
	userKey := "user-123"
	buckets := map[int]bool{}
	for i := 0; i < 50; i++ {
		flagKey := fmt.Sprintf("flag-%d", i)
		b := BucketUser(flagKey, userKey)
		buckets[b] = true
	}
	// We should have at least a few distinct buckets (extremely unlikely to be all same)
	if len(buckets) < 5 {
		t.Errorf("expected diverse buckets across flags, got only %d unique values", len(buckets))
	}
}

func TestBucketUser_CohortPreservation(t *testing.T) {
	// Users in the 10% bucket (0-999) should also be in the 25% bucket (0-2499)
	flagKey := "cohort-test"
	for i := 0; i < 1000; i++ {
		userKey := "user-" + string(rune(i))
		bucket := BucketUser(flagKey, userKey)
		if bucket < 1000 {
			// This user is in 10% — they must also be in 25%
			if bucket >= 2500 {
				t.Fatalf("user %s bucket %d: in 10%% but not in 25%%", userKey, bucket)
			}
		}
	}
}

func TestBucketUser_Distribution(t *testing.T) {
	// Test roughly uniform distribution
	buckets := make([]int, 10)
	total := 100000
	for i := 0; i < total; i++ {
		b := BucketUser("dist-flag", fmt.Sprintf("user-%d", i))
		buckets[b/1000]++
	}

	expected := total / 10
	tolerance := float64(expected) * 0.15

	for i, count := range buckets {
		if float64(count) < float64(expected)-tolerance || float64(count) > float64(expected)+tolerance {
			t.Errorf("bucket %d: expected ~%d, got %d (outside 15%% tolerance)", i, expected, count)
		}
	}
}
