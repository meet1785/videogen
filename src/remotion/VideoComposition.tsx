import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Script, Caption } from "@/types";

interface VideoCompositionProps {
  script: Script;
  audioUrl: string;
  captions: Caption[];
  imageUrls: string[];
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  script,
  audioUrl,
  captions,
  imageUrls,
}) => {
  const { fps } = useVideoConfig();

  // Calculate frame positions for each scene
  let currentFrame = 0;
  const sceneFrames = script.scenes.map((scene) => {
    const start = currentFrame;
    const duration = scene.duration * fps;
    currentFrame += duration;
    return { start, duration };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background Images with Ken Burns Effect */}
      {script.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={sceneFrames[index].start}
          durationInFrames={sceneFrames[index].duration}
        >
          <KenBurnsImage
            src={imageUrls[index]}
            durationInFrames={sceneFrames[index].duration}
          />
        </Sequence>
      ))}

      {/* Audio Track */}
      <Audio src={audioUrl} />

      {/* Animated Captions */}
      <CaptionsOverlay captions={captions} fps={fps} />
    </AbsoluteFill>
  );
};

// Ken Burns Effect Component
const KenBurnsImage: React.FC<{ src: string; durationInFrames: number }> = ({
  src,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Smooth zoom in effect
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.15], {
    extrapolateRight: "clamp",
  });

  // Subtle pan
  const translateX = interpolate(frame, [0, durationInFrames], [0, -20], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      />
      {/* Gradient overlay for better text readability */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        }}
      />
    </AbsoluteFill>
  );
};

// Animated Captions Component
const CaptionsOverlay: React.FC<{ captions: Caption[]; fps: number }> = ({
  captions,
  fps,
}) => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // Find current caption
  const currentCaption = captions.find(
    (cap) => currentTime >= cap.start && currentTime <= cap.end
  );

  if (!currentCaption) return null;

  // Calculate which word is currently being spoken
  const currentWordIndex = currentCaption.words.findIndex(
    (word) => currentTime >= word.start && currentTime <= word.end
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 120,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          maxWidth: "90%",
          padding: "16px 24px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: 12,
        }}
      >
        {currentCaption.words.map((word, index) => {
          const isActive = index === currentWordIndex;
          const isPast = index < currentWordIndex;

          return (
            <span
              key={`${word.word}-${index}`}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 42,
                fontWeight: 800,
                color: isActive ? "#FFD700" : isPast ? "#FFFFFF" : "#888888",
                textTransform: "uppercase",
                textShadow: isActive
                  ? "0 0 20px rgba(255, 215, 0, 0.8)"
                  : "2px 2px 4px rgba(0,0,0,0.8)",
                transition: "all 0.1s ease-out",
                transform: isActive ? "scale(1.1)" : "scale(1)",
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default VideoComposition;
