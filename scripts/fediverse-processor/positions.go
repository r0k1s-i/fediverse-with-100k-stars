package main

import (
	"math"
	"sort"
)

func getThreeStarPositions(cfg Config) map[string]Position {
	edge := cfg.ThreeStarEdge

	// Distribute three stars across different octants for better spatial spread
	// Form an equilateral triangle in 3D space, spread across different quadrants
	return map[string]Position{
		"mastodon.social": {X: 0, Y: 0, Z: 0},                      // Origin (center)
		"pawoo.net":       {X: -edge, Y: edge * 0.5, Z: edge * 0.7},   // Upper-left-front
		"mastodon.cloud":  {X: edge * 0.8, Y: -edge * 0.6, Z: -edge * 0.5}, // Lower-right-back
	}
}

func calculateOrbitalPosition(instance *Instance, centerX, centerY, centerZ, maxRadius float64, cfg Config) Position {
	userCount := 1
	if instance.Stats != nil && instance.Stats.UserCount > 0 {
		userCount = instance.Stats.UserCount
	}

	userNorm := logNormalize(float64(userCount), float64(cfg.MaxUserCount))

	// Add more randomness to distance to break up clustering
	distanceHash := domainHash(instance.Domain + "_dist")
	distanceVariation := (distanceHash - 0.5) * maxRadius * 0.3
	distance := cfg.DistanceBase + (1-userNorm)*maxRadius + distanceVariation

	// Use multiple hash sources for better distribution
	thetaHash := domainHash(instance.Domain + "_theta")
	theta := thetaHash * 2 * math.Pi

	// Increase z-axis variation with better randomness
	phiHash := domainHash(instance.Domain + "_phi")
	// Use full sphere range with non-uniform distribution for more variety
	phi := (phiHash - 0.5) * math.Pi * 1.8 // ±162° for very substantial z variation

	return Position{
		X: centerX + distance*math.Cos(theta)*math.Cos(phi),
		Y: centerY + distance*math.Sin(theta)*math.Cos(phi),
		Z: centerZ + distance*math.Sin(phi),
	}
}

func findNearestThreeStar(instance *Instance, threeStarPositions map[string]Position, cfg Config) Position {
	hash := domainHash(instance.Domain)
	starIndex := int(hash*3) % 3
	nearestDomain := cfg.TopMastodonDomains[starIndex]
	return threeStarPositions[nearestDomain]
}

func calculateGalaxyCenters(softwareList []string, cfg Config) map[string]Position {
	centers := make(map[string]Position)
	baseRadius := cfg.GalaxyRingRadius

	for _, software := range softwareList {
		// Use pure hash-based spherical distribution
		// Each galaxy gets a unique position based on its name hash

		// theta: azimuthal angle (0 to 2π) - full rotation around Y axis
		thetaHash := domainHash(software + "_theta")
		theta := thetaHash * 2 * math.Pi

		// phi: polar angle - use hash for full sphere coverage
		// Use arccos distribution for uniform sphere sampling
		phiHash := domainHash(software + "_phi")
		cosPhi := 2*phiHash - 1 // Maps [0,1] to [-1,1] uniformly
		sinPhi := math.Sqrt(1 - cosPhi*cosPhi)

		// Radius varies by hash for organic feel
		radiusHash := domainHash(software + "_radius")
		radius := baseRadius * (0.8 + radiusHash*1.4) // 0.8x to 2.2x base radius

		centers[software] = Position{
			X: radius * sinPhi * math.Cos(theta),
			Y: radius * sinPhi * math.Sin(theta),
			Z: radius * cosPhi,
		}
	}

	return centers
}

func isTopMastodon(domain string, cfg Config) bool {
	for _, d := range cfg.TopMastodonDomains {
		if d == domain {
			return true
		}
	}
	return false
}

func getSoftwareName(instance *Instance) string {
	if instance.Software != nil && instance.Software.Name != "" {
		return instance.Software.Name
	}
	return "Unknown"
}

