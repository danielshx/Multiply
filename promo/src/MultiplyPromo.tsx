import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
  Easing,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: INTER } = loadInter();
const { fontFamily: MONO } = loadJetBrainsMono();

export const PROMO_FPS = 30;
export const PROMO_WIDTH = 1920;
export const PROMO_HEIGHT = 1080;
export const PROMO_DURATION_FRAMES = 30 * PROMO_FPS; // 30s

//  ────────────────────────────────────────────────────────────────────────
//  Scene ranges (frames)
//  ────────────────────────────────────────────────────────────────────────
const S = {
  cold: [0, 90] as const,        // 0.0 – 3.0s  : black → first line
  problem: [90, 210] as const,   // 3.0 – 7.0s  : "Sales is still mostly human."
  until: [210, 300] as const,    // 7.0 – 10.0s : "Until now."
  title: [300, 420] as const,    // 10.0 – 14.0s: MULTIPLY title reveal
  orchestra: [420, 570] as const,// 14.0 – 19.0s: 7-role orchestra image
  swarm: [570, 720] as const,    // 19.0 – 24.0s: 25-tile swarm grid
  graph: [720, 810] as const,    // 24.0 – 27.0s: knowledge graph
  kpi: [810, 870] as const,      // 27.0 – 29.0s: KPI counters
  close: [870, 900] as const,    // 29.0 – 30.0s: closing logo + url
};

//  ────────────────────────────────────────────────────────────────────────
//  Visual primitives
//  ────────────────────────────────────────────────────────────────────────
const BG_GRADIENT =
  "radial-gradient(ellipse at 50% 50%, #0a1020 0%, #050810 60%, #000000 100%)";

const ACCENT = "#7c5cff";
const ACCENT_WARM = "#ffb347";
const ACCENT_HOT = "#ff5c7a";
const ACCENT_COOL = "#5ce6d4";

const Background: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame / 22) * 0.06 + 0.94;
  return (
    <AbsoluteFill
      style={{
        background: BG_GRADIENT,
        opacity: intensity * pulse,
      }}
    />
  );
};

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
      pointerEvents: "none",
      mixBlendMode: "overlay",
    }}
  />
);

const Grid: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(124,92,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.35) 1px, transparent 1px)",
      backgroundSize: "80px 80px",
      opacity,
      maskImage:
        "radial-gradient(ellipse at 50% 50%, black 10%, transparent 70%)",
    }}
  />
);

const ParticleField: React.FC<{ count?: number; seed?: number }> = ({
  count = 60,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r = ((i * 9301 + 49297 + seed * 233) % 233280) / 233280;
      const r2 = ((i * 1597 + 51749 + seed * 907) % 233280) / 233280;
      const r3 = ((i * 2357 + 61121 + seed * 331) % 233280) / 233280;
      return {
        x: r * 100,
        y: r2 * 100,
        size: 1 + r3 * 2.5,
        speed: 0.15 + r3 * 0.6,
        phase: r * Math.PI * 2,
      };
    });
  }, [count, seed]);

  return (
    <AbsoluteFill>
      {particles.map((p, i) => {
        const driftY = (p.y + frame * p.speed * 0.1) % 100;
        const opacity = 0.25 + Math.sin(frame / 30 + p.phase) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${driftY}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 7 === 0 ? ACCENT : "#ffffff",
              opacity,
              boxShadow:
                i % 7 === 0 ? `0 0 ${p.size * 6}px ${ACCENT}` : "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
      pointerEvents: "none",
    }}
  />
);

//  ────────────────────────────────────────────────────────────────────────
//  Scene 1: Cold open
//  ────────────────────────────────────────────────────────────────────────
const SceneCold: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 60, 90], [0, 1, 1.4], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 30, 70, 90], [0, 1, 1, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: 24 * scale,
          height: 24 * scale,
          borderRadius: "50%",
          background: "white",
          opacity,
          boxShadow: `0 0 ${60 * scale}px white, 0 0 ${180 * scale}px ${ACCENT}`,
        }}
      />
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 2 + 3: Problem statement → "Until now."
//  ────────────────────────────────────────────────────────────────────────
const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [90, 120], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);
  const letterSpacing = interpolate(frame, [0, 90], [0.4, 0.1]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 300,
          color: "rgba(255,255,255,0.88)",
          fontSize: 78,
          letterSpacing: `${letterSpacing}em`,
          textAlign: "center",
          opacity,
        }}
      >
        Sales is still mostly human.
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 400,
          color: ACCENT,
          fontSize: 22,
          letterSpacing: "0.3em",
          marginTop: 34,
          opacity: opacity * 0.75,
        }}
      >
        70% MECHANICAL · 30% DECISIONS · 100% EXHAUSTING
      </div>
    </AbsoluteFill>
  );
};

