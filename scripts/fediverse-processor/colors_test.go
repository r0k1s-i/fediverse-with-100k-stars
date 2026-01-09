package main

import (
	"math"
	"testing"
	"time"
)

// ============================================================
// A. Age-Based Color Mapping Tests (10 tests)
// ============================================================

func TestCalculateColor_YoungInstance(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "young.test",
		FirstSeenAt: time.Now().AddDate(0, -6, 0).Format(time.RFC3339), // 6 months old
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Young instances should have high hue values (closer to 240° blue)
	if color.HSL.H < 180 {
		t.Errorf("Young instance should have high hue (blue), got %f°", color.HSL.H)
	}
}

func TestCalculateColor_OldInstance(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "old.test",
		FirstSeenAt: "2017-01-01T00:00:00Z", // ~8 years old
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Old instances should have low hue values (closer to 0° red)
	if color.HSL.H > 100 {
		t.Errorf("Old instance should have low hue (red), got %f°", color.HSL.H)
	}
}

func TestCalculateColor_MediumAgeInstance(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "medium.test",
		FirstSeenAt: time.Now().AddDate(-2, -6, 0).Format(time.RFC3339), // ~2.5 years old
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Medium age should be in mid-range
	if color.HSL.H < 80 || color.HSL.H > 200 {
		t.Errorf("Medium age instance should have mid-range hue, got %f°", color.HSL.H)
	}
}

func TestCalculateColor_GenesisDateEdgeCase(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "genesis.test",
		FirstSeenAt: "2016-11-23T00:00:00Z", // Fediverse genesis date
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Should be oldest possible, near 0° (red)
	if color.HSL.H > 30 {
		t.Errorf("Genesis date instance should have very low hue (red), got %f°", color.HSL.H)
	}
}

func TestCalculateColor_MaxAgeCalculation(t *testing.T) {
	cfg := DefaultConfig
	maxAge := getMaxAgeDays(cfg)

	// Should be time from genesis (2016-11-23) to now
	expectedMinDays := 365 * 9 // At least 9 years
	if maxAge < float64(expectedMinDays) {
		t.Errorf("Max age should be at least %d days, got %f", expectedMinDays, maxAge)
	}
}

func TestLogNormalize_ZeroValue(t *testing.T) {
	result := logNormalize(0, 100)
	if result != 0 {
		t.Errorf("logNormalize(0, 100) should return 0, got %f", result)
	}
}

func TestLogNormalize_MaxValue(t *testing.T) {
	max := 1000.0
	result := logNormalize(max, max)

	// Should be close to 1.0
	if math.Abs(result-1.0) > 0.01 {
		t.Errorf("logNormalize(max, max) should be close to 1.0, got %f", result)
	}
}

func TestLogNormalize_MidValue(t *testing.T) {
	result := logNormalize(50, 100)

	// Log normalization should give value between 0 and 1
	if result <= 0 || result >= 1 {
		t.Errorf("logNormalize should return value between 0 and 1, got %f", result)
	}
}

func TestGetAgeDays_FutureDate(t *testing.T) {
	futureDate := time.Now().AddDate(1, 0, 0).Format(time.RFC3339)
	age := getAgeDays(futureDate)

	// Future dates should result in negative age
	if age > 0 {
		t.Errorf("Future date should give negative age, got %f", age)
	}
}

func TestCalculateColor_VeryOldInstance(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "ancient.test",
		FirstSeenAt: "2016-12-01T00:00:00Z", // ~9 years old
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Very old instances should be red spectrum
	if color.HSL.H > 40 {
		t.Errorf("Very old instance should be in red spectrum (<40°), got %f°", color.HSL.H)
	}
}

// ============================================================
// B. Era Offset System Tests (6 tests)
// ============================================================

func TestGetEraOffset_Pre2019(t *testing.T) {
	cfg := DefaultConfig
	offset := getEraOffset("2018-06-15T00:00:00Z", cfg)

	if offset != cfg.EraPre2019Offset {
		t.Errorf("Pre-2019 instance should have offset %f, got %f", cfg.EraPre2019Offset, offset)
	}
}

func TestGetEraOffset_Post2024(t *testing.T) {
	cfg := DefaultConfig
	offset := getEraOffset("2024-06-15T00:00:00Z", cfg)

	if offset != cfg.EraPost2024Offset {
		t.Errorf("Post-2024 instance should have offset %f, got %f", cfg.EraPost2024Offset, offset)
	}
}