func ProcessPositions(instances []Instance, cfg Config) []Instance {
	threeStarPositions := getThreeStarPositions(cfg)

	bySoftware := make(map[string][]int)
	for i := range instances {
		sw := getSoftwareName(&instances[i])
		bySoftware[sw] = append(bySoftware[sw], i)
	}

	type softwareStats struct {
		name       string
		totalUsers int
	}
	var softwareList []softwareStats
	for sw, indices := range bySoftware {
		if sw == "Mastodon" {
			continue
		}
		total := 0
		for _, idx := range indices {
			if instances[idx].Stats != nil {
				total += instances[idx].Stats.UserCount
			}
		}
		softwareList = append(softwareList, softwareStats{sw, total})
	}
	sort.Slice(softwareList, func(i, j int) bool {
		return softwareList[i].totalUsers > softwareList[j].totalUsers
	})

	softwareNames := make([]string, len(softwareList))
	for i, s := range softwareList {
		softwareNames[i] = s.name
	}
	galaxyCenters := calculateGalaxyCenters(softwareNames, cfg)

	result := make([]Instance, len(instances))
	for i := range instances {
		result[i] = instances[i]
		instance := &result[i]
		sw := getSoftwareName(instance)

		var position Position
		var positionType string

		if isTopMastodon(instance.Domain, cfg) {
			position = threeStarPositions[instance.Domain]
			positionType = "three_star_center"
		} else if sw == "Mastodon" {
			nearestStar := findNearestThreeStar(instance, threeStarPositions, cfg)
			// Calculate dynamic radius based on Mastodon instance count
			mastodonCount := len(bySoftware["Mastodon"])
			// More instances = larger radius to avoid overcrowding
			// Use log scale: 100 instances → 1x, 1000 → 1.5x, 10000 → 2x
			scaleFactor := 1.0 + math.Log10(float64(mastodonCount)/100.0)*0.5
			if scaleFactor < 1.0 {
				scaleFactor = 1.0
			}
			dynamicRadius := cfg.ThreeStarEdge * 0.4 * scaleFactor
			position = calculateOrbitalPosition(instance, nearestStar.X, nearestStar.Y, nearestStar.Z, dynamicRadius, cfg)
			positionType = "mastodon_orbital"
		} else if center, ok := galaxyCenters[sw]; ok {
			swIndices := bySoftware[sw]
			sort.Slice(swIndices, func(a, b int) bool {
				ucA, ucB := 0, 0
				if instances[swIndices[a]].Stats != nil {
					ucA = instances[swIndices[a]].Stats.UserCount
				}
				if instances[swIndices[b]].Stats != nil {
					ucB = instances[swIndices[b]].Stats.UserCount
				}
				return ucA > ucB
			})

			if len(swIndices) > 0 && instances[swIndices[0]].Domain == instance.Domain {
				position = center
				positionType = "galaxy_center"
			} else {
				// Calculate dynamic radius based on this software's instance count
				instanceCount := len(swIndices)
				// More instances = larger radius, log scale
				scaleFactor := 1.0 + math.Log10(float64(instanceCount)/10.0)*0.4
				if scaleFactor < 1.0 {
					scaleFactor = 1.0
				}
				dynamicRadius := cfg.GalaxyMaxRadius * scaleFactor
				position = calculateOrbitalPosition(instance, center.X, center.Y, center.Z, dynamicRadius, cfg)
				positionType = "galaxy_orbital"
			}
		} else {
			hash := domainHash(instance.Domain)

			// Outer rim gets its own distinct z-layer range
			// Use hash to determine which "shelf" in z-space
			zShelfHash := domainHash(instance.Domain + "_shelf")
			zShelf := math.Floor(zShelfHash * 5) // 5 distinct shelves

			// Base z-height for this shelf
			shelfHeight := (zShelf - 2) * 20000 // -40k, -20k, 0, 20k, 40k

			// XY position
			angle := hash * 2 * math.Pi
			distance := 50000 + hash*10000

			// Local z variation within shelf
			zHash := domainHash(instance.Domain + "_z")
			localZVariation := (zHash - 0.5) * 8000

			position = Position{
				X: distance * math.Cos(angle),
				Y: distance * math.Sin(angle),
				Z: shelfHeight + localZVariation,
			}
			positionType = "outer_rim"
		}

		instance.Position = &Position{
			X: math.Round(position.X*10) / 10,
			Y: math.Round(position.Y*10) / 10,
			Z: math.Round(position.Z*10) / 10,
		}
		instance.PositionType = positionType
	}

	return result
}
