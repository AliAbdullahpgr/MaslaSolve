import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function useFadeIn(startFrame: number, duration = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function useFadeOut(startFrame: number, duration = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function useSpringIn(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110 },
  });
}

export function useRise(startFrame: number, distance = 30, duration = 22) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // ease-out cubic
  const eased = 1 - Math.pow(1 - t, 3);
  return distance * (1 - eased);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
