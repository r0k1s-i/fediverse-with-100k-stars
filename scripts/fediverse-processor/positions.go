package main

import (
	"math"
	"sort"
)

// ============================================================================
// Helper Functions
// ============================================================================

// isSuperGiant checks if a domain is one of the three galactic core supergiants
func isSuperGiant(domain string, cfg Config) bool {
	for _, d := range cfg.SupergiantDomains {
		if d == domain {
			return true
		}
	}
	return false
}

// getSoftwareName safely extracts software name from instance
func getSoftwareName(instance *Instance) string {
	if instance.Software != nil && instance.Software.Name != "" {
		return instance.Software.Name
	}
	return "Unknown"
}

// getInstanceUserCount safely extracts user count from instance
func getInstanceUserCount(instance *Instance) int {
	if instance.Stats != nil && instance.Stats.UserCount > 0 {
		return instance.Stats.UserCount
	}
	return 1 // Default to 1 to avoid log(0)
}

// classifyInstanceSize determines position type based on user count
func classifyInstanceSize(userCount int, cfg Config) string {
	if userCount >= cfg.PlanetUserThreshold {
		return "planet"
	}
	if userCount >= cfg.AsteroidUserThreshold {
		return "asteroid"
	}
	if userCount >= cfg.SatelliteUserThreshold {
		return "satellite"
	}
	return "dust"
}

// getInstanceRadiusRange returns min and max radius fractions for a size class
func getInstanceRadiusRange(sizeType string) (float64, float64) {
	switch sizeType {
	case "planet":
		return 0.2, 0.4 // 20-40% of system radius (close to center)
	case "asteroid":
		return 0.4, 0.65 // 40-65% of system radius (middle belt)
	case "satellite":
		return 0.65, 0.85 // 65-85% of system radius (outer region)
	case "dust":
		return 0.85, 1.0 // 85-100% of system radius (edge)
	default:
		return 0.5, 1.0
	}
}

// calculateSystemTier determines tier (A/B/C) based on instance count
func calculateSystemTier(instanceCount int, cfg Config) string {
	if instanceCount >= cfg.TierAInstanceCount {
		return "A"
	}
	if instanceCount >= cfg.TierBInstanceCount {
		return "B"
	}
	return "C"
}

// calculateSystemMaxRadius calculates the maximum radius for a planetary system
func calculateSystemMaxRadius(instanceCount int, tier string, cfg Config) float64 {
	var baseRadius float64
	switch tier {
	case "A":
		baseRadius = cfg.TierASystemMaxRadius
	case "B":
		baseRadius = cfg.TierBSystemMaxRadius
	case "C":
		baseRadius = cfg.TierCSystemMaxRadius
	default:
		baseRadius = cfg.TierCSystemMaxRadius
	}

	// Logarithmic scaling with instance count
	if instanceCount < 10 {
		instanceCount = 10 // Prevent log issues
	}
	scaleFactor := 1.0 + math.Log10(float64(instanceCount)/10.0)*cfg.SystemRadiusScaleFactor
	if scaleFactor < 1.0 {
		scaleFactor = 1.0
	}

	return baseRadius * scaleFactor
}

// fibonacciSpherePoint generates a point on a sphere using Fibonacci lattice
func fibonacciSpherePoint(index, total int) (theta, phi float64) {
	goldenRatio := (1.0 + math.Sqrt(5.0)) / 2.0
	theta = 2.0 * math.Pi * float64(index) / goldenRatio
	phi = math.Acos(1.0 - 2.0*(float64(index)+0.5)/float64(total))
	return theta, phi
}

// rotatePoint applies a deterministic rotation based on seed string
// Uses Rodrigues' rotation formula for rotation around an arbitrary axis
func rotatePoint(p Position, seed string) Position {
	// Generate rotation axis from hash (unit vector on sphere)
	axisTheta := domainHash(seed+"_axisTheta") * 2 * math.Pi
	axisPhi := math.Acos(2*domainHash(seed+"_axisPhi") - 1)

	kx := math.Sin(axisPhi) * math.Cos(axisTheta)
	ky := math.Sin(axisPhi) * math.Sin(axisTheta)
	kz := math.Cos(axisPhi)

	// Rotation angle (0 to 2π)
	angle := domainHash(seed+"_angle") * 2 * math.Pi

	cosA := math.Cos(angle)
	sinA := math.Sin(angle)

	// Rodrigues' formula: v' = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
	crossX := ky*p.Z - kz*p.Y
	crossY := kz*p.X - kx*p.Z
	crossZ := kx*p.Y - ky*p.X

	dot := kx*p.X + ky*p.Y + kz*p.Z

	return Position{
		X: p.X*cosA + crossX*sinA + kx*dot*(1-cosA),
		Y: p.Y*cosA + crossY*sinA + ky*dot*(1-cosA),
		Z: p.Z*cosA + crossZ*sinA + kz*dot*(1-cosA),
	}
}

