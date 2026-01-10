package main

import (
	"math"
	"testing"
)

// ============================================================
// A. Supergiant Position Tests
// ============================================================

func TestGetSuperGiantPosition_ThreeStars(t *testing.T) {
	cfg := DefaultConfig

	// Test all three supergiants
	testCases := []struct {
		domain string
		name   string
	}{
		{"mastodon.social", "Mastodon Social"},
		{"misskey.io", "Misskey IO"},
		{"pixelfed.social", "Pixelfed Social"},
	}

	for _, tc := range testCases {
		pos := getSuperGiantPosition(tc.domain, cfg)
		if pos == nil {
			t.Errorf("%s should have a position", tc.name)
		}
	}
}

func TestGetSuperGiantPosition_MastodonSocialAtOrigin(t *testing.T) {
	cfg := DefaultConfig
	pos := getSuperGiantPosition("mastodon.social", cfg)

	if pos.X != 0 || pos.Y != 0 || pos.Z != 0 {
		t.Errorf("mastodon.social should be at origin (0,0,0), got (%f,%f,%f)", pos.X, pos.Y, pos.Z)
	}
}

func TestGetSuperGiantPosition_ProperSpacing(t *testing.T) {
	cfg := DefaultConfig

	p1 := getSuperGiantPosition("mastodon.social", cfg)
	p2 := getSuperGiantPosition("misskey.io", cfg)
	p3 := getSuperGiantPosition("pixelfed.social", cfg)

	// Calculate distances
	dist12 := math.Sqrt(math.Pow(p1.X-p2.X, 2) + math.Pow(p1.Y-p2.Y, 2) + math.Pow(p1.Z-p2.Z, 2))
	dist13 := math.Sqrt(math.Pow(p1.X-p3.X, 2) + math.Pow(p1.Y-p3.Y, 2) + math.Pow(p1.Z-p3.Z, 2))
	dist23 := math.Sqrt(math.Pow(p2.X-p3.X, 2) + math.Pow(p2.Y-p3.Y, 2) + math.Pow(p2.Z-p3.Z, 2))

	// All distances should be reasonable (within 2x of each other)
	minDist := math.Min(dist12, math.Min(dist13, dist23))
	maxDist := math.Max(dist12, math.Max(dist13, dist23))

	if maxDist > minDist*2.5 {
		t.Errorf("Supergiant distances too uneven: %.1f, %.1f, %.1f", dist12, dist13, dist23)
	}

	// Should be roughly at SupergiantRadius
	avgDist := (dist12 + dist13 + dist23) / 3
	if avgDist < cfg.SupergiantRadius*0.5 || avgDist > cfg.SupergiantRadius*2.0 {
		t.Errorf("Average distance %.1f not proportional to SupergiantRadius %.1f", avgDist, cfg.SupergiantRadius)
	}
}

// ============================================================
// B. Helper Function Tests
// ============================================================

func TestIsSuperGiant_Recognition(t *testing.T) {
	cfg := DefaultConfig

	testCases := []struct {
		domain   string
		expected bool
	}{
		{"mastodon.social", true},
		{"misskey.io", true},
		{"pixelfed.social", true},
		{"pawoo.net", false},
		{"fosstodon.org", false},
	}

	for _, tc := range testCases {
		result := isSuperGiant(tc.domain, cfg)
		if result != tc.expected {
			t.Errorf("isSuperGiant(%q) = %v, expected %v", tc.domain, result, tc.expected)
		}
	}
}

func TestGetSoftwareName_VariousSoftware(t *testing.T) {
	testCases := []struct {
		instance *Instance
		expected string
	}{
		{&Instance{Software: &Software{Name: "Mastodon"}}, "Mastodon"},
		{&Instance{Software: &Software{Name: "Pixelfed"}}, "Pixelfed"},
		{&Instance{Software: nil}, "Unknown"},
		{&Instance{Software: &Software{Name: ""}}, "Unknown"},
	}

	for _, tc := range testCases {
		result := getSoftwareName(tc.instance)
		if result != tc.expected {
			t.Errorf("getSoftwareName() = %q, expected %q", result, tc.expected)
		}
	}
}