func TestGetEraOffset_StandardEra(t *testing.T) {
	cfg := DefaultConfig
	offset := getEraOffset("2021-06-15T00:00:00Z", cfg)

	if offset != 0 {
		t.Errorf("Standard era (2019-2024) should have offset 0, got %f", offset)
	}
}

func TestGetEraOffset_ExactBoundary2019(t *testing.T) {
	cfg := DefaultConfig
	offset := getEraOffset("2019-01-01T00:00:00Z", cfg)

	// On or after 2019-01-01 should be standard era
	if offset != 0 {
		t.Errorf("Exact 2019-01-01 should be standard era (offset 0), got %f", offset)
	}
}

func TestGetEraOffset_ExactBoundary2024(t *testing.T) {
	cfg := DefaultConfig
	offset := getEraOffset("2024-01-01T00:00:00Z", cfg)

	// On or after 2024-01-01 should be post-2024 era
	if offset != cfg.EraPost2024Offset {
		t.Errorf("Exact 2024-01-01 should be post-2024 era, got %f", offset)
	}
}

func TestCalculateColor_EraOffsetComposition(t *testing.T) {
	cfg := DefaultConfig

	// Pre-2019 instance
	oldInstance := Instance{
		Domain:      "veteran.test",
		FirstSeenAt: "2017-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	// Post-2024 instance with similar age offset
	newInstance := Instance{
		Domain:      "newcomer.test",
		FirstSeenAt: "2024-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	oldColor := CalculateColor(&oldInstance, cfg)
	newColor := CalculateColor(&newInstance, cfg)

	// Old instance should be more red (lower hue) due to -20° offset
	// New instance should be more blue (higher hue) due to +20° offset
	if oldColor.HSL.H >= newColor.HSL.H {
		t.Errorf("Pre-2019 instance should be redder than post-2024, got old=%f° new=%f°",
			oldColor.HSL.H, newColor.HSL.H)
	}
}

// ============================================================
// C. Domain Hash Perturbation Tests (5 tests)
// ============================================================

func TestDomainHash_Deterministic(t *testing.T) {
	domain := "mastodon.social"
	hash1 := domainHash(domain)
	hash2 := domainHash(domain)

	if hash1 != hash2 {
		t.Errorf("Domain hash should be deterministic, got %f and %f", hash1, hash2)
	}
}

func TestDomainHash_DifferentDomains(t *testing.T) {
	hash1 := domainHash("mastodon.social")
	hash2 := domainHash("pixelfed.social")

	if hash1 == hash2 {
		t.Error("Different domains should produce different hashes")
	}
}

func TestDomainHash_Range(t *testing.T) {
	domains := []string{"mastodon.social", "pixelfed.social", "lemmy.ml", "misskey.io"}

	for _, domain := range domains {
		hash := domainHash(domain)
		if hash < 0 || hash > 1 {
			t.Errorf("Domain hash for %s should be between 0 and 1, got %f", domain, hash)
		}
	}
}

func TestCalculateColor_HashPerturbationRange(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "test.domain",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Perturbation is stored in debug info
	if color.Debug.HashPerturbation < -cfg.DomainHashRange ||
	   color.Debug.HashPerturbation > cfg.DomainHashRange {
		t.Errorf("Hash perturbation should be within ±%f, got %f",
			cfg.DomainHashRange, color.Debug.HashPerturbation)
	}
}

func TestCalculateColor_HashComposition(t *testing.T) {
	cfg := DefaultConfig

	// Two instances with same age but different domains
	instance1 := Instance{
		Domain:      "alpha.test",
		FirstSeenAt: "2021-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	instance2 := Instance{
		Domain:      "beta.test",
		FirstSeenAt: "2021-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color1 := CalculateColor(&instance1, cfg)
	color2 := CalculateColor(&instance2, cfg)

	// Should have different hues due to hash perturbation
	if color1.HSL.H == color2.HSL.H {
		t.Error("Same age instances with different domains should have different hues due to hash perturbation")
	}
}

// ============================================================
// D. Saturation Calculation Tests (4 tests)
// ============================================================

func TestCalculateColor_MinimumSaturation(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "tiny.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1, MonthlyActiveUsers: 1},
	}

	color := CalculateColor(&instance, cfg)

	// Minimum users should give minimum saturation
	if color.HSL.S < cfg.SaturationMin || color.HSL.S > cfg.SaturationMin+5 {
		t.Errorf("Minimum users should give saturation close to %f%%, got %f%%",
			cfg.SaturationMin, color.HSL.S)
	}
}

func TestCalculateColor_MaximumSaturation(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "huge.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 3500000, MonthlyActiveUsers: 100000}, // > 3M users
	}

	color := CalculateColor(&instance, cfg)

	// Maximum users should give maximum saturation
	if color.HSL.S < cfg.SaturationMax-5 || color.HSL.S > cfg.SaturationMax {
		t.Errorf("Maximum users should give saturation close to %f%%, got %f%%",
			cfg.SaturationMax, color.HSL.S)
	}
}

func TestCalculateColor_MidRangeSaturation(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "medium.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 10000, MonthlyActiveUsers: 5000},
	}

	color := CalculateColor(&instance, cfg)

	// Mid-range users should give mid saturation
	midSaturation := (cfg.SaturationMin + cfg.SaturationMax) / 2
	if color.HSL.S < midSaturation-20 || color.HSL.S > midSaturation+20 {
		t.Errorf("Mid-range users should give saturation around %f%%, got %f%%",
			midSaturation, color.HSL.S)
	}
}