// ============================================================================
// Supergiant Positions
// ============================================================================

func getSuperGiantPosition(domain string, cfg Config) *Position {
	// Form an equilateral triangle in the XY plane, centered at origin
	// All three points are at distance r from the origin, separated by 120°
	r := cfg.SupergiantRadius

	// 120° = 2π/3 radians apart
	// Point 0: angle 90° (top)
	// Point 1: angle 210° (bottom-left)
	// Point 2: angle 330° (bottom-right)

	switch domain {
	case "mastodon.social":
		// 90° (π/2): cos=0, sin=1
		return &Position{X: 0, Y: r, Z: 0}

	case "misskey.io":
		// 210° (7π/6): cos=-√3/2≈-0.866, sin=-0.5
		return &Position{X: r * (-0.866), Y: r * (-0.5), Z: 0}

	case "pixelfed.social":
		// 330° (11π/6): cos=√3/2≈0.866, sin=-0.5
		return &Position{X: r * 0.866, Y: r * (-0.5), Z: 0}

	default:
		return &Position{X: 0, Y: 0, Z: 0}
	}
}

// ============================================================================
// Software System Centers - Spiral Arm Structure
// ============================================================================

type TierInfo struct {
	Tier          string
	InstanceCount int
	Software      string
	ArmIndex      int // Which spiral arm (0-4 for Tier A)
}

// Main spiral arms: 5 major arms for Tier A software
const NUM_MAIN_ARMS = 5

func calculateSystemCenters(softwareTiers map[string]TierInfo, cfg Config) map[string]Position {
	centers := make(map[string]Position)

	// Separate software types by tier
	tierA := []TierInfo{}
	tierB := []TierInfo{}
	tierC := []TierInfo{}

	for _, tier := range softwareTiers {
		switch tier.Tier {
		case "A":
			tierA = append(tierA, tier)
		case "B":
			tierB = append(tierB, tier)
		case "C":
			tierC = append(tierC, tier)
		}
	}

	// Sort each tier by instance count (largest first) for consistent ordering
	sort.Slice(tierA, func(i, j int) bool {
		return tierA[i].InstanceCount > tierA[j].InstanceCount
	})
	sort.Slice(tierB, func(i, j int) bool {
		return tierB[i].InstanceCount > tierB[j].InstanceCount
	})
	sort.Slice(tierC, func(i, j int) bool {
		return tierC[i].InstanceCount > tierC[j].InstanceCount
	})

	// Assign arm indices to Tier A
	for i := range tierA {
		tierA[i].ArmIndex = i % NUM_MAIN_ARMS
	}

	// Tier A: Main spiral arms (logarithmic spiral)
	distributeSpiralArms(tierA, centers, cfg)

	// Tier B: Branch arms (short spirals branching from main arms)
	distributeBranchArms(tierB, centers, cfg)

	// Tier C: Central bulge (spherical distribution around core)
	distributeCentralBulge(tierC, centers, cfg)

	return centers
}

// Tier A: Main spiral arms using logarithmic spiral
func distributeSpiralArms(tiers []TierInfo, centers map[string]Position, cfg Config) {
	for _, tierInfo := range tiers {
		armIndex := tierInfo.ArmIndex
		baseAngle := 2.0 * math.Pi * float64(armIndex) / NUM_MAIN_ARMS

		// Each arm gets a position along its spiral
		// Multiple tier A software on same arm -> stagger them radially
		armPosition := getArmMemberIndex(tierInfo.Software, tiers, armIndex)
		totalInArm := countSoftwareInArm(tiers, armIndex)

		// Logarithmic spiral: r = a * exp(b * theta)
		// theta increases as we go outward along the arm
		progress := float64(armPosition) / math.Max(float64(totalInArm), 1.0)
		theta := progress * 2.5 * math.Pi // 1.25 rotations along arm

		a := 5000.0 // Starting radius
		b := 0.25   // Spiral tightness
		radius := a * math.Exp(b*theta)

		angle := baseAngle + theta

		// Add vertical wave to spiral arms (makes them 3D)
		// Each arm has a sinusoidal Z variation as it spirals out
		zHash := domainHash(tierInfo.Software + "_z")
		// Base wave: sin(theta) gives natural up-down as spiral progresses
		waveAmplitude := radius * 0.15 // ±15% of radius for substantial 3D effect
		zWave := math.Sin(theta*2.0) * waveAmplitude
		// Add hash variation on top
		zVariation := (zHash - 0.5) * radius * 0.05
		z := zWave + zVariation

		centers[tierInfo.Software] = Position{
			X: radius * math.Cos(angle),
			Y: radius * math.Sin(angle),
			Z: z,
		}
	}
}

