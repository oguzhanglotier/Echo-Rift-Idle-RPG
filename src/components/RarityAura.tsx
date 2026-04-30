// =============================================
// ECHO RIFT — RARITY AURA (v3, performance pass)
// Single animated border per item. Thickness + opacity breathe in
// sync (1.5±). Higher rarities push the maxThickness up so the
// hierarchy reads at a glance. Dimensional adds a second cycling
// RGB border on top.
//
// Why this revision: v2 spawned 12 orbiting particles per Dimensional
// item, each with sub-orbit + flicker = ~36 active Animated nodes.
// FlatList scrolls easily render 30+ cards → 1000+ nodes, the device
// thermals. v3 ships ONE Animated.Value per item (two for Dimensional)
// and uses interpolation only — runs cool on mid-range hardware.
//
// All animations tagged useNativeDriver where the prop allows; only
// borderWidth/borderColor (layout/style props) need the JS driver.
// =============================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import { Rarity, RARITY_COLORS } from '../types'

interface Props {
  rarity: Rarity
  children: React.ReactNode
  borderRadius?: number
}

// Border thickness range per rarity. Common gets no animation.
const BORDER_RANGE: Record<Rarity, [number, number] | null> = {
  Common:      null,
  Uncommon:    [1.0, 2.0],
  Rare:        [1.5, 2.6],
  Epic:        [2.0, 3.2],
  Legendary:   [2.5, 3.8],
  Dimensional: [2.8, 4.4],
}

// Pulse cycle ms. Higher rarity = slightly faster heartbeat.
const PULSE_MS: Record<Rarity, number> = {
  Common: 0,
  Uncommon: 1300,
  Rare: 1200,
  Epic: 1100,
  Legendary: 1000,
  Dimensional: 950,
}

export function RarityAura({ rarity, children, borderRadius = 8 }: Props) {
  if (rarity === 'Common') {
    return <View style={{ position: 'relative' }}>{children}</View>
  }
  return (
    <View style={{ position: 'relative' }}>
      {children}
      <NeonBorder rarity={rarity} borderRadius={borderRadius} />
      {rarity === 'Dimensional' && <RgbShiftBorder borderRadius={borderRadius} />}
    </View>
  )
}

// ─── NEON BORDER ────────────────────────────────────────────────────────────
function NeonBorder({ rarity, borderRadius }: { rarity: Rarity; borderRadius: number }) {
  const range = BORDER_RANGE[rarity]
  const cycle = PULSE_MS[rarity]
  if (!range || !cycle) return null

  const color = RARITY_COLORS[rarity]
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: cycle, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(t, { toValue: 0, duration: cycle, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])

  const borderWidth = t.interpolate({ inputRange: [0, 1], outputRange: range })
  const opacity     = t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth,
        borderColor: color,
        opacity,
      }]}
    />
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
        borderWidth: 1.2,
        borderColor,
      }]}
    />
  )
}
