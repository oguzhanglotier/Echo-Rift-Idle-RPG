// =============================================
// ECHO RIFT — RARITY AURA
// Layered visual effects scaled to rarity. Wraps an item card and
// paints animated borders / pulses / sparks / rings / glitches behind
// (and around) the children. All overlays are pointerEvents='none'.
//
// Tier intensity:
//   Common      → no FX (just children)
//   Uncommon    → soft inner pulse
//   Rare        → pulse + slow rotating shimmer ring
//   Epic        → pulse + ring + 4 corner sparks
//   Legendary   → all Epic + counter-rotating outer ring + 8 ambient stars
//   Dimensional → all Legendary + RGB color-shifting border + glitch flashes
//
// Performance: every animation uses useNativeDriver. Number of layers
// scales with rarity, so Common items pay zero animation cost.
// =============================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import { Rarity, RARITY_COLORS } from '../types'

interface Props {
  rarity: Rarity
  children: React.ReactNode
  /** Outer container size (square). Used for positioning rings/sparks. */
  size?: number
  /** Border radius applied to the visual layers (match the slot/card). */
  borderRadius?: number
  /** Disable expensive layers (e.g. when off-screen / scrolling lists). */
  reduced?: boolean
}

const STAR_COUNT_LEGENDARY = 8
const STAR_COUNT_DIMENSIONAL = 12

export function RarityAura({
  rarity, children, size = 96, borderRadius = 8, reduced = false,
}: Props) {
  const color = RARITY_COLORS[rarity] || '#888'

  // Common: ultra-cheap, just render children. No overlays, no anim.
  if (rarity === 'Common') {
    return <View style={{ position: 'relative' }}>{children}</View>
  }

  return (
    <View style={{ position: 'relative' }}>
      {children}

      {/* Layer 1: Inner glow pulse (Uncommon+) */}
      <Pulse color={color} borderRadius={borderRadius} />

      {/* Layer 2: Slow rotating shimmer ring (Rare+) */}
      {(rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Dimensional') && (
        <ShimmerRing color={color} size={size} borderRadius={borderRadius} duration={8000} />
      )}

      {/* Layer 3: 4 corner sparks (Epic+) */}
      {(rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Dimensional') && (
        <CornerSparks color={color} />
      )}

      {/* Layer 4: Counter-rotating outer ring + ambient stars (Legendary+) */}
      {(rarity === 'Legendary' || rarity === 'Dimensional') && (
        <>
          <ShimmerRing color={color} size={size} borderRadius={borderRadius} duration={6000} reverse />
          {!reduced && (
            <AmbientStars
              color={color}
              size={size}
              count={rarity === 'Dimensional' ? STAR_COUNT_DIMENSIONAL : STAR_COUNT_LEGENDARY}
            />
          )}
        </>
      )}

      {/* Layer 5: RGB color-shift border + glitch (Dimensional only) */}
      {rarity === 'Dimensional' && (
        <>
          <RgbShiftBorder borderRadius={borderRadius} />
          {!reduced && <GlitchFlash />}
        </>
      )}
    </View>
  )
}

// ─── LAYER 1 ────────────────────────────────────────────────────────────────
// Soft inner glow that breathes opacity 0.45 ↔ 1.0
function Pulse({ color, borderRadius }: { color: string; borderRadius: number }) {
  const anim = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.0,  duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.45, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: 1.5,
        borderColor: color,
        opacity: anim,
      }]}
    />
  )
}

// ─── LAYER 2 ────────────────────────────────────────────────────────────────
// Rotating ring outside the item, gives a "scanning" feel
function ShimmerRing({
  color, size, borderRadius, duration, reverse = false,
}: { color: string; size: number; borderRadius: number; duration: number; reverse?: boolean }) {
  const rot = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(rot, {
      toValue: 1, duration, easing: Easing.linear, useNativeDriver: true,
    }))
    loop.start()
    return () => loop.stop()
  }, [])
  const spin = rot.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  })
  const ringSize = size + 6
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -3, left: -3,
        width: ringSize, height: ringSize,
        borderRadius: borderRadius + 3,
        borderWidth: 1,
        borderColor: color + '50',
        transform: [{ rotate: spin }],
      }}
    >
      {/* Ring "spark" — a single bright dot riding the ring as it rotates */}
      <View style={{
        position: 'absolute',
        top: -2, left: ringSize / 2 - 2,
        width: 4, height: 4,
        borderRadius: 2,
        backgroundColor: color,
        shadowColor: color, shadowOpacity: 1, shadowRadius: 4,
      }} />
    </Animated.View>
  )
}

// ─── LAYER 3 ────────────────────────────────────────────────────────────────
// Four corner accents that scale in and out staggered
function CornerSparks({ color }: { color: string }) {
  const corners = [
    { top: -2, left: -2,  delay: 0    },
    { top: -2, right: -2, delay: 250  },
    { bottom: -2, right: -2, delay: 500  },
    { bottom: -2, left: -2,  delay: 750  },
  ]
  return (
    <>
      {corners.map((c, i) => (
        <CornerSpark key={i} color={color} {...c} />
      ))}
    </>
  )
}
function CornerSpark({
  color, top, left, right, bottom, delay,
}: { color: string; top?: number; left?: number; right?: number; bottom?: number; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0, duration: 700, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.delay(800),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top, left, right, bottom,
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: color,
        shadowColor: color, shadowOpacity: 1, shadowRadius: 5,
        transform: [{ scale }],
      }}
    />
  )
}

// ─── LAYER 4 ────────────────────────────────────────────────────────────────
// Tiny stars orbiting the item — Legendary aspirational drift
function AmbientStars({ color, size, count }: { color: string; size: number; count: number }) {
  const orbits = useRef(
    Array.from({ length: count }).map(() => new Animated.Value(Math.random()))
  ).current
  const center = size / 2
  const radius = size * 0.62

  useEffect(() => {
    const loops = orbits.map((v) =>
      Animated.loop(Animated.timing(v, {
        toValue: v.__getValue() + 1,
        duration: 6000 + Math.random() * 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }))
    )
    loops.forEach(l => l.start())
    return () => loops.forEach(l => l.stop())
  }, [])

  return (
    <>
      {orbits.map((v, i) => {
        const angle = v.interpolate({
          inputRange: [0, 1], outputRange: ['0deg', '360deg'],
        })
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: center - 1.5,
              left: center - 1.5,
              width: 3, height: 3,
              borderRadius: 1.5,
              backgroundColor: color,
              shadowColor: color, shadowOpacity: 1, shadowRadius: 3,
              transform: [
                { rotate: angle },
                { translateX: radius },
              ],
              opacity: 0.65,
            }}
          />
        )
      })}
    </>
  )
}

// ─── LAYER 5 ────────────────────────────────────────────────────────────────
// RGB color shift border — Dimensional signature
function RgbShiftBorder({ borderRadius }: { borderRadius: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
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
        borderWidth: 2,
        borderColor,
      }]}
    />
  )
}

// Random brief flash overlay — glitch feel
function GlitchFlash() {
  const op = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(2200 + Math.random() * 1800),
      Animated.timing(op, { toValue: 0.35, duration: 80,  useNativeDriver: true }),
      Animated.timing(op, { toValue: 0,    duration: 80,  useNativeDriver: true }),
      Animated.delay(120),
      Animated.timing(op, { toValue: 0.25, duration: 60,  useNativeDriver: true }),
      Animated.timing(op, { toValue: 0,    duration: 60,  useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        backgroundColor: '#FFFFFF',
        opacity: op,
      }]}
    />
  )
}