// Tier B: Branch arms (short spirals)
func distributeBranchArms(tiers []TierInfo, centers map[string]Position, cfg Config) {
	for i, tierInfo := range tiers {
		// Each B-tier branches from a main arm
		parentArm := i % NUM_MAIN_ARMS
		baseAngle := 2.0 * math.Pi * float64(parentArm) / NUM_MAIN_ARMS

		// Branch offset angle
		branchHash := domainHash(tierInfo.Software + "_branch")
		branchOffset := (branchHash - 0.5) * math.Pi / 3 // ±30°

		// Short spiral
		progress := branchHash
		theta := progress * math.Pi // Half rotation
		radius := 4000.0 + 4000.0*progress

		angle := baseAngle + branchOffset + theta*0.5

		// Slightly thicker than main arms (±4%)
		zHash := domainHash(tierInfo.Software + "_z")
		z := (zHash - 0.5) * radius * 0.08

		centers[tierInfo.Software] = Position{
			X: radius * math.Cos(angle),
			Y: radius * math.Sin(angle),
			Z: z,
		}
	}
}

// Tier C: Central bulge (spherical)
func distributeCentralBulge(tiers []TierInfo, centers map[string]Position, cfg Config) {
	total := len(tiers)
	if total == 0 {
		return
	}

	for i, tierInfo := range tiers {
		// Fibonacci lattice for sphere
		theta, phi := fibonacciSpherePoint(i, total)

		// Smaller radius for central bulge
		radiusHash := domainHash(tierInfo.Software + "_radius")
		radius := 3000.0 + radiusHash*2000.0 // 3k-5k

		centers[tierInfo.Software] = Position{
			X: radius * math.Sin(phi) * math.Cos(theta),
			Y: radius * math.Sin(phi) * math.Sin(theta),
			Z: radius * math.Cos(phi),
		}
	}
}

// Helper: find position index within an arm
func getArmMemberIndex(software string, tiers []TierInfo, armIndex int) int {
	count := 0
	for _, t := range tiers {
		if t.ArmIndex == armIndex {
			if t.Software == software {
				return count
			}
			count++
		}
	}
	return 0
}

// Helper: count software types in an arm
func countSoftwareInArm(tiers []TierInfo, armIndex int) int {
	count := 0
	for _, t := range tiers {
		if t.ArmIndex == armIndex {
			count++
		}
	}
	return count
}

// ============================================================================
// Instance Positioning Within Systems
// ============================================================================

func calculateInstancePosition(instance *Instance, systemCenter Position, systemMaxRadius float64, rank int, total int, softwareSeed string, cfg Config) *Position {
	userCount := getInstanceUserCount(instance)
	sizeType := classifyInstanceSize(userCount, cfg)

	minR, maxR := getInstanceRadiusRange(sizeType)
	userNorm := logNormalize(float64(userCount), float64(cfg.MaxUserCount))
	radiusFraction := maxR - (userNorm * (maxR - minR))

	distHash := domainHash(instance.Domain + "_dist")
	radiusVariation := (distHash - 0.5) * cfg.RadialVariationFactor * systemMaxRadius
	distance := radiusFraction*systemMaxRadius + radiusVariation

	if distance < 0 {
		distance = minR * systemMaxRadius
	}

	// Use Fibonacci Sphere for uniform distribution based on rank
	theta, phi := fibonacciSpherePoint(rank, total)

	localPos := Position{
		X: distance * math.Sin(phi) * math.Cos(theta),
		Y: distance * math.Sin(phi) * math.Sin(theta),
		Z: distance * math.Cos(phi),
	}

	// Apply system-specific rotation for visual variety
	rotated := rotatePoint(localPos, softwareSeed)

	return &Position{
		X: systemCenter.X + rotated.X,
		Y: systemCenter.Y + rotated.Y,
		Z: systemCenter.Z + rotated.Z,
	}
}