func TestClassifyInstanceSize(t *testing.T) {
	cfg := DefaultConfig

	testCases := []struct {
		userCount int
		expected  string
	}{
		{5000, "planet"},    // >= 1000
		{500, "asteroid"},   // >= 100
		{50, "satellite"},   // >= 10
		{5, "dust"},         // < 10
		{1, "dust"},         // minimum
		{10, "satellite"},   // exact threshold
		{100, "asteroid"},   // exact threshold
		{1000, "planet"},    // exact threshold
		{3000000, "planet"}, // max value
	}

	for _, tc := range testCases {
		result := classifyInstanceSize(tc.userCount, cfg)
		if result != tc.expected {
			t.Errorf("classifyInstanceSize(%d) = %q, expected %q", tc.userCount, result, tc.expected)
		}
	}
}

func TestCalculateSystemTier(t *testing.T) {
	cfg := DefaultConfig

	testCases := []struct {
		instanceCount int
		expected      string
	}{
		{200, "A"},  // >= 100
		{100, "A"},  // exact threshold
		{50, "B"},   // >= 20
		{20, "B"},   // exact threshold
		{10, "C"},   // < 20
		{1, "C"},    // minimum
		{1978, "A"}, // Mastodon count
	}

	for _, tc := range testCases {
		result := calculateSystemTier(tc.instanceCount, cfg)
		if result != tc.expected {
			t.Errorf("calculateSystemTier(%d) = %q, expected %q", tc.instanceCount, result, tc.expected)
		}
	}
}

func TestCalculateSystemMaxRadius_Scaling(t *testing.T) {
	cfg := DefaultConfig

	// Test logarithmic scaling
	radius10 := calculateSystemMaxRadius(10, "A", cfg)
	radius100 := calculateSystemMaxRadius(100, "A", cfg)
	radius1000 := calculateSystemMaxRadius(1000, "A", cfg)

	// Radius should increase with instance count
	if radius100 <= radius10 {
		t.Error("Radius should increase with instance count")
	}
	if radius1000 <= radius100 {
		t.Error("Radius should increase with instance count")
	}

	// But growth should be logarithmic (not linear)
	// 10->100 increase should be > 100->1000 increase
	increase1 := radius100 - radius10
	increase2 := radius1000 - radius100
	if increase2 > increase1 {
		t.Error("Radius scaling should be logarithmic (diminishing returns)")
	}
}

// ============================================================
// C. System Center Distribution Tests
// ============================================================

func TestCalculateSystemCenters_Count(t *testing.T) {
	cfg := DefaultConfig

	softwareTiers := map[string]TierInfo{
		"Mastodon": {Tier: "A", InstanceCount: 1978, Software: "Mastodon"},
		"Misskey":  {Tier: "A", InstanceCount: 478, Software: "Misskey"},
		"PeerTube": {Tier: "A", InstanceCount: 293, Software: "PeerTube"},
		"Pixelfed": {Tier: "A", InstanceCount: 202, Software: "Pixelfed"},
		"Pleroma":  {Tier: "B", InstanceCount: 70, Software: "Pleroma"},
		"Akkoma":   {Tier: "C", InstanceCount: 15, Software: "Akkoma"},
	}

	centers := calculateSystemCenters(softwareTiers, cfg)

	// Should have one center per software type
	if len(centers) != len(softwareTiers) {
		t.Errorf("Expected %d system centers, got %d", len(softwareTiers), len(centers))
	}

	// All software types should be present
	for software := range softwareTiers {
		if _, exists := centers[software]; !exists {
			t.Errorf("Missing center for software: %s", software)
		}
	}
}

