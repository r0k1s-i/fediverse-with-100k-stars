package main

import (
	"math"
	"sort"
)

func getThreeStarPositions(cfg Config) map[string]Position {
	edge := cfg.ThreeStarEdge
	height := edge * math.Sqrt(3) / 2

	return map[string]Position{
		"mastodon.social": {X: 0, Y: 0, Z: 0},
		"pawoo.net":       {X: edge, Y: 0, Z: 0},
		"mastodon.cloud":  {X: edge / 2, Y: height, Z: 0},
	}
}

func calculateOrbitalPosition(instance *Instance, centerX, centerY, centerZ, maxRadius float64, cfg Config) Position {
	userCount := 1
	if instance.Stats != nil && instance.Stats.UserCount > 0 {
		userCount = instance.Stats.UserCount
	}

	hash := domainHash(instance.Domain)
	userNorm := logNormalize(float64(userCount), float64(cfg.MaxUserCount))
	distance := cfg.DistanceBase + (1-userNorm)*maxRadius

	theta := hash * 2 * math.Pi
	phi := (domainHash(instance.Domain+"_z") - 0.5) * math.Pi * 0.5

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
	ringRadius := cfg.GalaxyRingRadius
	rings := cfg.GalaxyRingCount

	for index, software := range softwareList {
		ring := (index / 12) % rings
		posInRing := index % 12
		angleOffset := float64(ring) * 0.2

		radius := ringRadius + float64(ring)*ringRadius*0.7
		angle := (float64(posInRing)/12)*2*math.Pi + angleOffset

		zOffset := float64(ring) * 2000
		if ring%2 != 0 {
			zOffset = -zOffset
		}

		centers[software] = Position{
			X: radius * math.Cos(angle),
			Y: radius * math.Sin(angle),
			Z: zOffset,
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
			position = calculateOrbitalPosition(instance, nearestStar.X, nearestStar.Y, nearestStar.Z, cfg.ThreeStarEdge*0.4, cfg)
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
				position = calculateOrbitalPosition(instance, center.X, center.Y, center.Z, cfg.GalaxyMaxRadius, cfg)
				positionType = "galaxy_orbital"
			}
		} else {
			hash := domainHash(instance.Domain)
			angle := hash * 2 * math.Pi
			distance := 50000 + hash*10000
			position = Position{
				X: distance * math.Cos(angle),
				Y: distance * math.Sin(angle),
				Z: (domainHash(instance.Domain+"_z") - 0.5) * 5000,
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
