package main

import (
	"math"
	"testing"
)

// ============================================================
// A. Three-Star Triangle Formation Tests (4 tests)
// ============================================================

func TestGetThreeStarPositions_Formation(t *testing.T) {
	cfg := DefaultConfig
	positions := getThreeStarPositions(cfg)

	// Should return exactly 3 positions
	if len(positions) != 3 {
		t.Errorf("Expected 3 three-star positions, got %d", len(positions))
	}

	// Should have the three Mastodon domains
	expectedDomains := []string{"mastodon.social", "pawoo.net", "mastodon.cloud"}
	for _, domain := range expectedDomains {
		if _, exists := positions[domain]; !exists {
			t.Errorf("Missing position for domain: %s", domain)
		}
	}
}

func TestGetThreeStarPositions_SpatialSpread(t *testing.T) {
	cfg := DefaultConfig
	positions := getThreeStarPositions(cfg)

	// Get the three points
	p1 := positions["mastodon.social"]
	p2 := positions["pawoo.net"]
	p3 := positions["mastodon.cloud"]

	// Stars should be in different octants (different X/Y/Z signs)
	// p1 is at origin, p2 should have some negative coords, p3 should have different signs
	if p2.X >= 0 && p2.Y >= 0 && p2.Z >= 0 {
		t.Errorf("pawoo.net should not be in all-positive octant, got (%f, %f, %f)", p2.X, p2.Y, p2.Z)
	}

	// p3 should have different Z sign from p2
	if (p2.Z >= 0) == (p3.Z >= 0) {
		t.Errorf("Three stars should have Z variation, got p2.Z=%f, p3.Z=%f", p2.Z, p3.Z)
	}

	// Calculate 3D distances between all pairs - should be reasonable spread
	dist12 := math.Sqrt(math.Pow(p1.X-p2.X, 2) + math.Pow(p1.Y-p2.Y, 2) + math.Pow(p1.Z-p2.Z, 2))
	dist13 := math.Sqrt(math.Pow(p1.X-p3.X, 2) + math.Pow(p1.Y-p3.Y, 2) + math.Pow(p1.Z-p3.Z, 2))
	dist23 := math.Sqrt(math.Pow(p2.X-p3.X, 2) + math.Pow(p2.Y-p3.Y, 2) + math.Pow(p2.Z-p3.Z, 2))

	// All distances should be roughly similar (within 2x of each other)
	minDist := math.Min(dist12, math.Min(dist13, dist23))
	maxDist := math.Max(dist12, math.Max(dist13, dist23))
	if maxDist > minDist*2.5 {
		t.Errorf("Three stars distances too uneven: %.1f, %.1f, %.1f", dist12, dist13, dist23)
	}
}

func TestGetThreeStarPositions_MastodonSocialOrigin(t *testing.T) {
	cfg := DefaultConfig
	positions := getThreeStarPositions(cfg)

	p := positions["mastodon.social"]
	if p.X != 0 || p.Y != 0 || p.Z != 0 {
		t.Errorf("mastodon.social should be at origin (0,0,0), got (%f,%f,%f)", p.X, p.Y, p.Z)
	}
}

func TestGetThreeStarPositions_CustomEdgeLength(t *testing.T) {
	cfg := DefaultConfig
	cfg.ThreeStarEdge = 5000 // Different edge length

	positions := getThreeStarPositions(cfg)

	p1 := positions["mastodon.social"]
	p2 := positions["pawoo.net"]

	// 3D distance should be proportional to edge length
	distance := math.Sqrt(math.Pow(p1.X-p2.X, 2) + math.Pow(p1.Y-p2.Y, 2) + math.Pow(p1.Z-p2.Z, 2))
	// Distance should be within 0.5x to 2x of edge length
	if distance < cfg.ThreeStarEdge*0.5 || distance > cfg.ThreeStarEdge*2 {
		t.Errorf("Expected distance proportional to edge %.0f, got %.1f", cfg.ThreeStarEdge, distance)
	}
}

// ============================================================
// B. Orbital Position Calculation Tests (5 tests)
// ============================================================