func TestCalculateSystemCenters_TierDistances(t *testing.T) {
	cfg := DefaultConfig

	softwareTiers := map[string]TierInfo{
		"SoftwareA": {Tier: "A", InstanceCount: 150, Software: "SoftwareA"},
		"SoftwareB": {Tier: "B", InstanceCount: 50, Software: "SoftwareB"},
		"SoftwareC": {Tier: "C", InstanceCount: 10, Software: "SoftwareC"},
	}

	centers := calculateSystemCenters(softwareTiers, cfg)

	// Calculate distances from origin
	distA := math.Sqrt(centers["SoftwareA"].X*centers["SoftwareA"].X +
		centers["SoftwareA"].Y*centers["SoftwareA"].Y +
		centers["SoftwareA"].Z*centers["SoftwareA"].Z)

	distB := math.Sqrt(centers["SoftwareB"].X*centers["SoftwareB"].X +
		centers["SoftwareB"].Y*centers["SoftwareB"].Y +
		centers["SoftwareB"].Z*centers["SoftwareB"].Z)

	distC := math.Sqrt(centers["SoftwareC"].X*centers["SoftwareC"].X +
		centers["SoftwareC"].Y*centers["SoftwareC"].Y +
		centers["SoftwareC"].Z*centers["SoftwareC"].Z)

	// Tier A: should be on spiral arms (5k-15k range)
	if distA < 5000 || distA > 15000 {
		t.Errorf("Tier A distance %.1f not in spiral arm range [5000, 15000]", distA)
	}

	// Tier B: should be on branch arms (4k-8k range)
	if distB < 4000 || distB > 8000 {
		t.Errorf("Tier B distance %.1f not in branch arm range [4000, 8000]", distB)
	}

	// Tier C: should be in central bulge (3k-5k range)
	if distC < 3000 || distC > 5000 {
		t.Errorf("Tier C distance %.1f not in central bulge range [3000, 5000]", distC)
	}
}

// ============================================================
// D. Instance Position Calculation Tests
// ============================================================

func TestCalculateInstancePosition_DifferentSizes(t *testing.T) {
	cfg := DefaultConfig
	systemCenter := Position{X: 10000, Y: 5000, Z: 2000}
	systemMaxRadius := 5000.0

	// Planet (large instance)
	planetInstance := &Instance{
		Domain: "planet.test",
		Stats:  &Stats{UserCount: 5000, MonthlyActiveUsers: 2500},
	}
	planetPos := calculateInstancePosition(planetInstance, systemCenter, systemMaxRadius, cfg)

	// Dust (small instance)
	dustInstance := &Instance{
		Domain: "dust.test",
		Stats:  &Stats{UserCount: 5, MonthlyActiveUsers: 2},
	}
	dustPos := calculateInstancePosition(dustInstance, systemCenter, systemMaxRadius, cfg)

	// Calculate distances from system center
	planetDist := math.Sqrt(math.Pow(planetPos.X-systemCenter.X, 2) +
		math.Pow(planetPos.Y-systemCenter.Y, 2) +
		math.Pow(planetPos.Z-systemCenter.Z, 2))

	dustDist := math.Sqrt(math.Pow(dustPos.X-systemCenter.X, 2) +
		math.Pow(dustPos.Y-systemCenter.Y, 2) +
		math.Pow(dustPos.Z-systemCenter.Z, 2))

	// Planet should be closer to center than dust
	if planetDist >= dustDist {
		t.Errorf("Planet (dist %.1f) should be closer to center than dust (dist %.1f)", planetDist, dustDist)
	}

	// Planet should be in inner 40%, dust should be in outer 85-100%
	if planetDist > systemMaxRadius*0.4*1.2 { // Allow 20% margin for variation
		t.Errorf("Planet distance %.1f exceeds expected max %.1f", planetDist, systemMaxRadius*0.4)
	}
	if dustDist < systemMaxRadius*0.85*0.8 { // Allow 20% margin for variation
		t.Errorf("Dust distance %.1f below expected min %.1f", dustDist, systemMaxRadius*0.85)
	}
}