func TestCalculateColor_SaturationLogarithmic(t *testing.T) {
	cfg := DefaultConfig

	// Test logarithmic scaling
	instances := []Instance{
		{Domain: "a.test", FirstSeenAt: "2021-01-01T00:00:00Z", Stats: &Stats{UserCount: 100, MonthlyActiveUsers: 50}},
		{Domain: "b.test", FirstSeenAt: "2021-01-01T00:00:00Z", Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
		{Domain: "c.test", FirstSeenAt: "2021-01-01T00:00:00Z", Stats: &Stats{UserCount: 10000, MonthlyActiveUsers: 5000}},
	}

	colors := make([]float64, len(instances))
	for i, inst := range instances {
		color := CalculateColor(&inst, cfg)
		colors[i] = color.HSL.S
	}

	// Each 10x increase in users should increase saturation, but not linearly
	// The increase from 100->1000 should be larger than 1000->10000 (logarithmic)
	diff1 := colors[1] - colors[0]
	diff2 := colors[2] - colors[1]

	if diff1 <= diff2 {
		t.Error("Saturation scaling should be logarithmic (diminishing returns)")
	}
}

// ============================================================
// E. Lightness Calculation Tests (5 tests)
// ============================================================

func TestCalculateColor_MinimumLightness(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "zombie.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 10000, MonthlyActiveUsers: 0}, // Zero activity
	}

	color := CalculateColor(&instance, cfg)

	// Zero activity should give minimum lightness
	if color.HSL.L < cfg.LightnessMin || color.HSL.L > cfg.LightnessMin+5 {
		t.Errorf("Zero activity should give lightness close to %f%%, got %f%%",
			cfg.LightnessMin, color.HSL.L)
	}
}

func TestCalculateColor_MaximumLightness(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "active.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 1000}, // 100% activity
	}

	color := CalculateColor(&instance, cfg)

	// 100% activity should give maximum lightness
	if color.HSL.L < cfg.LightnessMax-5 || color.HSL.L > cfg.LightnessMax {
		t.Errorf("100%% activity should give lightness close to %f%%, got %f%%",
			cfg.LightnessMax, color.HSL.L)
	}
}

func TestCalculateColor_MidLightness(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "halfactive.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500}, // 50% activity
	}

	color := CalculateColor(&instance, cfg)

	// 50% activity should give mid-range lightness
	midLightness := (cfg.LightnessMin + cfg.LightnessMax) / 2
	if color.HSL.L < midLightness-10 || color.HSL.L > midLightness+10 {
		t.Errorf("50%% activity should give lightness around %f%%, got %f%%",
			midLightness, color.HSL.L)
	}
}

func TestCalculateColor_ActivityCapped(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "overflow.test",
		FirstSeenAt: "2021-01-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 1500}, // 150% activity (invalid)
	}

	color := CalculateColor(&instance, cfg)

	// Activity should be capped at 100%, giving max lightness
	if color.HSL.L > cfg.LightnessMax {
		t.Errorf("Activity >100%% should be capped, lightness should be ≤%f%%, got %f%%",
			cfg.LightnessMax, color.HSL.L)
	}
}