const SceneUntilNow: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [60, 90], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);
  const slide = interpolate(frame, [0, 30], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 200,
          color: "white",
          fontSize: 140,
          letterSpacing: "-0.02em",
          transform: `translateY(${slide}px)`,
          opacity,
        }}
      >
        Until now.
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 4: Title reveal
//  ────────────────────────────────────────────────────────────────────────
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleSpring = spring({
    fps,
    frame: frame - 6,
    config: { damping: 18, stiffness: 120, mass: 0.9 },
  });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame, [34, 58], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
  });

  const shimmer = interpolate(frame, [0, 120], [0, 120]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 800,
          fontSize: 240,
          letterSpacing: "-0.04em",
          color: "white",
          opacity: titleOpacity * fadeOut,
          transform: `scale(${0.9 + titleSpring * 0.1})`,
          backgroundImage: `linear-gradient(100deg, #ffffff 0%, #ffffff 40%, ${ACCENT} 50%, #ffffff 60%, #ffffff 100%)`,
          backgroundSize: "300% 100%",
          backgroundPosition: `${shimmer}% 0`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
        }}
      >
        multiply
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 400,
          fontSize: 26,
          letterSpacing: "0.42em",
          color: "rgba(255,255,255,0.7)",
          marginTop: 32,
          opacity: subOpacity * fadeOut,
          textTransform: "uppercase",
        }}
      >
        The swarm outreach engine
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          color: ACCENT,
          letterSpacing: "0.6em",
          marginTop: 14,
          opacity: subOpacity * fadeOut * 0.8,
        }}
      >
        HAPPYROBOT × TUM.AI · 2026
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 5: Agent Orchestra
//  ────────────────────────────────────────────────────────────────────────
const ROLES = [
  "SIGNAL HUNTER",
  "PROSPECTOR",
  "RESEARCHER",
  "PERSONALISER",
  "QUALIFIER",
  "NEGOTIATOR",
  "CLOSER",
];