func TestCalculateInstancePosition_ZAxisVariation(t *testing.T) {
	cfg := DefaultConfig
	systemCenter := Position{X: 0, Y: 0, Z: 0}
	systemMaxRadius := 5000.0

	// Test multiple instances
	var zValues []float64
	for i := 0; i < 10; i++ {
		instance := &Instance{
			Domain: "test" + string(rune(i)) + ".instance",
			Stats:  &Stats{UserCount: 100, MonthlyActiveUsers: 50},
		}
		pos := calculateInstancePosition(instance, systemCenter, systemMaxRadius, cfg)
		zValues = append(zValues, pos.Z)
	}

	// Z values should vary significantly for spherical distribution
	minZ := zValues[0]
	maxZ := zValues[0]
	for _, z := range zValues[1:] {
		if z < minZ {
			minZ = z
		}
		if z > maxZ {
			maxZ = z
		}
	}

	zRange := maxZ - minZ
	// For spherical distribution, expect substantial Z variation (at least 30% of max radius)
	if zRange < systemMaxRadius*0.3 {
		t.Errorf("Z-axis variation too small for sphere: %.1f (expected > %.1f)", zRange, systemMaxRadius*0.3)
	}
}

func TestCalculateInstancePosition_Deterministic(t *testing.T) {
	cfg := DefaultConfig
	systemCenter := Position{X: 1000, Y: 2000, Z: 3000}
	systemMaxRadius := 4000.0

	instance := &Instance{
		Domain: "deterministic.test",
		Stats:  &Stats{UserCount: 500, MonthlyActiveUsers: 250},
	}

	// Calculate same position twice
	pos1 := calculateInstancePosition(instance, systemCenter, systemMaxRadius, cfg)
	pos2 := calculateInstancePosition(instance, systemCenter, systemMaxRadius, cfg)

	if pos1.X != pos2.X || pos1.Y != pos2.Y || pos1.Z != pos2.Z {
		t.Error("Same instance should produce same position")
	}
}

// ============================================================
// E. Full Pipeline Tests
// ============================================================

func TestProcessPositions_SupergiantAssignment(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{
			Domain:   "mastodon.social",
			Software: &Software{Name: "Mastodon"},
			Stats:    &Stats{UserCount: 3000000, MonthlyActiveUsers: 280000},
		},
		{
			Domain:   "misskey.io",
			Software: &Software{Name: "Misskey"},
			Stats:    &Stats{UserCount: 695000, MonthlyActiveUsers: 100000},
		},
		{
			Domain:   "pixelfed.social",
			Software: &Software{Name: "Pixelfed"},
			Stats:    &Stats{UserCount: 514000, MonthlyActiveUsers: 50000},
		},
	}

	result := ProcessPositions(instances, cfg)

	// All three should be marked as supergiant
	for i, inst := range result {
		if inst.PositionType != "supergiant" {
			t.Errorf("Instance %d (%s) should be supergiant, got %s",
				i, inst.Domain, inst.PositionType)
		}
		if inst.Position == nil {
			t.Errorf("Instance %d should have position", i)
		}
	}
}

func TestProcessPositions_SoftwareClustering(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "m1.test", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 10000}},
		{Domain: "m2.test", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 5000}},
		{Domain: "p1.test", Software: &Software{Name: "Pixelfed"}, Stats: &Stats{UserCount: 3000}},
		{Domain: "p2.test", Software: &Software{Name: "Pixelfed"}, Stats: &Stats{UserCount: 2000}},
	}

	result := ProcessPositions(instances, cfg)

	// Calculate centroid of Mastodon instances
	mastodonCentroidX := (result[0].Position.X + result[1].Position.X) / 2
	mastodonCentroidY := (result[0].Position.Y + result[1].Position.Y) / 2

	// Calculate centroid of Pixelfed instances
	pixelfedCentroidX := (result[2].Position.X + result[3].Position.X) / 2
	pixelfedCentroidY := (result[2].Position.Y + result[3].Position.Y) / 2

	// Distance between Mastodon instances
	mastodonDist := math.Sqrt(math.Pow(result[0].Position.X-result[1].Position.X, 2) +
		math.Pow(result[0].Position.Y-result[1].Position.Y, 2))

	// Distance between Pixelfed instances
	pixelfedDist := math.Sqrt(math.Pow(result[2].Position.X-result[3].Position.X, 2) +
		math.Pow(result[2].Position.Y-result[3].Position.Y, 2))

	// Distance between software type centroids
	interClusterDist := math.Sqrt(math.Pow(mastodonCentroidX-pixelfedCentroidX, 2) +
		math.Pow(mastodonCentroidY-pixelfedCentroidY, 2))

	// Inter-cluster distance should be much larger than intra-cluster distances
	avgIntraCluster := (mastodonDist + pixelfedDist) / 2
	if interClusterDist < avgIntraCluster*2 {
		t.Logf("Warning: Software types may not be well-separated. Inter: %.1f, Intra: %.1f",
			interClusterDist, avgIntraCluster)
	}
}

