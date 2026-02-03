import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { Script, Caption } from "@/types";

// Props type for the composition
export interface VideoCompositionProps {
  script: Script;
  audioUrl: string;
  captions: Caption[];
  imageUrls: string[];
}

// Default props for preview/testing
const defaultProps: VideoCompositionProps = {
  script: {
    title: "Sample Video",
    scenes: [
      {
        id: 1,
        text: "This is a sample scene for preview.",
        imagePrompt: "A beautiful sunset over mountains",
        duration: 5,
      },
    ],
    totalDuration: 5,
  },
  audioUrl: "",
  captions: [],
  imageUrls: [],
};

// Calculate duration in frames based on script
const calculateDurationInFrames = (script: Script, fps: number): number => {
  // Use actual scene durations summed up, or totalDuration, with a minimum of 5 seconds
  const totalSceneDuration = script.scenes.reduce((sum, scene) => sum + (scene.duration || 5), 0);
  const duration = Math.max(script.totalDuration || totalSceneDuration, totalSceneDuration);
  return Math.max(Math.ceil(duration * fps), fps * 5); // Min 5 seconds
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={VideoComposition as React.FC<any>}
        durationInFrames={calculateDurationInFrames(defaultProps.script, 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        // Allow dynamic duration based on inputProps
        calculateMetadata={async ({ props }) => {
          const script = props.script as Script;
          const totalSceneDuration = script.scenes.reduce((sum, scene) => sum + (scene.duration || 5), 0);
          const duration = Math.max(script.totalDuration || totalSceneDuration, totalSceneDuration);
          return {
            durationInFrames: Math.max(Math.ceil(duration * 30), 150),
          };
        }}
      />
    </>
  );
};

// Register root for Remotion CLI
registerRoot(RemotionRoot);
