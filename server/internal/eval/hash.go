package eval

// MurmurHash3_x86_32 implements the MurmurHash3 32-bit hash function.
// Used for consistent hashing in percentage rollouts.
// Same user always gets the same bucket for a given flag.
func murmurHash3(key string, seed uint32) uint32 {
	data := []byte(key)
	length := len(data)
	nblocks := length / 4

	var h1 uint32 = seed

	const (
		c1 uint32 = 0xcc9e2d51
		c2 uint32 = 0x1b873593
	)

	// Body
	for i := 0; i < nblocks; i++ {
		k1 := uint32(data[i*4]) |
			uint32(data[i*4+1])<<8 |
			uint32(data[i*4+2])<<16 |
			uint32(data[i*4+3])<<24

		k1 *= c1
		k1 = rotl32(k1, 15)
		k1 *= c2

		h1 ^= k1
		h1 = rotl32(h1, 13)
		h1 = h1*5 + 0xe6546b64
	}

	// Tail
	tail := data[nblocks*4:]
	var k1 uint32
	switch len(tail) {
	case 3:
		k1 ^= uint32(tail[2]) << 16
		fallthrough
	case 2:
		k1 ^= uint32(tail[1]) << 8
		fallthrough
	case 1:
		k1 ^= uint32(tail[0])
		k1 *= c1
		k1 = rotl32(k1, 15)
		k1 *= c2
		h1 ^= k1
	}

	// Finalization
	h1 ^= uint32(length)
	h1 = fmix32(h1)

	return h1
}

func rotl32(x uint32, r int) uint32 {
	return (x << r) | (x >> (32 - r))
}

func fmix32(h uint32) uint32 {
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

// BucketUser returns a value between 0 and 9999 (inclusive) for a given flag key and user key.
// This determines whether a user falls within a percentage rollout.
// The result is deterministic: same inputs always produce the same bucket.
func BucketUser(flagKey, userKey string) int {
	hashKey := flagKey + "." + userKey
	hash := murmurHash3(hashKey, 0)
	return int(hash % 10000)
}