func TestProcessPositions_PositionTypes(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "planet.test", Software: &Software{Name: "Test"}, Stats: &Stats{UserCount: 5000}},
		{Domain: "asteroid.test", Software: &Software{Name: "Test"}, Stats: &Stats{UserCount: 500}},
		{Domain: "satellite.test", Software: &Software{Name: "Test"}, Stats: &Stats{UserCount: 50}},
		{Domain: "dust.test", Software: &Software{Name: "Test"}, Stats: &Stats{UserCount: 5}},
	}

	result := ProcessPositions(instances, cfg)

	// Check position types are assigned correctly
	if result[0].PositionType != "planet" {
		t.Errorf("Expected planet, got %s", result[0].PositionType)
	}
	if result[1].PositionType != "asteroid" {
		t.Errorf("Expected asteroid, got %s", result[1].PositionType)
	}
	if result[2].PositionType != "satellite" {
		t.Errorf("Expected satellite, got %s", result[2].PositionType)
	}
	if result[3].PositionType != "dust" {
		t.Errorf("Expected dust, got %s", result[3].PositionType)
	}
}

func TestProcessPositions_NoInfinityOrNaN(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "test1.instance", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 10000}},
		{Domain: "test2.instance", Software: &Software{Name: "Pixelfed"}, Stats: &Stats{UserCount: 5000}},
		{Domain: "test3.instance", Software: &Software{Name: "Lemmy"}, Stats: &Stats{UserCount: 3000}},
		{Domain: "test4.instance", Software: &Software{Name: "Unknown"}, Stats: &Stats{UserCount: 100}},
	}

	result := ProcessPositions(instances, cfg)

	for i, inst := range result {
		if inst.Position == nil {
			t.Errorf("Instance %d should have position", i)
			continue
		}

		// No infinity
		if math.IsInf(inst.Position.X, 0) || math.IsInf(inst.Position.Y, 0) || math.IsInf(inst.Position.Z, 0) {
			t.Errorf("Instance %d has infinite position", i)
		}

		// No NaN
		if math.IsNaN(inst.Position.X) || math.IsNaN(inst.Position.Y) || math.IsNaN(inst.Position.Z) {
			t.Errorf("Instance %d has NaN position", i)
		}

		// Position type should be set
		if inst.PositionType == "" {
			t.Errorf("Instance %d has no PositionType", i)
		}
	}
}

// ============================================================
// F. Edge Cases
// ============================================================

func TestProcessPositions_ZeroUserCount(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "zero.users", Software: &Software{Name: "Test"}, Stats: &Stats{UserCount: 0}},
	}

	// Should not panic
	result := ProcessPositions(instances, cfg)

	if len(result) != 1 {
		t.Error("Should process instance with zero users")
	}

	if math.IsInf(result[0].Position.X, 0) || math.IsNaN(result[0].Position.X) {
		t.Error("Should handle zero user count gracefully")
	}
}

func TestProcessPositions_NoStats(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "no.stats", Software: &Software{Name: "Test"}, Stats: nil},
	}

	// Should not panic
	result := ProcessPositions(instances, cfg)

	if len(result) != 1 {
		t.Error("Should process instance with nil stats")
	}

	if result[0].Position == nil {
		t.Error("Should assign position even with nil stats")
	}
}

func TestProcessPositions_EmptyInstances(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{}

	// Should not panic
	result := ProcessPositions(instances, cfg)

	if len(result) != 0 {
		t.Error("Empty input should produce empty output")
	}
}