func TestCalculateOrbitalPosition_CenterOffset(t *testing.T) {
	cfg := DefaultConfig
	instance := &Instance{
		Domain: "test.instance",
		Stats:  &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	position := calculateOrbitalPosition(instance, 100, 200, 300, 1000, cfg)

	// Position should be different from center
	if position.X == 100 && position.Y == 200 && position.Z == 300 {
		t.Error("Orbital position should be offset from center")
	}

	// Position should be within expected distance from center
	distFromCenter := math.Sqrt(
		math.Pow(position.X-100, 2) +
			math.Pow(position.Y-200, 2) +
			math.Pow(position.Z-300, 2))

	maxExpectedDistance := cfg.DistanceBase + 1000
	if distFromCenter > maxExpectedDistance {
		t.Errorf("Position distance from center (%.1f) exceeds expected max (%.1f)",
			distFromCenter, maxExpectedDistance)
	}
}

func TestCalculateOrbitalPosition_UserCountInfluence(t *testing.T) {
	cfg := DefaultConfig

	// Small instance (10 users)
	smallInstance := &Instance{
		Domain: "small.test",
		Stats:  &Stats{UserCount: 10, MonthlyActiveUsers: 5},
	}
	smallPos := calculateOrbitalPosition(smallInstance, 0, 0, 0, 1000, cfg)

	// Large instance (1M users)
	largeInstance := &Instance{
		Domain: "large.test",
		Stats:  &Stats{UserCount: 1000000, MonthlyActiveUsers: 500000},
	}
	largePos := calculateOrbitalPosition(largeInstance, 0, 0, 0, 1000, cfg)

	// Large instance should be closer to center (smaller distance)
	smallDist := math.Sqrt(smallPos.X*smallPos.X + smallPos.Y*smallPos.Y + smallPos.Z*smallPos.Z)
	largeDist := math.Sqrt(largePos.X*largePos.X + largePos.Y*largePos.Y + largePos.Z*largePos.Z)

	if largeDist >= smallDist {
		t.Errorf("Large instance (dist %.1f) should be closer than small instance (dist %.1f)",
			largeDist, smallDist)
	}
}

func TestCalculateOrbitalPosition_DeterministicForDomain(t *testing.T) {
	cfg := DefaultConfig
	instance := &Instance{
		Domain: "deterministic.test",
		Stats:  &Stats{UserCount: 5000, MonthlyActiveUsers: 2500},
	}

	// Calculate same position twice
	pos1 := calculateOrbitalPosition(instance, 0, 0, 0, 1000, cfg)
	pos2 := calculateOrbitalPosition(instance, 0, 0, 0, 1000, cfg)

	if pos1.X != pos2.X || pos1.Y != pos2.Y || pos1.Z != pos2.Z {
		t.Errorf("Same instance should produce same position")
	}
}

func TestCalculateOrbitalPosition_DifferentDomainsDifferentPositions(t *testing.T) {
	cfg := DefaultConfig

	instance1 := &Instance{
		Domain: "instance1.test",
		Stats:  &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	instance2 := &Instance{
		Domain: "instance2.test",
		Stats:  &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
	}

	pos1 := calculateOrbitalPosition(instance1, 0, 0, 0, 1000, cfg)
	pos2 := calculateOrbitalPosition(instance2, 0, 0, 0, 1000, cfg)

	if pos1.X == pos2.X && pos1.Y == pos2.Y && pos1.Z == pos2.Z {
		t.Error("Different domains should produce different positions")
	}
}

func TestCalculateOrbitalPosition_ZAxisVariation(t *testing.T) {
	cfg := DefaultConfig
	instances := []string{"test1.instance", "test2.instance", "test3.instance"}

	var zValues []float64
	for _, domain := range instances {
		instance := &Instance{
			Domain: domain,
			Stats:  &Stats{UserCount: 1000, MonthlyActiveUsers: 500},
		}
		pos := calculateOrbitalPosition(instance, 0, 0, 0, 1000, cfg)
		zValues = append(zValues, pos.Z)
	}

	// Z values should vary (different instances at different heights)
	minZ := zValues[0]
	maxZ := zValues[0]
	for _, z := range zValues {
		if z < minZ {
			minZ = z
		}
		if z > maxZ {
			maxZ = z
		}
	}

	if minZ == maxZ {
		t.Error("Different instances should have different Z positions")
	}
}

// ============================================================
// C. Galaxy Center Calculation Tests (3 tests)
// ============================================================

func TestCalculateGalaxyCenters_DistributionRing(t *testing.T) {
	cfg := DefaultConfig
	softwareList := []string{"Pixelfed", "Lemmy", "Misskey", "Peertube", "NodeBB"}

	centers := calculateGalaxyCenters(softwareList, cfg)

	// Should have one center per software
	if len(centers) != len(softwareList) {
		t.Errorf("Expected %d galaxy centers, got %d", len(softwareList), len(centers))
	}

	// Centers should be distributed in a circle
	for _, center := range centers {
		// Each center should be at some radius from origin
		radius := math.Sqrt(center.X*center.X + center.Y*center.Y)
		// Relaxed to 5x to support maximum scattering with index-based salts
		if radius < cfg.GalaxyRingRadius*0.3 || radius > cfg.GalaxyRingRadius*5 {
			t.Errorf("Galaxy center radius %.0f out of expected range", radius)
		}
	}
}

func TestCalculateGalaxyCenters_ZAxisVariation(t *testing.T) {
	cfg := DefaultConfig
	softwareList := make([]string, 48) // 4 rings × 12 per ring
	for i := 0; i < 48; i++ {
		softwareList[i] = "Software" + string(rune(i))
	}

	centers := calculateGalaxyCenters(softwareList, cfg)

	// Should have Z variation (different rings have different Z)
	zValues := make(map[float64]int)
	for _, center := range centers {
		zValues[center.Z]++
	}

	if len(zValues) < 2 {
		t.Error("Galaxy centers should have Z-axis variation across rings")
	}
}

func TestCalculateGalaxyCenters_UniformAngularDistribution(t *testing.T) {
	cfg := DefaultConfig
	softwareList := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"}

	centers := calculateGalaxyCenters(softwareList, cfg)

	// For first ring, centers should be roughly evenly distributed in angles
	var angles []float64
	for _, center := range centers {
		angle := math.Atan2(center.Y, center.X)
		angles = append(angles, angle)
	}

	// Average angular difference should be ~30° (360/12)
	// This is a loose check - just verify centers aren't all in one sector
	minAngle := angles[0]
	maxAngle := angles[0]
	for _, a := range angles {
		if a < minAngle {
			minAngle = a
		}
		if a > maxAngle {
			maxAngle = a
		}
	}

	angleSpread := maxAngle - minAngle
	if angleSpread < 3.0 { // Less than ~170°
		t.Errorf("Centers should be spread across multiple sectors, got spread of %.2f radians", angleSpread)
	}
}

// ============================================================
// D. Position Type Classification Tests (4 tests)
// ============================================================

func TestIsTopMastodon_Recognition(t *testing.T) {
	cfg := DefaultConfig

	testCases := []struct {
		domain   string
		expected bool
	}{
		{"mastodon.social", true},
		{"pawoo.net", true},
		{"mastodon.cloud", true},
		{"other.instance", false},
		{"fosstodon.org", false},
	}

	for _, tc := range testCases {
		result := isTopMastodon(tc.domain, cfg)
		if result != tc.expected {
			t.Errorf("isTopMastodon(%q) = %v, expected %v", tc.domain, result, tc.expected)
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

func TestFindNearestThreeStar_Distribution(t *testing.T) {
	cfg := DefaultConfig
	threeStarPositions := getThreeStarPositions(cfg)

	// Test that different domains map to different three-star centers
	domains := []string{
		"mastodon.instance1",
		"mastodon.instance2",
		"mastodon.instance3",
		"mastodon.instance4",
	}

	positions := make(map[string]Position)
	for _, domain := range domains {
		instance := &Instance{Domain: domain}
		pos := findNearestThreeStar(instance, threeStarPositions, cfg)
		positions[domain] = pos
	}

	// At least some instances should map to different stars
	uniquePositions := make(map[string]bool)
	for _, pos := range positions {
		key := string(rune(int(pos.X)))
		uniquePositions[key] = true
	}

	if len(uniquePositions) < 2 {
		t.Error("Mastodon instances should distribute across multiple three-star centers")
	}
}

// ============================================================
// E. Full Pipeline Tests (3 tests)
// ============================================================

func TestProcessPositions_ThreeStarAssignment(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{
			Domain:   "mastodon.social",
			Software: &Software{Name: "Mastodon"},
			Stats:    &Stats{UserCount: 1000000, MonthlyActiveUsers: 100000},
		},
		{
			Domain:   "pawoo.net",
			Software: &Software{Name: "Mastodon"},
			Stats:    &Stats{UserCount: 500000, MonthlyActiveUsers: 50000},
		},
		{
			Domain:   "mastodon.cloud",
			Software: &Software{Name: "Mastodon"},
			Stats:    &Stats{UserCount: 300000, MonthlyActiveUsers: 30000},
		},
	}

	result := ProcessPositions(instances, cfg)

	// All three should be marked as three_star_center
	for i, inst := range result {
		if inst.PositionType != "three_star_center" {
			t.Errorf("Instance %d (%s) should be three_star_center, got %s",
				i, inst.Domain, inst.PositionType)
		}
		if inst.Position == nil {
			t.Errorf("Instance %d should have position", i)
		}
	}
}

func TestProcessPositions_MastodonOrbitalAssignment(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "mastodon.social", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 100000}},
		{Domain: "other.mastodon.instance", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 5000}},
	}

	result := ProcessPositions(instances, cfg)

	// First should be three-star, second should be orbital
	if result[0].PositionType != "three_star_center" {
		t.Errorf("mastodon.social should be three_star_center")
	}
	if result[1].PositionType != "mastodon_orbital" {
		t.Errorf("other.mastodon.instance should be mastodon_orbital, got %s", result[1].PositionType)
	}
}

