package features

import "testing"

func TestEnablePhoneVerification_DefaultOff(t *testing.T) {
	if EnablePhoneVerification {
		t.Error("EnablePhoneVerification should default to false until MSG91 is configured")
	}
}