func TestCalculateColor_ZombieInstance(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "graveyard.test",
		FirstSeenAt: "2017-01-01T00:00:00Z", // Old
		Stats:       &Stats{UserCount: 100000, MonthlyActiveUsers: 10}, // Huge but dead
	}

	color := CalculateColor(&instance, cfg)

	// Should be dark (low lightness) due to low activity ratio
	if color.HSL.L > 40 {
		t.Errorf("Zombie instance should have low lightness, got %f%%", color.HSL.L)
	}

	// Should be red (old instance)
	if color.HSL.H > 60 {
		t.Errorf("Zombie instance should be red (old), got %f°", color.HSL.H)
	}
}

// ============================================================
// F. Color Format Output Tests (3 tests)
// ============================================================

func TestCalculateColor_HSLOutput(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "test.instance",
		FirstSeenAt: "2021-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Validate HSL ranges
	if color.HSL.H < 0 || color.HSL.H > 360 {
		t.Errorf("Hue should be 0-360°, got %f°", color.HSL.H)
	}
	if color.HSL.S < 0 || color.HSL.S > 100 {
		t.Errorf("Saturation should be 0-100%%, got %f%%", color.HSL.S)
	}
	if color.HSL.L < 0 || color.HSL.L > 100 {
		t.Errorf("Lightness should be 0-100%%, got %f%%", color.HSL.L)
	}
}

func TestCalculateColor_RGBOutput(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "test.instance",
		FirstSeenAt: "2021-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Validate RGB ranges
	if color.RGB.R < 0 || color.RGB.R > 255 {
		t.Errorf("RGB R should be 0-255, got %d", color.RGB.R)
	}
	if color.RGB.G < 0 || color.RGB.G > 255 {
		t.Errorf("RGB G should be 0-255, got %d", color.RGB.G)
	}
	if color.RGB.B < 0 || color.RGB.B > 255 {
		t.Errorf("RGB B should be 0-255, got %d", color.RGB.B)
	}
}

func TestCalculateColor_HexOutput(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "test.instance",
		FirstSeenAt: "2021-06-01T00:00:00Z",
		Stats:       &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	color := CalculateColor(&instance, cfg)

	// Validate hex format
	if len(color.Hex) != 7 {
		t.Errorf("Hex color should be 7 characters (#rrggbb), got %s", color.Hex)
	}
	if color.Hex[0] != '#' {
		t.Errorf("Hex color should start with #, got %s", color.Hex)
	}

	// Validate hex matches RGB
	expectedHex := rgbToHex(color.RGB)
	if color.Hex != expectedHex {
		t.Errorf("Hex color doesn't match RGB conversion, expected %s got %s",
			expectedHex, color.Hex)
	}
}

// ============================================================
// G. Integration Tests (5 tests)
// ============================================================

func TestCalculateColor_MastodonSocial(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "mastodon.social",
		FirstSeenAt: "2021-03-30T20:10:40Z",
		Stats:       &Stats{UserCount: 3054420, MonthlyActiveUsers: 280861},
		CreationTime: &CreationTime{
			CreatedAt: "2021-03-30T20:10:40Z",
			Source:    "first_seen_at",
			Reliable:  true,
		},
	}

	color := CalculateColor(&instance, cfg)

	// Known instance should produce consistent results
	// These are snapshot tests based on the algorithm
	if color.HSL.H < 0 || color.HSL.H > 360 {
		t.Errorf("mastodon.social hue out of range: %f°", color.HSL.H)
	}

	// Should be high saturation (huge user count)
	if color.HSL.S < 80 {
		t.Errorf("mastodon.social should have high saturation, got %f%%", color.HSL.S)
	}

	// Should be moderate lightness (good but not 100% activity)
	if color.HSL.L < 30 || color.HSL.L > 50 {
		t.Errorf("mastodon.social should have moderate lightness, got %f%%", color.HSL.L)
	}
}

func TestCalculateColor_PawooNet(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "pawoo.net",
		FirstSeenAt: "2021-03-21T00:00:00Z",
		Stats:       &Stats{UserCount: 800000, MonthlyActiveUsers: 50000},
	}

	color := CalculateColor(&instance, cfg)

	// Should produce valid color
	if color.HSL.H < 0 || color.HSL.H > 360 {
		t.Errorf("pawoo.net hue out of range: %f°", color.HSL.H)
	}

	// Should have different hash perturbation than mastodon.social
	msHash := domainHash("mastodon.social")
	pawooHash := domainHash("pawoo.net")
	if msHash == pawooHash {
		t.Error("Different domains should have different hashes")
	}
}