const SceneOrchestra: React.FC = () => {
  const frame = useCurrentFrame();
  const imgOpacity = interpolate(frame, [0, 30, 110, 150], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const imgScale = interpolate(frame, [0, 120], [1.02, 1.15], {
    easing: Easing.inOut(Easing.cubic),
  });
  const blurRampOut = interpolate(frame, [110, 150], [0, 16], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: imgOpacity,
          filter: `blur(${blurRampOut}px)`,
        }}
      >
        <Img
          src={staticFile("agent-orchestra.png")}
          style={{
            width: 900,
            height: "auto",
            transform: `scale(${imgScale})`,
            filter: "drop-shadow(0 0 80px rgba(124,92,255,0.4))",
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>

      {/*  Caption on the left  */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 160,
          opacity: interpolate(frame, [20, 40, 110, 140], [0, 1, 1, 0]),
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 18,
            color: ACCENT,
            letterSpacing: "0.45em",
          }}
        >
          ARCHITECTURE · 01
        </div>
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 300,
            fontSize: 62,
            color: "white",
            marginTop: 18,
            lineHeight: 1.05,
            maxWidth: 600,
          }}
        >
          Seven specialist
          <br />
          roles. One brain.
        </div>
      </div>

      {/*  Role-name ticker bottom-left  */}
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 140,
          display: "grid",
          gridTemplateColumns: "repeat(4, auto)",
          gap: "14px 32px",
          alignItems: "center",
        }}
      >
        {ROLES.map((role, i) => {
          const revealFrame = 36 + i * 6;
          const opacity = interpolate(
            frame,
            [revealFrame, revealFrame + 12, 110, 140],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return (
            <div
              key={role}
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.16em",
                opacity,
                padding: "6px 14px",
                border: `1px solid rgba(124,92,255,0.45)`,
                borderRadius: 2,
                background: "rgba(124,92,255,0.06)",
              }}
            >
              {role}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 6: Swarm Grid (25 tiles, mode flips)
//  ────────────────────────────────────────────────────────────────────────
const SwarmTile: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const appearFrame = 10 + i * 2;
  const appear = interpolate(frame, [appearFrame, appearFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pseudo-random mode per tile over time
  const seed = ((i * 7919) % 997) / 997;
  const modeCycle = (frame / 24 + seed * 4) % 4;
  let color = ACCENT_COOL;
  let label = "COLD";
  let glow = 6;
  if (modeCycle > 1.2) {
    color = ACCENT_WARM;
    label = "WARM";
    glow = 10;
  }
  if (modeCycle > 2.2) {
    color = ACCENT_HOT;
    label = "HOT";
    glow = 22;
  }
  if (modeCycle > 3.2) {
    color = "#a9f7c0";
    label = "BOOKED";
    glow = 30;
  }

  const ping = Math.sin(frame / 5 + seed * 10) * 0.5 + 0.5;
  const waveform = Array.from({ length: 16 }, (_, k) => {
    const h = Math.abs(Math.sin(frame / 4 + k * 0.9 + seed * 20)) * 16 + 2;
    return h;
  });

  return (
    <div
      style={{
        opacity: appear,
        transform: `translateY(${(1 - appear) * 18}px)`,
        background: "rgba(10,16,32,0.75)",
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "10px 12px",
        boxShadow: `0 0 ${glow}px ${color}66`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 96,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.15em",
          }}
        >
          L{String(i + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color,
            letterSpacing: "0.18em",
            background: `${color}22`,
            padding: "2px 6px",
            borderRadius: 2,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
        {waveform.map((h, k) => (
          <div
            key={k}
            style={{
              width: 2,
              height: h,
              background: color,
              opacity: 0.5 + ping * 0.5,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
        }}
      >
        {["DACH", "ALPS", "DE-S", "AT-E", "CH-N"][i % 5]} · {(seed * 94 + 12).toFixed(0)}%
      </div>
    </div>
  );
};

const SceneSwarm: React.FC = () => {
  const frame = useCurrentFrame();
  const headOpacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0]);
  const gridOpacity = interpolate(frame, [6, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [130, 150], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: "110px 120px" }}>
      <div style={{ opacity: headOpacity }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 18,
            color: ACCENT,
            letterSpacing: "0.45em",
          }}
        >
          EXECUTION · 02
        </div>
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 300,
            fontSize: 62,
            color: "white",
            marginTop: 12,
            lineHeight: 1.05,
          }}
        >
          25 conversations. <span style={{ color: ACCENT }}>At once.</span>
        </div>
      </div>

      <div
        style={{
          opacity: gridOpacity * fadeOut,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginTop: 60,
        }}
      >
        {Array.from({ length: 25 }, (_, i) => (
          <SwarmTile key={i} i={i} frame={frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 7: Knowledge Graph
//  ────────────────────────────────────────────────────────────────────────
const SceneGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const imgOpacity = interpolate(
    frame,
    [0, 20, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0]
  );
  const pan = interpolate(frame, [0, durationInFrames], [-30, 20]);
  const zoom = interpolate(frame, [0, durationInFrames], [1.05, 1.15]);

  const nodeCount = Math.floor(
    interpolate(frame, [10, 70], [0, 94], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const edgeCount = Math.floor(
    interpolate(frame, [18, 80], [0, 157], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: imgOpacity,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("knowledge-graph.png")}
          style={{
            width: 1400,
            height: "auto",
            transform: `translateX(${pan}px) scale(${zoom})`,
            filter: "drop-shadow(0 0 60px rgba(124,92,255,0.5))",
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 180,
          textAlign: "right",
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 18,
            color: ACCENT,
            letterSpacing: "0.45em",
          }}
        >
          MEMORY · 03
        </div>
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 300,
            fontSize: 56,
            color: "white",
            marginTop: 12,
            lineHeight: 1.05,
            maxWidth: 560,
          }}
        >
          The swarm remembers.
          <br />
          <span style={{ color: ACCENT }}>And teaches itself.</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 140,
          display: "flex",
          gap: 56,
          fontFamily: MONO,
          color: "white",
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.3em" }}>
            NODES
          </div>
          <div style={{ fontSize: 82, fontWeight: 600, color: ACCENT }}>{nodeCount}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.3em" }}>
            EDGES
          </div>
          <div style={{ fontSize: 82, fontWeight: 600, color: ACCENT_COOL }}>{edgeCount}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.3em" }}>
            PER RUN
          </div>
          <div style={{ fontSize: 82, fontWeight: 600, color: ACCENT_WARM }}>+12</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 8: KPI counters
//  ────────────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  label: string;
  target: number;
  color: string;
  frame: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
}> = ({ label, target, color, frame, suffix = "", prefix = "", delay = 0 }) => {
  const val = Math.floor(
    interpolate(frame, [delay, delay + 40], [0, target], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const appear = interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ textAlign: "center", opacity: appear }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.45em",
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 180,
          color,
          lineHeight: 1,
          textShadow: `0 0 40px ${color}88`,
        }}
      >
        {prefix}
        {val}
        {suffix}
      </div>
    </div>
  );
};

const SceneKPI: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [50, 60], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          color: ACCENT,
          letterSpacing: "0.5em",
          marginBottom: 50,
        }}
      >
        ONE DEMO RUN · LIVE · IN FRONT OF THE JURY
      </div>
      <div style={{ display: "flex", gap: 120, alignItems: "flex-end" }}>
        <KPI label="DIALS" target={25} color="white" frame={frame} delay={0} />
        <KPI label="CONNECTS" target={5} color={ACCENT} frame={frame} delay={10} />
        <KPI label="MEETINGS" target={1} color={ACCENT_WARM} frame={frame} delay={24} />
        <KPI label="LEARNINGS" target={12} color={ACCENT_COOL} frame={frame} delay={18} />
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Scene 9: Close
//  ────────────────────────────────────────────────────────────────────────
const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ fps, frame, config: { damping: 20, stiffness: 100 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 800,
          fontSize: 180,
          color: "white",
          letterSpacing: "-0.04em",
          transform: `scale(${0.92 + s * 0.08})`,
          opacity: s,
        }}
      >
        multiply
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 22,
          color: ACCENT,
          letterSpacing: "0.3em",
          marginTop: 18,
          opacity: interpolate(frame, [10, 22], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        multiply-danielshxs-projects.vercel.app
      </div>
    </AbsoluteFill>
  );
};

//  ────────────────────────────────────────────────────────────────────────
//  Root composition
//  ────────────────────────────────────────────────────────────────────────
export const MultiplyPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Background />
      <ParticleField count={80} seed={3} />
      <Grid opacity={0.06} />

      <Sequence from={S.cold[0]} durationInFrames={S.cold[1] - S.cold[0]}>
        <SceneCold />
      </Sequence>

      <Sequence from={S.problem[0]} durationInFrames={S.problem[1] - S.problem[0]}>
        <SceneProblem />
      </Sequence>

      <Sequence from={S.until[0]} durationInFrames={S.until[1] - S.until[0]}>
        <SceneUntilNow />
      </Sequence>

      <Sequence from={S.title[0]} durationInFrames={S.title[1] - S.title[0]}>
        <SceneTitle />
      </Sequence>

      <Sequence
        from={S.orchestra[0]}
        durationInFrames={S.orchestra[1] - S.orchestra[0]}
      >
        <SceneOrchestra />
      </Sequence>

      <Sequence from={S.swarm[0]} durationInFrames={S.swarm[1] - S.swarm[0]}>
        <SceneSwarm />
      </Sequence>

      <Sequence from={S.graph[0]} durationInFrames={S.graph[1] - S.graph[0]}>
        <SceneGraph />
      </Sequence>

      <Sequence from={S.kpi[0]} durationInFrames={S.kpi[1] - S.kpi[0]}>
        <SceneKPI />
      </Sequence>

      <Sequence from={S.close[0]} durationInFrames={S.close[1] - S.close[0]}>
        <SceneClose />
      </Sequence>

      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};