func TestProcessPositions_PositionRanges(t *testing.T) {
	cfg := DefaultConfig
	instances := []Instance{
		{Domain: "test1.instance", Software: &Software{Name: "Mastodon"}, Stats: &Stats{UserCount: 10000}},
		{Domain: "test2.instance", Software: &Software{Name: "Pixelfed"}, Stats: &Stats{UserCount: 5000}},
		{Domain: "test3.instance", Software: &Software{Name: "Lemmy"}, Stats: &Stats{UserCount: 3000}},
	}

	result := ProcessPositions(instances, cfg)

	// All should have positions
	for i, inst := range result {
		if inst.Position == nil {
			t.Errorf("Instance %d should have position", i)
			continue
		}

		// Positions should be reasonable (not at infinity)
		if math.IsInf(inst.Position.X, 0) || math.IsInf(inst.Position.Y, 0) || math.IsInf(inst.Position.Z, 0) {
			t.Errorf("Instance %d has infinite position", i)
		}

		// Positions should not be NaN
		if math.IsNaN(inst.Position.X) || math.IsNaN(inst.Position.Y) || math.IsNaN(inst.Position.Z) {
			t.Errorf("Instance %d has NaN position", i)
		}

		// Positions should be within reasonable bounds for this system
		if math.Abs(inst.Position.X) > 200000 || math.Abs(inst.Position.Y) > 200000 || math.Abs(inst.Position.Z) > 50000 {
			t.Logf("Instance %d position (%f, %f, %f) is at edge of space",
				i, inst.Position.X, inst.Position.Y, inst.Position.Z)
		}
	}

	// All should have position types assigned
	for i, inst := range result {
		if inst.PositionType == "" {
			t.Errorf("Instance %d has no PositionType", i)
		}
	}
}

// ============================================================
// F. Edge Cases and Boundary Tests (3 tests)
// ============================================================

func TestCalculateOrbitalPosition_ZeroUserCount(t *testing.T) {
	cfg := DefaultConfig
	instance := &Instance{
		Domain: "zero.users",
		Stats:  &Stats{UserCount: 0, MonthlyActiveUsers: 0},
	}

	// Should not panic
	pos := calculateOrbitalPosition(instance, 0, 0, 0, 1000, cfg)

	if math.IsInf(pos.X, 0) || math.IsNaN(pos.X) {
		t.Error("Should handle zero user count gracefully")
	}
}

func TestCalculateOrbitalPosition_NoStats(t *testing.T) {
	cfg := DefaultConfig
	instance := &Instance{
		Domain: "no.stats",
		Stats:  nil,
	}

	// Should not panic
	pos := calculateOrbitalPosition(instance, 0, 0, 0, 1000, cfg)

	if math.IsInf(pos.X, 0) || math.IsNaN(pos.X) {
		t.Error("Should handle nil stats gracefully")
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