func constrain(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// ============================================================================
// Unknown Software - Interstellar Dust Cloud Distribution
// ============================================================================

func calculateOuterRimPosition(instance *Instance, cfg Config) *Position {
	// Use domain hash to determine distribution strategy
	hash := domainHash(instance.Domain)
	strategyHash := domainHash(instance.Domain + "_strategy")

	// Distribution strategies (weighted):
	// 70% - Spiral arm dust (along the 5 main arms)
	// 20% - Clustered nebulae (small dense clusters)
	// 10% - Outer halo (diffuse outer region)

	if strategyHash < 0.70 {
		// Strategy 1: Spiral Arm Dust
		return calculateSpiralArmDust(instance, hash, cfg)
	} else if strategyHash < 0.90 {
		// Strategy 2: Clustered Nebulae
		return calculateClusteredNebula(instance, hash, cfg)
	} else {
		// Strategy 3: Outer Halo
		return calculateOuterHalo(instance, hash, cfg)
	}
}

// Strategy 1: Distribute along spiral arms with natural scatter
func calculateSpiralArmDust(instance *Instance, hash float64, cfg Config) *Position {
	// Choose which spiral arm (0-4)
	armHash := domainHash(instance.Domain + "_arm")
	armIndex := int(math.Floor(armHash * NUM_MAIN_ARMS))
	baseAngle := 2.0 * math.Pi * float64(armIndex) / NUM_MAIN_ARMS

	// Position along the arm (logarithmic spiral)
	progressHash := domainHash(instance.Domain + "_progress")
	theta := progressHash * 2.5 * math.Pi // Follow arm rotation

	// Distance: slightly beyond the main systems
	a := 8000.0 // Start further out than main systems
	b := 0.30   // Slightly looser spiral
	baseRadius := a * math.Exp(b*theta)

	// Add perpendicular scatter (drift away from arm center)
	scatterHash := domainHash(instance.Domain + "_scatter")
	perpendicularOffset := (scatterHash - 0.5) * 3000.0 // ±1500 units

	angle := baseAngle + theta

	// Z variation: waves along the arm
	zWaveHash := domainHash(instance.Domain + "_zwave")
	zWave := math.Sin(theta*3.0) * baseRadius * 0.12
	zScatter := (zWaveHash - 0.5) * 2500.0
	z := zWave + zScatter

	// Apply perpendicular offset in XY plane
	perpAngle := angle + math.Pi/2.0
	x := baseRadius*math.Cos(angle) + perpendicularOffset*math.Cos(perpAngle)
	y := baseRadius*math.Sin(angle) + perpendicularOffset*math.Sin(perpAngle)

	return &Position{X: x, Y: y, Z: z}
}

// Strategy 2: Form small dense clusters (nebulae)
func calculateClusteredNebula(instance *Instance, hash float64, cfg Config) *Position {
	// Determine cluster center (use first 6 chars of domain as cluster ID)
	clusterSeed := instance.Domain
	if len(clusterSeed) > 6 {
		clusterSeed = clusterSeed[:6]
	}

	// Cluster center in cylindrical coordinates
	clusterHash := domainHash(clusterSeed + "_cluster")
	clusterAngle := clusterHash * 2.0 * math.Pi
	clusterDist := 10000.0 + clusterHash*12000.0 // 10k-22k from center

	clusterZHash := domainHash(clusterSeed + "_clusterZ")
	clusterZ := (clusterZHash - 0.5) * 8000.0 // ±4000 units

	clusterCenterX := clusterDist * math.Cos(clusterAngle)
	clusterCenterY := clusterDist * math.Sin(clusterAngle)

	// Position within cluster (small tight sphere)
	localHash := domainHash(instance.Domain + "_local")
	localAngle := localHash * 2.0 * math.Pi

	localPhiHash := domainHash(instance.Domain + "_phi")
	localPhi := math.Acos(2.0*localPhiHash - 1.0)

	// Cluster radius (tight grouping)
	radiusHash := domainHash(instance.Domain + "_radius")
	localRadius := radiusHash * 800.0 // 0-800 units (very tight)

	localX := localRadius * math.Sin(localPhi) * math.Cos(localAngle)
	localY := localRadius * math.Sin(localPhi) * math.Sin(localAngle)
	localZ := localRadius * math.Cos(localPhi)

	return &Position{
		X: clusterCenterX + localX,
		Y: clusterCenterY + localY,
		Z: clusterZ + localZ,
	}
}

// Strategy 3: Diffuse outer halo
func calculateOuterHalo(instance *Instance, hash float64, cfg Config) *Position {
	// Spherical shell at large radius
	angle := hash * 2.0 * math.Pi

	phiHash := domainHash(instance.Domain + "_phi")
	phi := math.Acos(2.0*phiHash - 1.0)

	// Distance: far outer region
	distHash := domainHash(instance.Domain + "_dist")
	distance := 25000.0 + distHash*15000.0 // 25k-40k

	return &Position{
		X: distance * math.Sin(phi) * math.Cos(angle),
		Y: distance * math.Sin(phi) * math.Sin(angle),
		Z: distance * math.Cos(phi),
	}
}

// ============================================================================
// Main Processing Function
// ============================================================================

func ProcessPositions(instances []Instance, cfg Config) []Instance {
	// Step 1: Group instances by software type
	bySoftware := make(map[string][]int)
	for i := range instances {
		sw := getSoftwareName(&instances[i])
		bySoftware[sw] = append(bySoftware[sw], i)
	}

	// Step 2: Calculate tier for each software type and prepare metadata
	// IMPORTANT: Exclude "Unknown" software - it uses special dust cloud distribution
	softwareTiers := make(map[string]TierInfo)
	for software, indices := range bySoftware {
		// Skip "Unknown" - it will be handled by calculateOuterRimPosition
		if software == "Unknown" {
			continue
		}

		instanceCount := len(indices)
		tier := calculateSystemTier(instanceCount, cfg)
		softwareTiers[software] = TierInfo{
			Tier:          tier,
			InstanceCount: instanceCount,
			Software:      software,
		}
	}

	// Step 3: Calculate planetary system centers using Fibonacci lattice
	systemCenters := calculateSystemCenters(softwareTiers, cfg)

	// Step 4: Calculate system max radii
	systemRadii := make(map[string]float64)
	for software, tierInfo := range softwareTiers {
		systemRadii[software] = calculateSystemMaxRadius(
			tierInfo.InstanceCount,
			tierInfo.Tier,
			cfg,
		)
	}

	// Step 5: Sort instances within each software type by user count
	for software, indices := range bySoftware {
		sort.Slice(indices, func(a, b int) bool {
			ucA := getInstanceUserCount(&instances[indices[a]])
			ucB := getInstanceUserCount(&instances[indices[b]])
			return ucA > ucB
		})
		bySoftware[software] = indices
	}

	// Step 6: Process each instance
	result := make([]Instance, len(instances))
	for i := range instances {
		result[i] = instances[i]
		instance := &result[i]
		software := getSoftwareName(instance)

		if isSuperGiant(instance.Domain, cfg) {
			instance.Position = getSuperGiantPosition(instance.Domain, cfg)
			instance.PositionType = "supergiant"
			continue
		}

		systemCenter, ok := systemCenters[software]
		if !ok {
			instance.Position = calculateOuterRimPosition(instance, cfg)
			instance.PositionType = "unknown"
			continue
		}

		systemMaxRadius := systemRadii[software]
		userCount := getInstanceUserCount(instance)

		indices := bySoftware[software]
		total := len(indices)

		rank := -1
		for r, idx := range indices {
			if instances[idx].Domain == instance.Domain {
				rank = r
				break
			}
		}

		isLargest := rank == 0

		if isLargest && !isSuperGiant(instance.Domain, cfg) {
			instance.Position = &Position{
				X: systemCenter.X,
				Y: systemCenter.Y,
				Z: systemCenter.Z,
			}
			instance.PositionType = classifyInstanceSize(userCount, cfg)
		} else {
			instance.Position = calculateInstancePosition(instance, systemCenter, systemMaxRadius, rank, total, software, cfg)
			instance.PositionType = classifyInstanceSize(userCount, cfg)
		}

		instance.Position.X = math.Round(instance.Position.X*10) / 10
		instance.Position.Y = math.Round(instance.Position.Y*10) / 10
		instance.Position.Z = math.Round(instance.Position.Z*10) / 10
	}

	return result
}
