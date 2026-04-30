// =============================================
// ECHO RIFT — RARITY AURA (v4, thermals-fix)
// Strategy:
//   Common/Uncommon/Rare/Epic → 100% static visual (zero animation cost).
//     A coloured border + native shadow gives a "neon" look without any
//     per-frame work. Inventories can hold dozens of these — at zero CPU.
//   Legendary → single opacity pulse, useNativeDriver=true (GPU only).
//   Dimensional → opacity pulse + slow RGB color shift (one JS-driver
//     animation, acceptable because the item is rare).
//
// Why the previous version overheated: borderWidth + borderColor are
// layout/style props, useNativeDriver MUST be false → every frame ran
// on the JS thread. With 50 cards in a FlatList that's 50 parallel
// JS animations recalculating layout 60×/sec.
// =============================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import { Rarity, RARITY_COLORS } from '../types'

interface Props {
  rarity: Rarity
  children: React.ReactNode
  borderRadius?: number
}

export function RarityAura({ rarity, children, borderRadius = 8 }: Props) {
  // Common: render children unchanged. Cheapest possible.
  if (rarity === 'Common') {
    return <View style={{ position: 'relative' }}>{children}</View>
  }

  const color = RARITY_COLORS[rarity] || '#888'

  // Static tier — no animation at all.
  if (rarity === 'Uncommon' || rarity === 'Rare' || rarity === 'Epic') {
    const width  = rarity === 'Epic' ? 2.0 : rarity === 'Rare' ? 1.7 : 1.4
    const radius = rarity === 'Epic' ? 6 : rarity === 'Rare' ? 5 : 4
    const opacity = rarity === 'Epic' ? 0.65 : rarity === 'Rare' ? 0.55 : 0.45
    return (
      <View style={{ position: 'relative' }}>
        {children}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {
            borderRadius,
            borderWidth: width,
            borderColor: color,
            shadowColor: color,
            shadowOpacity: opacity,
            shadowRadius: radius,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4, // android shadow approximation
          }]}
        />
      </View>
    )
  }

  // Legendary: static border + ONE opacity-only pulse (native driver).
  if (rarity === 'Legendary') {
    return (
      <View style={{ position: 'relative' }}>
        {children}
        {/* Static base border */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {
            borderRadius,
            borderWidth: 2.2,
            borderColor: color,
            shadowColor: color,
            shadowOpacity: 0.85,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }]}
        />
        {/* Animated overlay — opacity only, runs on GPU */}
        <PulseOverlay color={color} borderRadius={borderRadius} />
      </View>
    )
  }

  // Dimensional: static border + opacity pulse + RGB cycle (premium tier).
  return (
    <View style={{ position: 'relative' }}>
      {children}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          borderRadius,
          borderWidth: 2.6,
          borderColor: color,
          shadowColor: color,
          shadowOpacity: 1.0,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }]}
      />
      <PulseOverlay color={color} borderRadius={borderRadius} />
      <RgbShiftBorder borderRadius={borderRadius} />
    </View>
  )
}

// ─── PULSE OVERLAY — opacity only, GPU friendly ─────────────────────────────
function PulseOverlay({ color, borderRadius }: { color: string; borderRadius: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1.0,  duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
        opacity,
      }]}
    />
  )
}

// ─── RGB SHIFT — Dimensional only ───────────────────────────────────────────
// Only color animation in the system. Single Dimensional usually < 5 in
// inventory, so cost is bounded.
function RgbShiftBorder({ borderRadius }: { borderRadius: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: false,
    }))
    loop.start()
    return () => loop.stop()
  }, [])
  const borderColor = t.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#EC4899', '#00D4FF', '#A855F7', '#EC4899'],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: 1.2,
        borderColor,
      }]}
    />
  )
}
