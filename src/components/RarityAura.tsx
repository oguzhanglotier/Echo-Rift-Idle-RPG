// =============================================
// ECHO RIFT — RARITY AURA (v2)
// Layered visual effects scaled to rarity. Wraps an item card and
// paints animated borders / orbiting electric particles behind
// (and around) the children. All overlays are pointerEvents='none'.
//
// Tier intensity:
//   Common      → no FX (just children)
//   Uncommon    → neon border (thickens + brightens, falls back to thin)
//   Rare        → border + 2 orbiting electric particles
//   Epic        → border + 4 orbiting electric particles
//   Legendary   → border + 8 orbiting electric particles (more density)
//   Dimensional → all of Legendary + 12 particles + RGB color-shift border
//
// Each "electric particle" is a glowing dot orbiting the item, and a
// smaller white spark orbits the dot itself (atomic-electron feel).
//
// Performance: orbit transforms use useNativeDriver. Border thickness
// pulse uses non-native driver (single layer). No flash, no spinning
// frame.
// =============================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import { Rarity, RARITY_COLORS } from '../types'

interface Props {
  rarity: Rarity
  children: React.ReactNode
  /** Outer container size (square). Used for positioning particles. */
  size?: number
  /** Border radius applied to the visual layers (match the slot/card). */
  borderRadius?: number
  /** Disable expensive layers (e.g. when off-screen / scrolling lists). */
  reduced?: boolean
}

const COUNT: Record<Rarity, number> = {
  Common: 0,
  Uncommon: 0,
  Rare: 2,
  Epic: 4,
  Legendary: 8,
  Dimensional: 12,
}

export function RarityAura({
  rarity, children, size = 96, borderRadius = 8, reduced = false,
}: Props) {
  const color = RARITY_COLORS[rarity] || '#888'

  if (rarity === 'Common') {
    return <View style={{ position: 'relative' }}>{children}</View>
  }

  const particleCount = reduced ? Math.ceil(COUNT[rarity] / 2) : COUNT[rarity]

  return (
    <View style={{ position: 'relative' }}>
      {children}

      {/* Neon border — thickens + brightens, breathes back */}
      <NeonBorder color={color} borderRadius={borderRadius} />

      {/* Orbiting electric particles */}
      {particleCount > 0 && (
        <ElectricOrbit color={color} size={size} count={particleCount} />
      )}

      {/* Dimensional only: RGB color-shifting outer accent */}
      {rarity === 'Dimensional' && (
        <RgbShiftBorder borderRadius={borderRadius} />
      )}
    </View>
  )
}

// ─── NEON BORDER ────────────────────────────────────────────────────────────
// Border thickness pulses 1.5 ↔ 3px while opacity goes 0.55 ↔ 1.0.
// Non-native driver because borderWidth is a layout prop, but only
// one View → cost is negligible.
function NeonBorder({ color, borderRadius }: { color: string; borderRadius: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(t, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])
  const width   = t.interpolate({ inputRange: [0, 1], outputRange: [1.5, 3.0] })
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: width,
        borderColor: color,
        opacity,
      }]}
    />
  )
}

// ─── ELECTRIC ORBIT (cluster of orbiting electric particles) ────────────────
function ElectricOrbit({ color, size, count }: { color: string; size: number; count: number }) {
  const center = size / 2
  const radius = size * 0.62

  // Stable per-particle params via ref so we don't recreate on render
  const params = useRef(
    Array.from({ length: count }).map((_, i) => ({
      initialAngle: i / count, // distributed evenly
      duration: 7000 + Math.floor(Math.random() * 4000),
      subDuration: 480 + Math.floor(Math.random() * 280),
      flickerDuration: 220 + Math.floor(Math.random() * 200),
    }))
  ).current

  return (
    <>
      {params.map((p, i) => (
        <ElectricParticle
          key={i}
          color={color}
          centerX={center}
          centerY={center}
          radius={radius}
          initialAngle={p.initialAngle}
          duration={p.duration}
          subDuration={p.subDuration}
          flickerDuration={p.flickerDuration}
        />
      ))}
    </>
  )
}

interface ParticleProps {
  color: string
  centerX: number
  centerY: number
  radius: number
  initialAngle: number    // 0..1
  duration: number        // main orbit period (ms)
  subDuration: number     // sub-orbit (electron) period (ms)
  flickerDuration: number // brightness flicker period (ms)
}

function ElectricParticle({
  color, centerX, centerY, radius,
  initialAngle, duration, subDuration, flickerDuration,
}: ParticleProps) {
  const orbit    = useRef(new Animated.Value(initialAngle)).current
  const subOrbit = useRef(new Animated.Value(Math.random())).current
  const flicker  = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const startVal = (orbit as any).__getValue ? (orbit as any).__getValue() : initialAngle
    const subStart = (subOrbit as any).__getValue ? (subOrbit as any).__getValue() : 0

    const orbitLoop = Animated.loop(Animated.timing(orbit, {
      toValue: startVal + 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }))
    const subLoop = Animated.loop(Animated.timing(subOrbit, {
      toValue: subStart + 1,
      duration: subDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    }))
    const flickerLoop = Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: 1.0, duration: flickerDuration, useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0.4, duration: flickerDuration, useNativeDriver: true }),
    ]))

    orbitLoop.start()
    subLoop.start()
    flickerLoop.start()
    return () => {
      orbitLoop.stop()
      subLoop.stop()
      flickerLoop.stop()
    }
  }, [])

  const orbitAngle = orbit.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  })
  const subOrbitAngle = subOrbit.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: centerY - 2,
        left: centerX - 2,
        width: 4,
        height: 4,
        transform: [
          { rotate: orbitAngle },
          { translateX: radius },
        ],
      }}
    >
      {/* Main glowing particle */}
      <Animated.View
        style={{
          width: 4, height: 4,
          borderRadius: 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          opacity: flicker,
        }}
      />
      {/* Sub-orbit white electron — small spark circling the main particle */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 1,
          left: 1,
          width: 2,
          height: 2,
          transform: [
            { rotate: subOrbitAngle },
            { translateX: 6 },
          ],
        }}
      >
        <Animated.View
          style={{
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: '#FFFFFF',
            shadowColor: '#FFFFFF',
            shadowOpacity: 1,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 0 },
            opacity: flicker,
          }}
        />
      </Animated.View>
    </Animated.View>
  )
}

// ─── DIMENSIONAL: RGB COLOR-SHIFT BORDER ────────────────────────────────────
function RgbShiftBorder({ borderRadius }: { borderRadius: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: false,
    }))
    loop.start()
    return () => loop.stop()
  }, [])
  // Cycle pink → cyan → violet → pink
  const borderColor = t.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#EC4899', '#00D4FF', '#A855F7', '#EC4899'],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: 1.5,
        borderColor,
      }]}
    />
  )
}