func TestCalculateColor_PixelfedSocial(t *testing.T) {
	cfg := DefaultConfig
	instance := Instance{
		Domain:      "pixelfed.social",
		FirstSeenAt: "2021-03-21T00:00:00Z",
		Stats:       &Stats{UserCount: 50000, MonthlyActiveUsers: 10000},
		Software:    &Software{Name: "Pixelfed"},
	}

	color := CalculateColor(&instance, cfg)

	// Should produce valid color
	if color.Hex[0] != '#' || len(color.Hex) != 7 {
		t.Errorf("Invalid hex format: %s", color.Hex)
	}

	// RGB should match hex
	expectedHex := rgbToHex(color.RGB)
	if color.Hex != expectedHex {
		t.Errorf("Hex/RGB mismatch: hex=%s rgb=%s", color.Hex, expectedHex)
	}
}

func TestCalculateColor_BatchProcessing(t *testing.T) {
	cfg := DefaultConfig

	// Create 100 instances with varying properties
	instances := make([]Instance, 100)
	for i := 0; i < 100; i++ {
		instances[i] = Instance{
			Domain:      fmt.Sprintf("instance%d.test", i),
			FirstSeenAt: time.Now().AddDate(0, -i, 0).Format(time.RFC3339),
			Stats: &Stats{
				UserCount:          (i + 1) * 100,
				MonthlyActiveUsers: (i + 1) * 50,
			},
		}
	}

	// Process all instances
	colors := make([]*Color, 100)
	for i := range instances {
		colors[i] = CalculateColor(&instances[i], cfg)
	}

	// Validate all colors
	for i, color := range colors {
		if color.HSL.H < 0 || color.HSL.H > 360 {
			t.Errorf("Instance %d: invalid hue %f°", i, color.HSL.H)
		}
		if color.RGB.R < 0 || color.RGB.R > 255 ||
		   color.RGB.G < 0 || color.RGB.G > 255 ||
		   color.RGB.B < 0 || color.RGB.B > 255 {
			t.Errorf("Instance %d: invalid RGB (%d,%d,%d)", i, color.RGB.R, color.RGB.G, color.RGB.B)
		}
		if len(color.Hex) != 7 || color.Hex[0] != '#' {
			t.Errorf("Instance %d: invalid hex %s", i, color.Hex)
		}
	}
}

func TestCalculateColor_SpectrumDistribution(t *testing.T) {
	cfg := DefaultConfig

	// Create instances across full age spectrum
	instances := []Instance{
		{Domain: "new.test", FirstSeenAt: time.Now().AddDate(0, -1, 0).Format(time.RFC3339), Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
		{Domain: "recent.test", FirstSeenAt: time.Now().AddDate(-1, 0, 0).Format(time.RFC3339), Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
		{Domain: "mid.test", FirstSeenAt: time.Now().AddDate(-3, 0, 0).Format(time.RFC3339), Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
		{Domain: "old.test", FirstSeenAt: "2018-01-01T00:00:00Z", Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
		{Domain: "ancient.test", FirstSeenAt: "2016-12-01T00:00:00Z", Stats: &Stats{UserCount: 1000, MonthlyActiveUsers: 500}},
	}

	hues := make([]float64, len(instances))
	for i := range instances {
		color := CalculateColor(&instances[i], cfg)
		hues[i] = color.HSL.H
	}

	// Verify hues generally decrease with age (newer = higher/bluer, older = lower/redder)
	// Note: Hash perturbation may cause some variance
	for i := 0; i < len(hues)-1; i++ {
		// Allow for hash perturbation ±30°, but general trend should be decreasing
		if hues[i] < hues[i+1]-60 { // If significantly inverted
			t.Errorf("Expected general trend: newer instances bluer than older, but instance %d (%f°) << instance %d (%f°)",
				i, hues[i], i+1, hues[i+1])
		}
	}

	// Verify we're using the full spectrum
	minHue := hues[0]
	maxHue := hues[0]
	for _, h := range hues {
		if h < minHue {
			minHue = h
		}
		if h > maxHue {
			maxHue = h
		}
	}

	spectrum := maxHue - minHue
	if spectrum < 100 {
		t.Errorf("Color spectrum should span at least 100°, got %f°", spectrum)
	}
}
